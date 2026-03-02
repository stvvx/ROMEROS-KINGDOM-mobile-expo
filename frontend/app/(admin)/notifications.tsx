import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform } from 'react-native'
import axios from 'axios'
import Constants from 'expo-constants'
import { usePathname, useRouter } from 'expo-router'
import { getItem } from '@/utils/storage'

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

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/(admin)/dashboard' },
  { label: 'Products', path: '/(admin)/products' },
  { label: 'Categories', path: '/(admin)/categories' },
  { label: 'Users', path: '/(admin)/users' },
  { label: 'Reviews', path: '/(admin)/review' },
  { label: 'Notifications', path: '/(admin)/notifications' },
]

const AdminHeader = () => {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <View style={styles.headerWrapper}>
      <Text style={styles.brand}>⚙️ Admin</Text>
      <FlatList
        data={NAV_ITEMS}
        horizontal
        keyExtractor={(i) => i.path}
        renderItem={({ item }) => {
          const active = pathname === item.path
          return (
            <TouchableOpacity
              style={[styles.navBtn, active && styles.navBtnActive]}
              onPress={() => router.push(item.path)}
            >
              <Text style={[styles.navText, active && styles.navTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
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

export default function AdminNotifications() {
  const router = useRouter()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = await getItem('authToken')
      const res = await axios.get(`${API_URL}/admin/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 12000,
      })
      setItems(res.data.notifications || [])
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load notifications'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const onPressItem = (item: NotificationItem) => {
    if (item.refModel === 'Product' && item.refId) {
      router.push({ pathname: '/(user)/ProductDetails', params: { id: item.refId } })
    } else if (item.refModel === 'Order') {
      router.push('/(admin)/orders')
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
      <AdminHeader />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 26 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => onPressItem(item)} activeOpacity={0.9}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.type}</Text>
              </View>
            </View>
            <Text style={styles.message}>{item.message}</Text>
            <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.muted}>No notifications</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E1117' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0E1117' },
  headerWrapper: { paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#0E1117' },
  brand: { color: '#E8EDF5', fontWeight: '800', fontSize: 18 },
  navBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderColor: '#1F2540', borderWidth: 1, marginRight: 8, backgroundColor: '#121727' },
  navBtnActive: { borderColor: '#00C2C7' },
  navText: { color: '#E8EDF5', fontWeight: '700' },
  navTextActive: { color: '#00E5EB' },
  error: { color: '#FF5A6E', paddingHorizontal: 16, paddingTop: 10 },
  card: { backgroundColor: '#121727', borderColor: '#1F2540', borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: '#E8EDF5', fontSize: 16, fontWeight: '700' },
  message: { color: '#C6CCDC', fontSize: 14 },
  time: { color: '#7A859E', fontSize: 12 },
  badge: { backgroundColor: '#00C2C71A', borderColor: '#00C2C7', borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { color: '#00E5EB', fontWeight: '700', textTransform: 'uppercase', fontSize: 11 },
  emptyBox: { padding: 20, alignItems: 'center' },
  muted: { color: '#7A859E' },
})