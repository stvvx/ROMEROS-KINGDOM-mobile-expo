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
  category: string
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
  visible,
  title,
  message,
  destructiveText = 'Delete',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={cd.overlay} onPress={onCancel}>
        <Pressable style={cd.card} onPress={() => {}}>
          <View style={cd.iconWrap}>
            <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#ff6b6b" />
          </View>
          <Text style={cd.title}>{title}</Text>
          <Text style={cd.message}>{message}</Text>
          <View style={cd.divider} />
          <View style={cd.buttonRow}>
            <TouchableOpacity
              style={cd.cancelBtn}
              onPress={onCancel}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={cd.cancelBtnText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[cd.confirmBtn, isLoading && cd.confirmBtnDisabled]}
              onPress={onConfirm}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="trash-2" size={15} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={cd.confirmBtnText}>{destructiveText}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const cd = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    backgroundColor: '#16213e',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 20,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(255,107,107,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 13, color: 'rgba(160,174,192,0.75)', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  divider: { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 20 },
  buttonRow: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: 'rgba(160,174,192,0.7)' },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#ff6b6b',
    borderRadius: 13,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff6b6b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
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
    name: '',
    price: '',
    description: '',
    category: '',
    stock: '',
  })

  // Themed alert state
  const [alertVisible, setAlertVisible] = useState(false)
  const [alertType, setAlertType] = useState<'success' | 'error'>('success')
  const [alertTitle, setAlertTitle] = useState('')
  const [alertMessage, setAlertMessage] = useState('')

  // Delete confirmation state
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const showAlert = (type: 'success' | 'error', title: string, message: string) => {
    setAlertType(type)
    setAlertTitle(title)
    setAlertMessage(message)
    setAlertVisible(true)
  }

  // ==================== LOAD ====================
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

  // ==================== IMAGE PICK ====================
  const pickImage = async () => {
    const remaining = 3 - (pickedImages.length + remoteImages.length)
    if (remaining <= 0) {
      showAlert('error', 'Image Limit', 'Maximum 3 images allowed per product')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    })

    if (!result.canceled) {
      const imgs = result.assets.map((a, i) => ({
        uri: a.uri,
        name: `gallery_${Date.now()}_${i}.jpg`,
        type: 'image/jpeg',
      }))
      setPickedImages([...pickedImages, ...imgs].slice(0, 3))
    }
  }

  // ==================== CAMERA ====================
  const takePhoto = async () => {
    const remaining = 3 - (pickedImages.length + remoteImages.length)
    if (remaining <= 0) {
      showAlert('error', 'Image Limit', 'Maximum 3 images allowed per product')
      return
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      showAlert('error', 'Permission Required', 'Camera access is required to take photos')
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
    })

    if (!result.canceled) {
      const img = {
        uri: result.assets[0].uri,
        name: `camera_${Date.now()}.jpg`,
        type: 'image/jpeg',
      }
      setPickedImages([...pickedImages, img].slice(0, 3))
    }
  }

  // ==================== CLOUDINARY ====================
  const uploadImagesToCloudinary = async (images: PickedImage[]) => {
    const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'debzvfysb'
    const uploadPreset =
      process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'romeros'

    const uploaded: CloudinaryImage[] = []

    for (const img of images) {
      const formData = new FormData()

      try {
        if (Platform.OS === 'web') {
          const response = await fetch(img.uri)
          const blob = await response.blob()
          formData.append('file', blob, img.name)
        } else {
          formData.append('file', {
            uri: img.uri,
            type: img.type,
            name: img.name,
          } as any)
        }

        formData.append('upload_preset', uploadPreset)
        formData.append('folder', 'romeros/products')

        const res = await axios.post(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 30000,
          }
        )

        uploaded.push({
          public_id: res.data.public_id,
          url: res.data.secure_url,
        })
      } catch (uploadError: any) {
        console.error('Cloudinary upload error:', uploadError.response?.data || uploadError.message)
        throw new Error(
          `Image upload failed: ${
            uploadError.response?.data?.error?.message ||
            uploadError.message ||
            'Unknown error'
          }`
        )
      }
    }
    return uploaded
  }

  // ==================== SUBMIT ====================
  const submitProduct = async () => {
    if (!form.name.trim()) {
      showAlert('error', 'Validation Error', 'Product name is required')
      return
    }
    if (!form.price.trim()) {
      showAlert('error', 'Validation Error', 'Product price is required')
      return
    }
    if (!form.category.trim()) {
      showAlert('error', 'Validation Error', 'Please select a category')
      return
    }
    if (!form.stock.trim()) {
      showAlert('error', 'Validation Error', 'Product stock is required')
      return
    }

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

      if (!images.length) {
        showAlert('error', 'Validation Error', 'Please add at least one product image')
        return
      }

      const payload = {
        ...form,
        price: Number(form.price),
        stock: Number(form.stock),
        images,
      }

      await dispatch(upsertAdminProduct({ editingId, payload })).unwrap()

      showAlert('success', 'Success', editingId ? 'Product updated successfully!' : 'Product created successfully!')
      resetForm()
      fetchProducts({ silent: true })
    } catch (err: any) {
      const msg = err || 'Failed to save product'
      showAlert('error', 'Operation Failed', msg)
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setPickedImages([])
    setRemoteImages([])
    setForm({ name: '', price: '', description: '', category: '', stock: '' })
    setModalVisible(false)
  }

  const handleEdit = (product: Product) => {
    setEditingId(product._id)
    setForm({
      name: product.name,
      price: String(product.price),
      description: product.description || '',
      category: product.category || '',
      stock: String(product.stock),
    })
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

  // ==================== RENDER ====================
  if (loading && products.length === 0) {
    return (
      <View style={s.root}>
        <AdminHeader title="Products" icon="package-variant-closed" />
        <View style={s.loader}>
          <ActivityIndicator size="large" color="#2280b0" />
          <Text style={s.loaderText}>Loading products...</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={s.root}>
      <AdminHeader title="Products" icon="package-variant-closed" />

      {/* Themed Alert */}
      <AdminToast
        visible={alertVisible}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />

      {/* Delete Confirmation Dialog */}
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

      {/* Page Header */}
      <View style={s.pageHeader}>
        <View>
          <Text style={s.pageTitle}>Products</Text>
          <Text style={s.pageSubtitle}>Manage product inventory</Text>
        </View>
        <TouchableOpacity
          style={s.createBtn}
          onPress={() => {
            resetForm()
            setModalVisible(true)
          }}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={14} color="#fff" style={{ marginRight: 6 }} />
          <Text style={s.createBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
        {/* Products List */}
        {products.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIconWrap}>
              <MaterialCommunityIcons name="package-variant" size={40} color="rgba(160,174,192,0.4)" />
            </View>
            <Text style={s.emptyTitle}>No products yet</Text>
            <Text style={s.emptySubtitle}>Create your first product to get started</Text>
          </View>
        ) : (
          products.map((product) => (
            <View key={product._id} style={s.card}>
              <View style={s.cardIcon}>
                {product.images?.[0]?.url ? (
                  <Image
                    source={{ uri: product.images[0].url }}
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : (
                  <MaterialCommunityIcons name="image-off" size={18} color="rgba(255,255,255,0.3)" />
                )}
              </View>

              <View style={s.cardInfo}>
                <Text style={s.cardName}>{product.name}</Text>
                <Text style={s.cardDesc} numberOfLines={1}>{product.description || 'No description'}</Text>
                <View style={s.badgeRow}>
                  <View style={s.badge}>
                    <Text style={[s.badgeText, { color: '#4caf50' }]}>${product.price.toFixed(2)}</Text>
                  </View>
                  <View style={s.badge}>
                    <Text style={[s.badgeText, { color: '#2280b0' }]}>Stock: {product.stock}</Text>
                  </View>
                  <View style={s.badge}>
                    <Text style={[s.badgeText, { color: 'rgba(160,174,192,0.7)' }]}>{product.category}</Text>
                  </View>
                </View>
              </View>

              <View style={s.cardActions}>
                <TouchableOpacity
                  style={s.actionIcon}
                  onPress={() => handleEdit(product)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="edit-2" size={14} color="#2280b0" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.actionIcon}
                  onPress={() => handleDelete(product._id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="trash-2" size={14} color="#ff6b6b" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Product Form Modal - Bottom Sheet */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={resetForm}
      >
        <View style={s.modalOverlay}>
          <Pressable style={s.modalBackdrop} onPress={resetForm} />
          <View style={s.modalSheet}>
            {/* Handle */}
            <View style={s.modalHandle} />

            {/* Modal Header */}
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>
                  {editingId ? 'Edit Product' : 'New Product'}
                </Text>
                <Text style={s.modalSubtitle}>
                  {editingId ? 'Update product details' : 'Create a new product'}
                </Text>
              </View>
              <TouchableOpacity onPress={resetForm} style={s.modalCloseBtn}>
                <Feather name="x" size={18} color="rgba(160,174,192,0.7)" />
              </TouchableOpacity>
            </View>

            <View style={s.modalDivider} />

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <Text style={s.sectionLabel}>Product Name *</Text>
              <TextInput
                placeholder="Enter product name"
                placeholderTextColor="rgba(160,174,192,0.35)"
                style={s.input}
                value={form.name}
                onChangeText={(t) => setForm({ ...form, name: t })}
              />

              <View style={s.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.sectionLabel}>Price *</Text>
                  <TextInput
                    placeholder="0.00"
                    placeholderTextColor="rgba(160,174,192,0.35)"
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
                    placeholderTextColor="rgba(160,174,192,0.35)"
                    keyboardType="numeric"
                    style={s.input}
                    value={form.stock}
                    onChangeText={(t) => setForm({ ...form, stock: t })}
                  />
                </View>
              </View>

              <Text style={s.sectionLabel}>Category *</Text>
              {categories.length ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.categoryContainer}
                >
                  {categories.map((c) => {
                    const active = form.category === c.category
                    return (
                      <TouchableOpacity
                        key={c.category}
                        style={[s.categoryChip, active && s.categoryChipActive]}
                        onPress={() => setForm({ ...form, category: c.category })}
                        activeOpacity={0.8}
                      >
                        <Text style={[s.categoryChipText, active && s.categoryChipTextActive]}>
                          {c.category}
                        </Text>
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
                placeholderTextColor="rgba(160,174,192,0.35)"
                style={[s.input, s.multilineInput]}
                multiline
                numberOfLines={4}
                value={form.description}
                onChangeText={(t) => setForm({ ...form, description: t })}
                textAlignVertical="top"
              />

              <Text style={s.sectionLabel}>Images *</Text>
              <View style={s.imageButtonGroup}>
                <TouchableOpacity
                  style={[s.imageBtn, s.imageBtnGallery]}
                  onPress={pickImage}
                  activeOpacity={0.7}
                >
                  <Feather name="image" size={18} color="#2280b0" style={{ marginRight: 8 }} />
                  <Text style={s.imageBtnText}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.imageBtn, s.imageBtnCamera]}
                  onPress={takePhoto}
                  activeOpacity={0.7}
                >
                  <Feather name="camera" size={18} color="#4caf50" style={{ marginRight: 8 }} />
                  <Text style={s.imageBtnText}>Camera</Text>
                </TouchableOpacity>
              </View>

              {(remoteImages.length > 0 || pickedImages.length > 0) && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={s.sectionLabel}>
                    Selected Images ({remoteImages.length + pickedImages.length}/3)
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.imagePreviewContainer}
                  >
                    {remoteImages.map((img, idx) => (
                      <View key={img.public_id} style={s.previewWrapper}>
                        <Image source={{ uri: img.url }} style={s.previewImage} />
                        <TouchableOpacity
                          style={s.removeImageBtn}
                          onPress={() =>
                            setRemoteImages(remoteImages.filter((_, i) => i !== idx))
                          }
                        >
                          <Feather name="x" size={14} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {pickedImages.map((img, idx) => (
                      <View key={img.uri} style={s.previewWrapper}>
                        <Image source={{ uri: img.uri }} style={s.previewImage} />
                        <TouchableOpacity
                          style={s.removeImageBtn}
                          onPress={() =>
                            setPickedImages(pickedImages.filter((_, i) => i !== idx))
                          }
                        >
                          <Feather name="x" size={14} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </ScrollView>

            {/* Modal Actions */}
            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={resetForm}
                disabled={submitting}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, submitting && s.saveBtnDisabled]}
                onPress={submitProduct}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="check" size={15} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={s.saveBtnText}>
                      {editingId ? 'Update' : 'Create'}
                    </Text>
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
  root: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  container: { flex: 1, backgroundColor: '#1a1a2e', paddingHorizontal: 18 },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loaderText: { color: 'rgba(160,174,192,0.6)', marginTop: 12, fontSize: 14 },

  // Page Header
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 14,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  pageSubtitle: {
    fontSize: 12,
    color: 'rgba(160,174,192,0.6)',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#2280b0',
    borderRadius: 12,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
    gap: 10,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  emptySubtitle: { fontSize: 13, color: 'rgba(160,174,192,0.4)' },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 10,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(34,128,176,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 3 },
  cardDesc: { fontSize: 12, color: 'rgba(160,174,192,0.55)', marginBottom: 6 },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
  cardActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  modalSheet: {
    backgroundColor: '#16213e',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    maxHeight: '88%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 2 },
  modalSubtitle: { fontSize: 12, color: 'rgba(160,174,192,0.6)' },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginBottom: 20,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(160,174,192,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  // Inputs
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#fff',
    fontSize: 14,
    marginBottom: 20,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 13,
  },
  formRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },

  // Category
  categoryContainer: { gap: 8, paddingBottom: 8 },
  categoryChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  categoryChipActive: { backgroundColor: '#2280b0', borderColor: '#2280b0' },
  categoryChipText: { color: 'rgba(160,174,192,0.8)', fontWeight: '700', fontSize: 12 },
  categoryChipTextActive: { color: '#fff' },
  helperText: { color: 'rgba(160,174,192,0.6)', fontSize: 13, marginTop: 8 },

  // Image Buttons
  imageButtonGroup: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  imageBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  imageBtnGallery: {
    borderColor: 'rgba(34,128,176,0.5)',
    backgroundColor: 'rgba(34,128,176,0.1)',
  },
  imageBtnCamera: {
    borderColor: 'rgba(76,175,80,0.5)',
    backgroundColor: 'rgba(76,175,80,0.1)',
  },
  imageBtnText: { color: 'rgba(160,174,192,0.8)', fontWeight: '700', fontSize: 13 },

  // Image Preview
  imagePreviewContainer: { gap: 12, paddingBottom: 8 },
  previewWrapper: { position: 'relative' },
  previewImage: { width: 100, height: 100, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ff6b6b',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ff6b6b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },

  // Modal Actions
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 13,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: 'rgba(160,174,192,0.7)' },
  saveBtn: {
    flex: 1,
    backgroundColor: '#2280b0',
    borderRadius: 13,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2280b0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
})