import React, { useEffect, useState } from 'react'
import {
  ActionSheetIOS,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import axios from 'axios'
import Constants from 'expo-constants'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'

import AdminHeader from '@/components/adminHeader'
import { getItem, setItem } from '@/utils/storage'

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

type AvatarShape = string | { url?: string }
type UserShape = {
  name?: string
  email?: string
  address?: string
  avatar?: AvatarShape
}
type NewAvatarFile = { uri: string; name: string; type: string } | null

const C = {
  bg: '#020B18',
  bgLayer: '#040F1F',
  surface: '#071828',
  surfaceHigh: '#0A2035',
  border: '#0D2440',
  borderBright: 'rgba(0,168,255,0.45)',
  accent: '#00A8FF',
  accentGlow: 'rgba(0,168,255,0.1)',
  text: '#E8F4FF',
  textSub: 'rgba(120,180,230,0.7)',
  textDim: 'rgba(60,110,170,0.45)',
} as const

function resolveAvatarUrl(avatar?: AvatarShape): string | undefined {
  if (!avatar) return undefined
  if (typeof avatar === 'string') return avatar || undefined
  return avatar.url || undefined
}

function initials(name?: string, email?: string) {
  if (name?.trim()) {
    return name
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }
  return (email?.[0] || 'A').toUpperCase()
}

const AdminProfileScreen: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<UserShape | null>(null)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [avatarUri, setAvatarUri] = useState<string | undefined>()
  const [newAvatar, setNewAvatar] = useState<NewAvatarFile>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const token = await getItem('authToken')
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const res = await axios.get(`${API_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        })

        const fetched: UserShape = res.data?.user || {}
        setUser(fetched)
        setName(fetched.name || '')
        setAddress(fetched.address || '')
        setAvatarUri(resolveAvatarUrl(fetched.avatar))
        await setItem('user', JSON.stringify(fetched))
      } catch {
        const raw = await getItem('user')
        if (raw) {
          const local = JSON.parse(raw) as UserShape
          setUser(local)
          setName(local.name || '')
          setAddress(local.address || '')
          setAvatarUri(resolveAvatarUrl(local.avatar))
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const openAvatarPicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
          title: 'Update Admin Avatar',
        },
        (idx) => {
          if (idx === 1) pickAvatar('camera')
          if (idx === 2) pickAvatar('gallery')
        }
      )
      return
    }

    Alert.alert('Update Admin Avatar', 'Select image source', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take Photo', onPress: () => pickAvatar('camera') },
      { text: 'Choose from Gallery', onPress: () => pickAvatar('gallery') },
    ])
  }

  const pickAvatar = async (mode: 'camera' | 'gallery') => {
    try {
      if (mode === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync()
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera access is required.')
          return
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Photo library access is required.')
          return
        }
      }

      const result = await (mode === 'camera'
        ? ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.75 })
        : ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.75,
          }))

      if (result.canceled) return
      const asset = result.assets?.[0]
      if (!asset?.uri) return

      const ext = asset.uri.split('.').pop() || 'jpg'
      const fileName = `admin_avatar_${Date.now()}.${ext}`
      const mimeType = asset.mimeType || `image/${ext}`

      setAvatarUri(asset.uri)
      setNewAvatar({ uri: asset.uri, name: fileName, type: mimeType })
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Unable to open image picker.')
    }
  }

  const saveProfile = async () => {
    try {
      setSaving(true)
      const token = await getItem('authToken')
      if (!token) {
        Alert.alert('Authentication Required', 'Please log in again.')
        return
      }

      let res: any
      if (newAvatar) {
        const form = new FormData()
        form.append('name', name)
        form.append('address', address)
        form.append('avatar', {
          uri: newAvatar.uri,
          name: newAvatar.name,
          type: newAvatar.type,
        } as any)

        res = await axios.put(`${API_URL}/me/update`, form, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000,
        })
      } else {
        res = await axios.put(
          `${API_URL}/me/update`,
          { name, address },
          { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }
        )
      }

      const updated: UserShape = res.data?.user || { name, address }
      setUser(updated)
      setName(updated.name || '')
      setAddress(updated.address || '')
      setAvatarUri(resolveAvatarUrl(updated.avatar))
      setNewAvatar(null)
      await setItem('user', JSON.stringify(updated))
      Alert.alert('Profile Updated', 'Admin profile saved successfully.')
    } catch (err: any) {
      Alert.alert('Save Failed', err?.response?.data?.message || err?.message || 'Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={s.container}>
      <AdminHeader title="Profile" icon="account-cog-outline" />

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={s.loadingText}>LOADING PROFILE...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.card}>
            <Text style={s.cardTitle}>ADMIN PROFILE</Text>

            <TouchableOpacity style={s.avatarWrap} onPress={openAvatarPicker} activeOpacity={0.85}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={s.avatar} />
              ) : (
                <View style={s.avatarFallback}>
                  <Text style={s.avatarInitials}>{initials(name || user?.name, user?.email)}</Text>
                </View>
              )}
              <View style={s.avatarCameraBadge}>
                <Feather name="camera" size={12} color={C.bg} />
              </View>
            </TouchableOpacity>
            <Text style={s.helperText}>Tap avatar to use camera or choose from gallery</Text>

            <Text style={s.label}>NAME</Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="Admin name"
              placeholderTextColor={C.textDim}
              selectionColor={C.accent}
            />

            <Text style={s.label}>EMAIL</Text>
            <View style={s.readOnlyInput}>
              <Text style={s.readOnlyText}>{user?.email || 'N/A'}</Text>
            </View>

            <Text style={s.label}>ADDRESS</Text>
            <TextInput
              style={[s.input, s.multiline]}
              value={address}
              onChangeText={setAddress}
              placeholder="Address"
              placeholderTextColor={C.textDim}
              multiline
              selectionColor={C.accent}
            />

            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.7 }]} onPress={saveProfile} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={C.bg} />
              ) : (
                <>
                  <MaterialCommunityIcons name="content-save-outline" size={16} color={C.bg} style={{ marginRight: 8 }} />
                  <Text style={s.saveBtnText}>SAVE PROFILE</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  )
}

export default AdminProfileScreen

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: C.textDim, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 16,
  },
  cardTitle: {
    color: C.text,
    fontSize: 16,
    letterSpacing: 2,
    fontWeight: '800',
    marginBottom: 14,
  },

  avatarWrap: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: C.accentGlow,
    borderWidth: 1.5,
    borderColor: C.borderBright,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  avatar: { width: 92, height: 92, borderRadius: 46 },
  avatarFallback: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: C.text, fontWeight: '800', fontSize: 28 },
  avatarCameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.bgLayer,
  },
  helperText: { color: C.textSub, textAlign: 'center', fontSize: 11, marginBottom: 12 },

  label: {
    color: C.textSub,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: 7,
    marginTop: 8,
  },
  input: {
    backgroundColor: C.surfaceHigh,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    color: C.text,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
  },
  multiline: { minHeight: 78, textAlignVertical: 'top' },
  readOnlyInput: {
    backgroundColor: C.surfaceHigh,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  readOnlyText: { color: C.textDim, fontSize: 14 },

  saveBtn: {
    marginTop: 16,
    height: 46,
    borderRadius: 10,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  saveBtnText: { color: C.bg, fontWeight: '800', letterSpacing: 1.2, fontSize: 12 },
})
