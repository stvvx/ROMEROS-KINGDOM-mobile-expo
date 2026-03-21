import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal,
  ScrollView,
  TextInput,
  Pressable,
} from 'react-native'
import axios from 'axios'
import Constants from 'expo-constants'
import { getItem } from '@/utils/storage'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import AdminHeader from '@/components/adminHeader'

// ─── API CONFIG ───────────────────────────────────────────────
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

// ─── DESIGN TOKENS ────────────────────────────────────────────
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

// ─── TYPES ────────────────────────────────────────────────────
const ROLE_OPTIONS = ['user', 'admin'] as const

interface User {
  _id: string
  name: string
  email: string
  role: 'user' | 'admin'
  avatar?: { url: string }
  isActive: boolean
}

// ─── AVATAR INITIALS ─────────────────────────────────────────
const Avatar: React.FC<{ name: string; role: 'user' | 'admin' }> = ({ name, role }) => {
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  return (
    <View style={[av.circle, role === 'admin' ? av.admin : av.user]}>
      <Text style={av.text}>{initials}</Text>
    </View>
  )
}

const av = StyleSheet.create({
  circle: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  admin:  { backgroundColor: 'rgba(255,90,110,0.15)', borderWidth: 1, borderColor: 'rgba(255,90,110,0.3)' },
  user:   { backgroundColor: 'rgba(128,0,7,0.15)',    borderWidth: 1, borderColor: 'rgba(128,0,7,0.3)'   },
  text:   { color: C.text, fontSize: 15, fontWeight: '700' },
})

// ─── CUSTOM ALERT MODAL ───────────────────────────────────────
interface ThemedAlertProps {
  visible: boolean
  type: 'success' | 'error'
  title: string
  message: string
  onClose: () => void
}

const ThemedAlert: React.FC<ThemedAlertProps> = ({ visible, type, title, message, onClose }) => {
  const isSuccess = type === 'success'
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={al.overlay} onPress={onClose}>
        <Pressable style={al.card} onPress={() => {}}>
          <View style={[al.iconWrap, isSuccess ? al.iconSuccess : al.iconError]}>
            <Ionicons name={isSuccess ? 'checkmark-circle' : 'alert-circle'} size={32} color={isSuccess ? C.mint : C.danger} />
          </View>
          <Text style={al.title}>{title}</Text>
          <Text style={al.message}>{message}</Text>
          <View style={al.divider} />
          <TouchableOpacity style={[al.btn, isSuccess ? al.btnSuccess : al.btnError]} onPress={onClose} activeOpacity={0.85}>
            <Text style={al.btnText}>{isSuccess ? 'Great!' : 'Got it'}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const al = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  card:        { width: '100%', backgroundColor: C.bgLayer, borderRadius: 22, borderWidth: 1, borderColor: C.border, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 24 }, shadowOpacity: 0.6, shadowRadius: 40, elevation: 20 },
  iconWrap:    { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  iconSuccess: { backgroundColor: 'rgba(153,98,80,0.12)', borderWidth: 1, borderColor: 'rgba(153,98,80,0.3)'  },
  iconError:   { backgroundColor: 'rgba(255,90,110,0.10)', borderWidth: 1, borderColor: 'rgba(255,90,110,0.28)' },
  title:       { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 8, textAlign: 'center' },
  message:     { fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  divider:     { width: '100%', height: 1, backgroundColor: C.border, marginBottom: 20 },
  btn:         { width: '100%', borderRadius: 13, paddingVertical: 14, alignItems: 'center', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  btnSuccess:  { backgroundColor: C.accent, shadowColor: C.accent },
  btnError:    { backgroundColor: C.danger, shadowColor: C.danger },
  btnText:     { color: C.text, fontSize: 15, fontWeight: '700' },
})

// ─── MAIN SCREEN ─────────────────────────────────────────────
export default function AdminUsers() {
  const [loading,       setLoading      ] = useState(true)
  const [users,         setUsers        ] = useState<User[]>([])
  const [selectedUser,  setSelectedUser ] = useState<User | null>(null)
  const [modalVisible,  setModalVisible ] = useState(false)
  const [selectedRole,  setSelectedRole ] = useState<'user' | 'admin'>('user')
  const [userActive,    setUserActive   ] = useState(true)
  const [updating,      setUpdating     ] = useState(false)
  const [searchQuery,   setSearchQuery  ] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('asc')

  const [alertVisible,  setAlertVisible ] = useState(false)
  const [alertType,     setAlertType    ] = useState<'success' | 'error'>('success')
  const [alertTitle,    setAlertTitle   ] = useState('')
  const [alertMessage,  setAlertMessage ] = useState('')

  const showAlert = (type: 'success' | 'error', title: string, message: string) => {
    setAlertType(type); setAlertTitle(title); setAlertMessage(message); setAlertVisible(true)
  }

  useEffect(() => { fetchUsers() }, [])

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
        isActive: typeof u.isActive === 'boolean' ? u.isActive : true,
      }))
      setUsers(normalizedUsers)
    } catch {
      showAlert('error', 'Failed to Load', 'Could not fetch users. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const openUserModal = (user: User) => {
    setSelectedUser(user); setSelectedRole(user.role); setUserActive(user.isActive); setModalVisible(true)
  }

  const closeModal = () => { setModalVisible(false); setSelectedUser(null); setUserActive(true) }

  const updateUser = async () => {
    if (!selectedUser) return
    try {
      setUpdating(true)
      const headers = { 'Content-Type': 'application/json', ...(await getAuthHeader()) }
      await axios.put(`${API_URL}/admin/user/${selectedUser._id}`, { role: selectedRole, isActive: userActive }, { headers })
      closeModal()
      fetchUsers()
      showAlert('success', 'User Updated', `${selectedUser.name}'s account has been updated successfully.`)
    } catch (err: any) {
      showAlert('error', 'Update Failed', err?.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const av = (a?.name || '').toLowerCase()
    const bv = (b?.name || '').toLowerCase()
    const cmp = av.localeCompare(bv)
    return sortDir === 'asc' ? cmp : -cmp
  })

  const adminCount  = users.filter(u => u.role === 'admin').length
  const activeCount = users.filter(u => u.isActive).length

  if (loading && users.length === 0) {
    return (
      <View style={s.root}>
        <AdminHeader title="Users" icon="account-group" />
        <View style={s.loader}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={s.loaderText}>Loading users...</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={s.root}>
      <AdminHeader title="Users" icon="account-group" />

      <ThemedAlert
        visible={alertVisible}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />

      {/* ── Page Header ── */}
      <View style={s.pageHeader}>
        <View>
          <Text style={s.pageTitle}>User Management</Text>
          <Text style={s.pageSubtitle}>Manage roles and account status</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            style={s.refreshBtn}
            onPress={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            activeOpacity={0.85}
          >
            <Feather name={sortDir === 'asc' ? 'arrow-up' : 'arrow-down'} size={15} color={C.accent} />
          </TouchableOpacity>
          <TouchableOpacity style={s.refreshBtn} onPress={fetchUsers}>
            <Feather name="refresh-cw" size={15} color={C.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Stats Row ── */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <MaterialCommunityIcons name="account-multiple" size={20} color={C.accent} />
          <Text style={s.statNum}>{users.length}</Text>
          <Text style={s.statLabel}>Total</Text>
        </View>
        <View style={s.statCard}>
          <MaterialCommunityIcons name="shield-crown" size={20} color={C.danger} />
          <Text style={[s.statNum, { color: C.danger }]}>{adminCount}</Text>
          <Text style={s.statLabel}>Admins</Text>
        </View>
        <View style={s.statCard}>
          <Ionicons name="checkmark-circle" size={20} color={C.mint} />
          <Text style={[s.statNum, { color: C.mint }]}>{activeCount}</Text>
          <Text style={s.statLabel}>Active</Text>
        </View>
        <View style={s.statCard}>
          <Feather name="pause-circle" size={20} color="#ffca28" />
          <Text style={[s.statNum, { color: '#ffca28' }]}>{users.length - activeCount}</Text>
          <Text style={s.statLabel}>Inactive</Text>
        </View>
      </View>

      {/* ── Search ── */}
      <View style={[s.searchWrap, searchFocused && s.searchWrapFocused]}>
        <Feather name="search" size={16} color={C.textSub} style={{ marginRight: 10 }} />
        <TextInput
          placeholder="Search by name or email..."
          style={s.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={C.textDim}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        {!!searchQuery && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={15} color={C.textSub} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={s.resultsCount}>
        {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}{searchQuery ? ` for "${searchQuery}"` : ''}
      </Text>

      {/* ── List ── */}
      {filteredUsers.length === 0 ? (
        <View style={s.emptyState}>
          <View style={s.emptyIconWrap}>
            <MaterialCommunityIcons name="account-search" size={36} color={C.textDim} />
          </View>
          <Text style={s.emptyTitle}>No users found</Text>
          <Text style={s.emptySubtitle}>Try a different search term</Text>
        </View>
      ) : (
        <FlatList
          data={sortedUsers}
          keyExtractor={(item) => item._id}
          onRefresh={fetchUsers}
          refreshing={loading}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => openUserModal(item)} activeOpacity={0.75}>
              <View style={s.cardLeft}>
                <Avatar name={item.name} role={item.role} />
                <View style={s.cardInfo}>
                  <Text style={s.cardName}>{item.name}</Text>
                  <Text style={s.cardEmail}>{item.email}</Text>
                </View>
              </View>

              <View style={s.cardRight}>
                <View style={s.badgeRow}>
                  <View style={[s.badge, item.role === 'admin' ? s.badgeAdmin : s.badgeUser]}>
                    <MaterialCommunityIcons
                      name={item.role === 'admin' ? 'shield-crown' : 'account'}
                      size={10}
                      color={item.role === 'admin' ? C.danger : C.accentText}
                    />
                    <Text style={[s.badgeText, item.role === 'admin' ? s.badgeTextAdmin : s.badgeTextUser]}>
                      {item.role === 'admin' ? 'Admin' : 'User'}
                    </Text>
                  </View>
                  <View style={[s.badge, item.isActive ? s.badgeActive : s.badgeInactive]}>
                    <View style={[s.dot, item.isActive ? s.dotActive : s.dotInactive]} />
                    <Text style={[s.badgeText, item.isActive ? s.badgeTextActive : s.badgeTextInactive]}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={16} color={C.textDim} style={{ marginTop: 6 }} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* ── Edit Modal ── */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={s.modalOverlay}>
          <Pressable style={s.modalBackdrop} onPress={closeModal} />
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />

            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Edit User</Text>
                <Text style={s.modalSubtitle}>Update role & account status</Text>
              </View>
              <TouchableOpacity onPress={closeModal} style={s.modalCloseBtn}>
                <Feather name="x" size={18} color={C.textSub} />
              </TouchableOpacity>
            </View>

            <View style={s.modalDivider} />

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedUser && (
                <>
                  <View style={s.userInfoPanel}>
                    <Avatar name={selectedUser.name} role={selectedUser.role} />
                    <View>
                      <Text style={s.userInfoName}>{selectedUser.name}</Text>
                      <Text style={s.userInfoEmail}>{selectedUser.email}</Text>
                    </View>
                  </View>

                  <Text style={s.sectionLabel}>Role</Text>
                  <View style={s.roleRow}>
                    {ROLE_OPTIONS.map((role) => {
                      const isSelected = selectedRole === role
                      return (
                        <TouchableOpacity
                          key={role}
                          style={[s.roleBtn, isSelected && (role === 'admin' ? s.roleBtnAdmin : s.roleBtnUser)]}
                          onPress={() => setSelectedRole(role)}
                          activeOpacity={0.8}
                        >
                          <MaterialCommunityIcons
                            name={role === 'admin' ? 'shield-crown' : 'account'}
                            size={18}
                            color={isSelected ? (role === 'admin' ? C.danger : C.accentText) : C.textDim}
                          />
                          <Text style={[s.roleBtnText, isSelected && (role === 'admin' ? s.roleBtnTextAdmin : s.roleBtnTextUser)]}>
                            {role === 'admin' ? 'Admin' : 'User'}
                          </Text>
                          {isSelected && (
                            <Feather name="check" size={13} color={role === 'admin' ? C.danger : C.accentText} style={{ marginLeft: 4 }} />
                          )}
                        </TouchableOpacity>
                      )
                    })}
                  </View>

                  <Text style={s.sectionLabel}>Account Status</Text>
                  <TouchableOpacity
                    style={[s.statusToggle, userActive && s.statusToggleActive]}
                    onPress={() => setUserActive(v => !v)}
                    activeOpacity={0.8}
                  >
                    <View style={[s.toggleTrack, userActive && s.toggleTrackActive]}>
                      <View style={[s.toggleThumb, userActive && s.toggleThumbActive]} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={s.toggleLabel}>{userActive ? 'Active' : 'Inactive'}</Text>
                      <Text style={s.toggleSub}>
                        {userActive ? 'User can log in and use the app' : 'User is blocked from accessing the app'}
                      </Text>
                    </View>
                    <View style={[s.statusDot, userActive ? s.statusDotActive : s.statusDotInactive]} />
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>

            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={closeModal} disabled={updating}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn, updating && s.saveBtnDisabled]} onPress={updateUser} disabled={updating}>
                {updating ? (
                  <ActivityIndicator size="small" color={C.text} />
                ) : (
                  <>
                    <Feather name="save" size={15} color={C.text} />
                    <Text style={s.saveBtnText}> Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  refreshBtn:   { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(128,0,7,0.12)', borderWidth: 1, borderColor: 'rgba(128,0,7,0.25)', alignItems: 'center', justifyContent: 'center' },

  statsRow: { flexDirection: 'row', paddingHorizontal: 18, gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 12, alignItems: 'center', gap: 4 },
  statNum:  { fontSize: 18, fontWeight: '800', color: C.accent },
  statLabel:{ fontSize: 10, color: C.textSub, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  searchWrap:        { flexDirection: 'row', alignItems: 'center', marginHorizontal: 18, marginBottom: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 13, paddingHorizontal: 14, height: 48 },
  searchWrapFocused: { borderColor: C.accent, backgroundColor: 'rgba(128,0,7,0.08)' },
  searchInput:       { flex: 1, color: C.text, fontSize: 14, height: '100%' },
  resultsCount:      { fontSize: 11, color: C.textDim, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginHorizontal: 20, marginBottom: 12 },

  emptyState:   { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80, gap: 10 },
  emptyIconWrap:{ width: 72, height: 72, borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: C.textSub },
  emptySubtitle:{ fontSize: 13, color: C.textDim },

  card:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.surface, marginHorizontal: 18, marginBottom: 10, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
  cardLeft:  { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardInfo:  { flex: 1 },
  cardName:  { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 3 },
  cardEmail: { fontSize: 12, color: C.textSub },
  cardRight: { alignItems: 'flex-end' },

  badgeRow:          { flexDirection: 'row', gap: 6 },
  badge:             { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  badgeAdmin:        { backgroundColor: 'rgba(255,90,110,0.12)', borderWidth: 1, borderColor: 'rgba(255,90,110,0.25)' },
  badgeUser:         { backgroundColor: 'rgba(128,0,7,0.12)',    borderWidth: 1, borderColor: 'rgba(128,0,7,0.25)'   },
  badgeActive:       { backgroundColor: 'rgba(153,98,80,0.15)',  borderWidth: 1, borderColor: 'rgba(153,98,80,0.3)'  },
  badgeInactive:     { backgroundColor: 'rgba(255,202,40,0.10)', borderWidth: 1, borderColor: 'rgba(255,202,40,0.25)'},
  badgeText:         { fontSize: 10, fontWeight: '700' },
  badgeTextAdmin:    { color: C.danger },
  badgeTextUser:     { color: C.accentText },
  badgeTextActive:   { color: C.mint },
  badgeTextInactive: { color: '#ffca28' },

  dot:         { width: 6, height: 6, borderRadius: 3 },
  dotActive:   { backgroundColor: C.mint },
  dotInactive: { backgroundColor: '#ffca28' },

  modalOverlay:  { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
  modalSheet:    { backgroundColor: C.bgLayer, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12, maxHeight: '88%', borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.border },
  modalHandle:   { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 18 },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  modalTitle:    { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 2 },
  modalSubtitle: { fontSize: 12, color: C.textSub },
  modalCloseBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  modalDivider:  { height: 1, backgroundColor: C.border, marginBottom: 20 },

  userInfoPanel: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, marginBottom: 22 },
  userInfoName:  { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 2 },
  userInfoEmail: { fontSize: 12, color: C.textSub },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },

  roleRow:         { flexDirection: 'row', gap: 12, marginBottom: 22 },
  roleBtn:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 13, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  roleBtnAdmin:    { borderColor: 'rgba(255,90,110,0.4)', backgroundColor: 'rgba(255,90,110,0.08)' },
  roleBtnUser:     { borderColor: 'rgba(128,0,7,0.4)',    backgroundColor: 'rgba(128,0,7,0.1)'     },
  roleBtnText:     { fontSize: 14, fontWeight: '600', color: C.textDim },
  roleBtnTextAdmin:{ color: C.danger },
  roleBtnTextUser: { color: C.accentText },

  statusToggle:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, marginBottom: 24 },
  statusToggleActive: { borderColor: 'rgba(153,98,80,0.4)', backgroundColor: 'rgba(153,98,80,0.08)' },
  toggleTrack:        { width: 44, height: 26, borderRadius: 13, backgroundColor: 'rgba(200,160,144,0.15)', padding: 3, justifyContent: 'center' },
  toggleTrackActive:  { backgroundColor: C.mint },
  toggleThumb:        { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(200,160,144,0.4)', alignSelf: 'flex-start' },
  toggleThumbActive:  { backgroundColor: C.text, alignSelf: 'flex-end' },
  toggleLabel:        { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 2 },
  toggleSub:          { fontSize: 11, color: C.textSub, lineHeight: 16 },
  statusDot:          { width: 10, height: 10, borderRadius: 5 },
  statusDotActive:    { backgroundColor: C.mint },
  statusDotInactive:  { backgroundColor: '#ffca28' },

  modalActions:   { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn:      { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 13, paddingVertical: 15, alignItems: 'center', backgroundColor: 'rgba(249,249,249,0.04)' },
  cancelBtnText:  { fontSize: 14, fontWeight: '700', color: C.textSub },
  saveBtn:        { flex: 1, backgroundColor: C.accent, borderRadius: 13, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: C.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  saveBtnDisabled:{ opacity: 0.6 },
  saveBtnText:    { fontSize: 14, fontWeight: '700', color: C.text },
})