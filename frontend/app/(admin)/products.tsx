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
import { getItem } from '@/utils/storage'

// ==================== API URL CONFIGURATION ====================
let API_URL =
  process.env.NGROK_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:4000/api/v1'

const manifest: any = (Constants as any).manifest || (Constants as any).expoConfig
const debuggerHost = manifest?.debuggerHost ? manifest.debuggerHost.split(':')[0] : null

if (debuggerHost && debuggerHost !== 'localhost') {
  API_URL = API_URL.replace('localhost', debuggerHost)
} else if (Platform.OS === 'android' && API_URL.includes('localhost')) {
  API_URL = API_URL.replace('localhost', '10.0.2.2')
}

console.log('[Config] API_URL configured:', API_URL)

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
  isDeleted?: boolean
  createdAt?: string
  updatedAt?: string
}

interface Category {
  category: string
  count: number
}

// ==================== MAIN COMPONENT ====================
export default function AdminProducts() {
  // ==================== STATE ====================
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pickedImages, setPickedImages] = useState<PickedImage[]>([])
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const [form, setForm] = useState({
    name: '',
    price: '',
    description: '',
    category: '',
    stock: '',
  })

  // ==================== INITIAL FETCH ====================
  useEffect(() => {
    verifyToken()
    fetchProducts()
    fetchCategories()
  }, [])

  // ==================== TOKEN VERIFICATION ====================
  const verifyToken = async () => {
    try {
      const token = await getItem('authToken')
      console.log('[Token] Token exists:', !!token)
      
      if (token) {
        // Log token preview
        console.log('[Token] Preview:', token.substring(0, 20) + '...')
        
        // Try to decode JWT payload
        try {
          const base64Url = token.split('.')[1]
          if (base64Url) {
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
            const payload = JSON.parse(atob(base64))
            console.log('[Token] Payload:', payload)
            console.log('[Token] Expires:', new Date(payload.exp * 1000).toLocaleString())
            console.log('[Token] User role:', payload.role)
          }
        } catch (e) {
          console.log('[Token] Not a JWT token or cannot decode')
        }
      } else {
        console.warn('[Token] No token found - user may need to login')
        Alert.alert('Authentication Required', 'Please login to continue')
      }
      
      return token
    } catch (error) {
      console.error('[Token] Error verifying token:', error)
      return null
    }
  }

  // ==================== AUTH HELPERS ====================
  const getAuthHeader = async () => {
    try {
      const token = await getItem('authToken')
      console.log('[Auth] Getting auth header - Token present:', !!token)
      
      if (!token) {
        console.warn('[Auth] No token available')
        return {}
      }
      
      return { Authorization: `Bearer ${token}` }
    } catch (error) {
      console.error('[Auth] Error getting auth header:', error)
      return {}
    }
  }

  // ==================== API FUNCTIONS ====================
  const fetchProducts = async () => {
    try {
      setLoading(true)
      const headers = await getAuthHeader()
      
      console.log('[API] Fetching products from:', `${API_URL}/admin/products`)
      console.log('[API] Headers:', JSON.stringify(headers))
      
      const res = await axios.get(`${API_URL}/admin/products`, { headers })
      
      console.log('[API] Products fetched:', res.data.products?.length || 0)
      setProducts(res.data.products || [])
    } catch (err: any) {
      console.error('[API] Fetch products error:', err.message)
      
      if (err.response?.status === 401) {
        Alert.alert('Authentication Error', 'Please login again')
      } else {
        Alert.alert('Error', 'Failed to load products')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      console.log('[API] Fetching categories from:', `${API_URL}/products/categories`)
      const res = await axios.get(`${API_URL}/products/categories`)
      console.log('[API] Categories fetched:', res.data.categories?.length || 0)
      setCategories(res.data.categories || [])
    } catch (err: any) {
      console.error('[API] Fetch categories error:', err.message)
    }
  }

  // ==================== CLOUDINARY IMAGE UPLOAD ====================
  const uploadImagesToCloudinary = async (images: PickedImage[]): Promise<CloudinaryImage[]> => {
    try {
      if (images.length === 0) return []

      console.log('[Cloudinary] Starting upload of', images.length, 'images')

      const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'debzvfysb'
      const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'romeros'

      console.log('[Cloudinary] Using cloudName:', cloudName, 'uploadPreset:', uploadPreset)

      const uploadedImages: CloudinaryImage[] = []

      for (const img of images) {
        try {
          const formData = new FormData()
          formData.append('file', {
            uri: img.uri,
            name: img.name,
            type: img.type || 'image/jpeg',
          } as any)
          formData.append('upload_preset', uploadPreset)
          formData.append('folder', 'romeros/products')

          console.log('[Cloudinary] Uploading image:', img.name)

          const response = await axios.post(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            }
          )

          console.log('[Cloudinary] Image uploaded:', response.data.public_id)
          uploadedImages.push({
            public_id: response.data.public_id,
            url: response.data.secure_url,
          })
        } catch (imgErr: any) {
          const errorMsg = imgErr.response?.data?.error?.message || imgErr.message
          console.error('[Cloudinary] Single image error:', errorMsg)
          throw new Error(`Failed to upload image: ${errorMsg}`)
        }
      }

      console.log('[Cloudinary] All images uploaded:', uploadedImages.length)
      return uploadedImages
    } catch (err: any) {
      console.error('[Cloudinary] Error:', err.message)
      throw new Error(`Failed to upload images to Cloudinary: ${err.message}`)
    }
  }

  // ==================== IMAGE PICKER ====================
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to select images.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 3 - pickedImages.length,
      })

      if (!result.canceled && result.assets.length > 0) {
        const newImages = result.assets.map((asset, idx) => {
          const name = asset.uri.split('/').pop() || `image_${Date.now()}_${idx}.jpg`
          const ext = name.split('.').pop() || 'jpg'
          const type = `image/${ext === 'jpg' ? 'jpeg' : ext}`

          return {
            uri: asset.uri,
            name,
            type,
          }
        })
        
        const totalImages = pickedImages.length + newImages.length
        if (totalImages > 3) {
          Alert.alert('Limit Reached', 'You can only upload up to 3 images')
          return
        }
        
        setPickedImages([...pickedImages, ...newImages])
      }
    } catch (err) {
      console.error('[ImagePicker] Error:', err)
      Alert.alert('Error', 'Failed to pick images')
    }
  }

  const removePickedImage = (index: number) => {
    setPickedImages(pickedImages.filter((_, i) => i !== index))
  }

  // ==================== FORM VALIDATION ====================
  const validateForm = (): boolean => {
    const { name, price, description, category, stock } = form

    if (!name.trim()) {
      Alert.alert('Validation', 'Product name is required')
      return false
    }

    if (!price.trim()) {
      Alert.alert('Validation', 'Price is required')
      return false
    }

    const priceNum = parseFloat(price)
    if (isNaN(priceNum) || priceNum < 0) {
      Alert.alert('Validation', 'Please enter a valid price')
      return false
    }

    if (!description.trim()) {
      Alert.alert('Validation', 'Description is required')
      return false
    }

    if (!category) {
      Alert.alert('Validation', 'Please select a category')
      return false
    }

    if (!stock.trim()) {
      Alert.alert('Validation', 'Stock quantity is required')
      return false
    }

    const stockNum = parseInt(stock, 10)
    if (isNaN(stockNum) || stockNum < 0) {
      Alert.alert('Validation', 'Please enter a valid stock quantity')
      return false
    }

    if (pickedImages.length === 0 && !editingId) {
      Alert.alert('Validation', 'Please select at least one image')
      return false
    }

    return true
  }

  // ==================== SUBMIT PRODUCT ====================
  const submitProduct = async () => {
    if (!validateForm()) return

    console.log('=================================')
    console.log('[Submit] STARTING PRODUCT SUBMISSION')
    console.log('=================================')

    try {
      setSubmitting(true)
      
      const { name, price, description, category, stock } = form

      // Log form data
      console.log('[Submit] Form data:', {
        name: name.trim(),
        price: parseFloat(price),
        description: description.trim(),
        category: category.trim(),
        stock: parseInt(stock, 10),
        imageCount: pickedImages.length,
        editingId: editingId || 'new product'
      })

      // Get auth headers
      const headers = await getAuthHeader()
      console.log('[Submit] Auth headers:', JSON.stringify(headers))

      if (!headers.Authorization) {
        console.error('[Submit] No authorization token found!')
        Alert.alert('Authentication Error', 'Please login again')
        setSubmitting(false)
        return
      }

      // Upload images to Cloudinary
      let uploadedImages: CloudinaryImage[] = []
      if (pickedImages.length > 0) {
        console.log('[Submit] Uploading images to Cloudinary...')
        try {
          uploadedImages = await uploadImagesToCloudinary(pickedImages.slice(0, 3))
          console.log('[Submit] Cloudinary upload successful. Images:', uploadedImages.length)
        } catch (uploadErr: any) {
          console.error('[Submit] Cloudinary upload failed:', uploadErr)
          Alert.alert('Upload Error', uploadErr.message)
          setSubmitting(false)
          return
        }
      } else if (editingId && editingProduct) {
        // When editing, use existing images if no new ones uploaded
        uploadedImages = editingProduct.images || []
        console.log('[Submit] Using existing images:', uploadedImages.length)
      }

      // Prepare payload EXACTLY as backend expects
      const payload = {
        name: name.trim(),
        price: Number(price),
        description: description.trim(),
        category: category.trim(),
        stock: Number(stock),
        images: uploadedImages
      }

      console.log('[Submit] Final payload:')
      console.log(JSON.stringify(payload, null, 2))
      
      // Determine endpoint
      const url = editingId 
        ? `${API_URL}/admin/product/${editingId}`
        : `${API_URL}/admin/product/new`
      
      console.log('[Submit] Endpoint:', url)
      console.log('[Submit] Method:', editingId ? 'PUT' : 'POST')

      // Make request
      console.log('[Submit] Sending request...')
      
      const response = await axios({
        method: editingId ? 'put' : 'post',
        url: url,
        data: payload,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...headers
        },
        timeout: 15000 // 15 second timeout
      })

      console.log('[Submit] Response received!')
      console.log('[Submit] Status:', response.status)
      console.log('[Submit] Data:', JSON.stringify(response.data, null, 2))

      Alert.alert(
        'Success', 
        editingId ? 'Product updated successfully' : 'Product created successfully'
      )

      // Reset form
      setForm({ name: '', price: '', description: '', category: '', stock: '' })
      setPickedImages([])
      setEditingId(null)
      setEditingProduct(null)
      
      // Refresh products list
      await fetchProducts()

    } catch (err: any) {
      console.error('=================================')
      console.error('[Submit] ERROR DETAILS:')
      console.error('=================================')
      console.error('Error name:', err.name)
      console.error('Error message:', err.message)
      
      if (err.response) {
        // Server responded with error
        console.error('[Submit] Server Response Error:')
        console.error('Status:', err.response.status)
        console.error('Status Text:', err.response.statusText)
        console.error('Headers:', JSON.stringify(err.response.headers, null, 2))
        console.error('Data:', JSON.stringify(err.response.data, null, 2))
        
        // Extract error message
        let errorMessage = 'Server error occurred'
        if (err.response.data) {
          if (typeof err.response.data === 'string') {
            errorMessage = err.response.data
          } else if (err.response.data.message) {
            errorMessage = err.response.data.message
          } else if (err.response.data.error) {
            errorMessage = err.response.data.error
          } else {
            errorMessage = JSON.stringify(err.response.data)
          }
        }
        
        // Handle specific status codes
        if (err.response.status === 401) {
          Alert.alert('Authentication Error', 'Your session has expired. Please login again.')
        } else if (err.response.status === 403) {
          Alert.alert('Authorization Error', 'You do not have permission to perform this action')
        } else if (err.response.status === 404) {
          Alert.alert('Not Found', 'The requested resource was not found')
        } else if (err.response.status === 422) {
          Alert.alert('Validation Error', errorMessage)
        } else {
          Alert.alert(`Error ${err.response.status}`, errorMessage)
        }
        
      } else if (err.request) {
        // Request made but no response
        console.error('[Submit] No response received:')
        console.error('Request:', err.request)
        Alert.alert(
          'Network Error', 
          `Cannot connect to server at ${API_URL}. Check if backend is running.`
        )
      } else {
        // Request setup error
        console.error('[Submit] Request setup error:', err.message)
        Alert.alert('Error', err.message)
      }
    } finally {
      setSubmitting(false)
      console.log('[Submit] Submission process complete')
    }
  }

  // ==================== EDIT PRODUCT ====================
  const onEdit = (product: Product) => {
    console.log('[Edit] Editing product:', product._id)
    setEditingId(product._id)
    setEditingProduct(product)
    setForm({
      name: product.name,
      price: String(product.price),
      description: product.description,
      category: product.category,
      stock: String(product.stock),
    })
    setPickedImages([]) // Clear picked images when editing
  }

  // ==================== DELETE PRODUCT ====================
  const onDelete = (id: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => doDelete(id),
        },
      ]
    )
  }

  const doDelete = async (id: string) => {
    try {
      setLoading(true)
      const headers = await getAuthHeader()
      
      console.log('[Delete] Deleting product:', id)
      await axios.delete(`${API_URL}/admin/product/${id}`, { headers })
      
      Alert.alert('Success', 'Product deleted successfully')
      await fetchProducts()
    } catch (err: any) {
      console.error('[Delete] Error:', err)
      Alert.alert('Error', err?.response?.data?.message || 'Failed to delete product')
    } finally {
      setLoading(false)
    }
  }

  // ==================== RENDER LOADING ====================
  if (loading && products.length === 0) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={styles.loaderText}>Loading products...</Text>
      </View>
    )
  }

  // ==================== MAIN RENDER ====================
  return (
    <View style={styles.container}>
      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={styles.title}>
          {editingId ? '✏️ Edit Product' : '➕ Add New Product'}
        </Text>

        {/* Product Name */}
        <Text style={styles.label}>Product Name <Text style={styles.required}>*</Text></Text>
        <TextInput
          placeholder="Enter product name"
          value={form.name}
          onChangeText={(text) => setForm({ ...form, name: text })}
          style={styles.input}
          editable={!submitting}
        />

        {/* Price */}
        <Text style={styles.label}>Price ($) <Text style={styles.required}>*</Text></Text>
        <TextInput
          placeholder="Enter price"
          keyboardType="decimal-pad"
          value={form.price}
          onChangeText={(text) => setForm({ ...form, price: text })}
          style={styles.input}
          editable={!submitting}
        />

        {/* Stock */}
        <Text style={styles.label}>Stock Quantity <Text style={styles.required}>*</Text></Text>
        <TextInput
          placeholder="Enter stock quantity"
          keyboardType="numeric"
          value={form.stock}
          onChangeText={(text) => setForm({ ...form, stock: text })}
          style={styles.input}
          editable={!submitting}
        />

        {/* Description */}
        <Text style={styles.label}>Description <Text style={styles.required}>*</Text></Text>
        <TextInput
          placeholder="Enter product description"
          value={form.description}
          onChangeText={(text) => setForm({ ...form, description: text })}
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={4}
          editable={!submitting}
        />

        {/* Category Selection */}
        <Text style={styles.label}>Category <Text style={styles.required}>*</Text></Text>
        {categories.length === 0 ? (
          <ActivityIndicator size="small" color="#1976d2" />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
          >
            {categories.map((cat, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.categoryTag,
                  form.category === cat.category && styles.categoryTagActive,
                ]}
                onPress={() => setForm({ ...form, category: cat.category })}
                disabled={submitting}
              >
                <Text
                  style={[
                    styles.categoryTagText,
                    form.category === cat.category && styles.categoryTagTextActive,
                  ]}
                >
                  {cat.category} ({cat.count})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Image Picker */}
        <Text style={styles.label}>Product Images <Text style={styles.required}>*</Text></Text>
        <TouchableOpacity
          style={[styles.imagePickBtn, (submitting || pickedImages.length >= 3) && styles.disabledBtn]}
          onPress={pickImage}
          disabled={submitting || pickedImages.length >= 3}
        >
          <Text style={styles.imagePickBtnText}>
            📷 {pickedImages.length === 0 ? 'Pick Images' : `Add More Images (${pickedImages.length}/3)`}
          </Text>
        </TouchableOpacity>

        {/* Show existing images when editing */}
        {editingId && editingProduct && editingProduct.images && editingProduct.images.length > 0 && pickedImages.length === 0 && (
          <View style={styles.imagePreview}>
            <Text style={styles.previewLabel}>Existing Images:</Text>
            <View style={styles.imageGrid}>
              {editingProduct.images.map((img, idx) => (
                <View key={idx} style={styles.imageCard}>
                  <Image source={{ uri: img.url }} style={styles.thumbImage} />
                  <View style={styles.existingBadge}>
                    <Text style={styles.existingBadgeText}>Existing</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Image Preview Grid for new images */}
        {pickedImages.length > 0 && (
          <View style={styles.imagePreview}>
            <Text style={styles.previewLabel}>New Images ({pickedImages.length}/3):</Text>
            <View style={styles.imageGrid}>
              {pickedImages.map((img, idx) => (
                <View key={idx} style={styles.imageCard}>
                  <Image source={{ uri: img.uri }} style={styles.thumbImage} />
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removePickedImage(idx)}
                    disabled={submitting}
                  >
                    <Text style={styles.removeBtnText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.disabledBtn]}
            onPress={submitProduct}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>
                {editingId ? 'Update Product' : 'Create Product'}
              </Text>
            )}
          </TouchableOpacity>

          {editingId && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                setEditingId(null)
                setEditingProduct(null)
                setForm({
                  name: '',
                  price: '',
                  description: '',
                  category: '',
                  stock: '',
                })
                setPickedImages([])
              }}
              disabled={submitting}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Products List */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>
          📦 Products ({products.length})
        </Text>
        <FlatList
          data={products}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.productCard}>
              {item.images && item.images.length > 0 && (
                <Image
                  source={{ uri: item.images[0].url }}
                  style={styles.productImage}
                />
              )}
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.productPrice}>
                  ${item.price.toFixed(2)}
                </Text>
                <Text style={styles.productStock}>
                  Stock: {item.stock}
                </Text>
                <Text style={styles.productCategory} numberOfLines={1}>
                  {item.category}
                </Text>
              </View>
              <View style={styles.productActions}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => onEdit(item)}
                >
                  <Text style={styles.actionBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => onDelete(item._id)}
                >
                  <Text style={styles.actionBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  )
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loaderText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  form: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    color: '#1a1a1a',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 6,
    marginTop: 4,
  },
  required: {
    color: '#d32f2f',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    fontSize: 14,
    color: '#1a1a1a',
    backgroundColor: '#fafafa',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryScroll: {
    marginBottom: 16,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  categoryTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  categoryTagActive: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
  },
  categoryTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  categoryTagTextActive: {
    color: '#fff',
  },
  imagePickBtn: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  imagePickBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  imagePreview: {
    marginBottom: 16,
  },
  previewLabel: {
    fontWeight: '600',
    marginBottom: 8,
    color: '#444',
    fontSize: 13,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageCard: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    backgroundColor: 'rgba(255, 68, 68, 0.9)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  existingBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  existingBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#1976d2',
    borderRadius: 8,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelBtnText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 15,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    resizeMode: 'cover',
    backgroundColor: '#f0f0f0',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
    marginRight: 8,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 2,
  },
  productStock: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 11,
    color: '#999',
    textTransform: 'capitalize',
  },
  productActions: {
    gap: 6,
  },
  editBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1976d2',
  },
  deleteBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d32f2f',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
})