// components/AdminHeader.tsx
import React, { useRef, useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Image, Platform, Alert,
} from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'
import { getItem, removeItem } from '@/utils/storage'

const C = {
  bg:         '#2a0508',
  bgLayer:    '#350709',
  surface:    '#420a0e',
  border:     '#5a1015',
  accent:     '#800007',
  accentText: '#c0000a',
  mint:       '#996250',
  text:       '#F9F9F9',
  textSub:    '#c8a090',
  textDim:    '#7a3030',
  danger:     '#FF5A6E',
}

const isWeb = Platform.OS === 'web'

const NAV_ITEMS = [
  { label: 'Dashboard',     path: '/(admin)/dashboard',     icon: 'chart-timeline'         },
  { label: 'Orders',        path: '/(admin)/orders',        icon: 'package-variant-closed' },
  { label: 'Products',      path: '/(admin)/products',      icon: 'package-variant'        },
  { label: 'Categories',    path: '/(admin)/categories',    icon: 'folder-multiple'        },
  { label: 'Vouchers',      path: '/(admin)/vouchers',      icon: 'ticket-percent'         },
  { label: 'Users',         path: '/(admin)/users',         icon: 'account-group'          },
  { label: 'Reviews',       path: '/(admin)/review',        icon: 'star'                   },
  { label: 'Notifications', path: '/(admin)/notifications', icon: 'bell'                   },
]

interface AdminHeaderProps {
  title?: string
  icon?: string
  hideMenu?: boolean
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
  title = 'Dashboard',
  icon  = 'chart-timeline',
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
        } catch {
          setProfile({ name: rawUser })
        }
      }
    }
  }, [])

  useEffect(() => { checkAuth() }, [checkAuth])

  useEffect(() => {
    Animated.parallel([
      Animated.timing(menuSlide, { toValue: menuOpen ? 0 : -300, duration: 280, useNativeDriver: true }),
      Animated.timing(menuOverlayOpacity, { toValue: menuOpen ? 1 : 0, duration: 280, useNativeDriver: true }),
    ]).start()
  }, [menuOpen])

  const handleLogout = async () => {
    try {
      await removeItem('authToken')
      await removeItem('user')
      setIsLoggedIn(false)
      setMenuOpen(false)
      if (Platform.OS === 'web') { window.location.href = '/' }
      else { router.replace('/(auth)/login') }
    } catch {
      Alert.alert('Error', 'Failed to logout. Please try again.')
    }
  }

  const navigate = (path: string) => {
    setMenuOpen(false)
    router.push(path as any)
  }

  return (
    <>
      {/* ── Top Bar ── */}
      <View style={s.wrapper}>
        <View style={s.leftWrap}>
          <MaterialCommunityIcons name={icon as any} size={18} color={C.text} style={{ marginRight: 8 }} />
          <Text style={s.brand}>{title}</Text>
        </View>

        {/* Web: horizontal nav */}
        {isWeb && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.navRow}>
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
                    size={12}
                    color={isActive ? C.text : C.textSub}
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
              <View style={[s.hamburgerLine, { width: 18 }]} />
              <View style={s.hamburgerLine} />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Mobile Drawer ── */}
      {!isWeb && menuOpen && (
        <>
          <Animated.View style={[s.drawerBackdrop, { opacity: menuOverlayOpacity }]}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setMenuOpen(false)} />
          </Animated.View>

          <Animated.View style={[s.drawerPanel, { transform: [{ translateX: menuSlide }] }]}>

            {/* Drawer Header */}
            <View style={s.drawerHeader}>
              <View>
                <Text style={s.drawerEyebrow}>◈ DRIFT N' DASH</Text>
                <Text style={s.drawerTitle}>ADMIN</Text>
              </View>
              <TouchableOpacity style={s.drawerCloseBtn} onPress={() => setMenuOpen(false)}>
                <Feather name="x" size={18} color={C.textSub} />
              </TouchableOpacity>
            </View>

            {/* Profile */}
            {isLoggedIn && (
              <TouchableOpacity style={s.drawerProfile} onPress={() => navigate('/(admin)/dashboard')}>
                <View style={s.drawerAvatarWrap}>
                  {profile?.avatar
                    ? <Image source={{ uri: profile.avatar }} style={s.drawerAvatar} />
                    : <MaterialCommunityIcons name="account-circle" size={32} color={C.accent} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.drawerProfileName}>{profile?.name ?? 'Admin'}</Text>
                  <Text style={s.drawerProfileSub}>Admin Panel →</Text>
                </View>
              </TouchableOpacity>
            )}

            <View style={s.drawerDivider} />

            {/* Nav Items */}
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.path
              return (
                <TouchableOpacity
                  key={item.path}
                  style={[s.drawerItem, isActive && s.drawerItemActive]}
                  onPress={() => navigate(item.path)}
                >
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={18}
                    color={isActive ? C.accentText : C.textSub}
                  />
                  <Text style={[s.drawerItemLabel, isActive && s.drawerItemLabelActive]}>
                    {item.label}
                  </Text>
                  {isActive && <View style={s.drawerActiveIndicator} />}
                </TouchableOpacity>
              )
            })}

            <View style={s.drawerDivider} />

            <TouchableOpacity style={[s.drawerItem, s.drawerItemDanger]} onPress={handleLogout}>
              <Feather name="log-out" size={18} color={C.danger} />
              <Text style={[s.drawerItemLabel, { color: C.danger }]}>Logout</Text>
            </TouchableOpacity>

          </Animated.View>
        </>
      )}
    </>
  )
}

const s = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.bgLayer,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  leftWrap: { flexDirection: 'row', alignItems: 'center' },
  brand:    { color: C.text, fontSize: 15, fontWeight: '700' },

  navRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  activeBtn:   { backgroundColor: C.accent, borderColor: C.accent },
  navLabel:    { color: C.textSub, fontSize: 12, fontWeight: '600' },
  activeLabel: { color: C.text, fontWeight: '800' },

  hamburgerBtn: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center',
  },
  hamburgerLines: { gap: 4, alignItems: 'flex-end' },
  hamburgerLine:  { width: 22, height: 2.5, borderRadius: 2, backgroundColor: C.text },

  drawerBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 200,
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
  drawerEyebrow: { color: C.accent, fontSize: 10, letterSpacing: 3, fontWeight: '700', marginBottom: 4 },
  drawerTitle:   { color: C.text, fontSize: 22, fontWeight: '800', letterSpacing: 2 },
  drawerCloseBtn:{
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },

  drawerProfile: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 16, marginBottom: 16, padding: 14,
    backgroundColor: C.surface, borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
  },
  drawerAvatarWrap: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: 'rgba(128,0,7,0.15)', borderWidth: 1,
    borderColor: 'rgba(128,0,7,0.3)', justifyContent: 'center',
    alignItems: 'center', overflow: 'hidden',
  },
  drawerAvatar:      { width: 48, height: 48, borderRadius: 12 },
  drawerProfileName: { color: C.text, fontSize: 14, fontWeight: '700' },
  drawerProfileSub:  { color: C.accent, fontSize: 11, marginTop: 2 },

  drawerDivider: {
    height: 1, backgroundColor: C.border,
    marginHorizontal: 16, marginVertical: 10,
  },

  drawerItem:            { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 13 },
  drawerItemActive:      { backgroundColor: 'rgba(128,0,7,0.1)', borderLeftWidth: 3, borderLeftColor: C.accent, paddingLeft: 17 },
  drawerItemDanger:      { marginTop: 4 },
  drawerItemLabel:       { flex: 1, color: C.textSub, fontSize: 14, fontWeight: '600', letterSpacing: 0.2 },
  drawerItemLabelActive: { color: C.accentText, fontWeight: '700' },
  drawerActiveIndicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent },
})

export default AdminHeader