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
import { useRouter } from 'expo-router'
import { getItem, removeItem, setItem } from '@/utils/storage'

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
} as const

/* ─── Types ─── */
type AvatarShape = string | { url?: string }
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

/* ─── Main component ─── */
export default function UserProfile() {
  const router = useRouter()

  const [user, setUser]             = useState<UserShape | null>(null)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)

  const [name, setName]             = useState('')
  const [address, setAddress]       = useState('')
  const [city, setCity]             = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry]       = useState('')
  const [phoneNo, setPhoneNo]       = useState('')

  const [avatarUri, setAvatarUri]   = useState<string | undefined>()
  const [newAvatar, setNewAvatar]   = useState<NewAvatarFile>(null)

  const headerFade = useRef(new Animated.Value(0)).current

  /* ── Load profile ── */
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
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        })
        const fetched: UserShape = res.data.user
        // The server only stores a combined address string; merge the individual
        // fields (addressObj) that we saved locally so the form stays split.
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
    } finally {
      setLoading(false)
    }
  }

  const hydrate = (parsed: UserShape) => {
    setUser(parsed)
    setName(parsed.name || '')
    if (parsed.addressObj) {
      setAddress(parsed.addressObj.street   || '')
      setCity(parsed.addressObj.city        || '')
      setPostalCode(parsed.addressObj.postalCode || '')
      setCountry(parsed.addressObj.country  || '')
      setPhoneNo(parsed.addressObj.phone    || '')
    } else if (parsed.address) {
      setAddress(parsed.address)
    }
    setAvatarUri(resolveAvatarUrl(parsed.avatar))
  }

  /* ── Avatar picker ── */
  const openAvatarPicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
          title: 'Change Profile Photo',
        },
        idx => {
          if (idx === 1) launchPicker('camera')
          if (idx === 2) launchPicker('gallery')
        },
      )
    } else {
      Alert.alert('Change Profile Photo', 'Select a source', [
        { text: 'Cancel', style: 'cancel' },
        { text: '📷  Take Photo',          onPress: () => launchPicker('camera')  },
        { text: '🖼  Choose from Gallery',  onPress: () => launchPicker('gallery') },
      ])
    }
  }

  const launchPicker = async (mode: 'camera' | 'gallery') => {
    try {
      if (mode === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync()
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Camera access is needed to take a photo.')
          return
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Photo library access is needed.')
          return
        }
      }

      const result = await (mode === 'camera'
        ? ImagePicker.launchCameraAsync({
            allowsEditing: true, aspect: [1, 1], quality: 0.75,
          })
        : ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, aspect: [1, 1], quality: 0.75,
          }))

      if (result.canceled) return
      const asset = result.assets?.[0]
      if (!asset?.uri) return

      const ext      = asset.uri.split('.').pop() || 'jpg'
      const mimeType = asset.mimeType || `image/${ext}`
      const fileName = `avatar_${Date.now()}.${ext}`

      setAvatarUri(asset.uri)
      setNewAvatar({ uri: asset.uri, name: fileName, type: mimeType })
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not open picker.')
    }
  }

  /* ── Save profile ── */
  const saveProfile = async () => {
    try {
      setSaving(true)
      const token = await getItem('authToken')
      if (!token) {
        Alert.alert('Error', 'You must be signed in to save your profile.')
        return
      }

      const addressObj    = { street: address, city, postalCode, country, phone: phoneNo }
      const addressString = [address, city, postalCode, country].filter(Boolean).join(', ')

      let res: any

      if (newAvatar) {
        /* multipart/form-data so multer can read req.file */
        const form = new FormData()
        form.append('name',    name)
        form.append('address', addressString)
        form.append('avatar',  { uri: newAvatar.uri, name: newAvatar.name, type: newAvatar.type } as any)

        res = await axios.put(`${API_URL}/me/update`, form, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
          timeout: 30000,
        })
      } else {
        res = await axios.put(
          `${API_URL}/me/update`,
          { name, address: addressString },
          { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 },
        )
      }

      const updated: UserShape = { ...res.data.user, addressObj }
      setUser(updated)
      setNewAvatar(null)
      // Re-hydrate all form fields from the merged result so nothing gets stale
      hydrate(updated)
      await setItem('user', JSON.stringify(updated))
      Alert.alert('✓ Saved', 'Your profile has been updated.')
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save profile.'
      Alert.alert('Save failed', msg)
    } finally {
      setSaving(false)
    }
  }

  /* ── Sign out ── */
  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          await removeItem('authToken')
          await removeItem('user')
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <View style={s.center}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={s.muted}>Loading profile…</Text>
      </View>
    )
  }

  /* ── No auth ── */
  if (!user) {
    return (
      <View style={s.center}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <Text style={{ fontSize: 48, marginBottom: 12 }}>👤</Text>
        <Text style={s.pageTitle}>Sign in to view your profile</Text>
        <TouchableOpacity style={s.primaryBtn} onPress={() => router.push('/(auth)/login')}>
          <Text style={s.primaryBtnTxt}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ── Header ── */}
          <Animated.View style={[s.header, { opacity: headerFade }]}>
            <View style={s.headerTop}>
              <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                <Text style={s.backBtnTxt}>←</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={s.eyebrow}>◈ ROMEROS</Text>
                <Text style={s.pageTitle}>My Profile</Text>
              </View>
            </View>

            {/* Avatar */}
            <View style={s.avatarSection}>
              <TouchableOpacity style={s.avatarWrap} onPress={openAvatarPicker} activeOpacity={0.85}>
                {avatarUri
                  ? <Image source={{ uri: avatarUri }} style={s.avatar} />
                  : (
                    <View style={s.avatarPlaceholder}>
                      <Text style={s.avatarInitials}>{getInitials(user)}</Text>
                    </View>
                  )
                }
                <View style={s.cameraBadge}><Text style={s.cameraIcon}>📷</Text></View>
              </TouchableOpacity>

              {newAvatar && (
                <View style={s.pendingBadge}>
                  <Text style={s.pendingTxt}>New photo selected — save to apply</Text>
                </View>
              )}

              <Text style={s.userName}>{user?.name || 'No name'}</Text>
              <Text style={s.userEmail}>{user?.email}</Text>
            </View>

            {/* Quick nav */}
            <View style={s.quickNavRow}>
              <TouchableOpacity style={s.quickNavBtn} onPress={() => router.push('/(user)/notifications')}>
                <Text style={s.quickNavTxt}>🔔  Notifications</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.quickNavBtn} onPress={() => router.push('/(user)/orders')}>
                <Text style={s.quickNavTxt}>📦  My Orders</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.quickNavBtn} onPress={() => router.push('/(user)/review')}>
                <Text style={s.quickNavTxt}>★  My Reviews</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ── Form ── */}
          <View style={s.form}>
            <Text style={s.sectionLabel}>PERSONAL INFO</Text>

            <Text style={s.fieldLabel}>Full Name</Text>
            <TextInput value={name} onChangeText={setName} style={s.input} placeholder="Your full name" placeholderTextColor={C.textSub} />

            <Text style={s.sectionLabel}>SHIPPING ADDRESS</Text>

            <Text style={s.fieldLabel}>Street Address</Text>
            <TextInput value={address} onChangeText={setAddress} style={[s.input, s.textArea]} multiline placeholder="Street / apartment / unit" placeholderTextColor={C.textSub} />

            <Text style={s.fieldLabel}>City</Text>
            <TextInput value={city} onChangeText={setCity} style={s.input} placeholder="City" placeholderTextColor={C.textSub} />

            <Text style={s.fieldLabel}>Postal Code</Text>
            <TextInput value={postalCode} onChangeText={setPostalCode} style={s.input} keyboardType="numeric" placeholder="Postal / ZIP code" placeholderTextColor={C.textSub} />

            <Text style={s.fieldLabel}>Country</Text>
            <TextInput value={country} onChangeText={setCountry} style={s.input} placeholder="Country" placeholderTextColor={C.textSub} />

            <Text style={s.sectionLabel}>CONTACT</Text>

            <Text style={s.fieldLabel}>Phone Number</Text>
            <TextInput value={phoneNo} onChangeText={setPhoneNo} style={s.input} keyboardType="phone-pad" placeholder="Mobile / phone number" placeholderTextColor={C.textSub} />
          </View>

          {/* ── Actions ── */}
          <View style={s.actions}>
            <TouchableOpacity style={[s.saveBtn, saving && s.saveBtnDisabled]} onPress={saveProfile} disabled={saving} activeOpacity={0.85}>
              {saving
                ? <ActivityIndicator color={C.bg} size="small" />
                : <Text style={s.saveBtnTxt}>Save Profile</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={s.dangerBtn} onPress={handleSignOut} activeOpacity={0.85}>
              <Text style={s.dangerBtnTxt}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

/* ─── Styles ─── */
const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: C.bg },
  center:     { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },

  header: {
    backgroundColor: C.bgLayer,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 20,
  },
  headerTop:   { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backBtn:     { width: 40, height: 40, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  backBtnTxt:  { color: C.text, fontSize: 20 },
  eyebrow:     { color: C.accent, fontSize: 10, letterSpacing: 3, fontWeight: '700' },
  pageTitle:   { color: C.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },

  avatarSection: { alignItems: 'center', gap: 8 },
  avatarWrap:    { position: 'relative' },
  avatar:        { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: C.accent },
  avatarPlaceholder: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: C.surface, borderWidth: 3, borderColor: C.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { color: C.accentText, fontSize: 36, fontWeight: '800' },
  cameraBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: C.bgLayer,
  },
  cameraIcon:  { fontSize: 14 },
  pendingBadge:{ backgroundColor: 'rgba(0,194,199,0.12)', borderRadius: 8, borderWidth: 1, borderColor: C.accent, paddingHorizontal: 12, paddingVertical: 6 },
  pendingTxt:  { color: C.accentText, fontSize: 12, fontWeight: '600' },
  userName:    { color: C.text, fontSize: 18, fontWeight: '800', marginTop: 4 },
  userEmail:   { color: C.textSub, fontSize: 13 },

  quickNavRow: { gap: 8 },
  quickNavBtn: {
    paddingHorizontal: 16, paddingVertical: 11,
    borderRadius: 10, borderWidth: 1, borderColor: C.accent,
    alignItems: 'center', backgroundColor: 'rgba(0,194,199,0.06)',
  },
  quickNavTxt: { color: C.accent, fontWeight: '700', fontSize: 13 },

  form:         { padding: 20, gap: 6 },
  sectionLabel: { color: C.textSub, fontSize: 11, fontWeight: '800', letterSpacing: 2.5, marginTop: 18, marginBottom: 4 },
  fieldLabel:   { color: C.textBody, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  input: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontSize: 14,
  },
  textArea:     { minHeight: 72, textAlignVertical: 'top' },

  actions:         { paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  saveBtn:         { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnTxt:      { color: C.bg, fontWeight: '800', fontSize: 15 },
  dangerBtn:       { borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: C.danger, backgroundColor: 'rgba(255,90,110,0.06)' },
  dangerBtnTxt:    { color: C.danger, fontWeight: '700', fontSize: 14 },

  muted:        { color: C.textSub, fontSize: 13, marginTop: 8 },
  primaryBtn:   { backgroundColor: C.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  primaryBtnTxt:{ color: C.bg, fontWeight: '800', fontSize: 14 },
  accentText:   {},
})