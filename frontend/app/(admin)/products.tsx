import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native'
import axios from 'axios'
import Constants from 'expo-constants'
import * as ImagePicker from 'expo-image-picker'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import AdminHeader from '@/components/adminHeader'
import AdminToast from '@/components/admin-toast'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  deleteAdminProduct,
  fetchAdminProducts,
  fetchProductCategories,
  upsertAdminProduct,
} from '@/store/slices/adminProductSlice'

// ==================== API URL ====================
let API_URL =
  process.env.NGROK_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:4000/api/v1'

const manifest: any =
  (Constants as any).manifest || (Constants as any).expoConfig
const debuggerHost = manifest?.debuggerHost?.split(':')[0]

if (debuggerHost && debuggerHost !== 'localhost') {
  API_URL = API_URL.replace('localhost', debuggerHost)
} else if (Platform.OS === 'android') {
  API_URL = API_URL.replace('localhost', '10.0.2.2')
}

/* ─────────────────────────────────────────
   Palette — Blue Robotics (Admin variant)
───────────────────────────────────────── */
const C = {
  bg:          '#020B18',
  bgLayer:     '#040F1F',
  surface:     '#071828',
  surfaceHigh: '#0A2035',
  border:      '#0D2440',
  borderBright:'rgba(0,168,255,0.45)',
  accent:      '#00A8FF',
  accentDim:   '#005A8E',
  accentGlow:  'rgba(0,168,255,0.1)',
  accentText:  '#33BBFF',
  text:        '#E8F4FF',
  textSub:     'rgba(120,180,230,0.7)',
  textDim:     'rgba(60,110,170,0.45)',
  danger:      '#FF4060',
  dangerBg:    'rgba(255,64,96,0.08)',
  dangerBorder:'rgba(255,64,96,0.22)',
  success:     '#00D4AA',
  successBg:   'rgba(0,212,170,0.08)',
  successBorder:'rgba(0,212,170,0.3)',
  warn:        '#F59E0B',
  warnBg:      'rgba(245,158,11,0.1)',
  warnBorder:  'rgba(245,158,11,0.28)',
  white:       '#FFFFFF',
} as const

const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace'

// ==================== TYPES ====================
interface PickedImage {
  uri: string
  name: string
  type: string
}

interface CloudinaryImage {
  public_id: string
  url: string
}

interface Product {
  _id: string
  name: string
  price: number
  description: string
  category: string
  stock: number
  images: CloudinaryImage[]
}

interface Category {
  _id?: string
  name?: string
  category?: string
  count: number
}

// ==================== CONFIRM DIALOG ====================
interface ConfirmDialogProps {
  visible: boolean
  title: string
  message: string
  destructiveText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible, title, message,
  destructiveText = 'Delete', cancelText = 'Cancel',
  onConfirm, onCancel, isLoading = false,
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <Pressable style={cd.overlay} onPress={onCancel}>
      <Pressable style={cd.card} onPress={() => {}}>
        <View style={cd.iconWrap}>
          <MaterialCommunityIcons name="alert-circle-outline" size={40} color={C.danger} />
        </View>
        <Text style={cd.title}>{title}</Text>
        <Text style={cd.message}>{message}</Text>
        <View style={cd.divider} />
        <View style={cd.buttonRow}>
          <TouchableOpacity style={cd.cancelBtn} onPress={onCancel} disabled={isLoading} activeOpacity={0.8}>
            <Text style={cd.cancelBtnText}>{cancelText}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[cd.confirmBtn, isLoading && cd.confirmBtnDisabled]}
            onPress={onConfirm}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={C.text} />
            ) : (
              <>
                <Feather name="trash-2" size={15} color={C.text} style={{ marginRight: 6 }} />
                <Text style={cd.confirmBtnText}>{destructiveText}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </Pressable>
    </Pressable>
  </Modal>
)

const cd = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  card:       { width: '100%', backgroundColor: C.bgLayer, borderRadius: 22, borderWidth: 1, borderColor: C.border, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 24 }, shadowOpacity: 0.6, shadowRadius: 40, elevation: 20 },
  iconWrap:   { width: 72, height: 72, borderRadius: 20, backgroundColor: C.dangerBg,   borderWidth: 1, borderColor: C.dangerBorder,   alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title:      { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 8, textAlign: 'center' },
  message:    { fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  divider:    { width: '100%', height: 1, backgroundColor: C.border, marginBottom: 20 },
  buttonRow:  { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn:  { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 13, paddingVertical: 14, alignItems: 'center', backgroundColor: 'rgba(249,249,249,0.04)' },
  cancelBtnText:  { fontSize: 14, fontWeight: '700', color: C.textSub },
  confirmBtn: { flex: 1, backgroundColor: C.danger, borderRadius: 13, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: C.danger, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: C.text },
})

// ==================== MAIN ====================
export default function AdminProducts() {
  const dispatch = useAppDispatch()
  const { products, categories, loading, refreshing, deleting, submitting } = useAppSelector((state) => state.adminProduct)

  const [modalVisible, setModalVisible] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pickedImages, setPickedImages] = useState<PickedImage[]>([])
  const [remoteImages, setRemoteImages] = useState<CloudinaryImage[]>([])

  const [form, setForm] = useState({
    name: '', price: '', description: '', category: '', stock: '',
  })

  const [alertVisible, setAlertVisible] = useState(false)
  const [alertType, setAlertType] = useState<'success' | 'error'>('success')
  const [alertTitle, setAlertTitle] = useState('')
  const [alertMessage, setAlertMessage] = useState('')

  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const showAlert = (type: 'success' | 'error', title: string, message: string) => {
    setAlertType(type); setAlertTitle(title); setAlertMessage(message); setAlertVisible(true)
  }

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  const fetchProducts = async (opts?: { silent?: boolean }) => {
    try {
      await dispatch(fetchAdminProducts(opts)).unwrap()
    } catch {
      showAlert('error', 'Failed to Load', 'Could not fetch products. Please try again.')
    }
  }

  const fetchCategories = async () => {
    try {
      await dispatch(fetchProductCategories()).unwrap()
    } catch {
      showAlert('error', 'Failed to Load', 'Could not fetch categories.')
    }
  }

  const pickImage = async () => {
    const remaining = 3 - (pickedImages.length + remoteImages.length)
    if (remaining <= 0) { showAlert('error', 'Image Limit', 'Maximum 3 images allowed per product'); return }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: remaining, quality: 0.8,
    })
    if (!result.canceled) {
      const imgs = result.assets.map((a, i) => ({ uri: a.uri, name: `gallery_${Date.now()}_${i}.jpg`, type: 'image/jpeg' }))
      setPickedImages([...pickedImages, ...imgs].slice(0, 3))
    }
  }

  const takePhoto = async () => {
    const remaining = 3 - (pickedImages.length + remoteImages.length)
    if (remaining <= 0) { showAlert('error', 'Image Limit', 'Maximum 3 images allowed per product'); return }
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') { showAlert('error', 'Permission Required', 'Camera access is required to take photos'); return }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true })
    if (!result.canceled) {
      const img = { uri: result.assets[0].uri, name: `camera_${Date.now()}.jpg`, type: 'image/jpeg' }
      setPickedImages([...pickedImages, img].slice(0, 3))
    }
  }

  const uploadImagesToCloudinary = async (images: PickedImage[]) => {
    const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'debzvfysb'
    const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'romeros'
    const uploaded: CloudinaryImage[] = []

    for (const img of images) {
      const formData = new FormData()
      try {
        if (Platform.OS === 'web') {
          const response = await fetch(img.uri)
          const blob = await response.blob()
          formData.append('file', blob, img.name)
        } else {
          formData.append('file', { uri: img.uri, type: img.type, name: img.name } as any)
        }
        formData.append('upload_preset', uploadPreset)
        formData.append('folder', 'romeros/products')
        const res = await axios.post(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 30000 }
        )
        uploaded.push({ public_id: res.data.public_id, url: res.data.secure_url })
      } catch (uploadError: any) {
        throw new Error(`Image upload failed: ${uploadError.response?.data?.error?.message || uploadError.message || 'Unknown error'}`)
      }
    }
    return uploaded
  }

  const submitProduct = async () => {
    if (!form.name.trim())     { showAlert('error', 'Validation Error', 'Product name is required'); return }
    if (!form.price.trim())    { showAlert('error', 'Validation Error', 'Product price is required'); return }
    if (!form.category.trim()) { showAlert('error', 'Validation Error', 'Please select a category'); return }
    if (!form.stock.trim())    { showAlert('error', 'Validation Error', 'Product stock is required'); return }

    try {
      let images = [...remoteImages]
      if (pickedImages.length) {
        try {
          const uploaded = await uploadImagesToCloudinary(pickedImages)
          images = [...images, ...uploaded]
        } catch (uploadErr: any) {
          showAlert('error', 'Image Upload Failed', uploadErr.message || 'Failed to upload images to Cloudinary')
          return
        }
      }
      if (!images.length) { showAlert('error', 'Validation Error', 'Please add at least one product image'); return }

      const payload = { ...form, price: Number(form.price), stock: Number(form.stock), images }
      await dispatch(upsertAdminProduct({ editingId, payload })).unwrap()
      showAlert('success', 'Success', editingId ? 'Product updated successfully!' : 'Product created successfully!')
      resetForm()
      fetchProducts({ silent: true })
    } catch (err: any) {
      showAlert('error', 'Operation Failed', err || 'Failed to save product')
    }
  }

  const resetForm = () => {
    setEditingId(null); setPickedImages([]); setRemoteImages([])
    setForm({ name: '', price: '', description: '', category: '', stock: '' })
    setModalVisible(false)
  }

  const handleEdit = (product: Product) => {
    setEditingId(product._id)
    setForm({ name: product.name, price: String(product.price), description: product.description || '', category: product.category || '', stock: String(product.stock) })
    setRemoteImages(product.images || [])
    setPickedImages([])
    setModalVisible(true)
  }

  const handleDelete = (id: string) => {
    setDeleteTargetId(id)
    setDeleteConfirmVisible(true)
  }

  const confirmDelete = async () => {
    if (!deleteTargetId) return
    try {
      await dispatch(deleteAdminProduct(deleteTargetId)).unwrap()
      setDeleteConfirmVisible(false)
      setDeleteTargetId(null)
      showAlert('success', 'Deleted', 'Product has been deleted successfully')
    } catch (error: any) {
      showAlert('error', 'Delete Failed', error || 'Failed to delete product')
    }
  }

  const sortedProducts = [...products].sort((a: any, b: any) => {
    const av = String(a?.name || '').toLowerCase()
    const bv = String(b?.name || '').toLowerCase()
    const cmp = av.localeCompare(bv)
    return sortDir === 'asc' ? cmp : -cmp
  })

  if (loading && products.length === 0) {
    return (
      <View style={s.root}>
        <AdminHeader title="Products" icon="package-variant-closed" />
        <View style={s.loader}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={s.loaderText}>Loading products...</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={s.root}>
      <AdminHeader title="Products" icon="package-variant" />

      <AdminToast
        visible={alertVisible}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />

      <ConfirmDialog
        visible={deleteConfirmVisible}
        title="Delete Product"
        message="Are you sure you want to permanently delete this product?"
        destructiveText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmVisible(false)}
        isLoading={deleting}
      />

      {/* ── Page Header ── */}
      <View style={s.pageHeader}>
        <View>
          <Text style={s.pageTitle}>Product Management</Text>
          <Text style={s.pageSubtitle}>Add, update and manage products</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            style={s.refreshBtn}
            onPress={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            activeOpacity={0.85}
          >
            <Feather name={sortDir === 'asc' ? 'arrow-up' : 'arrow-down'} size={15} color={C.accent} />
          </TouchableOpacity>
          <TouchableOpacity style={s.refreshBtn} onPress={() => fetchProducts()}>
            <Feather name="refresh-cw" size={15} color={C.accent} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={sortedProducts}
        keyExtractor={(item) => item._id}
        renderItem={({ item: product }) => (
          <View key={product._id} style={s.card}>
            <View style={s.cardIcon}>
              {product.images?.[0]?.url ? (
                <Image source={{ uri: product.images[0].url }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <MaterialCommunityIcons name="image-off" size={18} color={C.textDim} />
              )}
            </View>

            <View style={s.cardInfo}>
              <Text style={s.cardName}>{product.name}</Text>
              <Text style={s.cardDesc} numberOfLines={1}>{product.description || 'No description'}</Text>
              <View style={s.badgeRow}>
                <View style={s.badge}>
                  <Text style={[s.badgeText, { color: C.mint }]}>₱{product.price.toFixed(2)}</Text>
                </View>
                <View style={s.badge}>
                  <Text style={[s.badgeText, { color: C.accentText }]}>Stock: {product.stock}</Text>
                </View>
                <View style={s.badge}>
                  <Text style={[s.badgeText, { color: C.textSub }]}>{product.category}</Text>
                </View>
              </View>
            </View>

            <View style={s.cardActions}>
              <TouchableOpacity style={s.actionIcon} onPress={() => handleEdit(product)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="edit-2" size={14} color={C.accent} />
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionIcon, s.actionIconDanger]} onPress={() => handleDelete(product._id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="trash-2" size={14} color={C.danger} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <View style={s.emptyIconWrap}>
              <MaterialCommunityIcons name="package-variant" size={40} color={C.textDim} />
            </View>
            <Text style={s.emptyTitle}>No products yet</Text>
            <Text style={s.emptySubtitle}>Create your first product to get started</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 6 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Product Form Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={resetForm}>
        <View style={s.modalOverlay}>
          <Pressable style={s.modalBackdrop} onPress={resetForm} />
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />

            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>{editingId ? 'Edit Product' : 'New Product'}</Text>
                <Text style={s.modalSubtitle}>{editingId ? 'Update product details' : 'Create a new product'}</Text>
              </View>
              <TouchableOpacity onPress={resetForm} style={s.modalCloseBtn}>
                <Feather name="x" size={18} color={C.textSub} />
              </TouchableOpacity>
            </View>

            <View style={s.modalDivider} />

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <Text style={s.sectionLabel}>Product Name *</Text>
              <TextInput
                placeholder="Enter product name"
                placeholderTextColor={C.textDim}
                style={s.input}
                value={form.name}
                onChangeText={(t) => setForm({ ...form, name: t })}
              />

              <View style={s.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.sectionLabel}>Price *</Text>
                  <TextInput
                    placeholder="0.00"
                    placeholderTextColor={C.textDim}
                    keyboardType="decimal-pad"
                    style={s.input}
                    value={form.price}
                    onChangeText={(t) => setForm({ ...form, price: t })}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.sectionLabel}>Stock *</Text>
                  <TextInput
                    placeholder="0"
                    placeholderTextColor={C.textDim}
                    keyboardType="numeric"
                    style={s.input}
                    value={form.stock}
                    onChangeText={(t) => setForm({ ...form, stock: t })}
                  />
                </View>
              </View>

              <Text style={s.sectionLabel}>Category *</Text>
              {categories.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categoryContainer}>
                  {categories.map((c, idx) => {
                    const value = c._id || c.category || ''
                    const label = c.name || c.category || 'Unknown'
                    const active = form.category === value
                    const key = value || `${label}-${idx}`
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[s.categoryChip, active && s.categoryChipActive]}
                        onPress={() => setForm({ ...form, category: value })}
                        activeOpacity={0.8}
                      >
                        <Text style={[s.categoryChipText, active && s.categoryChipTextActive]}>{label}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>
              ) : (
                <Text style={s.helperText}>No categories available</Text>
              )}

              <Text style={s.sectionLabel}>Description</Text>
              <TextInput
                placeholder="Enter product description"
                placeholderTextColor={C.textDim}
                style={[s.input, s.multilineInput]}
                multiline
                numberOfLines={4}
                value={form.description}
                onChangeText={(t) => setForm({ ...form, description: t })}
                textAlignVertical="top"
              />

              <Text style={s.sectionLabel}>Images *</Text>
              <View style={s.imageButtonGroup}>
                <TouchableOpacity style={[s.imageBtn, s.imageBtnGallery]} onPress={pickImage} activeOpacity={0.7}>
                  <Feather name="image" size={18} color={C.accent} style={{ marginRight: 8 }} />
                  <Text style={s.imageBtnText}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.imageBtn, s.imageBtnCamera]} onPress={takePhoto} activeOpacity={0.7}>
                  <Feather name="camera" size={18} color={C.mint} style={{ marginRight: 8 }} />
                  <Text style={s.imageBtnText}>Camera</Text>
                </TouchableOpacity>
              </View>

              {(remoteImages.length > 0 || pickedImages.length > 0) && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={s.sectionLabel}>Selected Images ({remoteImages.length + pickedImages.length}/3)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.imagePreviewContainer}>
                    {remoteImages.map((img, idx) => (
                      <View key={img.public_id} style={s.previewWrapper}>
                        <Image source={{ uri: img.url }} style={s.previewImage} />
                        <TouchableOpacity style={s.removeImageBtn} onPress={() => setRemoteImages(remoteImages.filter((_, i) => i !== idx))}>
                          <Feather name="x" size={14} color={C.text} />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {pickedImages.map((img, idx) => (
                      <View key={img.uri} style={s.previewWrapper}>
                        <Image source={{ uri: img.uri }} style={s.previewImage} />
                        <TouchableOpacity style={s.removeImageBtn} onPress={() => setPickedImages(pickedImages.filter((_, i) => i !== idx))}>
                          <Feather name="x" size={14} color={C.text} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </ScrollView>

            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={resetForm} disabled={submitting}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn, submitting && s.saveBtnDisabled]} onPress={submitProduct} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator size="small" color={C.text} />
                ) : (
                  <>
                    <Feather name="check" size={15} color={C.text} style={{ marginRight: 8 }} />
                    <Text style={s.saveBtnText}>{editingId ? 'Update' : 'Create'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

// ==================== STYLES ====================
const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: C.bg },
  container:  { flex: 1, backgroundColor: C.bg, paddingHorizontal: 18 },
  loader:     { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { color: C.textSub, marginTop: 12, fontSize: 14 },

  pageHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 20, paddingBottom: 14 },
  pageTitle:    { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: 0.3, marginBottom: 2 },
  pageSubtitle: { fontSize: 12, color: C.textSub },
  refreshBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  createBtn:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, backgroundColor: C.accent, borderRadius: 12, shadowColor: C.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  createBtnText:{ color: C.text, fontSize: 13, fontWeight: '700' },

  emptyState:   { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80, gap: 10 },
  emptyIconWrap:{ width: 72, height: 72, borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: C.textSub },
  emptySubtitle:{ fontSize: 13, color: C.textDim },

  card:            { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, marginBottom: 10, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
  cardIcon:        { width: 56, height: 56, borderRadius: 12, backgroundColor: C.accentGlow, alignItems: 'center', justifyContent: 'center', marginRight: 12, overflow: 'hidden' },
  cardInfo:        { flex: 1 },
  cardName:        { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 3 },
  cardDesc:        { fontSize: 12, color: C.textSub, marginBottom: 6 },
  badgeRow:        { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badge:           { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: C.accentGlow },
  badgeText:       { fontSize: 10, fontWeight: '700' },
  cardActions:     { flexDirection: 'row', gap: 8, alignItems: 'center' },
  actionIcon:      { width: 36, height: 36, borderRadius: 10, backgroundColor: C.accentGlow, alignItems: 'center', justifyContent: 'center' },
  actionIconDanger:{ backgroundColor: C.dangerBg },

  modalOverlay:  { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
  modalSheet:    { backgroundColor: C.bgLayer, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12, maxHeight: '88%', borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.border },
  modalHandle:   { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 18 },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  modalTitle:    { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 2 },
  modalSubtitle: { fontSize: 12, color: C.textSub },
  modalCloseBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  modalDivider:  { height: 1, backgroundColor: C.border, marginBottom: 20 },

  sectionLabel:   { fontSize: 11, fontWeight: '700', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  input:          { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, color: C.text, fontSize: 14, marginBottom: 20 },
  multilineInput: { minHeight: 100, textAlignVertical: 'top', paddingTop: 13 },
  formRow:        { flexDirection: 'row', gap: 12, marginBottom: 20 },

  categoryContainer:       { gap: 8, paddingBottom: 8 },
  categoryChip:            { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface },
  categoryChipActive:      { backgroundColor: C.accent, borderColor: C.accent },
  categoryChipText:        { color: C.textSub, fontWeight: '700', fontSize: 12 },
  categoryChipTextActive:  { color: C.text },
  helperText:              { color: C.textSub, fontSize: 13, marginTop: 8 },

  imageButtonGroup: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  imageBtn:         { flex: 1, flexDirection: 'row', paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  imageBtnGallery:  { borderColor: C.borderBright, backgroundColor: C.accentGlow },
  imageBtnCamera:   { borderColor: C.successBorder, backgroundColor: C.successBg },
  imageBtnText:     { color: C.textSub, fontWeight: '700', fontSize: 13 },

  imagePreviewContainer: { gap: 12, paddingBottom: 8 },
  previewWrapper:        { position: 'relative' },
  previewImage:          { width: 100, height: 100, borderRadius: 12, backgroundColor: C.surface },
  removeImageBtn:        { position: 'absolute', top: -8, right: -8, width: 28, height: 28, borderRadius: 14, backgroundColor: C.danger, justifyContent: 'center', alignItems: 'center', shadowColor: C.danger, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },

  modalActions:   { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn:      { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 13, paddingVertical: 15, alignItems: 'center', backgroundColor: 'rgba(249,249,249,0.04)' },
  cancelBtnText:  { fontSize: 14, fontWeight: '700', color: C.textSub },
  saveBtn:        { flex: 1, backgroundColor: C.accent, borderRadius: 13, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: C.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  saveBtnDisabled:{ opacity: 0.6 },
  saveBtnText:    { fontSize: 14, fontWeight: '700', color: C.text },
})