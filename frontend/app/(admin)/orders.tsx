import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native'
import axios from 'axios'
import Constants from 'expo-constants'
import { getItem } from '@/utils/storage'

let API_URL =
  process.env.NGROK_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:4000/api/v1'

const manifest: any = Constants.manifest || Constants.expoConfig
const debuggerHost = manifest?.debuggerHost?.split(':')[0]

if (debuggerHost && debuggerHost !== 'localhost') {
  API_URL = API_URL.replace('localhost', debuggerHost)
} else if (Platform.OS === 'android') {
  API_URL = API_URL.replace('localhost', '10.0.2.2')
}

const STATUS_OPTIONS = ['Processing', 'Shipped', 'Delivered', 'Cancelled']

export default function OrderManagement() {
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<any[]>([])

  const getAuthHeader = async () => {
    const token = await getItem('authToken')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/admin/orders`, {
        headers: await getAuthHeader(),
      })
      setOrders(res.data.orders || [])
    } catch {
      Alert.alert('Error', 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const updateStatus = async (id: string, status: string) => {
    try {
      await axios.put(
        `${API_URL}/admin/order/${id}`,
        { status },
        { headers: await getAuthHeader() }
      )
      fetchOrders()
    } catch {
      Alert.alert('Error', 'Failed to update order')
    }
  }

  if (loading) {
    return <ActivityIndicator size="large" style={{ marginTop: 40 }} />
  }

  return (
    <FlatList
      data={orders}
      keyExtractor={(o) => o._id}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Order #{item._id.slice(-6)}</Text>
            <Text style={styles.rowSub}>Total: ₱{item.totalPrice}</Text>
            <Text style={styles.rowSub}>Status: {item.orderStatus}</Text>
          </View>

          {STATUS_OPTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.statusBtn,
                item.orderStatus === s && styles.activeStatus,
              ]}
              onPress={() => updateStatus(item._id, s)}
            >
              <Text style={item.orderStatus === s && { color: '#fff' }}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  row: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 8,
  },
  rowTitle: { fontWeight: '700' },
  rowSub: { fontSize: 12, color: '#666' },
  statusBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    marginTop: 6,
  },
  activeStatus: {
    backgroundColor: '#1976d2',
  },
})