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
  ScrollView,
} from 'react-native'
import axios from 'axios'
import Constants from 'expo-constants'
import * as ImagePicker from 'expo-image-picker'
import { usePathname, useRouter } from 'expo-router'
import { getItem } from '@/utils/storage'

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

// ==================== HEADER ====================
const NAV_ITEMS = [
  { label: 'Dashboard', path: '/(admin)/dashboard' },
  { label: 'Products', path: '/(admin)/products' },
  { label: 'Categories', path: '/(admin)/categories' },
  { label: 'Users', path: '/(admin)/users' },
  { label: 'Reviews', path: '/(admin)/review' },
]

const AdminHeader = () => {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <View style={headerStyles.wrapper}>
      <Text style={headerStyles.brand}>⚙️ Admin</Text>
      <FlatList
        data={NAV_ITEMS}
        horizontal
        keyExtractor={(i) => i.path}
        renderItem={({ item }) => {
          const active = pathname === item.path
          return (
            <TouchableOpacity
              style={[headerStyles.navBtn, active && headerStyles.activeBtn]}
              onPress={() => router.push(item.path)}
            >
              <Text style={headerStyles.navLabel}>{item.label}</Text>
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}

// ==================== MAIN ====================
export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

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

  // ==================== LOAD ====================
  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  const fetchProducts = async (opts?: { silent?: boolean }) => {
    try {
      opts?.silent ? setRefreshing(true) : setLoading(true)
      const headers = await getAuthHeader()
      const res = await axios.get(`${API_URL}/admin/products`, { headers })
      setProducts(res.data.products || [])
    } catch {
      Alert.alert('Error', 'Failed to load products')
    } finally {
      opts?.silent ? setRefreshing(false) : setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/products/categories`)
      setCategories(res.data.categories || [])
    } catch {
      setCategories([])
    }
  }

  // ==================== IMAGE PICK ====================
  const pickImage = async () => {
    const remaining = 3 - (pickedImages.length + remoteImages.length)
    if (remaining <= 0) {
      Alert.alert('Limit', 'Max 3 images only')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      Alert.alert('Limit', 'Max 3 images only')
      return
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera permission is required')
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
      formData.append('file', img as any)
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

  // ==================== SUBMIT ====================
  const submitProduct = async () => {
    if (!form.name || !form.price || !form.category || !form.stock) {
      Alert.alert('Validation', 'Fill all required fields')
      return
    }

    try {
      setSubmitting(true)

      let images = [...remoteImages]
      if (pickedImages.length) {
        const uploaded = await uploadImagesToCloudinary(pickedImages)
        images = [...images, ...uploaded]
      }

      if (!images.length) {
        Alert.alert('Validation', 'At least one image required')
        return
      }

      const payload = {
        ...form,
        price: Number(form.price),
        stock: Number(form.stock),
        images,
      }

      const headers = await getAuthHeader()
      const url = editingId
        ? `${API_URL}/admin/product/${editingId}`
        : `${API_URL}/admin/product/new`

      await axios({
        method: editingId ? 'put' : 'post',
        url,
        data: payload,
        headers,
      })

      Alert.alert('Success', editingId ? 'Product updated' : 'Product created')
      resetForm()
      fetchProducts({ silent: true })
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to save product'
      Alert.alert('Error', msg)
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setPickedImages([])
    setRemoteImages([])
    setForm({ name: '', price: '', description: '', category: '', stock: '' })
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
  }

  const handleDelete = async (id: string) => {
    Alert.alert('Confirm delete', 'Delete this product?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleteId(id)
            const headers = await getAuthHeader()
            await axios.delete(`${API_URL}/admin/product/${id}`, { headers })
            setProducts((prev) => prev.filter((p) => p._id !== id))
          } catch {
            Alert.alert('Error', 'Failed to delete product')
          } finally {
            setDeleteId(null)
          }
        },
      },
    ])
  }

  // ==================== RENDER ====================
  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <>
      <AdminHeader />
      <FlatList
        data={products}
        keyExtractor={(i) => i._id}
        refreshing={refreshing}
        onRefresh={() => fetchProducts({ silent: true })}
        ListHeaderComponent={
          <View style={styles.formCard}>
            <Text style={styles.title}>
              {editingId ? 'Edit Product' : 'Add Product'}
            </Text>

            <TextInput
              placeholder="Name"
              style={styles.input}
              value={form.name}
              onChangeText={(t) => setForm({ ...form, name: t })}
            />

            <View style={styles.row}>
              <TextInput
                placeholder="Price"
                style={[styles.input, styles.half]}
                keyboardType="decimal-pad"
                value={form.price}
                onChangeText={(t) => setForm({ ...form, price: t })}
              />
              <TextInput
                placeholder="Stock"
                style={[styles.input, styles.half]}
                keyboardType="numeric"
                value={form.stock}
                onChangeText={(t) => setForm({ ...form, stock: t })}
              />
            </View>

            <TextInput
              placeholder="Description"
              style={[styles.input, styles.multiline]}
              multiline
              value={form.description}
              onChangeText={(t) => setForm({ ...form, description: t })}
            />

            <Text style={styles.label}>Category</Text>
            {categories.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {categories.map((c) => {
                  const active = form.category === c.category
                  return (
                    <TouchableOpacity
                      key={c.category}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setForm({ ...form, category: c.category })}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {c.category} ({c.count})
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            ) : (
              <Text style={styles.helper}>No categories found</Text>
            )}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.btn} onPress={pickImage}>
                <Text style={styles.btnText}>Pick Images</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: '#6a1b9a' }]}
                onPress={takePhoto}
              >
                <Text style={styles.btnText}>Use Camera</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.disabledBtn]}
              onPress={submitProduct}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>
                  {editingId ? 'Update Product' : 'Create Product'}
                </Text>
              )}
            </TouchableOpacity>

            {!!(remoteImages.length || pickedImages.length) && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.previewRow}
              >
                {remoteImages.map((img) => (
                  <Image
                    key={img.public_id}
                    source={{ uri: img.url }}
                    style={styles.preview}
                  />
                ))}
                {pickedImages.map((img) => (
                  <Image
                    key={img.uri}
                    source={{ uri: img.uri }}
                    style={styles.preview}
                  />
                ))}
              </ScrollView>
            )}

            {editingId && (
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                <Text style={styles.cancelText}>Cancel editing</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {item.images?.[0]?.url ? (
                <Image
                  source={{ uri: item.images[0].url }}
                  style={styles.cardImage}
                />
              ) : (
                <View style={[styles.cardImage, styles.emptyImage]}>
                  <Text style={styles.emptyImageText}>No Image</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardMeta}>${item.price.toFixed(2)}</Text>
                <Text style={styles.cardMeta}>Stock: {item.stock}</Text>
                <Text style={styles.cardMeta}>Category: {item.category}</Text>
              </View>
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.editBtn]}
                onPress={() => handleEdit(item)}
              >
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={() => handleDelete(item._id)}
                disabled={deleteId === item._id}
              >
                {deleteId === item._id ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.actionText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No products yet</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </>
  )
}

// ==================== STYLES ====================
const headerStyles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#1a1a2e',
  },
  brand: { color: '#fff', fontWeight: '700', marginRight: 10 },
  navBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2280b0',
    borderRadius: 20,
    marginRight: 8,
  },
  activeBtn: { backgroundColor: '#4caf50' },
  navLabel: { color: '#fff' },
})

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  formCard: { backgroundColor: '#fff', padding: 14, borderRadius: 10 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  multiline: { minHeight: 80 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  label: { fontWeight: '600', marginBottom: 6 },
  helper: { color: '#777', marginBottom: 10 },
  btn: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitBtn: {
    backgroundColor: '#1976d2',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledBtn: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700' },
  previewRow: { gap: 10, marginTop: 10 },
  preview: { width: 70, height: 70, borderRadius: 8, backgroundColor: '#eee' },
  cancelBtn: {
    marginTop: 10,
    padding: 10,
    alignItems: 'center',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
  },
  cancelText: { color: '#333', fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardImage: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#eee' },
  emptyImage: { justifyContent: 'center', alignItems: 'center' },
  emptyImageText: { color: '#999', fontSize: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardMeta: { color: '#555' },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  editBtn: { backgroundColor: '#1976d2' },
  deleteBtn: { backgroundColor: '#d32f2f' },
  actionText: { color: '#fff', fontWeight: '700' },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: { color: '#777' },
  chipRow: { gap: 8, marginBottom: 10 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 6,
    backgroundColor: '#f7f7f7',
  },
  chipActive: { backgroundColor: '#1976d2', borderColor: '#1976d2' },
  chipText: { color: '#333', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
})