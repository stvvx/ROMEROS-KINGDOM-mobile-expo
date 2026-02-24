import React, { useEffect, useState } from 'react'
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  FlatList,
} from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import axios from 'axios'
import Constants from 'expo-constants'
import { getItem } from '@/utils/storage'

// ─────────────────────────────────────────────────────────────
// API CONFIG
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// ADMIN HEADER
// ─────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/(admin)/dashboard' },
  { label: 'Products', path: '/(admin)/products' },
  { label: 'Categories', path: '/(admin)/categories' },
  { label: 'Users', path: '/(admin)/users' },
  { label: 'Reviews', path: '/(admin)/review' },
]

const AdminHeader: React.FC = () => {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <View style={headerStyles.wrapper}>
      <Text style={headerStyles.brand}>⚙️ Admin</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={headerStyles.navRow}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.path

          return (
            <TouchableOpacity
              key={item.path}
              style={[
                headerStyles.navBtn,
                isActive && headerStyles.activeBtn,
              ]}
              onPress={() => router.push(item.path)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  headerStyles.navLabel,
                  isActive && headerStyles.activeLabel,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

const headerStyles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  brand: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginRight: 10,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navBtn: {
    backgroundColor: '#2280b0',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  activeBtn: {
    backgroundColor: '#4caf50',
  },
  navLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  activeLabel: {
    fontWeight: '800',
  },
})

// ─────────────────────────────────────────────────────────────
// CATEGORIES SCREEN
// ─────────────────────────────────────────────────────────────

interface Category {
  _id: string
  name: string
  description?: string
  image?: {
    url: string
  }
  createdAt: string
}

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

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
      console.error('Error fetching categories:', error)
      Alert.alert('Error', 'Failed to fetch categories')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter category name')
      return
    }

    try {
      setSubmitting(true)
      const headers = {
        'Content-Type': 'application/json',
        ...(await getAuthHeader()),
      }
      const res = await axios.post(`${API_URL}/admin/category/new`, formData, { headers })

      if (res.data.success) {
        Alert.alert('Success', 'Category created successfully')
        setFormData({ name: '', description: '' })
        setShowForm(false)
        fetchCategories()
      }
    } catch (error: any) {
      console.error('Error creating category:', error)
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to create category'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    try {
      setDeleteId(id)
      const headers = await getAuthHeader()
      const res = await axios.delete(`${API_URL}/admin/category/${id}`, { headers })

      if (res.data.success) {
        Alert.alert('Success', 'Category deleted successfully')
        fetchCategories()
      }
    } catch (error: any) {
      console.error('Error deleting category:', error)
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to delete category'
      )
    } finally {
      setDeleteId(null)
    }
  }

  const handleEditCategory = (category: Category) => {
    setEditingId(category._id)
    setFormData({
      name: category.name,
      description: category.description || '',
    })
    setShowForm(true)
  }

  const handleUpdateCategory = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter category name')
      return
    }

    try {
      setSubmitting(true)
      const headers = {
        'Content-Type': 'application/json',
        ...(await getAuthHeader()),
      }
      const res = await axios.put(
        `${API_URL}/admin/category/${editingId}`,
        formData,
        { headers }
      )

      if (res.data.success) {
        Alert.alert('Success', 'Category updated successfully')
        setFormData({ name: '', description: '' })
        setEditingId(null)
        setShowForm(false)
        fetchCategories()
      }
    } catch (error: any) {
      console.error('Error updating category:', error)
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to update category'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({ name: '', description: '' })
  }

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <View style={styles.categoryCard}>
      <View style={styles.cardContent}>
        <Text style={styles.categoryName}>{item.name}</Text>
        {item.description && (
          <Text style={styles.categoryDesc} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <Text style={styles.categoryDate}>
          Created: {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => handleEditCategory(item)}
          disabled={deleteId === item._id || editingId === item._id}
        >
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => {
            Alert.alert(
              'Delete Category',
              'Are you sure you want to delete this category?',
              [
                { text: 'Cancel', onPress: () => {} },
                {
                  text: 'Delete',
                  onPress: () => handleDeleteCategory(item._id),
                  style: 'destructive',
                },
              ]
            )
          }}
          disabled={deleteId === item._id}
        >
          {deleteId === item._id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.deleteBtnText}>Delete</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )

  if (loading) {
    return (
      <>
        <AdminHeader />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2280b0" />
        </View>
      </>
    )
  }

  return (
    <>
      <AdminHeader />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerSection}>
          <Text style={styles.title}>Categories Management</Text>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => {
              if (showForm) {
                handleCloseForm()
              } else {
                setShowForm(true)
              }
            }}
          >
            <Text style={styles.createBtnText}>
              {showForm ? 'Cancel' : '+ New Category'}
            </Text>
          </TouchableOpacity>
        </View>

        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {editingId ? 'Edit Category' : 'Create New Category'}
            </Text>

            <Text style={styles.label}>Category Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter category name"
              placeholderTextColor="#999"
              value={formData.name}
              onChangeText={(text) =>
                setFormData({ ...formData, name: text })
              }
              editable={!submitting}
            />

            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Enter category description"
              placeholderTextColor="#999"
              value={formData.description}
              onChangeText={(text) =>
                setFormData({ ...formData, description: text })
              }
              multiline
              numberOfLines={3}
              editable={!submitting}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[
                styles.submitBtn,
                submitting && styles.submitBtnDisabled,
              ]}
              onPress={editingId ? handleUpdateCategory : handleCreateCategory}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {editingId ? 'Update Category' : 'Create Category'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.statsCard}>
          <Text style={styles.statsText}>Total Categories: {categories.length}</Text>
        </View>

        <Text style={styles.listTitle}>All Categories</Text>

        {categories.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No categories yet</Text>
            <Text style={styles.emptySubtext}>
              Create your first category to get started
            </Text>
          </View>
        ) : (
          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
          />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    flex: 1,
  },
  createBtn: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
    marginBottom: 12,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  submitBtn: {
    backgroundColor: '#2280b0',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  statsCard: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2280b0',
  },
  statsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2280b0',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },
  cardContent: {
    flex: 1,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  categoryDesc: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  categoryDate: {
    fontSize: 12,
    color: '#999',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: '#2280b0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  editBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteBtn: {
    backgroundColor: '#f44336',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
})

export default Categories
