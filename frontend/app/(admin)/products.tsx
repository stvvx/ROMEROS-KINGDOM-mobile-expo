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
  process.env.NGROK_URL || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api/v1'

const manifest: any = (Constants as any).manifest || (Constants as any).expoConfig
const debuggerHost = manifest?.debuggerHost ? manifest.debuggerHost.split(':')[0] : null

if (debuggerHost && debuggerHost !== 'localhost') {
  API_URL = API_URL.replace('localhost', debuggerHost)
} else if (Platform.OS === 'android' && API_URL.includes('localhost')) {
  API_URL = API_URL.replace('localhost', '10.0.2.2')
}

const STATUS_OPTIONS = ['Processing', 'Shipped', 'Delivered', 'Cancelled']

export default function AdminProducts() {
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'products' | 'orders'>('products')

  const [products, setProducts] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])

  const [form, setForm] = useState({ name: '', price: '', description: '', category: '', stock: '', image: '' })
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [mode])

  const getAuthHeader = async () => {
    const token = await getItem('authToken')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const headers = await getAuthHeader()
      if (mode === 'products') {
        const res = await axios.get(`${API_URL}/admin/products`, { headers })
        setProducts(res.data.products || [])
      } else {
        const res = await axios.get(`${API_URL}/admin/orders/`, { headers })
        setOrders(res.data.orders || [])
      }
    } catch (err) {
      console.warn('Fetch error', err && err.message ? err.message : err)
      Alert.alert('Error', 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const submitProduct = async () => {
    const { name, price, description, category, stock, image } = form
    if (!name || !price) return Alert.alert('Validation', 'Name and price required')
    try {
      setLoading(true)
      const headers = { 'Content-Type': 'application/json', ...(await getAuthHeader()) }
      const payload: any = {
        name,
        price: Number(price),
        description,
        category,
        stock: Number(stock || 0),
      }
      if (image) payload.images = [image]

      if (editingId) {
        await axios.put(`${API_URL}/admin/product/${editingId}`, payload, { headers })
        Alert.alert('Updated', 'Product updated')
        setEditingId(null)
      } else {
        await axios.post(`${API_URL}/admin/product/new`, payload, { headers })
        Alert.alert('Created', 'Product added')
      }
      setForm({ name: '', price: '', description: '', category: '', stock: '', image: '' })
      fetchData()
    } catch (err: any) {
      console.error('Submit product error', err?.response?.data || err.message || err)
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save product')
    } finally {
      setLoading(false)
    }
  }

  const onEdit = (p: any) => {
    setEditingId(p._id)
    setForm({ name: p.name || '', price: String(p.price || ''), description: p.description || '', category: String(p.category || ''), stock: String(p.stock || ''), image: p.images?.[0]?.url || '' })
  }

  const onDelete = (id: string) => {
    Alert.alert('Confirm', 'Soft-delete this product?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: () => doDelete(id) },
    ])
  }

  const doDelete = async (id: string) => {
    try {
      setLoading(true)
      const headers = await getAuthHeader()
      await axios.delete(`${API_URL}/admin/product/${id}`, { headers })
      Alert.alert('Deleted', 'Product soft-deleted')
      fetchData()
    } catch (err) {
      console.warn('Delete error', err)
      Alert.alert('Error', 'Failed to delete')
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      setLoading(true)
      const headers = { 'Content-Type': 'application/json', ...(await getAuthHeader()) }
      await axios.put(`${API_URL}/admin/order/${orderId}`, { status }, { headers })
      Alert.alert('Updated', 'Order status updated')
      fetchData()
    } catch (err) {
      console.warn('Order update error', err)
      Alert.alert('Error', 'Failed to update order')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <View style={styles.loader}><ActivityIndicator size="large" /></View>

  return (
    <View style={styles.container}>
      <View style={styles.segment}>
        <TouchableOpacity onPress={() => setMode('products')} style={[styles.segmentBtn, mode === 'products' && styles.activeBtn]}>
          <Text style={[styles.segmentText, mode === 'products' && styles.activeText]}>Products</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMode('orders')} style={[styles.segmentBtn, mode === 'orders' && styles.activeBtn]}>
          <Text style={[styles.segmentText, mode === 'orders' && styles.activeText]}>Orders</Text>
        </TouchableOpacity>
      </View>

      {mode === 'products' ? (
        <View style={{ flex: 1 }}>
          <View style={styles.form}>
            <TextInput placeholder="Name" value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} style={styles.input} />
            <TextInput placeholder="Price" keyboardType="numeric" value={form.price} onChangeText={(t) => setForm({ ...form, price: t })} style={styles.input} />
            <TextInput placeholder="Category" value={form.category} onChangeText={(t) => setForm({ ...form, category: t })} style={styles.input} />
            <TextInput placeholder="Stock" keyboardType="numeric" value={form.stock} onChangeText={(t) => setForm({ ...form, stock: t })} style={styles.input} />
            <TextInput placeholder="Image URL" value={form.image} onChangeText={(t) => setForm({ ...form, image: t })} style={styles.input} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.primaryBtn} onPress={submitProduct}><Text style={styles.btnText}>{editingId ? 'Update' : 'Add'}</Text></TouchableOpacity>
              {editingId && <TouchableOpacity style={styles.ghostBtn} onPress={() => { setEditingId(null); setForm({ name: '', price: '', description: '', category: '', stock: '', image: '' }) }}><Text>Cancel</Text></TouchableOpacity>}
            </View>
          </View>

          <FlatList data={products} keyExtractor={(i) => i._id} renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowSub}>${item.price} • Stock: {item.stock}</Text>
                <Text style={styles.rowSub}>Category: {item.category}</Text>
              </View>
              <View style={styles.rowActions}>
                <TouchableOpacity style={styles.smallBtn} onPress={() => onEdit(item)}><Text>Edit</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#ffdddd' }]} onPress={() => onDelete(item._id)}><Text>Delete</Text></TouchableOpacity>
              </View>
            </View>
          )} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList data={orders} keyExtractor={(o) => o._id} renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Order {String(item._id).slice(-6)}</Text>
                <Text style={styles.rowSub}>Total: ${item.totalPrice}</Text>
                <Text style={styles.rowSub}>Status: {item.orderStatus}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                {STATUS_OPTIONS.map((s) => (
                  <TouchableOpacity key={s} style={[styles.statusBtn, item.orderStatus === s && styles.activeStatus]} onPress={() => updateOrderStatus(item._id, s)}>
                    <Text style={item.orderStatus === s ? { color: '#fff' } : {}}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: '#fff' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  segment: { flexDirection: 'row', marginBottom: 12, backgroundColor: '#f2f2f2', borderRadius: 8 },
  segmentBtn: { flex: 1, padding: 10, alignItems: 'center' },
  activeBtn: { backgroundColor: '#1976d2', borderRadius: 8 },
  segmentText: { fontWeight: '600' },
  activeText: { color: '#fff' },
  form: { marginBottom: 12, gap: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 6 },
  primaryBtn: { backgroundColor: '#1976d2', padding: 12, borderRadius: 8 },
  ghostBtn: { padding: 12, borderRadius: 8, backgroundColor: '#eee', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  row: { flexDirection: 'row', padding: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 8, marginBottom: 8, alignItems: 'center' },
  rowTitle: { fontWeight: '700' },
  rowSub: { color: '#666', fontSize: 12 },
  rowActions: { marginLeft: 8, justifyContent: 'center' },
  smallBtn: { padding: 8, borderRadius: 6, backgroundColor: '#f0f0f0', marginBottom: 6 },
  statusBtn: { padding: 6, borderRadius: 6, backgroundColor: '#f7f7f7', marginBottom: 6 },
  activeStatus: { backgroundColor: '#1976d2' },
})
