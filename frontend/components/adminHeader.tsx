// components/AdminHeader.tsx
import React, { useRef, useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Image, Platform, Alert,
} from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'
import { getItem, removeItem } from '@/utils/storage'

/* ─── Palette — Blue Robotics (Admin) ─── */
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
} as const

const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace'
const isWeb = Platform.OS === 'web'

/* ─── Nav items ─── */
const NAV_ITEMS = [
  { label: 'DASHBOARD',     path: '/(admin)/dashboard',     icon: 'chart-timeline'         },
  { label: 'ORDERS',        path: '/(admin)/orders',        icon: 'package-variant-closed' },
  { label: 'PRODUCTS',      path: '/(admin)/products',      icon: 'package-variant'        },
  { label: 'CATEGORIES',    path: '/(admin)/categories',    icon: 'folder-multiple'        },
  { label: 'VOUCHERS',      path: '/(admin)/vouchers',      icon: 'ticket-percent'         },
  { label: 'USERS',         path: '/(admin)/users',         icon: 'account-group'          },
  { label: 'REVIEWS',       path: '/(admin)/review',        icon: 'star-outline'           },
  { label: 'SIGNALS',       path: '/(admin)/notifications', icon: 'bell-outline'           },
  { label: 'PROFILE',       path: '/(admin)/profile',       icon: 'account-cog-outline'    },
]

interface AdminHeaderProps {
  title?: string
  icon?: string
  hideMenu?: boolean
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
  title    = 'Dashboard',
  icon     = 'chart-timeline',
  hideMenu = false,
}) => {
  const router   = useRouter()
  const pathname = usePathname()

  const [menuOpen,   setMenuOpen  ] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [profile,    setProfile   ] = useState<{ name?: string; avatar?: string } | null>(null)

  const menuSlide          = useRef(new Animated.Value(-300)).current
  const menuOverlayOpacity = useRef(new Animated.Value(0)).current

  const checkAuth = useCallback(async () => {
    const token = await getItem('authToken')
    setIsLoggedIn(!!token)
    if (token) {
      const rawUser = await getItem('user')
      if (rawUser) {
        try {
          const u = JSON.parse(rawUser)
          setProfile({ name: u.name, avatar: u.avatar?.url || u.avatar || undefined })
        } catch { setProfile({ name: rawUser }) }
      }
    }
  }, [])

  useEffect(() => { checkAuth() }, [checkAuth, pathname])

  useEffect(() => {
    Animated.parallel([
      Animated.timing(menuSlide,          { toValue: menuOpen ? 0 : -300, duration: 280, useNativeDriver: true }),
      Animated.timing(menuOverlayOpacity, { toValue: menuOpen ? 1 : 0,    duration: 280, useNativeDriver: true }),
    ]).start()
  }, [menuOpen])

  const handleLogout = async () => {
    try {
      await removeItem('authToken')
      await removeItem('user')
      setIsLoggedIn(false)
      setMenuOpen(false)

      const goToLogin = () => {
        if (Platform.OS === 'web') {
          window.location.href = '/'
        } else {
          router.replace('/(auth)/login')
        }
      }

      if (Platform.OS === 'web') {
        window.alert('You have been logged out successfully.')
        goToLogin()
      } else {
        Alert.alert('Logged Out', 'You have been logged out successfully.', [
          { text: 'OK', onPress: goToLogin },
        ])
      }
    } catch { Alert.alert('Error', 'Failed to logout. Please try again.') }
  }

  const navigate = (path: string) => {
    setMenuOpen(false)
    router.push(path as any)
  }

  return (
    <>
      {/* ══════════════════════════════════
          TOP BAR
      ══════════════════════════════════ */}
      <View style={s.wrapper}>
        {/* Status dot + brand */}
        <View style={s.leftWrap}>
          <View style={s.brandIconWrap}>
            <MaterialCommunityIcons name={icon as any} size={16} color={C.accent} />
            <View style={s.brandDot} />
          </View>
          <View>
            <Text style={s.brandEyebrow}>ROMEROS KINGDOM</Text>
            <Text style={s.brand}>{title.toUpperCase()}</Text>
          </View>
        </View>

        {/* Web: horizontal nav pills */}
        {isWeb && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.navRow}
          >
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.path
              return (
                <TouchableOpacity
                  key={item.path}
                  style={[s.navBtn, isActive && s.activeBtn]}
                  onPress={() => router.push(item.path as any)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={11}
                    color={isActive ? C.bg : C.textSub}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={[s.navLabel, isActive && s.activeLabel]}>{item.label}</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        )}

        {/* Mobile: hamburger */}
        {!isWeb && isLoggedIn && !hideMenu && (
          <TouchableOpacity style={s.hamburgerBtn} onPress={() => setMenuOpen(true)}>
            <View style={s.hamburgerLines}>
              <View style={s.hamburgerLine} />
              <View style={[s.hamburgerLine, s.hamburgerLineMid]} />
              <View style={s.hamburgerLine} />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* ══════════════════════════════════
          MOBILE DRAWER
      ══════════════════════════════════ */}
      {!isWeb && menuOpen && (
        <>
          <Animated.View style={[s.drawerBackdrop, { opacity: menuOverlayOpacity }]}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setMenuOpen(false)} />
          </Animated.View>

          <Animated.View style={[s.drawerPanel, { transform: [{ translateX: menuSlide }] }]}>

            {/* Drawer header */}
            <View style={s.drawerHeader}>
              {/* Brand icon + wordmark */}
              <View style={s.drawerBrandRow}>
                <View style={s.drawerBrandIcon}>
                  <MaterialCommunityIcons name="shield-crown-outline" size={18} color={C.accent} />
                </View>
                <View>
                  <Text style={s.drawerEyebrow}>ROMERO'S KINGDOM</Text>
                  <Text style={s.drawerTitle}>ADMIN</Text>
                </View>
              </View>
              <TouchableOpacity style={s.drawerCloseBtn} onPress={() => setMenuOpen(false)}>
                <Feather name="x" size={16} color={C.textSub} />
              </TouchableOpacity>
            </View>

            {/* Profile card */}
            {isLoggedIn && (
              <TouchableOpacity style={s.drawerProfile} onPress={() => navigate('/(admin)/profile')}>
                <View style={s.drawerAvatarWrap}>
                  {profile?.avatar
                    ? <Image source={{ uri: profile.avatar }} style={s.drawerAvatar} />
                    : <MaterialCommunityIcons name="account-circle" size={30} color={C.accent} />
                  }
                  {/* Online dot */}
                  <View style={s.avatarOnlineDot} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.drawerProfileName}>{profile?.name ?? 'ADMIN'}</Text>
                  <Text style={s.drawerProfileSub}>ADMIN PANEL →</Text>
                </View>
                <View style={s.drawerProfileBadge}>
                  <MaterialCommunityIcons name="shield-crown-outline" size={12} color={C.accent} />
                </View>
              </TouchableOpacity>
            )}

            <View style={s.drawerDivider} />

            {/* Nav items */}
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.path
              return (
                <TouchableOpacity
                  key={item.path}
                  style={[s.drawerItem, isActive && s.drawerItemActive]}
                  onPress={() => navigate(item.path)}
                >
                  {/* Icon badge */}
                  <View style={[
                    s.drawerItemIconWrap,
                    isActive && { backgroundColor: C.accentGlow, borderColor: C.borderBright },
                  ]}>
                    <MaterialCommunityIcons
                      name={item.icon as any}
                      size={15}
                      color={isActive ? C.accent : C.textSub}
                    />
                  </View>
                  <Text style={[s.drawerItemLabel, isActive && s.drawerItemLabelActive]}>
                    {item.label}
                  </Text>
                  {isActive && <View style={s.drawerActiveIndicator} />}
                </TouchableOpacity>
              )
            })}

            <View style={s.drawerDivider} />

            {/* Logout */}
            <TouchableOpacity style={[s.drawerItem, s.drawerItemDanger]} onPress={handleLogout}>
              <View style={[s.drawerItemIconWrap, { backgroundColor: C.dangerBg, borderColor: C.dangerBorder }]}>
                <Feather name="log-out" size={15} color={C.danger} />
              </View>
              <Text style={[s.drawerItemLabel, { color: C.danger }]}>SIGN OUT</Text>
            </TouchableOpacity>

          </Animated.View>
        </>
      )}
    </>
  )
}

/* ─────────────────────────────────────────
   Styles
───────────────────────────────────────── */
const s = StyleSheet.create({
  /* Top bar */
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.bgLayer,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  leftWrap:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandIconWrap: {
    width: 36, height: 36, borderRadius: 9,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderBright,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.accent, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  brandDot: {
    position: 'absolute', top: 2, right: 2,
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: C.success,
    shadowColor: C.success, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9, shadowRadius: 4, elevation: 2,
  },
  brandEyebrow: { color: C.accent, fontSize: 7, letterSpacing: 2, fontWeight: '700', fontFamily: MONO },
  brand:        { color: C.text, fontSize: 13, fontWeight: '800', letterSpacing: 2, fontFamily: MONO },

  /* Web nav */
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, paddingHorizontal: 8 },
  navBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: 18, borderWidth: 1, borderColor: C.border,
  },
  activeBtn:   { backgroundColor: C.accent, borderColor: C.accent },
  navLabel:    { color: C.textSub, fontSize: 10, fontWeight: '700', letterSpacing: 1, fontFamily: MONO },
  activeLabel: { color: C.bg, fontWeight: '800' },

  /* Hamburger */
  hamburgerBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center',
  },
  hamburgerLines:  { gap: 4, alignItems: 'flex-end' },
  hamburgerLine:   { width: 20, height: 2, borderRadius: 2, backgroundColor: C.text },
  hamburgerLineMid:{ width: 14, backgroundColor: C.accent, opacity: 0.8 },

  /* Drawer */
  drawerBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 200,
  },
  drawerPanel: {
    position: 'absolute', top: 0, left: 0, bottom: 0, width: 280,
    backgroundColor: C.bgLayer,
    borderRightWidth: 1, borderRightColor: C.border,
    zIndex: 201,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 40,
  },

  drawerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 20,
  },
  drawerBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  drawerBrandIcon:{
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderBright,
    alignItems: 'center', justifyContent: 'center',
  },
  drawerEyebrow: { color: C.accent, fontSize: 8, letterSpacing: 2.5, fontWeight: '700', fontFamily: MONO, marginBottom: 2 },
  drawerTitle:   { color: C.text, fontSize: 20, fontWeight: '800', letterSpacing: 2.5, fontFamily: MONO },
  drawerCloseBtn:{
    width: 34, height: 34, borderRadius: 9,
    backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },

  drawerProfile: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 14, padding: 13,
    backgroundColor: C.surface, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
  },
  drawerAvatarWrap: {
    width: 46, height: 46, borderRadius: 11,
    backgroundColor: C.accentGlow, borderWidth: 1.5, borderColor: C.borderBright,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  drawerAvatar:     { width: 46, height: 46, borderRadius: 11 },
  avatarOnlineDot:  {
    position: 'absolute', top: 2, right: 2,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: C.success, borderWidth: 1.5, borderColor: C.bgLayer,
    shadowColor: C.success, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9, shadowRadius: 4, elevation: 3,
  },
  drawerProfileName:  { color: C.text, fontSize: 13, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.5 },
  drawerProfileSub:   { color: C.accent, fontSize: 9, marginTop: 2, fontFamily: MONO, letterSpacing: 1 },
  drawerProfileBadge: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: C.accentGlow, borderWidth: 1, borderColor: C.borderBright,
    alignItems: 'center', justifyContent: 'center',
  },

  drawerDivider: { height: 1, backgroundColor: C.border, marginHorizontal: 16, marginVertical: 10 },

  drawerItem:            { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 11 },
  drawerItemActive:      { backgroundColor: C.accentGlow, borderLeftWidth: 2.5, borderLeftColor: C.accent, paddingLeft: 13.5 },
  drawerItemDanger:      { marginTop: 4 },
  drawerItemIconWrap:    { width: 32, height: 32, borderRadius: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  drawerItemLabel:       { flex: 1, color: C.textSub, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, fontFamily: MONO },
  drawerItemLabelActive: { color: C.accentText },
  drawerActiveIndicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent, shadowColor: C.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 4, elevation: 2 },
})

export default AdminHeader