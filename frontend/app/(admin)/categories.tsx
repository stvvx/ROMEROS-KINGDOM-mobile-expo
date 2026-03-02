import React, { useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  FlatList,
  ScrollView,
  Modal,
  Pressable,
  Animated,
} from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import axios from 'axios'
import Constants from 'expo-constants'
import { getItem } from '@/utils/storage'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'

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

// ─── NAV ─────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Dashboard', path: '/(admin)/dashboard' },
  { label: 'Products',  path: '/(admin)/products'  },
  { label: 'Categories',path: '/(admin)/categories'},
  { label: 'Users',     path: '/(admin)/users'     },
  { label: 'Reviews', path: '/(admin)/review' },
  { label: 'Notifications', path: '/(admin)/notifications' },
]

const AdminHeader: React.FC = () => {
  const router   = useRouter()
  const pathname = usePathname()

  return (
    <View style={hdr.wrapper}>
      <MaterialCommunityIcons name="folder-multiple" size={18} color="#fff" style={{ marginRight: 8 }} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={hdr.navRow}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.path
          return (
            <TouchableOpacity
              key={item.path}
              style={[hdr.navBtn, isActive && hdr.activeBtn]}
              onPress={() => router.push(item.path as any)}
              activeOpacity={0.8}
            >
              <Text style={[hdr.navLabel, isActive && hdr.activeLabel]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

const hdr = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn: {
    backgroundColor: '#2280b0',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  activeBtn:   { backgroundColor: '#4caf50' },
  navLabel:    { color: '#fff', fontSize: 13, fontWeight: '600' },
  activeLabel: { fontWeight: '800' },
})

// ─── THEMED ALERT MODAL ───────────────────────────────────────
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
            <Ionicons
              name={isSuccess ? 'checkmark-circle' : 'alert-circle'}
              size={32}
              color={isSuccess ? '#4caf50' : '#ff6b6b'}
            />
          </View>
          <Text style={al.title}>{title}</Text>
          <Text style={al.message}>{message}</Text>
          <View style={al.divider} />
          <TouchableOpacity
            style={[al.btn, isSuccess ? al.btnSuccess : al.btnError]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={al.btnText}>{isSuccess ? 'Great!' : 'Got it'}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ─── THEMED CONFIRM DIALOG ───────────────────────────────────
interface ConfirmDialogProps {
  visible: boolean
  title: string
  message: string
  destructiveText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  destructiveText = 'Delete',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={cd.overlay} onPress={onCancel}>
        <Pressable style={cd.card} onPress={() => {}}>
          <View style={cd.iconWrap}>
            <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#ff6b6b" />
          </View>
          <Text style={cd.title}>{title}</Text>
          <Text style={cd.message}>{message}</Text>
          <View style={cd.divider} />
          <View style={cd.buttonRow}>
            <TouchableOpacity
              style={cd.cancelBtn}
              onPress={onCancel}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={cd.cancelBtnText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[cd.confirmBtn, isLoading && cd.confirmBtnDisabled]}
              onPress={onConfirm}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="trash-2" size={15} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={cd.confirmBtnText}>{destructiveText}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const cd = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    backgroundColor: '#16213e',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 20,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(255,107,107,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title:   { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 13, color: 'rgba(160,174,192,0.75)', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  divider: { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 20 },
  buttonRow: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: 'rgba(160,174,192,0.7)' },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#ff6b6b',
    borderRadius: 13,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff6b6b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
})

const al = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    backgroundColor: '#16213e',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 20,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconSuccess: { backgroundColor: 'rgba(76,175,80,0.12)', borderWidth: 1, borderColor: 'rgba(76,175,80,0.3)'  },
  iconError:   { backgroundColor: 'rgba(255,107,107,0.12)',borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)'},
  title:   { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 13, color: 'rgba(160,174,192,0.8)', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  divider: { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 20 },
  btn: {
    width: '100%',
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  btnSuccess: { backgroundColor: '#4caf50', shadowColor: '#4caf50' },
  btnError:   { backgroundColor: '#ff6b6b', shadowColor: '#ff6b6b' },
  btnText:    { color: '#fff', fontSize: 15, fontWeight: '700' },
})

// ─────────────────────────────────────────────────────────────
// CATEGORIES SCREEN
// ─────────────────────────────────────────────────────────────

// ─── TYPES ────────────────────────────────────────────────────
interface Category {
  _id: string
  name: string
  description?: string
  image?: {
    url: string
  }
  createdAt: string
}

// ─── MAIN SCREEN ─────────────────────────────────────────────
export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  // Themed alert state
  const [alertVisible, setAlertVisible] = useState(false)
  const [alertType, setAlertType] = useState<'success' | 'error'>('success')
  const [alertTitle, setAlertTitle] = useState('')
  const [alertMessage, setAlertMessage] = useState('')

  // Delete confirmation state
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const showAlert = (type: 'success' | 'error', title: string, message: string) => {
    setAlertType(type)
    setAlertTitle(title)
    setAlertMessage(message)
    setAlertVisible(true)
  }

  const getAuthHeader = async () => {
    const token = await getItem('authToken')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const headers = await getAuthHeader()
      const res = await axios.get(`${API_URL}/categories`, { headers })
      setCategories(res.data.categories || [])
    } catch (error) {
      showAlert('error', 'Failed to Load', 'Could not fetch categories. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const openCategoryModal = (category?: Category) => {
    if (category) {
      setSelectedCategory(category)
      setFormData({
        name: category.name,
        description: category.description || '',
      })
    } else {
      setSelectedCategory(null)
      setFormData({ name: '', description: '' })
    }
    setModalVisible(true)
  }

  const closeModal = () => {
    setModalVisible(false)
    setSelectedCategory(null)
    setFormData({ name: '', description: '' })
  }

  const handleSaveCategory = async () => {
    if (!formData.name.trim()) {
      showAlert('error', 'Validation Error', 'Please enter a category name')
      return
    }

    try {
      setUpdating(true)
      const headers = {
        'Content-Type': 'application/json',
        ...(await getAuthHeader()),
      }

      if (selectedCategory) {
        // Update
        await axios.put(
          `${API_URL}/admin/category/${selectedCategory._id}`,
          formData,
          { headers }
        )
        showAlert('success', 'Updated', 'Category has been updated successfully')
      } else {
        // Create
        await axios.post(`${API_URL}/admin/category/new`, formData, { headers })
        showAlert('success', 'Created', 'Category has been created successfully')
      }
      closeModal()
      fetchCategories()
    } catch (error: any) {
      showAlert('error', 'Operation Failed', error.response?.data?.message || 'Something went wrong')
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteCategory = (id: string) => {
    setDeleteTargetId(id)
    setDeleteConfirmVisible(true)
  }

  const confirmDelete = async () => {
    if (!deleteTargetId) return
    try {
      setIsDeleting(true)
      const headers = await getAuthHeader()
      await axios.delete(`${API_URL}/admin/category/${deleteTargetId}`, { headers })
      setDeleteConfirmVisible(false)
      setDeleteTargetId(null)
      showAlert('success', 'Deleted', 'Category has been deleted successfully')
      fetchCategories()
    } catch (error: any) {
      showAlert('error', 'Delete Failed', error.response?.data?.message || 'Failed to delete')
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  )

  if (loading && categories.length === 0) {
    return (
      <>
        <AdminHeader />
        <View style={s.loader}>
          <ActivityIndicator size="large" color="#2280b0" />
          <Text style={s.loaderText}>Loading categories...</Text>
        </View>
      </>
    )
  }

  return (
    <>
      <AdminHeader />

      {/* Themed Alert */}
      <ThemedAlert
        visible={alertVisible}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        visible={deleteConfirmVisible}
        title="Delete Category"
        message="This action cannot be undone. Are you sure you want to delete this category?"
        destructiveText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteConfirmVisible(false)
          setDeleteTargetId(null)
        }}
        isLoading={isDeleting}
      />

      <View style={s.root}>

        {/* ── Page Header ── */}
        <View style={s.pageHeader}>
          <View>
            <Text style={s.pageTitle}>Categories</Text>
            <Text style={s.pageSubtitle}>Manage product categories</Text>
          </View>
          <TouchableOpacity style={s.refreshBtn} onPress={fetchCategories}>
            <Feather name="refresh-cw" size={15} color="#2280b0" />
          </TouchableOpacity>
        </View>

        {/* ── Stats Row ── */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <MaterialCommunityIcons name="folder-multiple" size={20} color="#2280b0" />
            <Text style={s.statNum}>{categories.length}</Text>
            <Text style={s.statLabel}>Total</Text>
          </View>
          <View style={s.statCard}>
            <Feather name="plus-circle" size={20} color="#4caf50" />
            <Text style={s.statNum}>{filteredCategories.length}</Text>
            <Text style={s.statLabel}>Found</Text>
          </View>
        </View>

        {/* ── Search ── */}
        <View style={[s.searchWrap, searchFocused && s.searchWrapFocused]}>
          <Feather name="search" size={16} color="rgba(160,174,192,0.6)" style={{ marginRight: 10 }} />
          <TextInput
            placeholder="Search categories..."
            style={s.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="rgba(160,174,192,0.35)"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {!!searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={15} color="rgba(160,174,192,0.5)" />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Results count & Create button ── */}
        <View style={s.actionBar}>
          <Text style={s.resultsCount}>
            {filteredCategories.length} {filteredCategories.length === 1 ? 'category' : 'categories'}
          </Text>
          <TouchableOpacity
            style={s.createBtn}
            onPress={() => openCategoryModal()}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={14} color="#fff" style={{ marginRight: 6 }} />
            <Text style={s.createBtnText}>New</Text>
          </TouchableOpacity>
        </View>

        {/* ── List ── */}
        {filteredCategories.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIconWrap}>
              <MaterialCommunityIcons name="folder-open-outline" size={36} color="rgba(160,174,192,0.4)" />
            </View>
            <Text style={s.emptyTitle}>No categories found</Text>
            <Text style={s.emptySubtitle}>
              {searchQuery ? 'Try a different search' : 'Create your first category'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredCategories}
            keyExtractor={(item) => item._id}
            onRefresh={fetchCategories}
            refreshing={loading}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.card}
                onPress={() => openCategoryModal(item)}
                activeOpacity={0.75}
              >
                <View style={s.cardIcon}>
                  <MaterialCommunityIcons name="folder" size={20} color="#2280b0" />
                </View>

                <View style={s.cardInfo}>
                  <Text style={s.cardName}>{item.name}</Text>
                  {item.description && (
                    <Text style={s.cardDesc} numberOfLines={1}>{item.description}</Text>
                  )}
                  <Text style={s.cardDate}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                <View style={s.cardActions}>
                  <TouchableOpacity
                    style={s.actionIcon}
                    onPress={() => openCategoryModal(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="edit-2" size={14} color="#2280b0" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.actionIcon}
                    onPress={() => handleDeleteCategory(item._id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <Feather name="trash-2" size={14} color="#ff6b6b" />
                  </TouchableOpacity>
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

              {/* Handle */}
              <View style={s.modalHandle} />

              {/* Modal Header */}
              <View style={s.modalHeader}>
                <View>
                  <Text style={s.modalTitle}>
                    {selectedCategory ? 'Edit Category' : 'New Category'}
                  </Text>
                  <Text style={s.modalSubtitle}>
                    {selectedCategory ? 'Update category details' : 'Create a new product category'}
                  </Text>
                </View>
                <TouchableOpacity onPress={closeModal} style={s.modalCloseBtn}>
                  <Feather name="x" size={18} color="rgba(160,174,192,0.7)" />
                </TouchableOpacity>
              </View>

              <View style={s.modalDivider} />

              <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 20 }}>
                {/* Name */}
                <Text style={s.sectionLabel}>Category Name</Text>
                <TextInput
                  style={s.input}
                  placeholder="Enter category name"
                  placeholderTextColor="rgba(160,174,192,0.35)"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  editable={!updating}
                />

                {/* Description */}
                <Text style={s.sectionLabel}>Description</Text>
                <TextInput
                  style={[s.input, s.multilineInput]}
                  placeholder="Enter category description (optional)"
                  placeholderTextColor="rgba(160,174,192,0.35)"
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  multiline
                  numberOfLines={4}
                  editable={!updating}
                  textAlignVertical="top"
                />
              </ScrollView>

              {/* Actions */}
              <View style={s.modalActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={closeModal} disabled={updating}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.saveBtn, updating && s.saveBtnDisabled]}
                  onPress={handleSaveCategory}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Feather name="save" size={15} color="#fff" />
                      <Text style={s.saveBtnText}>
                        {selectedCategory ? ' Update' : ' Create'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

            </View>
          </View>
        </Modal>

      </View>
    </>
  )
}

// ─── STYLES ──────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    gap: 12,
  },
  loaderText: {
    color: 'rgba(160,174,192,0.6)',
    fontSize: 14,
  },

  // ── Page Header ──
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 14,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  pageSubtitle: {
    fontSize: 12,
    color: 'rgba(160,174,192,0.6)',
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(34,128,176,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,128,176,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  statNum:   { fontSize: 18, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 10, color: 'rgba(160,174,192,0.6)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  // ── Search ──
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 13,
    paddingHorizontal: 14,
    height: 48,
  },
  searchWrapFocused: {
    borderColor: '#2280b0',
    backgroundColor: 'rgba(34,128,176,0.08)',
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    height: '100%',
  },

  // ── Action Bar ──
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  resultsCount: {
    fontSize: 11,
    color: 'rgba(160,174,192,0.45)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#4caf50',
    borderRadius: 12,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Empty ──
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
    gap: 10,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  emptySubtitle: { fontSize: 13, color: 'rgba(160,174,192,0.4)' },

  // ── Category Card ──
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginHorizontal: 18,
    marginBottom: 10,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(34,128,176,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo:  { flex: 1 },
  cardName:  { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 3 },
  cardDesc:  { fontSize: 12, color: 'rgba(160,174,192,0.55)', marginBottom: 5 },
  cardDate:  { fontSize: 11, color: 'rgba(160,174,192,0.4)' },
  cardActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  modalSheet: {
    backgroundColor: '#16213e',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    maxHeight: '88%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle:    { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 2 },
  modalSubtitle: { fontSize: 12, color: 'rgba(160,174,192,0.6)' },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginBottom: 20,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(160,174,192,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  // Inputs
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#fff',
    fontSize: 14,
    marginBottom: 20,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 13,
  },

  // Modal actions
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 13,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: 'rgba(160,174,192,0.7)' },
  saveBtn: {
    flex: 1,
    backgroundColor: '#2280b0',
    borderRadius: 13,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2280b0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
})
