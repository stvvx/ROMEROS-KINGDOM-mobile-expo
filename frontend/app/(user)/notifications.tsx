import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Platform } from 'react-native'
import axios from 'axios'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import { getItem } from '@/utils/storage'

// Resolve API URL for device/emulator/web
let API_URL =
  process.env.NGROK_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:4000/api/v1'

const manifest: any = (Constants as any).manifest || (Constants as any).expoConfig
const debuggerHost = manifest?.debuggerHost?.split(':')[0]

if (debuggerHost && debuggerHost !== 'localhost') {
  API_URL = API_URL.replace('localhost', debuggerHost)
} else if (Platform.OS === 'android' && API_URL.includes('localhost')) {
  API_URL = API_URL.replace('localhost', '10.0.2.2')
}

interface NotificationItem {
  _id: string
  title: string
  message: string
  type: string
  refId?: string
  refModel?: string
  isRead: boolean
  createdAt: string
}

export default function UserNotifications() {
  const router = useRouter()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsAuth, setNeedsAuth] = useState(false)

  useEffect(() => {
    load()
  }, [])

  const load = async (opts?: { silent?: boolean }) => {
    try {
      opts?.silent ? setRefreshing(true) : setLoading(true)
      setError(null)
      const token = await getItem('authToken')
      if (!token) {
        setNeedsAuth(true)
        setItems([])
        return
      }
      setNeedsAuth(false)
      const res = await axios.get(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 12000,
      })
      setItems(res.data.notifications || [])
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load notifications'
      setError(msg)
    } finally {
      opts?.silent ? setRefreshing(false) : setLoading(false)
    }
  }

  const markAllRead = async () => {
    try {
      const token = await getItem('authToken')
      if (!token) return
      await axios.post(`${API_URL}/notifications/read-all`, {}, { headers: { Authorization: `Bearer ${token}` } })
      setItems(prev => prev.map(it => ({ ...it, isRead: true })))
    } catch (err) {
      // non-blocking
    }
  }

  const markRead = async (id: string) => {
    try {
      const token = await getItem('authToken')
      if (!token) return
      await axios.post(`${API_URL}/notifications/${id}/read`, {}, { headers: { Authorization: `Bearer ${token}` } })
      setItems(prev => prev.map(it => (it._id === id ? { ...it, isRead: true } : it)))
    } catch (err) {
      // ignore
    }
  }

  const onPressItem = (item: NotificationItem) => {
    if (item.refModel === 'Product' && item.refId) {
      router.push({ pathname: '/(user)/ProductDetails', params: { id: item.refId } })
    } else if (item.refModel === 'Order' && item.refId) {
      router.push('/(user)/orders')
    }
    markRead(item._id)
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00C2C7" />
        <Text style={styles.muted}>Loading notifications...</Text>
      </View>
    )
  }

  if (needsAuth) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Sign in to view notifications</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.primaryBtnText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity onPress={markAllRead}>
          <Text style={styles.link}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 30 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load({ silent: true })} tintColor="#00C2C7" />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.muted}>No notifications yet.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, item.isRead && styles.cardRead]}
            activeOpacity={0.9}
            onPress={() => onPressItem(item)}
          >
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <View style={[styles.badge, item.isRead && styles.badgeRead]}>
                <Text style={styles.badgeText}>{item.type}</Text>
              </View>
            </View>
            <Text style={styles.message}>{item.message}</Text>
            <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E1117' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  title: { color: '#E8EDF5', fontSize: 22, fontWeight: '800' },
  link: { color: '#00C2C7', fontWeight: '700' },
  error: { color: '#FF5A6E', paddingHorizontal: 16 },
  emptyBox: { alignItems: 'center', padding: 20 },
  card: { backgroundColor: '#121727', borderColor: '#1F2540', borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  cardRead: { opacity: 0.75 },
  cardTitle: { color: '#E8EDF5', fontSize: 16, fontWeight: '700' },
  message: { color: '#C6CCDC', fontSize: 14 },
  time: { color: '#7A859E', fontSize: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { backgroundColor: '#00C2C71A', borderColor: '#00C2C7', borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  badgeRead: { backgroundColor: '#1F2540', borderColor: '#1F2540' },
  badgeText: { color: '#00E5EB', fontWeight: '700', textTransform: 'uppercase', fontSize: 11 },
  center: { flex: 1, backgroundColor: '#0E1117', alignItems: 'center', justifyContent: 'center', gap: 10 },
  muted: { color: '#7A859E' },
  primaryBtn: { backgroundColor: '#00C2C7', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 },
  primaryBtnText: { color: '#0E1117', fontWeight: '800' },
})