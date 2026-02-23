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
} from 'react-native'
import axios from 'axios'
import Constants from 'expo-constants'
import { getItem } from '@/utils/storage'

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

export default function AdminProducts() {
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    price: '',
    description: '',
    category: '',
    stock: '',
    image: '',
  })

  useEffect(() => {
    fetchProducts()
  }, [])

  const getAuthHeader = async () => {
    const token = await getItem('authToken')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const headers = await getAuthHeader()
      const res = await axios.get(`${API_URL}/admin/products`, { headers })
      setProducts(res.data.products || [])
    } catch (err) {
      console.warn('Fetch products error', err)
      Alert.alert('Error', 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  const submitProduct = async () => {
    const { name, price, description, category, stock, image } = form

    if (!name || !price) {
      return Alert.alert('Validation', 'Name and price are required')
    }

    try {
      setLoading(true)
      const headers = {
        'Content-Type': 'application/json',
        ...(await getAuthHeader()),
      }

      const payload: any = {
        name,
        price: Number(price),
        description,
        category,
        stock: Number(stock || 0),
      }

      if (image) payload.images = [image]

      if (editingId) {
        await axios.put(
          `${API_URL}/admin/product/${editingId}`,
          payload,
          { headers }
        )
        Alert.alert('Updated', 'Product updated')
        setEditingId(null)
      } else {
        await axios.post(
          `${API_URL}/admin/product/new`,
          payload,
          { headers }
        )
        Alert.alert('Created', 'Product added')
      }

      setForm({
        name: '',
        price: '',
        description: '',
        category: '',
        stock: '',
        image: '',
      })

      fetchProducts()
    } catch (err: any) {
      console.error('Submit product error', err)
      Alert.alert(
        'Error',
        err?.response?.data?.message || 'Failed to save product'
      )
    } finally {
      setLoading(false)
    }
  }

  const onEdit = (product: any) => {
    setEditingId(product._id)
    setForm({
      name: product.name || '',
      price: String(product.price || ''),
      description: product.description || '',
      category: product.category || '',
      stock: String(product.stock || ''),
      image: product.images?.[0]?.url || '',
    })
  }

  const onDelete = (id: string) => {
    Alert.alert('Confirm', 'Soft-delete this product?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => doDelete(id),
      },
    ])
  }

  const doDelete = async (id: string) => {
    try {
      setLoading(true)
      const headers = await getAuthHeader()
      await axios.delete(`${API_URL}/admin/product/${id}`, { headers })
      Alert.alert('Deleted', 'Product soft-deleted')
      fetchProducts()
    } catch (err) {
      console.warn('Delete product error', err)
      Alert.alert('Error', 'Failed to delete product')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Product Form */}
      <View style={styles.form}>
        <TextInput
          placeholder="Name"
          value={form.name}
          onChangeText={(t) => setForm({ ...form, name: t })}
          style={styles.input}
        />
        <TextInput
          placeholder="Price"
          keyboardType="numeric"
          value={form.price}
          onChangeText={(t) => setForm({ ...form, price: t })}
          style={styles.input}
        />
        <TextInput
          placeholder="Category"
          value={form.category}
          onChangeText={(t) => setForm({ ...form, category: t })}
          style={styles.input}
        />
        <TextInput
          placeholder="Stock"
          keyboardType="numeric"
          value={form.stock}
          onChangeText={(t) => setForm({ ...form, stock: t })}
          style={styles.input}
        />
        <TextInput
          placeholder="Image URL"
          value={form.image}
          onChangeText={(t) => setForm({ ...form, image: t })}
          style={styles.input}
        />

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.primaryBtn} onPress={submitProduct}>
            <Text style={styles.btnText}>
              {editingId ? 'Update Product' : 'Add Product'}
            </Text>
          </TouchableOpacity>

          {editingId && (
            <TouchableOpacity
              style={styles.ghostBtn}
              onPress={() => {
                setEditingId(null)
                setForm({
                  name: '',
                  price: '',
                  description: '',
                  category: '',
                  stock: '',
                  image: '',
                })
              }}
            >
              <Text>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Product List */}
      <FlatList
        data={products}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowSub}>
                ₱{item.price} • Stock: {item.stock}
              </Text>
              <Text style={styles.rowSub}>
                Category: {item.category}
              </Text>
            </View>

            <View style={styles.rowActions}>
              <TouchableOpacity
                style={styles.smallBtn}
                onPress={() => onEdit(item)}
              >
                <Text>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallBtn, { backgroundColor: '#ffdddd' }]}
                onPress={() => onDelete(item._id)}
              >
                <Text>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: '#fff' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  form: { marginBottom: 12, gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
  },

  primaryBtn: {
    flex: 1,
    backgroundColor: '#1976d2',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  ghostBtn: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#eee',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700' },

  row: {
    flexDirection: 'row',
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  rowTitle: { fontWeight: '700' },
  rowSub: { color: '#666', fontSize: 12 },

  rowActions: { marginLeft: 8 },
  smallBtn: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    marginBottom: 6,
  },
})