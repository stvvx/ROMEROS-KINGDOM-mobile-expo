import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native'
import axios from 'axios'
import Constants from 'expo-constants'
import * as ImagePicker from 'expo-image-picker'
import { usePathname, useRouter } from 'expo-router'
import { getItem } from '@/utils/storage'

// ==================== API URL CONFIGURATION ====================
let API_URL =
  process.env.NGROK_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:4000/api/v1'

const manifest: any =
  (Constants as any).manifest || (Constants as any).expoConfig
const debuggerHost = manifest?.debuggerHost
  ? manifest.debuggerHost.split(':')[0]
  : null

if (debuggerHost && debuggerHost !== 'localhost') {
  API_URL = API_URL.replace('localhost', debuggerHost)
} else if (Platform.OS === 'android' && API_URL.includes('localhost')) {
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

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/(admin)/dashboard' },
  { label: 'Products', path: '/(admin)/products' },
  { label: 'Categories', path: '/(admin)/categories' },
  { label: 'Users', path: '/(admin)/users' },
  { label: 'Reviews', path: '/(admin)/review' },
]

const AdminHeader: React.FC = () => {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <View style={headerStyles.wrapper}>
      <Text style={headerStyles.brand}>⚙️ Admin</Text>

      <FlatList
        data={NAV_ITEMS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.path}
        contentContainerStyle={headerStyles.navRow}
        renderItem={({ item }) => {
          const isActive = pathname === item.path

          return (
            <TouchableOpacity
              style={[
                headerStyles.navBtn,
                isActive && headerStyles.activeBtn,
              ]}
              onPress={() => router.push(item.path)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  headerStyles.navLabel,
                  isActive && headerStyles.activeLabel,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}

const headerStyles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  brand: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginRight: 10,
  },
  navRow: {
    alignItems: 'center',
    gap: 8,
  },
  navBtn: {
    backgroundColor: '#2280b0',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
  },
  activeBtn: {
    backgroundColor: '#4caf50',
  },
  navLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  activeLabel: {
    fontWeight: '800',
  },
})

// ==================== MAIN COMPONENT ====================
export default function AdminProducts() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
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

  // ==================== AUTH ====================
  const getAuthHeader = async () => {
    const token = await getItem('authToken')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // ==================== INITIAL LOAD ====================
  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchProducts(), fetchCategories()])
    }
    load()
  }, [])

  // ==================== API ====================
  const fetchProducts = async (opts?: { silent?: boolean }) => {
    try {
      if (opts?.silent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const headers = await getAuthHeader()
      const res = await axios.get(`${API_URL}/admin/products`, { headers })
      setProducts(res.data.products || [])
    } catch (err) {
      console.error('Error loading products', err)
      Alert.alert('Error', 'Failed to load products')
    } finally {
      if (opts?.silent) {
        setRefreshing(false)
      } else {
        setLoading(false)
      }
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/products/categories`)
      setCategories(res.data.categories || [])
    } catch (err) {
      console.error('Error loading categories', err)
    }
  }

  // ==================== HELPERS ====================
  const resetForm = () => {
    setForm({
      name: '',
      price: '',
      description: '',
      category: '',
      stock: '',
    })
    setEditingId(null)
    setPickedImages([])
    setRemoteImages([])
  }

  const formatCurrency = (value: number) => {
    if (!Number.isFinite(value)) return '$0.00'
    return `$${value.toFixed(2)}`
  }

  // ==================== CLOUDINARY ====================
  const uploadImagesToCloudinary = async (
    images: PickedImage[]
  ): Promise<CloudinaryImage[]> => {
    const cloudName =
      process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'debzvfysb'
    const uploadPreset =
      process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'romeros'

    const uploaded: CloudinaryImage[] = []

    for (const img of images) {
      const formData = new FormData()
      formData.append('file', {
        uri: img.uri,
        name: img.name,
        type: img.type,
      } as any)
      formData.append('upload_preset', uploadPreset)
      formData.append('folder', 'romeros/products')

      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )

      uploaded.push({
        public_id: res.data.public_id,
        url: res.data.secure_url,
      })
    }

    return uploaded
  }

  // ==================== IMAGE PICKER ====================
  const pickImage = async () => {
    const remaining = Math.max(0, 3 - (remoteImages.length + pickedImages.length))
    if (!remaining) {
      Alert.alert('Limit', 'You can upload up to 3 images per product')
      return
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') return

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    })

    if (!result.canceled) {
      const imgs = result.assets.map((a, i) => ({
        uri: a.uri,
        name: `img_${Date.now()}_${i}.jpg`,
        type: 'image/jpeg',
      }))
      setPickedImages([...pickedImages, ...imgs].slice(0, 3))
    }
  }

  const removeRemoteImage = (idx: number) => {
    setRemoteImages(remoteImages.filter((_, i) => i !== idx))
  }

  const removePickedImage = (idx: number) => {
    setPickedImages(pickedImages.filter((_, i) => i !== idx))
  }

  // ==================== SUBMIT ====================
  const submitProduct = async () => {
    if (!form.name.trim() || !form.price.trim() || !form.category.trim()) {
      Alert.alert('Validation', 'Name, price, and category are required')
      return
    }

    if (!form.stock.trim()) {
      Alert.alert('Validation', 'Stock is required')
      return
    }

    try {
      setSubmitting(true)

      let finalImages = [...remoteImages]
      if (pickedImages.length) {
        const uploaded = await uploadImagesToCloudinary(pickedImages)
        finalImages = [...remoteImages, ...uploaded].slice(0, 3)
      }

      if (!finalImages.length) {
        Alert.alert('Validation', 'At least one image is required')
        return
      }

      const payload = {
        name: form.name.trim(),
        price: Number(form.price),
        description: form.description.trim(),
        category: form.category.trim(),
        stock: Number(form.stock),
        images: finalImages,
      }

      const headers = await getAuthHeader()
      const url = editingId
        ? `${API_URL}/admin/product/${editingId}`
        : `${API_URL}/admin/product/new`

      await axios({
        method: editingId ? 'put' : 'post',
        url,
        data: payload,
        headers: { 'Content-Type': 'application/json', ...headers },
      })

      Alert.alert('Success', editingId ? 'Product updated' : 'Product created')
      await fetchProducts({ silent: true })
      resetForm()
    } catch (err: any) {
      console.error('Save product error', err)
      Alert.alert(
        'Error',
        err?.response?.data?.message || err.message || 'Failed to save product'
      )
    } finally {
      setSubmitting(false)
    }
  }

  // ==================== EDIT/DELETE ====================
  const onEdit = (p: Product) => {
    setEditingId(p._id)
    setForm({
      name: p.name,
      price: String(p.price),
      description: p.description,
      category: p.category,
      stock: String(p.stock),
    })
    setRemoteImages(p.images || [])
    setPickedImages([])
  }

  const handleDelete = async (id: string) => {
    try {
      setDeleteId(id)
      const headers = await getAuthHeader()
      await axios.delete(`${API_URL}/admin/product/${id}`, { headers })
      await fetchProducts({ silent: true })
      if (editingId === id) resetForm()
      Alert.alert('Deleted', 'Product removed')
    } catch (err: any) {
      console.error('Delete product error', err)
      Alert.alert(
        'Error',
        err?.response?.data?.message || 'Failed to delete product'
      )
    } finally {
      setDeleteId(null)
    }
  }

  // ==================== RENDER ====================
  const renderProductCard = ({ item }: { item: Product }) => {
    const firstImage = item.images?.[0]?.url
    return (
      <View style={styles.productCard}>
        <View style={styles.productRow}>
          {firstImage ? (
            <Image source={{ uri: firstImage }} style={styles.productImg} />
          ) : (
            <View style={[styles.productImg, styles.placeholderImg]}>
              <Text style={styles.placeholderText}>No Image</Text>
            </View>
          )}
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productMeta}>
              {formatCurrency(item.price)} • Stock {item.stock}
            </Text>
            <Text style={styles.productMeta}>Category: {item.category}</Text>
            <Text numberOfLines={2} style={styles.productDesc}>
              {item.description}
            </Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => onEdit(item)}
            disabled={deleteId === item._id}
          >
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            disabled={deleteId === item._id}
            onPress={() =>
              Alert.alert(
                'Delete product',
                'Are you sure you want to delete this product?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => handleDelete(item._id),
                  },
                ]
              )
            }
          >
            {deleteId === item._id ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.actionText}>Delete</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  if (loading) {
    return (
      <>
        <AdminHeader />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#2280b0" />
        </View>
      </>
    )
  }

  return (
    <>
      <AdminHeader />
      <FlatList
        data={products}
        keyExtractor={(item) => item._id}
        renderItem={renderProductCard}
        refreshing={refreshing}
        onRefresh={() => fetchProducts({ silent: true })}
        ListHeaderComponent={(
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.title}>
                {editingId ? 'Edit Product' : 'Add Product'}
              </Text>
              {editingId && (
                <TouchableOpacity onPress={resetForm}>
                  <Text style={styles.resetText}>Reset</Text>
                </TouchableOpacity>
              )}
            </View>

            <TextInput
              placeholder="Product name"
              value={form.name}
              onChangeText={(t) => setForm({ ...form, name: t })}
              style={styles.input}
            />
            <View style={styles.row}>
              <TextInput
                placeholder="Price"
                keyboardType="decimal-pad"
                value={form.price}
                onChangeText={(t) => setForm({ ...form, price: t })}
                style={[styles.input, styles.half]}
              />
              <TextInput
                placeholder="Stock"
                keyboardType="numeric"
                value={form.stock}
                onChangeText={(t) => setForm({ ...form, stock: t })}
                style={[styles.input, styles.half]}
              />
            </View>

            <TextInput
              placeholder="Description"
              multiline
              value={form.description}
              onChangeText={(t) => setForm({ ...form, description: t })}
              style={[styles.input, styles.multiline]}
              textAlignVertical="top"
            />

            <Text style={styles.label}>Category</Text>
            <View style={styles.chipRow}>
              {categories.map((cat) => {
                const isActive = form.category === cat.category
                return (
                  <TouchableOpacity
                    key={cat.category}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => setForm({ ...form, category: cat.category })}
                  >
                    <Text style={isActive ? styles.chipTextActive : styles.chipText}>
                      {cat.category} ({cat.count})
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <View style={styles.imageRow}>
              {remoteImages.map((img, idx) => (
                <View key={`remote-${img.public_id}-${idx}`} style={styles.imagePill}>
                  <Image source={{ uri: img.url }} style={styles.thumb} />
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeRemoteImage(idx)}
                  >
                    <Text style={styles.removeText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {pickedImages.map((img, idx) => (
                <View key={`picked-${img.uri}-${idx}`} style={styles.imagePill}>
                  <Image source={{ uri: img.uri }} style={styles.thumb} />
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removePickedImage(idx)}
                  >
                    <Text style={styles.removeText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.btn} onPress={pickImage}>
              <Text style={styles.btnText}>Pick Images</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.disabledBtn]}
              onPress={submitProduct}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.btnText}>
                  {editingId ? 'Update Product' : 'Create Product'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No products yet. Add your first one.</Text>
        }
        contentContainerStyle={styles.listContent}
      />
    </>
  )
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 32 },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: { fontSize: 20, fontWeight: '700' },
  resetText: { color: '#f44336', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  multiline: { minHeight: 80 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  label: { fontWeight: '600', marginBottom: 6, marginTop: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    borderWidth: 1,
    borderColor: '#b0bec5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f5f7fa',
  },
  chipActive: {
    backgroundColor: '#2280b0',
    borderColor: '#2280b0',
  },
  chipText: { color: '#1a1a1a', fontWeight: '600' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  imageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  imagePill: {
    position: 'relative',
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f2f2f2',
  },
  thumb: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: '#fff', fontWeight: '800', lineHeight: 18 },
  btn: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  submitBtn: {
    backgroundColor: '#1976d2',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledBtn: { opacity: 0.7 },
  btnText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  productRow: { flexDirection: 'row', gap: 12 },
  productImg: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#eee' },
  placeholderImg: { justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#666', fontWeight: '600' },
  productInfo: { flex: 1 },
  productName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  productMeta: { color: '#455a64', marginBottom: 2 },
  productDesc: { color: '#616161', marginTop: 2 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#0288d1',
    borderRadius: 8,
  },
  deleteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#e53935',
    borderRadius: 8,
  },
  actionText: { color: '#fff', fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#666', marginTop: 12 },
})