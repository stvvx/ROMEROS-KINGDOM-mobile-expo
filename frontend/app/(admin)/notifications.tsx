import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native'
import axios from 'axios'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import { getItem } from '@/utils/storage'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import AdminHeader from '@/components/adminHeader'

// ─── API CONFIG ───────────────────────────────────────────────
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

// ─── TYPES ────────────────────────────────────────────────────
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

// ─── TYPE CONFIG ──────────────────────────────────────────────
const getTypeConfig = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'order':
      return { bg: 'rgba(33,150,243,0.12)', border: 'rgba(33,150,243,0.25)', text: '#2196F3', icon: 'truck-outline' }
    case 'product':
      return { bg: 'rgba(34,128,176,0.12)', border: 'rgba(34,128,176,0.25)', text: '#2280b0', icon: 'package-variant' }
    case 'review':
      return { bg: 'rgba(255,202,40,0.12)', border: 'rgba(255,202,40,0.25)', text: '#ffca28', icon: 'star-outline' }
    case 'user':
      return { bg: 'rgba(76,175,80,0.12)', border: 'rgba(76,175,80,0.25)', text: '#4caf50', icon: 'account' }
    case 'alert':
      return { bg: 'rgba(255,107,107,0.12)', border: 'rgba(255,107,107,0.25)', text: '#ff6b6b', icon: 'alert-circle-outline' }
    default:
      return { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.1)', text: 'rgba(160,174,192,0.7)', icon: 'bell-outline' }
  }
}

// ─── MAIN SCREEN ─────────────────────────────────────────────
export default function AdminNotifications() {
  const router = useRouter()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const localReadIds = React.useRef<Set<string>>(new Set())

  useEffect(() => {
    load()
  }, [])

  const load = async (opts?: { silent?: boolean }) => {
    try {
      opts?.silent ? setRefreshing(true) : setLoading(true)
      setError(null)
      const token = await getItem('authToken')
      const res = await axios.get(`${API_URL}/admin/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 12000,
      })
      const fetched: NotificationItem[] = res.data.notifications || []
      setItems(fetched.map((n) => ({
        ...n,
        isRead: n.isRead || localReadIds.current.has(n._id),
      })))
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load notifications'
      setError(msg)
    } finally {
      opts?.silent ? setRefreshing(false) : setLoading(false)
    }
  }

  const onPressItem = async (item: NotificationItem) => {
    // Mark as read locally immediately
    if (!item.isRead) {
      localReadIds.current.add(item._id)
      setItems((prev) =>
        prev.map((n) => n._id === item._id ? { ...n, isRead: true } : n)
      )
      // Optionally persist to backend (fire-and-forget)
      try {
        const token = await getItem('authToken')
        await axios.post(
          `${API_URL}/notifications/${item._id}/read`,
          {},
          { headers: { Authorization: `Bearer ${token}` }, timeout: 8000 }
        )
      } catch {
        // Silently ignore — local state is already updated
      }
    }

    if (item.refModel === 'Product' && item.refId) {
      router.push({ pathname: '/(user)/ProductDetails', params: { id: item.refId } })
    } else if (item.refModel === 'Order') {
      router.push('/(admin)/orders')
    }
  }

  const unreadCount = items.filter(i => !i.isRead).length
  const readCount   = items.filter(i => i.isRead).length

  if (loading) {
    return (
      <View style={s.root}>
        <AdminHeader title="Notifications" icon="bell-outline" />
        <View style={s.loader}>
          <ActivityIndicator size="large" color="#2280b0" />
          <Text style={s.loaderText}>Loading notifications...</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={s.root}>
      <AdminHeader title="Notifications" icon="bell-outline" />

      {/* ── Page Header ── */}
      <View style={s.pageHeader}>
        <View>
          <Text style={s.pageTitle}>Notifications</Text>
          <Text style={s.pageSubtitle}>System alerts and activity updates</Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={() => load()}>
          <Feather name="refresh-cw" size={15} color="#2280b0" />
        </TouchableOpacity>
      </View>

      {/* ── Stats Row ── */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <MaterialCommunityIcons name="bell-outline" size={20} color="#2280b0" />
          <Text style={s.statNum}>{items.length}</Text>
          <Text style={s.statLabel}>Total</Text>
        </View>
        <View style={s.statCard}>
          <MaterialCommunityIcons name="bell-ring-outline" size={20} color="#ff6b6b" />
          <Text style={s.statNum}>{unreadCount}</Text>
          <Text style={s.statLabel}>Unread</Text>
        </View>
        <View style={s.statCard}>
          <MaterialCommunityIcons name="bell-check-outline" size={20} color="#4caf50" />
          <Text style={s.statNum}>{readCount}</Text>
          <Text style={s.statLabel}>Read</Text>
        </View>
      </View>

      {/* ── Error ── */}
      {error ? (
        <View style={s.errorWrap}>
          <Ionicons name="alert-circle" size={16} color="#ff6b6b" style={{ marginRight: 6 }} />
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* ── List ── */}
      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 28, gap: 10 }}
        onRefresh={() => load({ silent: true })}
        refreshing={refreshing}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <View style={s.emptyIconWrap}>
              <MaterialCommunityIcons name="bell-off-outline" size={36} color="rgba(160,174,192,0.4)" />
            </View>
            <Text style={s.emptyTitle}>No notifications</Text>
            <Text style={s.emptySubtitle}>System alerts and activity updates will appear here</Text>
          </View>
        }
        renderItem={({ item }) => {
          const typeConfig = getTypeConfig(item.type)
          return (
            <TouchableOpacity
              style={[s.card, !item.isRead && s.cardUnread]}
              onPress={() => onPressItem(item)}
              activeOpacity={0.75}
            >
              {/* Unread indicator */}
              {!item.isRead && <View style={s.unreadDot} />}

              <View style={s.cardTop}>
                {/* Icon */}
                <View style={[s.typeIconWrap, { backgroundColor: typeConfig.bg, borderColor: typeConfig.border }]}>
                  <MaterialCommunityIcons name={typeConfig.icon as any} size={18} color={typeConfig.text} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{item.title}</Text>
                  <Text style={s.cardTime}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>

                {/* Type badge */}
                <View style={[s.typeBadge, { backgroundColor: typeConfig.bg, borderColor: typeConfig.border }]}>
                  <Text style={[s.typeBadgeText, { color: typeConfig.text }]}>
                    {item.type?.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Message */}
              <Text style={s.cardMessage}>{item.message}</Text>

              {/* Footer */}
              {(item.refModel === 'Product' || item.refModel === 'Order') && (
                <>
                  <View style={s.divider} />
                  <View style={s.cardFooter}>
                    <Feather name="arrow-right-circle" size={13} color="rgba(160,174,192,0.4)" style={{ marginRight: 5 }} />
                    <Text style={s.cardFooterText}>
                      Tap to view {item.refModel === 'Product' ? 'product' : 'order'}
                    </Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}

// ─── STYLES ──────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    color: 'rgba(160,174,192,0.6)',
    fontSize: 14,
  },

  // ── Page Header ──
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
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(34,128,176,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,128,176,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  statNum:   { fontSize: 18, fontWeight: '800', color: '#fff' },
  statLabel: {
    fontSize: 10,
    color: 'rgba(160,174,192,0.6)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Error ──
  errorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    marginBottom: 10,
    backgroundColor: 'rgba(255,107,107,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.25)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: { color: '#ff6b6b', fontSize: 13, fontWeight: '600', flex: 1 },

  // ── Empty ──
  emptyState: {
    paddingTop: 60,
    justifyContent: 'center',
    alignItems: 'center',
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
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  emptySubtitle: { fontSize: 13, color: 'rgba(160,174,192,0.4)', textAlign: 'center', paddingHorizontal: 20 },

  // ── Notification Card ──
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: 14,
    gap: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  cardUnread: {
    borderColor: 'rgba(34,128,176,0.3)',
    backgroundColor: 'rgba(34,128,176,0.06)',
  },
  unreadDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2280b0',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
    paddingRight: 20,
  },
  cardTime: { fontSize: 11, color: 'rgba(160,174,192,0.5)' },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  typeBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  cardMessage: {
    fontSize: 13,
    color: 'rgba(160,174,192,0.75)',
    lineHeight: 20,
  },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardFooterText: {
    fontSize: 11,
    color: 'rgba(160,174,192,0.4)',
    fontWeight: '600',
  },
})