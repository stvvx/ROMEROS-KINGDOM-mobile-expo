import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native'
import axios from 'axios'
import Constants from 'expo-constants'
import { getItem } from '@/utils/storage'

let API_URL =
  process.env.NGROK_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:4000/api/v1'

const manifest: any =
  (Constants as any).manifest || (Constants as any).expoConfig
const debuggerHost = manifest?.debuggerHost
  ? manifest.debuggerHost.split(':')[0]
  : null

if (debuggerHost && debuggerHost !== 'localhost') {
  API_URL = API_URL.replace('localhost', debuggerHost)
} else if (Platform.OS === 'android' && API_URL.includes('localhost')) {
  API_URL = API_URL.replace('localhost', '10.0.2.2')
}

/** ✅ Vendor REMOVED */
const ROLE_OPTIONS = ['user', 'admin'] as const

interface User {
  _id: string
  name: string
  email: string
  role: 'user' | 'admin'
  avatar?: { url: string }
  isActive: boolean
}

export default function AdminUsers() {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'user' | 'admin'>('user')
  const [userActive, setUserActive] = useState<boolean>(true)
  const [updating, setUpdating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const getAuthHeader = async () => {
    const token = await getItem('authToken')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const headers = await getAuthHeader()
      const res = await axios.get(`${API_URL}/admin/users`, { headers })

      const normalizedUsers = (res.data.users || []).map((u: any) => ({
        ...u,
        isActive: u.isActive !== false, // ✅ normalize
      }))

      setUsers(normalizedUsers)
    } catch {
      Alert.alert('Error', 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const openUserModal = (user: User) => {
    setSelectedUser(user)
    setSelectedRole(user.role)
    setUserActive(user.isActive)
    setModalVisible(true)
  }

  const closeModal = () => {
    setModalVisible(false)
    setSelectedUser(null)
    setUserActive(true)
  }

  const updateUser = async () => {
    if (!selectedUser) return

    try {
      setUpdating(true)
      const headers = {
        'Content-Type': 'application/json',
        ...(await getAuthHeader()),
      }

      await axios.put(
        `${API_URL}/admin/user/${selectedUser._id}`,
        {
          role: selectedRole,
          isActive: userActive, // ✅ FIXED
        },
        { headers }
      )

      Alert.alert('Success', 'User updated')
      closeModal()
      fetchUsers()
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.message || 'Update failed'
      )
    } finally {
      setUpdating(false)
    }
  }

  const getRoleColor = (role: 'user' | 'admin') =>
    role === 'admin' ? '#ff6b6b' : '#4ecdc4'

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading && users.length === 0) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Search users..."
        style={styles.search}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item._id}
        onRefresh={fetchUsers}
        refreshing={loading}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => openUserModal(item)}
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.email}>{item.email}</Text>

            <View style={styles.badges}>
              <Text
                style={[
                  styles.role,
                  { backgroundColor: getRoleColor(item.role) },
                ]}
              >
                {item.role.toUpperCase()}
              </Text>

              {!item.isActive && (
                <Text style={styles.inactive}>INACTIVE</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      />

      {/* MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Edit User</Text>

            {ROLE_OPTIONS.map((role) => (
              <TouchableOpacity
                key={role}
                onPress={() => setSelectedRole(role)}
              >
                <Text
                  style={[
                    styles.option,
                    selectedRole === role && styles.optionActive,
                  ]}
                >
                  {role.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.toggle}
              onPress={() => setUserActive((v) => !v)}
            >
              <Text>
                {userActive ? 'Deactivate Account' : 'Activate Account'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.save}
              onPress={updateUser}
              disabled={updating}
            >
              <Text style={styles.saveText}>
                {updating ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={closeModal}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  loader: { flex: 1, justifyContent: 'center' },
  search: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  name: { fontWeight: '700' },
  email: { fontSize: 12, color: '#666' },
  badges: { flexDirection: 'row', gap: 8, marginTop: 6 },
  role: {
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 10,
  },
  inactive: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    paddingHorizontal: 8,
    borderRadius: 10,
    fontSize: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  option: { padding: 10 },
  optionActive: { backgroundColor: '#e3f2fd' },
  toggle: { marginVertical: 12 },
  save: {
    backgroundColor: '#1976d2',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700' },
  cancel: { textAlign: 'center', marginTop: 10 },
})