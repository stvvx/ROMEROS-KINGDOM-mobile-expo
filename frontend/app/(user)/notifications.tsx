import React, { useEffect, useRef, useState } from 'react'
import {
  Animated,
  FlatList,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native'
import axios from 'axios'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import { getItem } from '@/utils/storage'

/* ─── API URL ─── */
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

/* ─── Design tokens ─── */
const C = {
  bg:         '#0E1117',
  bgLayer:    '#12151F',
  surface:    '#1A1E2E',
  border:     '#1F2540',
  accent:     '#00C2C7',
  accentText: '#00E5EB',
  text:       '#E8EDF5',
  textSub:    '#7A859E',
  textBody:   '#C6CCDC',
  danger:     '#FF5A6E',
  warning:    '#FFB347',
  mint:       '#3DFFC0',
  info:       '#6EA8FE',
} as const

/* ─── Type icons / colours per notification type ─── */
const TYPE_META: Record<string, { icon: string; color: string; bg: string }> = {
  order:   { icon: '📦', color: C.info,    bg: 'rgba(110,168,254,0.12)' },
  review:  { icon: '★',  color: C.mint,    bg: 'rgba(61,255,192,0.10)'  },
  product: { icon: '🛍',  color: C.accent,  bg: 'rgba(0,194,199,0.10)'   },
  system:  { icon: '🔔', color: C.warning, bg: 'rgba(255,179,71,0.12)'  },
}
function getMeta(type: string) {
  return TYPE_META[type] ?? TYPE_META.system
}

/* ─── Interfaces ─── */
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

/* ─────────────────────────────────────────
   Detail Sheet
───────────────────────────────────────── */
const DetailSheet = ({
  item,
  onClose,
  onNavigate,
}: {
  item: NotificationItem
  onClose: () => void
  onNavigate: () => void
}) => {
  const slideY  = useRef(new Animated.Value(60)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.timing(slideY,  { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start()
  }, [])

  const close = () => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideY,  { toValue: 60, duration: 200, useNativeDriver: true }),
    ]).start(onClose)
  }

  const meta = getMeta(item.type)
  const hasDeepLink =
    (item.refModel === 'Product' && !!item.refId) ||
    (item.refModel === 'Order'   && !!item.refId)

  const deepLinkLabel =
    item.refModel === 'Order'   ? '📦  View Order Details →' :
    item.refModel === 'Product' ? '🛍  View Product →'       : null

  return (
    <Animated.View style={[ds.overlay, { opacity }]}>
      {/* Backdrop */}
      <TouchableOpacity style={ds.backdrop} activeOpacity={1} onPress={close} />

      {/* Sheet */}
      <Animated.View style={[ds.sheet, { transform: [{ translateY: slideY }] }]}>

        {/* Handle */}
        <View style={ds.handle} />

        {/* Type banner */}
        <View style={[ds.banner, { backgroundColor: meta.bg, borderColor: meta.color }]}>
          <Text style={ds.bannerIcon}>{meta.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[ds.bannerType, { color: meta.color }]}>
              {item.type.toUpperCase()}
            </Text>
            <Text style={ds.bannerTime}>
              {new Date(item.createdAt).toLocaleString()}
            </Text>
          </View>
          {!item.isRead && <View style={ds.unreadDot} />}
        </View>

        {/* Title */}
        <Text style={ds.detailTitle}>{item.title}</Text>

        {/* Message body */}
        <View style={ds.msgBox}>
          <Text style={ds.msgText}>{item.message}</Text>
        </View>

        {/* Deep-link CTA */}
        {hasDeepLink && deepLinkLabel && (
          <TouchableOpacity style={[ds.ctaBtn, { borderColor: meta.color }]} onPress={onNavigate}>
            <Text style={[ds.ctaTxt, { color: meta.color }]}>{deepLinkLabel}</Text>
          </TouchableOpacity>
        )}

        {/* Close */}
        <TouchableOpacity style={ds.closeBtn} onPress={close}>
          <Text style={ds.closeTxt}>Close</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  )
}

/* ─────────────────────────────────────────
   Main Screen
───────────────────────────────────────── */
export default function UserNotifications() {
  const router = useRouter()
  const [items, setItems]         = useState<NotificationItem[]>([])
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [needsAuth, setNeedsAuth] = useState(false)
  const [selected, setSelected]   = useState<NotificationItem | null>(null)

  const headerFade = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 420, useNativeDriver: true }).start()
    load()
  }, [])

  const load = async (opts?: { silent?: boolean }) => {
    try {
      opts?.silent ? setRefreshing(true) : setLoading(true)
      setError(null)
      const token = await getItem('authToken')
      if (!token) { setNeedsAuth(true); setItems([]); return }
      setNeedsAuth(false)
      const res = await axios.get(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 12000,
      })
      setItems(res.data.notifications || [])
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load notifications')
    } finally {
      opts?.silent ? setRefreshing(false) : setLoading(false)
    }
  }

  const markRead = async (id: string) => {
    try {
      const token = await getItem('authToken')
      if (!token) return
      await axios.post(`${API_URL}/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setItems(prev => prev.map(it => it._id === id ? { ...it, isRead: true } : it))
    } catch { /* non-blocking */ }
  }

  const markAllRead = async () => {
    try {
      const token = await getItem('authToken')
      if (!token) return
      await axios.post(`${API_URL}/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setItems(prev => prev.map(it => ({ ...it, isRead: true })))
    } catch { /* non-blocking */ }
  }

  /* Open the sheet and mark as read */
  const openDetail = (item: NotificationItem) => {
    setSelected(item)
    if (!item.isRead) markRead(item._id)
  }

  /* Navigate away from detail sheet */
  const handleNavigate = (item: NotificationItem) => {
    setSelected(null)
    if (item.refModel === 'Order' && item.refId) {
      router.push({ pathname: '/(user)/orders', params: { orderId: item.refId } })
    } else if (item.refModel === 'Product' && item.refId) {
      router.push({ pathname: '/(user)/ProductDetails', params: { id: item.refId } })
    }
  }

  const unreadCount = items.filter(i => !i.isRead).length

  /* ── Auth guard ── */
  if (!loading && needsAuth) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <Text style={{ fontSize: 36, marginBottom: 12 }}>🔔</Text>
        <Text style={styles.pageTitle}>Sign in to view notifications</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.primaryBtnText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    )
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.muted}>Loading notifications…</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnTxt}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>◈ ROMEROS</Text>
            <Text style={styles.pageTitle}>Notifications</Text>
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
              <Text style={styles.markAllTxt}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Unread pill */}
        {unreadCount > 0 && (
          <View style={styles.unreadBanner}>
            <Text style={styles.unreadBannerTxt}>
              🔔  {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </Animated.View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={items}
        keyExtractor={item => item._id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load({ silent: true })}
            tintColor={C.accent}
            colors={[C.accent]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🔔</Text>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.muted}>No notifications yet.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const meta = getMeta(item.type)
          return (
            <TouchableOpacity
              style={[
                styles.card,
                item.isRead && styles.cardRead,
                !item.isRead && { borderColor: meta.color },
              ]}
              activeOpacity={0.88}
              onPress={() => openDetail(item)}
            >
              {/* Left colour strip */}
              <View style={[styles.typeStrip, { backgroundColor: meta.color }]} />

              <View style={styles.cardInner}>
                <View style={styles.cardTop}>
                  {/* Icon + title */}
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.typeIcon}>{meta.icon}</Text>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  </View>

                  {/* Unread dot */}
                  {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: meta.color }]} />}
                </View>

                <Text style={styles.cardMessage} numberOfLines={2}>{item.message}</Text>

                <View style={styles.cardFooter}>
                  <View style={[styles.typeBadge, { backgroundColor: meta.bg, borderColor: meta.color }]}>
                    <Text style={[styles.typeBadgeTxt, { color: meta.color }]}>
                      {item.type.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.cardTime}>
                    {new Date(item.createdAt).toLocaleString()}
                  </Text>
                </View>

                {(item.refModel === 'Order' || item.refModel === 'Product') && (
                  <Text style={[styles.tapHint, { color: meta.color }]}>
                    Tap to view details →
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )
        }}
      />

      {/* Detail sheet */}
      {selected && (
        <DetailSheet
          item={selected}
          onClose={() => setSelected(null)}
          onNavigate={() => handleNavigate(selected)}
        />
      )}
    </View>
  )
}

/* ─────────────────────────────────────────
   Styles
───────────────────────────────────────── */
const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: C.bg },
  center:     { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },

  /* Header */
  header: {
    backgroundColor: C.bgLayer,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTop:   { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 },
  backBtn:     { width: 40, height: 40, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  backBtnTxt:  { color: C.text, fontSize: 20 },
  eyebrow:     { color: C.accent, fontSize: 10, letterSpacing: 3, fontWeight: '700' },
  pageTitle:   { color: C.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  markAllBtn:  { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: C.accent },
  markAllTxt:  { color: C.accent, fontWeight: '700', fontSize: 12 },
  unreadBanner: { backgroundColor: 'rgba(0,194,199,0.10)', borderRadius: 10, borderWidth: 1, borderColor: C.accent, paddingHorizontal: 14, paddingVertical: 8 },
  unreadBannerTxt: { color: C.accentText, fontSize: 13, fontWeight: '600' },

  /* Card */
  card: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardRead:    { opacity: 0.65 },
  typeStrip:   { width: 4 },
  cardInner:   { flex: 1, padding: 14, gap: 6 },
  cardTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  typeIcon:    { fontSize: 16 },
  cardTitle:   { color: C.text, fontSize: 15, fontWeight: '700', flex: 1 },
  unreadDot:   { width: 9, height: 9, borderRadius: 5, marginLeft: 6 },
  cardMessage: { color: C.textBody, fontSize: 13, lineHeight: 19 },
  cardFooter:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  typeBadge:   { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeTxt:{ fontSize: 10, fontWeight: '700' },
  cardTime:    { color: C.textSub, fontSize: 11, flex: 1, textAlign: 'right' },
  tapHint:     { fontSize: 11, fontWeight: '700', marginTop: 2 },

  /* Empty */
  emptyBox:    { alignItems: 'center', marginTop: 60, gap: 6 },
  emptyTitle:  { color: C.text, fontSize: 18, fontWeight: '700' },
  muted:       { color: C.textSub, fontSize: 13 },

  error: { color: C.danger, paddingHorizontal: 16, paddingVertical: 8 },
  primaryBtn:  { backgroundColor: C.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  primaryBtnText: { color: C.bg, fontWeight: '800', fontSize: 14 },

  /* unused — kept to avoid missing ref if imported elsewhere */
  surface: {},
})

/* ─── Detail sheet styles (separate to avoid name collision) ─── */
const ds = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 200,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: C.bgLayer,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderColor: C.border,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    gap: 14,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    marginBottom: 6,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  bannerIcon:  { fontSize: 28 },
  bannerType:  { fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  bannerTime:  { color: C.textSub, fontSize: 12, marginTop: 2 },
  unreadDot:   { width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent },
  detailTitle: { color: C.text, fontSize: 20, fontWeight: '800', lineHeight: 28 },
  msgBox: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  msgText: { color: C.textBody, fontSize: 14, lineHeight: 22 },
  ctaBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  ctaTxt:  { fontWeight: '800', fontSize: 14 },
  closeBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  closeTxt: { color: C.textSub, fontWeight: '600', fontSize: 14 },
})