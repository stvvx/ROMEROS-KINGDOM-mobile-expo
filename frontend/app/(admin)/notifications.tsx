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

/* ─────────────────────────────────────────
   Palette — Blue Robotics (Admin variant)
───────────────────────────────────────── */
const C = {
  bg:          '#020B18',
  bgLayer:     '#040F1F',
  surface:     '#071828',
  surfaceHigh: '#0A2035',
  border:      '#0D2440',
  borderBright:'rgba(0,168,255,0.45)',
  accent:      '#00A8FF',
  accentDim:   '#005A8E',
  accentGlow:  'rgba(0,168,255,0.1)',
  accentText:  '#33BBFF',
  text:        '#E8F4FF',
  textSub:     'rgba(120,180,230,0.7)',
  textDim:     'rgba(60,110,170,0.45)',
  danger:      '#FF4060',
  dangerBg:    'rgba(255,64,96,0.08)',
  dangerBorder:'rgba(255,64,96,0.22)',
  success:     '#00D4AA',
  successBg:   'rgba(0,212,170,0.08)',
  successBorder:'rgba(0,212,170,0.3)',
  warn:        '#F59E0B',
  warnBg:      'rgba(245,158,11,0.1)',
  warnBorder:  'rgba(245,158,11,0.28)',
  white:       '#FFFFFF',
} as const

const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace'

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

/* ─── Notification type config ─── */
const getTypeConfig = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'order':
      return { bg: C.accentGlow, border: C.borderBright, text: C.accentText, icon: 'truck-outline' }
    case 'product':
      return { bg: C.accentGlow, border: C.borderBright, text: C.accentText, icon: 'package-variant' }
    case 'review':
      return { bg: C.warnBg, border: C.warnBorder, text: C.warn, icon: 'star-outline' }
    case 'user':
      return { bg: C.successBg, border: C.successBorder, text: C.success, icon: 'account' }
    case 'alert':
      return { bg: C.dangerBg, border: C.dangerBorder, text: C.danger, icon: 'alert-circle-outline' }
    default:
      return { bg: C.surface, border: C.border, text: C.textSub, icon: 'bell-outline' }
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

  useEffect(() => { load() }, [])

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
      setItems(fetched.map((n) => ({ ...n, isRead: n.isRead || localReadIds.current.has(n._id) })))
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load notifications')
    } finally {
      opts?.silent ? setRefreshing(false) : setLoading(false)
    }
  }

  const onPressItem = async (item: NotificationItem) => {
    if (!item.isRead) {
      localReadIds.current.add(item._id)
      setItems((prev) => prev.map((n) => n._id === item._id ? { ...n, isRead: true } : n))
      try {
        const token = await getItem('authToken')
        await axios.post(`${API_URL}/notifications/${item._id}/read`, {}, {
          headers: { Authorization: `Bearer ${token}` }, timeout: 8000,
        })
      } catch { /* silently ignore */ }
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
          <ActivityIndicator size="large" color={C.accent} />
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
          <Feather name="refresh-cw" size={15} color={C.accent} />
        </TouchableOpacity>
      </View>

      {/* ── Stats Row ── */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <MaterialCommunityIcons name="bell-outline" size={20} color={C.accent} />
          <Text style={s.statNum}>{items.length}</Text>
          <Text style={s.statLabel}>Total</Text>
        </View>
        <View style={s.statCard}>
          <MaterialCommunityIcons name="bell-ring-outline" size={20} color={C.danger} />
          <Text style={[s.statNum, { color: C.danger }]}>{unreadCount}</Text>
          <Text style={s.statLabel}>Unread</Text>
        </View>
        <View style={s.statCard}>
          <MaterialCommunityIcons name="bell-check-outline" size={20} color={C.mint} />
          <Text style={[s.statNum, { color: C.mint }]}>{readCount}</Text>
          <Text style={s.statLabel}>Read</Text>
        </View>
      </View>

      {/* ── Error ── */}
      {error ? (
        <View style={s.errorWrap}>
          <Ionicons name="alert-circle" size={16} color={C.danger} style={{ marginRight: 6 }} />
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
              <MaterialCommunityIcons name="bell-off-outline" size={36} color={C.textDim} />
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
              {!item.isRead && <View style={s.unreadDot} />}

              <View style={s.cardTop}>
                <View style={[s.typeIconWrap, { backgroundColor: typeConfig.bg, borderColor: typeConfig.border }]}>
                  <MaterialCommunityIcons name={typeConfig.icon as any} size={18} color={typeConfig.text} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{item.title}</Text>
                  <Text style={s.cardTime}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>

                <View style={[s.typeBadge, { backgroundColor: typeConfig.bg, borderColor: typeConfig.border }]}>
                  <Text style={[s.typeBadgeText, { color: typeConfig.text }]}>
                    {item.type?.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={s.cardMessage}>{item.message}</Text>

              {(item.refModel === 'Product' || item.refModel === 'Order') && (
                <>
                  <View style={s.divider} />
                  <View style={s.cardFooter}>
                    <Feather name="arrow-right-circle" size={13} color={C.textDim} style={{ marginRight: 5 }} />
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
  root:       { flex: 1, backgroundColor: C.bg },
  loader:     { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { color: C.textSub, fontSize: 14 },

  pageHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 20, paddingBottom: 14 },
  pageTitle:    { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: 0.3, marginBottom: 2 },
  pageSubtitle: { fontSize: 12, color: C.textSub },
  refreshBtn:   { width: 38, height: 38, borderRadius: 12, backgroundColor: C.accentGlow, borderWidth: 1, borderColor: C.borderBright, alignItems: 'center', justifyContent: 'center' },

  statsRow: { flexDirection: 'row', paddingHorizontal: 18, gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 12, alignItems: 'center', gap: 4 },
  statNum:  { fontSize: 18, fontWeight: '800', color: C.accent },
  statLabel:{ fontSize: 10, color: C.textSub, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  errorWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 18, marginBottom: 10, backgroundColor: C.dangerBg, borderWidth: 1, borderColor: C.dangerBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  errorText: { color: C.danger, fontSize: 13, fontWeight: '600', flex: 1 },

  emptyState:   { paddingTop: 60, justifyContent: 'center', alignItems: 'center', gap: 10 },
  emptyIconWrap:{ width: 72, height: 72, borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: C.textSub },
  emptySubtitle:{ fontSize: 13, color: C.textDim, textAlign: 'center', paddingHorizontal: 20 },

  card:       { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14, gap: 8, position: 'relative', overflow: 'hidden' },
  cardUnread: { borderColor: C.accentGlow, backgroundColor: C.accentGlow },
  unreadDot:  { position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent },

  cardTop:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  typeIconWrap: { width: 40, height: 40, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cardTitle:    { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2, paddingRight: 20 },
  cardTime:     { fontSize: 11, color: C.textDim },
  typeBadge:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start' },
  typeBadgeText:{ fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  cardMessage:  { fontSize: 13, color: C.textSub, lineHeight: 20 },
  divider:      { height: 1, backgroundColor: C.border },
  cardFooter:   { flexDirection: 'row', alignItems: 'center' },
  cardFooterText:{ fontSize: 11, color: C.textDim, fontWeight: '600' },
})