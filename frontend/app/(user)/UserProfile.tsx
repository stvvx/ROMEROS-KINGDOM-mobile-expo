import React, { useEffect, useRef, useState } from 'react'
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import axios from 'axios'
import Constants from 'expo-constants'
import { useRouter, Stack } from 'expo-router'
import { getItem, removeItem, setItem } from '@/utils/storage'
import { getApiUrl } from '@/store/api'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'

/* ─── API URL ─── */
let API_URL = getApiUrl()

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
  textBody:    'rgba(160,200,240,0.75)',
  textDim:     'rgba(60,110,170,0.45)',
  danger:      '#FF4060',
  dangerBg:    'rgba(255,64,96,0.08)',
  dangerBorder:'rgba(255,64,96,0.22)',
  success:     '#00D4AA',
} as const

const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace'

/* ─── Types ─── */
type AvatarShape  = string | { url?: string }
type NewAvatarFile = { uri: string; name: string; type: string } | null

type UserShape = {
  name?: string
  email?: string
  avatar?: AvatarShape
  address?: string
  addressObj?: {
    street?: string
    city?: string
    postalCode?: string
    country?: string
    phone?: string
  }
}

/* ─── Helpers ─── */
function resolveAvatarUrl(avatar?: AvatarShape): string | undefined {
  if (!avatar) return undefined
  if (typeof avatar === 'string') return avatar || undefined
  return avatar.url || undefined
}

function getInitials(user?: UserShape | null) {
  return (
    user?.name
      ?.split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    'U'
  )
}

/* ─────────────────────────────────────────
   Field Component
───────────────────────────────────────── */
interface FieldProps {
  label: string
  value: string
  onChangeText: (t: string) => void
  placeholder: string
  keyboardType?: any
  multiline?: boolean
  leftIcon?: React.ReactNode
}

const Field: React.FC<FieldProps> = ({
  label, value, onChangeText, placeholder,
  keyboardType, multiline, leftIcon,
}) => {
  const [focused, setFocused] = useState(false)
  return (
    <View style={fi.group}>
      <View style={fi.labelRow}>
        <View style={fi.tick} />
        <Text style={fi.label}>{label}</Text>
      </View>
      <View style={[fi.wrap, focused && fi.wrapFocused, multiline && fi.wrapMulti]}>
        <View style={fi.rail} />
        {leftIcon && <View style={fi.iconWrap}>{leftIcon}</View>}
        <TextInput
          style={[fi.input, multiline && fi.inputMulti]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.textDim}
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={C.accent}
        />
      </View>
    </View>
  )
}

const fi = StyleSheet.create({
  group:      { marginBottom: 14 },
  labelRow:   { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  tick:       { width: 2.5, height: 10, borderRadius: 1.5, backgroundColor: C.accent },
  label:      { fontSize: 9, fontWeight: '700', color: C.accent, letterSpacing: 2, fontFamily: MONO },
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,168,255,0.04)',
    borderWidth: 1, borderColor: C.border,
    borderRadius: 9, overflow: 'hidden', minHeight: 48,
  },
  wrapFocused:{ borderColor: C.accent, backgroundColor: 'rgba(0,168,255,0.08)' },
  wrapMulti:  { alignItems: 'flex-start', minHeight: 80 },
  rail:       { width: 3, alignSelf: 'stretch', backgroundColor: C.accentDim },
  iconWrap:   { paddingLeft: 12, paddingRight: 4, paddingTop: 2 },
  input:      { flex: 1, color: C.text, fontSize: 14, paddingHorizontal: 12, paddingVertical: 13, height: 48, fontFamily: MONO },
  inputMulti: { height: undefined, minHeight: 80 },
})

/* ─────────────────────────────────────────
   Quick Nav Button
───────────────────────────────────────── */
interface QuickNavBtnProps {
  label: string
  icon: React.ReactNode
  onPress: () => void
}

const QuickNavBtn: React.FC<QuickNavBtnProps> = ({ label, icon, onPress }) => (
  <TouchableOpacity style={s.quickNavBtn} onPress={onPress} activeOpacity={0.8}>
    <View style={s.quickNavIconWrap}>{icon}</View>
    <Text style={s.quickNavTxt}>{label}</Text>
    <Feather name="arrow-right" size={12} color={C.accentDim} />
  </TouchableOpacity>
)

/* ─────────────────────────────────────────
   Main Component
───────────────────────────────────────── */
export default function UserProfile() {
  const router = useRouter()

  const [user,       setUser]       = useState<UserShape | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [name,       setName]       = useState('')
  const [address,    setAddress]    = useState('')
  const [city,       setCity]       = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country,    setCountry]    = useState('')
  const [phoneNo,    setPhoneNo]    = useState('')
  const [avatarUri,  setAvatarUri]  = useState<string | undefined>()
  const [newAvatar,  setNewAvatar]  = useState<NewAvatarFile>(null)

  const headerFade = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 420, useNativeDriver: true }).start()
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const token = await getItem('authToken')
      if (!token) { setLoading(false); return }
      try {
        const res = await axios.get(`${API_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` }, timeout: 10000,
        })
        const fetched: UserShape = res.data.user
        const cached = await getItem('user')
        if (cached) {
          const local = JSON.parse(cached) as UserShape
          if (local.addressObj) fetched.addressObj = local.addressObj
        }
        await setItem('user', JSON.stringify(fetched))
        hydrate(fetched)
      } catch {
        const raw = await getItem('user')
        if (raw) hydrate(JSON.parse(raw))
      }
    } finally { setLoading(false) }
  }

  const hydrate = (parsed: UserShape) => {
    setUser(parsed)
    setName(parsed.name || '')
    if (parsed.addressObj) {
      setAddress(parsed.addressObj.street       || '')
      setCity(parsed.addressObj.city            || '')
      setPostalCode(parsed.addressObj.postalCode || '')
      setCountry(parsed.addressObj.country      || '')
      setPhoneNo(parsed.addressObj.phone        || '')
    } else if (parsed.address) {
      setAddress(parsed.address)
    }
    setAvatarUri(resolveAvatarUrl(parsed.avatar))
  }

  const openAvatarPicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Take Photo', 'Choose from Library'], cancelButtonIndex: 0, title: 'Update Unit Avatar' },
        idx => { if (idx === 1) launchPicker('camera'); if (idx === 2) launchPicker('gallery') },
      )
    } else {
      Alert.alert('Update Unit Avatar', 'Select a source', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo',         onPress: () => launchPicker('camera')  },
        { text: 'Choose from Gallery', onPress: () => launchPicker('gallery') },
      ])
    }
  }

  const launchPicker = async (mode: 'camera' | 'gallery') => {
    try {
      if (mode === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync()
        if (status !== 'granted') { Alert.alert('Permission Required', 'Camera access is needed.'); return }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (status !== 'granted') { Alert.alert('Permission Required', 'Photo library access is needed.'); return }
      }
      const result = await (mode === 'camera'
        ? ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.75 })
        : ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.75 }))
      if (result.canceled) return
      const asset = result.assets?.[0]
      if (!asset?.uri) return
      const guessedExt = asset.uri.split('.').pop()?.split('?')[0]?.toLowerCase()
      const rawExt = guessedExt && /^[a-z0-9]+$/.test(guessedExt) ? guessedExt : 'jpg'
      const ext = rawExt === 'heic' || rawExt === 'heif' ? 'jpg' : rawExt
      const mimeType = asset.mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`
      const fileName = `avatar_${Date.now()}.${ext}`
      setAvatarUri(asset.uri)
      setNewAvatar({ uri: asset.uri, name: fileName, type: mimeType })
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not open picker.')
    }
  }

  const saveProfile = async () => {
    try {
      setSaving(true)
      const token = await getItem('authToken')
      if (!token) { Alert.alert('Error', 'You must be signed in.'); return }
      const addressObj    = { street: address, city, postalCode, country, phone: phoneNo }
      const addressString = [address, city, postalCode, country].filter(Boolean).join(', ')
      let res: any
      if (newAvatar) {
        const form = new FormData()
        form.append('name',    name)
        form.append('address', addressString)
        form.append('avatar',  { uri: newAvatar.uri, name: newAvatar.name, type: newAvatar.type } as any)
        res = await axios.put(`${API_URL}/me/update`, form, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000,
        })
      } else {
        res = await axios.put(`${API_URL}/me/update`, { name, address: addressString }, {
          headers: { Authorization: `Bearer ${token}` }, timeout: 15000,
        })
      }
      const updated: UserShape = { ...res.data.user, addressObj }
      setUser(updated); setNewAvatar(null); hydrate(updated)
      await setItem('user', JSON.stringify(updated))
      Alert.alert('PROFILE UPDATED', 'Your operator profile has been saved.')
    } catch (err: any) {
      Alert.alert('SAVE FAILED', err?.response?.data?.message || err?.message || 'Failed to save profile.')
    } finally { setSaving(false) }
  }

  const handleSignOut = () => {
    Alert.alert('CONFIRM SIGN OUT', 'Your session will be terminated. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          await removeItem('authToken')
          await removeItem('user')
          if (Platform.OS === 'web') {
            window.alert('You have been logged out successfully.')
            router.replace('/(auth)/login')
          } else {
            Alert.alert('Logged Out', 'You have been logged out successfully.', [
              { text: 'OK', onPress: () => router.replace('/(auth)/login') },
            ])
          }
        },
      },
    ])
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <View style={s.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={s.muted}>SYNCING PROFILE...</Text>
      </View>
    )
  }

  /* ── No auth ── */
  if (!user) {
    return (
      <View style={s.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <View style={s.authIconWrap}>
          <Feather name="user" size={32} color={C.textDim} />
        </View>
        <Text style={s.authTitle}>NOT AUTHENTICATED</Text>
        <Text style={s.authSub}>Sign in to access your profile</Text>
        <TouchableOpacity style={s.primaryBtn} onPress={() => router.push('/(auth)/login')}>
          <View style={s.primaryBtnScan} />
          <Feather name="shield" size={13} color={C.bg} style={{ marginRight: 7 }} />
          <Text style={s.primaryBtnTxt}>SIGN IN</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ══════════════════════════════════
              HEADER
          ══════════════════════════════════ */}
          <Animated.View style={[s.header, { opacity: headerFade }]}>
            {/* Status bar */}
            <View style={s.statusBar}>
              <View style={s.statusLeft}>
                <View style={s.statusPulse} />
                <Text style={s.statusText}>SYSTEM ONLINE</Text>
              </View>
              <Text style={s.statusText}>RK-OS v2.4</Text>
            </View>

            {/* Title */}
            <View style={s.titleRow}>
              <TouchableOpacity 
                style={s.backBtn}
                onPress={() => router.back()}
                activeOpacity={0.7}
              >
                <Feather name="chevron-left" size={20} color={C.accent} />
              </TouchableOpacity>
              <View style={s.titleTick} />
              <View>
                <Text style={s.eyebrow}>ROMERO'S KINGDOM</Text>
                <Text style={s.pageTitle}>OPERATOR PROFILE</Text>
              </View>
            </View>

            {/* Avatar section */}
            <View style={s.avatarSection}>
              <TouchableOpacity style={s.avatarOuter} onPress={openAvatarPicker} activeOpacity={0.85}>
                {/* Cyan glow ring */}
                <View style={s.avatarRing} />
                {avatarUri
                  ? <Image source={{ uri: avatarUri }} style={s.avatar} />
                  : (
                    <View style={s.avatarPlaceholder}>
                      <Text style={s.avatarInitials}>{getInitials(user)}</Text>
                    </View>
                  )
                }
                {/* Camera badge */}
                <View style={s.cameraBadge}>
                  <Feather name="camera" size={11} color={C.bg} />
                </View>
                {/* Status dot */}
                <View style={s.avatarStatusDot} />
              </TouchableOpacity>

              {newAvatar && (
                <View style={s.pendingBadge}>
                  <Feather name="image" size={11} color={C.accentText} style={{ marginRight: 6 }} />
                  <Text style={s.pendingTxt}>NEW AVATAR SELECTED — SAVE TO APPLY</Text>
                </View>
              )}

              <Text style={s.userName}>{user?.name || 'OPERATOR'}</Text>
              <Text style={s.userEmail}>{user?.email}</Text>
            </View>

            {/* Quick nav row */}
            <View style={s.quickNavRow}>
              <QuickNavBtn
                label="NOTIFICATIONS"
                icon={<Ionicons name="notifications-outline" size={15} color={C.accent} />}
                onPress={() => router.push('/(user)/notifications')}
              />
              <QuickNavBtn
                label="MY ORDERS"
                icon={<MaterialCommunityIcons name="package-variant-closed" size={15} color={C.accent} />}
                onPress={() => router.push('/(user)/orders')}
              />
              <QuickNavBtn
                label="MY REVIEWS"
                icon={<Ionicons name="star-outline" size={15} color={C.accent} />}
                onPress={() => router.push('/(user)/review')}
              />
            </View>
          </Animated.View>

          {/* ══════════════════════════════════
              FORM
          ══════════════════════════════════ */}
          <View style={s.form}>
            {/* Personal info */}
            <View style={s.sectionLabelRow}>
              <View style={s.sectionTick} />
              <Text style={s.sectionLabel}>PERSONAL INFO</Text>
            </View>

            <Field
              label="Operator Name"
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              leftIcon={<Feather name="user" size={14} color={C.textSub} />}
            />

            {/* Shipping address */}
            <View style={[s.sectionLabelRow, { marginTop: 10 }]}>
              <View style={s.sectionTick} />
              <Text style={s.sectionLabel}>DELIVERY COORDINATES</Text>
            </View>

            <Field
              label="Street Address"
              value={address}
              onChangeText={setAddress}
              placeholder="Street / apartment / unit"
              multiline
              leftIcon={<Feather name="map-pin" size={14} color={C.textSub} />}
            />

            <View style={s.fieldRow}>
              <View style={{ flex: 1 }}>
                <Field label="City"        value={city}       onChangeText={setCity}       placeholder="City" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Postal Code" value={postalCode} onChangeText={setPostalCode} placeholder="ZIP" keyboardType="numeric" />
              </View>
            </View>

            <Field
              label="Country"
              value={country}
              onChangeText={setCountry}
              placeholder="Country"
              leftIcon={<Feather name="globe" size={14} color={C.textSub} />}
            />

            {/* Contact */}
            <View style={[s.sectionLabelRow, { marginTop: 10 }]}>
              <View style={s.sectionTick} />
              <Text style={s.sectionLabel}>CONTACT CHANNEL</Text>
            </View>

            <Field
              label="Phone Number"
              value={phoneNo}
              onChangeText={setPhoneNo}
              placeholder="Mobile / phone number"
              keyboardType="phone-pad"
              leftIcon={<Feather name="phone" size={14} color={C.textSub} />}
            />
          </View>

          {/* ══════════════════════════════════
              ACTIONS
          ══════════════════════════════════ */}
          <View style={s.actions}>
            <TouchableOpacity
              style={[s.saveBtn, saving && s.saveBtnDisabled]}
              onPress={saveProfile}
              disabled={saving}
              activeOpacity={0.85}
            >
              <View style={s.saveBtnScan} />
              {saving
                ? <ActivityIndicator color={C.bg} size="small" />
                : (
                  <>
                    <Feather name="zap" size={14} color={C.bg} style={{ marginRight: 8 }} />
                    <Text style={s.saveBtnTxt}>SAVE PROFILE</Text>
                    <Feather name="arrow-right" size={14} color={C.bg} style={{ marginLeft: 8 }} />
                  </>
                )
              }
            </TouchableOpacity>

            <TouchableOpacity style={s.dangerBtn} onPress={handleSignOut} activeOpacity={0.85}>
              <Feather name="log-out" size={14} color={C.danger} style={{ marginRight: 8 }} />
              <Text style={s.dangerBtnTxt}>SIGN OUT</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

/* ─────────────────────────────────────────
   Styles
───────────────────────────────────────── */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center:    { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },

  /* Auth / loading states */
  authIconWrap:  { width: 80, height: 80, borderRadius: 20, backgroundColor: C.accentGlow, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  authTitle:     { color: C.text,    fontSize: 14, fontWeight: '800', letterSpacing: 2.5, fontFamily: MONO },
  authSub:       { color: C.textDim, fontSize: 11 },
  muted:         { color: C.textDim, fontSize: 10, letterSpacing: 2.5, fontFamily: MONO, marginTop: 10 },
  primaryBtn:    { flexDirection: 'row', alignItems: 'center', backgroundColor: C.accent, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 10, overflow: 'hidden', shadowColor: C.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 14, elevation: 8 },
  primaryBtnScan:{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  primaryBtnTxt: { color: C.bg, fontWeight: '800', fontSize: 12, letterSpacing: 2, fontFamily: MONO },

  /* Header */
  header: {
    backgroundColor: C.bgLayer,
    paddingTop: Platform.OS === 'ios' ? 52 : 34,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 20,
    gap: 0,
  },
  statusBar:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.bg },
  statusLeft:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusPulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.success, shadowColor: C.success, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 4, elevation: 2 },
  statusText:  { color: C.textDim, fontSize: 9, fontWeight: '700', letterSpacing: 1.8, fontFamily: MONO },

  titleRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 14 },
  backBtn:   { width: 36, height: 36, borderRadius: 8, backgroundColor: C.accentGlow, borderWidth: 1, borderColor: C.borderBright, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  titleTick: { width: 3, height: 30, borderRadius: 2, backgroundColor: C.accent },
  eyebrow:   { color: C.accent, fontSize: 9, letterSpacing: 2.5, fontWeight: '700', fontFamily: MONO },
  pageTitle: { color: C.text, fontSize: 18, fontWeight: '900', letterSpacing: 3, fontFamily: MONO },

  /* Avatar */
  avatarSection: { alignItems: 'center', gap: 8, paddingTop: 4, paddingBottom: 16 },
  avatarOuter:   { position: 'relative', marginBottom: 4 },
  avatarRing: {
    position: 'absolute', inset: -4,
    borderRadius: 65,
    borderWidth: 1.5, borderColor: C.borderBright,
    shadowColor: C.accent, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 14, elevation: 6,
  },
  avatar:            { width: 110, height: 110, borderRadius: 55, borderWidth: 2.5, borderColor: C.accent },
  avatarPlaceholder: { width: 110, height: 110, borderRadius: 55, backgroundColor: C.surface, borderWidth: 2.5, borderColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  avatarInitials:    { color: C.accentText, fontSize: 34, fontWeight: '800', fontFamily: MONO },
  cameraBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: C.bgLayer,
    shadowColor: C.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 6, elevation: 4,
  },
  avatarStatusDot: {
    position: 'absolute', top: 4, left: 4,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: C.success, borderWidth: 2, borderColor: C.bgLayer,
    shadowColor: C.success, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 5, elevation: 3,
  },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.accentGlow, borderRadius: 8, borderWidth: 1, borderColor: C.borderBright, paddingHorizontal: 12, paddingVertical: 6 },
  pendingTxt:   { color: C.accentText, fontSize: 9, fontWeight: '700', letterSpacing: 1.2, fontFamily: MONO },
  userName:     { color: C.text, fontSize: 16, fontWeight: '800', marginTop: 4, fontFamily: MONO, letterSpacing: 1 },
  userEmail:    { color: C.textDim, fontSize: 12, fontFamily: MONO },

  /* Quick nav */
  quickNavRow:     { gap: 8, paddingHorizontal: 20 },
  quickNavBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 10, borderWidth: 1,
    borderColor: C.borderBright, backgroundColor: C.accentGlow,
  },
  quickNavIconWrap:{ width: 28, height: 28, borderRadius: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  quickNavTxt:     { flex: 1, color: C.accentText, fontWeight: '700', fontSize: 11, letterSpacing: 1.5, fontFamily: MONO },

  /* Form */
  form:           { padding: 20, gap: 2 },
  sectionLabelRow:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, marginTop: 6 },
  sectionTick:    { width: 2.5, height: 12, borderRadius: 1.5, backgroundColor: C.accent },
  sectionLabel:   { color: C.accent, fontSize: 9, fontWeight: '700', letterSpacing: 2.5, fontFamily: MONO },
  fieldRow:       { flexDirection: 'row', gap: 12 },

  /* Actions */
  actions:        { paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.accent, borderRadius: 12, paddingVertical: 15,
    overflow: 'hidden',
    shadowColor: C.accent, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65, shadowRadius: 16, elevation: 10,
  },
  saveBtnScan:    { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  saveBtnDisabled:{ opacity: 0.55 },
  saveBtnTxt:     { color: C.bg, fontWeight: '800', fontSize: 13, letterSpacing: 2, fontFamily: MONO },
  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, paddingVertical: 14,
    borderWidth: 1, borderColor: C.dangerBorder, backgroundColor: C.dangerBg,
  },
  dangerBtnTxt: { color: C.danger, fontWeight: '700', fontSize: 12, letterSpacing: 2, fontFamily: MONO },
})