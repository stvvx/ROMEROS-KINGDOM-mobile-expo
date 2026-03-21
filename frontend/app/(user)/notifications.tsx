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
import { useRouter, Stack } from 'expo-router'
import { getItem } from '@/utils/storage'
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'

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

/* ─── Palette — Blue Robotics ─── */
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
  textBody:    'rgba(160,200,240,0.75)',
  danger:      '#FF4060',
  dangerBg:    'rgba(255,64,96,0.08)',
  dangerBorder:'rgba(255,64,96,0.22)',
  success:     '#00D4AA',
  warn:        '#F59E0B',
  warnBg:      'rgba(245,158,11,0.1)',
  warnBorder:  'rgba(245,158,11,0.28)',
} as const

const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace'

/* ─── Type meta — icon names + colors per notification type ─── */
const TYPE_META: Record<string, {
  iconLib: 'mci' | 'feather' | 'ion';
  iconName: string;
  color: string;
  bg: string;
  border: string;
  tag: string;
}> = {
  order:   { iconLib: 'mci',     iconName: 'package-variant-closed', color: C.accent,  bg: C.accentGlow,    border: C.borderBright,               tag: 'ORDER'   },
  review:  { iconLib: 'mci',     iconName: 'star-outline',           color: C.warn,    bg: C.warnBg,        border: C.warnBorder,                  tag: 'REVIEW'  },
  product: { iconLib: 'feather', iconName: 'shopping-bag',           color: C.success, bg: 'rgba(0,212,170,0.08)', border: 'rgba(0,212,170,0.3)',   tag: 'PRODUCT' },
  system:  { iconLib: 'ion',     iconName: 'notifications-outline',  color: C.textSub, bg: 'rgba(120,180,230,0.06)', border: 'rgba(120,180,230,0.2)', tag: 'SYSTEM'  },
}

function getMeta(type: string) {
  return TYPE_META[type] ?? TYPE_META.system
}

function TypeIcon({ type, size, color }: { type: string; size: number; color: string }) {
  const m = getMeta(type)
  if (m.iconLib === 'mci')     return <MaterialCommunityIcons name={m.iconName as any} size={size} color={color} />
  if (m.iconLib === 'feather') return <Feather name={m.iconName as any} size={size} color={color} />
  return <Ionicons name={m.iconName as any} size={size} color={color} />
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
  item, onClose, onNavigate,
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

  return (
    <Animated.View style={[ds.overlay, { opacity }]}>
      <TouchableOpacity style={ds.backdrop} activeOpacity={1} onPress={close} />
      <Animated.View style={[ds.sheet, { transform: [{ translateY: slideY }] }]}>
        {/* Handle */}
        <View style={ds.handle} />

        {/* Corner accents on sheet */}
        <View style={[ds.cornerTL, { borderColor: meta.color }]} />
        <View style={[ds.cornerTR, { borderColor: meta.color }]} />

        {/* Banner */}
        <View style={[ds.banner, { backgroundColor: meta.bg, borderColor: meta.border }]}>
          <View style={[ds.bannerIconWrap, { backgroundColor: meta.bg, borderColor: meta.border }]}>
            <TypeIcon type={item.type} size={20} color={meta.color} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={ds.bannerTagRow}>
              <View style={ds.bannerTagTick} />
              <Text style={[ds.bannerType, { color: meta.color }]}>{meta.tag}</Text>
            </View>
            <Text style={ds.bannerTime}>
              {new Date(item.createdAt).toLocaleString()}
            </Text>
          </View>
          {!item.isRead && <View style={[ds.unreadDot, { backgroundColor: meta.color }]} />}
        </View>

        {/* Title */}
        <Text style={ds.detailTitle}>{item.title}</Text>

        {/* Message box */}
        <View style={ds.msgBox}>
          <View style={[ds.msgRail, { backgroundColor: meta.color }]} />
          <Text style={ds.msgText}>{item.message}</Text>
        </View>

        {/* Deep-link CTA */}
        {hasDeepLink && (
          <TouchableOpacity
            style={[ds.ctaBtn, { borderColor: meta.color, backgroundColor: meta.bg, overflow: 'hidden' }]}
            onPress={onNavigate}
          >
            <View style={ds.ctaBtnScan} />
            <TypeIcon type={item.type} size={14} color={meta.color} />
            <Text style={[ds.ctaTxt, { color: meta.color }]}>
              {item.refModel === 'Order' ? '  VIEW ORDER DETAILS' : '  VIEW PRODUCT'}
            </Text>
            <Feather name="arrow-right" size={13} color={meta.color} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        )}

        {/* Close */}
        <TouchableOpacity style={ds.closeBtn} onPress={close}>
          <Text style={ds.closeTxt}>[ CLOSE ]</Text>
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
  const [items,     setItems]     = useState<NotificationItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const [refreshing,setRefreshing]= useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [needsAuth, setNeedsAuth] = useState(false)
  const [selected,  setSelected]  = useState<NotificationItem | null>(null)

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

  const openDetail = (item: NotificationItem) => {
    setSelected(item)
    if (!item.isRead) markRead(item._id)
  }

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
      <View style={s.center}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <View style={s.authIconWrap}>
          <Ionicons name="notifications-off-outline" size={36} color={C.textDim} />
        </View>
        <Text style={s.authTitle}>NOT AUTHENTICATED</Text>
        <Text style={s.authSub}>Sign in to view your notifications</Text>
        <TouchableOpacity style={s.primaryBtn} onPress={() => router.push('/(auth)/login')}>
          <View style={s.primaryBtnScan} />
          <Feather name="shield" size={14} color={C.bg} style={{ marginRight: 8 }} />
          <Text style={s.primaryBtnText}>SIGN IN</Text>
        </TouchableOpacity>
      </View>
    )
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <View style={s.center}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={s.muted}>LOADING SIGNALS...</Text>
      </View>
    )
  }

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ══════════════════════════════════
          HEADER
      ══════════════════════════════════ */}
      <Animated.View style={[s.header, { opacity: headerFade }]}>
        {/* Status bar row */}
        <View style={s.statusBar}>
          <View style={s.statusLeft}>
            <View style={s.statusPulse} />
            <Text style={s.statusText}>SYSTEM ONLINE</Text>
          </View>
          <Text style={s.statusText}>RK-OS v2.4</Text>
        </View>

        {/* Title row */}
        <View style={s.headerTop}>
          <TouchableOpacity 
            style={s.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="chevron-left" size={20} color={C.accent} />
          </TouchableOpacity>
          <View style={s.headerLeft}>
            <View style={s.headerTick} />
            <View>
              <Text style={s.eyebrow}>ROMERO'S KINGDOM</Text>
              <Text style={s.pageTitle}>SIGNALS</Text>
            </View>
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity style={s.markAllBtn} onPress={markAllRead}>
              <Feather name="check-circle" size={13} color={C.accent} style={{ marginRight: 5 }} />
              <Text style={s.markAllTxt}>MARK ALL READ</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Unread banner */}
        {unreadCount > 0 && (
          <View style={s.unreadBanner}>
            <View style={s.unreadBannerDot} />
            <Text style={s.unreadBannerTxt}>
              {unreadCount} UNREAD SIGNAL{unreadCount > 1 ? 'S' : ''} PENDING
            </Text>
          </View>
        )}
      </Animated.View>

      {error ? (
        <View style={s.errorRow}>
          <Feather name="alert-triangle" size={13} color={C.danger} />
          <Text style={s.error}> {error}</Text>
        </View>
      ) : null}

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
          <View style={s.emptyBox}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="notifications-off-outline" size={36} color={C.textDim} />
            </View>
            <Text style={s.emptyTitle}>ALL CLEAR</Text>
            <Text style={s.muted}>No signals received yet.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const meta = getMeta(item.type)
          return (
            <TouchableOpacity
              style={[
                s.card,
                item.isRead && s.cardRead,
                !item.isRead && { borderColor: meta.border },
              ]}
              activeOpacity={0.88}
              onPress={() => openDetail(item)}
            >
              {/* Left color strip */}
              <View style={[s.typeStrip, { backgroundColor: meta.color }]} />

              <View style={s.cardInner}>
                {/* Top row */}
                <View style={s.cardTop}>
                  <View style={s.cardTitleRow}>
                    {/* Icon badge */}
                    <View style={[s.cardIconBadge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                      <TypeIcon type={item.type} size={13} color={meta.color} />
                    </View>
                    <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
                  </View>
                  {!item.isRead && (
                    <View style={[s.unreadDot, { backgroundColor: meta.color }]} />
                  )}
                </View>

                {/* Message */}
                <Text style={s.cardMessage} numberOfLines={2}>{item.message}</Text>

                {/* Footer */}
                <View style={s.cardFooter}>
                  <View style={[s.typeBadge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                    <Text style={[s.typeBadgeTxt, { color: meta.color }]}>{meta.tag}</Text>
                  </View>
                  <Text style={s.cardTime}>
                    {new Date(item.createdAt).toLocaleString()}
                  </Text>
                </View>

                {/* Deep link hint */}
                {(item.refModel === 'Order' || item.refModel === 'Product') && (
                  <Text style={[s.tapHint, { color: meta.color }]}>
                    TAP TO VIEW DETAILS →
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )
        }}
      />

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
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center:    { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },

  /* Auth guard */
  authIconWrap: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: C.accentGlow, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  authTitle: { color: C.text,    fontSize: 14, fontWeight: '800', letterSpacing: 2.5, fontFamily: MONO },
  authSub:   { color: C.textDim, fontSize: 11, letterSpacing: 0.8 },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.accent, paddingHorizontal: 24, paddingVertical: 13,
    borderRadius: 10, overflow: 'hidden',
    shadowColor: C.accent, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 14, elevation: 8,
  },
  primaryBtnScan: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  primaryBtnText: { color: C.bg, fontWeight: '800', fontSize: 12, letterSpacing: 2, fontFamily: MONO },

  muted: { color: C.textDim, fontSize: 11, letterSpacing: 2, fontFamily: MONO },

  /* Header */
  header: {
    backgroundColor: C.bgLayer,
    paddingTop: Platform.OS === 'ios' ? 52 : 34,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  statusBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 5,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.bg,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusPulse: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: C.success,
    shadowColor: C.success, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9, shadowRadius: 4, elevation: 2,
  },
  statusText: { color: C.textDim, fontSize: 9, fontWeight: '700', letterSpacing: 1.8, fontFamily: MONO },

  headerTop:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  backBtn:     { width: 36, height: 36, borderRadius: 8, backgroundColor: C.accentGlow, borderWidth: 1, borderColor: C.borderBright, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTick:  { width: 3, height: 30, borderRadius: 2, backgroundColor: C.accent },
  eyebrow:     { color: C.accent, fontSize: 9, letterSpacing: 2.5, fontWeight: '700', fontFamily: MONO },
  pageTitle:   { color: C.text,   fontSize: 22, fontWeight: '900', letterSpacing: 3, fontFamily: MONO },
  markAllBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 9, borderWidth: 1, borderColor: C.borderBright,
    backgroundColor: C.accentGlow,
  },
  markAllTxt: { color: C.accent, fontWeight: '700', fontSize: 10, letterSpacing: 1.5, fontFamily: MONO },
  unreadBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: C.accentGlow,
    borderRadius: 9, borderWidth: 1, borderColor: C.borderBright,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  unreadBannerDot: {
    width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.accent,
    shadowColor: C.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 4, elevation: 2,
  },
  unreadBannerTxt: { color: C.accentText, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, fontFamily: MONO },

  /* Error */
  errorRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  error:    { color: C.danger, fontSize: 12 },

  /* Notification Card */
  card: {
    backgroundColor: C.surface,
    borderRadius: 13, borderWidth: 1, borderColor: C.border,
    flexDirection: 'row', overflow: 'hidden',
  },
  cardRead:     { opacity: 0.5 },
  typeStrip:    { width: 3 },
  cardInner:    { flex: 1, padding: 14, gap: 7 },
  cardTop:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
  cardIconBadge: {
    width: 28, height: 28, borderRadius: 8,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  cardTitle:    { color: C.text, fontSize: 14, fontWeight: '700', flex: 1, lineHeight: 19 },
  unreadDot:    { width: 9, height: 9, borderRadius: 5, marginLeft: 6 },
  cardMessage:  { color: C.textBody, fontSize: 12, lineHeight: 18 },
  cardFooter:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  typeBadge:    { borderRadius: 6, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3 },
  typeBadgeTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2, fontFamily: MONO },
  cardTime:     { color: C.textDim, fontSize: 10, flex: 1, textAlign: 'right', fontFamily: MONO },
  tapHint:      { fontSize: 10, fontWeight: '700', letterSpacing: 1, fontFamily: MONO, marginTop: 2 },

  /* Empty */
  emptyBox:    { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: C.accentGlow, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle:  { color: C.textSub, fontSize: 14, fontWeight: '800', letterSpacing: 2.5, fontFamily: MONO },
})

/* ─────────────────────────────────────────
   Detail Sheet Styles
───────────────────────────────────────── */
const ds = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'flex-end', zIndex: 200,
  },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.75)' },
  sheet: {
    backgroundColor: C.bgLayer,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    borderColor: C.border,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 28, gap: 14,
  },
  /* Corner ticks on sheet top corners */
  cornerTL: { position: 'absolute', top: -1, left: -1,  width: 14, height: 14, borderTopWidth: 2, borderLeftWidth: 2,  borderTopLeftRadius: 24 },
  cornerTR: { position: 'absolute', top: -1, right: -1, width: 14, height: 14, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 24 },
  handle: {
    alignSelf: 'center', width: 42, height: 4,
    borderRadius: 2, backgroundColor: C.border, marginBottom: 4,
  },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, borderWidth: 1, padding: 14,
  },
  bannerIconWrap: {
    width: 42, height: 42, borderRadius: 11,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  bannerTagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  bannerTagTick:{ width: 2, height: 9, borderRadius: 1, backgroundColor: 'currentColor', opacity: 0.7 },
  bannerType:   { fontSize: 10, fontWeight: '800', letterSpacing: 2.5, fontFamily: MONO },
  bannerTime:   { color: C.textDim, fontSize: 11, fontFamily: MONO },
  unreadDot:    { width: 9, height: 9, borderRadius: 5 },
  detailTitle:  { color: C.text, fontSize: 18, fontWeight: '800', lineHeight: 26, letterSpacing: 0.5 },
  msgBox: {
    backgroundColor: C.surface, borderRadius: 11,
    borderWidth: 1, borderColor: C.border,
    padding: 16, flexDirection: 'row', gap: 12, overflow: 'hidden',
  },
  msgRail: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  msgText: { flex: 1, color: C.textBody, fontSize: 13, lineHeight: 21 },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 10, borderWidth: 1.5,
  },
  ctaBtnScan: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.15)' },
  ctaTxt:    { fontWeight: '800', fontSize: 12, letterSpacing: 2, fontFamily: MONO },
  closeBtn: {
    paddingVertical: 13, borderRadius: 10,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center',
  },
  closeTxt: { color: C.textSub, fontWeight: '700', fontSize: 12, letterSpacing: 2, fontFamily: MONO },
})