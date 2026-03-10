import React, { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons'
import AdminHeader from '@/components/adminHeader'
import AdminToast from '@/components/admin-toast'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { deleteAdminVoucher, fetchAdminVouchers, upsertAdminVoucher } from '@/store/slices/adminVoucherSlice'

type VoucherCategory = 'free-shipping' | 'minimum-spend' | 'monthly-voucher'

interface VoucherItem {
  _id: string
  code: string
  category: VoucherCategory
  badge: string
  label: string
  description: string
  validText: string
  leftValue: string
  rightTag?: string
  isActive?: boolean
}

interface VoucherForm {
  code: string
  category: VoucherCategory
  badge: string
  label: string
  description: string
  validText: string
  leftValue: string
  rightTag: string
}

const TAB_CONFIG: Array<{ key: VoucherCategory; label: string; icon: string }> = [
  { key: 'free-shipping', label: 'Free Shipping', icon: 'truck-fast-outline' },
  { key: 'minimum-spend', label: 'Minimum Spend', icon: 'cash-multiple' },
  { key: 'monthly-voucher', label: 'Monthly Voucher', icon: 'calendar-month' },
]

const emptyForm: VoucherForm = {
  code: '',
  category: 'free-shipping',
  badge: '',
  label: '',
  description: '',
  validText: '',
  leftValue: '',
  rightTag: '',
}

export default function VouchersAdminScreen() {
  const dispatch = useAppDispatch()
  const { vouchers, loading, refreshing, saving, deleting } = useAppSelector((state) => state.adminVoucher)
  const [activeCategory, setActiveCategory] = useState<VoucherCategory>('free-shipping')
  const [search, setSearch] = useState('')

  const [formVisible, setFormVisible] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState<VoucherItem | null>(null)
  const [formData, setFormData] = useState<VoucherForm>(emptyForm)
  const [alertVisible, setAlertVisible] = useState(false)
  const [alertType, setAlertType] = useState<'success' | 'error'>('success')
  const [alertTitle, setAlertTitle] = useState('')
  const [alertMessage, setAlertMessage] = useState('')

  const showAlert = (type: 'success' | 'error', title: string, message: string) => {
    setAlertType(type)
    setAlertTitle(title)
    setAlertMessage(message)
    setAlertVisible(true)
  }

  const fetchVouchers = async (isPullToRefresh = false) => {
    try {
      await dispatch(fetchAdminVouchers({ silent: isPullToRefresh })).unwrap()
    } catch (error: any) {
      showAlert('error', 'Load Failed', error || 'Could not fetch vouchers')
    }
  }

  useEffect(() => {
    fetchVouchers()
  }, [])

  const filteredVouchers = useMemo(() => {
    const query = search.trim().toLowerCase()

    return vouchers.filter((item) => {
      if (item.category !== activeCategory) return false
      if (!query) return true

      return (
        item.code.toLowerCase().includes(query) ||
        item.badge.toLowerCase().includes(query) ||
        item.label.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      )
    })
  }, [vouchers, activeCategory, search])

  const openCreateModal = () => {
    setEditingVoucher(null)
    setFormData({ ...emptyForm, category: activeCategory })
    setFormVisible(true)
  }

  const openEditModal = (voucher: VoucherItem) => {
    setEditingVoucher(voucher)
    setFormData({
      code: voucher.code,
      category: voucher.category,
      badge: voucher.badge,
      label: voucher.label,
      description: voucher.description,
      validText: voucher.validText,
      leftValue: voucher.leftValue,
      rightTag: voucher.rightTag || '',
    })
    setFormVisible(true)
  }

  const closeFormModal = () => {
    if (saving) return
    setFormVisible(false)
    setEditingVoucher(null)
    setFormData(emptyForm)
  }

  const validateForm = () => {
    if (!formData.code.trim()) return 'Voucher code is required.'
    if (!formData.badge.trim()) return 'Badge is required.'
    if (!formData.label.trim()) return 'Label is required.'
    if (!formData.description.trim()) return 'Description is required.'
    if (!formData.validText.trim()) return 'Validity text is required.'
    if (!formData.leftValue.trim()) return 'Left value is required.'
    return ''
  }

  const saveVoucher = async () => {
    const err = validateForm()
    if (err) {
      showAlert('error', 'Validation Error', err)
      return
    }

    try {
      const payload = {
        code: formData.code.trim().toUpperCase(),
        category: formData.category,
        badge: formData.badge.trim(),
        label: formData.label.trim(),
        description: formData.description.trim(),
        validText: formData.validText.trim(),
        leftValue: formData.leftValue.trim(),
        rightTag: formData.rightTag.trim(),
      }

      await dispatch(upsertAdminVoucher({ editingId: editingVoucher?._id ?? null, payload })).unwrap()

      showAlert('success', 'Success', editingVoucher ? 'Voucher updated successfully.' : 'Voucher created successfully.')
      closeFormModal()
      fetchVouchers(true)
    } catch (error: any) {
      showAlert('error', 'Save Failed', error || 'Could not save voucher')
    }
  }

  const deleteVoucher = (voucherId: string) => {
    Alert.alert('Delete Voucher', 'Are you sure you want to delete this voucher?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await dispatch(deleteAdminVoucher(voucherId)).unwrap()
            showAlert('success', 'Deleted', 'Voucher has been deleted successfully.')
          } catch (error: any) {
            showAlert('error', 'Delete Failed', error || 'Could not delete voucher')
          }
        },
      },
    ])
  }

  return (
    <View style={styles.page}>
      <AdminHeader title="Voucher Management" icon="ticket-percent" />

      <AdminToast
        visible={alertVisible}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />

      {loading && vouchers.length === 0 ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#00C2C7" />
          <Text style={styles.loaderText}>Loading vouchers...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.toolbar}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search voucher code"
              placeholderTextColor="rgba(198,204,220,0.55)"
              style={styles.searchInput}
            />
            <TouchableOpacity style={styles.iconBtn} onPress={() => fetchVouchers(true)} activeOpacity={0.85}>
              <Feather name="refresh-cw" size={15} color="#00C2C7" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.createBtn} onPress={openCreateModal} activeOpacity={0.85}>
              <Feather name="plus" size={15} color="#0E1117" />
              <Text style={styles.createBtnText}>New</Text>
            </TouchableOpacity>
          </View>

          {refreshing && <Text style={styles.refreshText}>Refreshing vouchers...</Text>}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
            {TAB_CONFIG.map((tab) => {
              const active = tab.key === activeCategory
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tab, active && styles.tabActive]}
                  onPress={() => setActiveCategory(tab.key)}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons
                    name={tab.icon as any}
                    size={18}
                    color={active ? '#0E1117' : '#C6CCDC'}
                  />
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vouchers ({filteredVouchers.length})</Text>
            <Text style={styles.sectionHint}>Tap a card to edit</Text>
          </View>

          <View style={styles.listWrap}>
            {filteredVouchers.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="ticket-confirmation-outline" size={40} color="#7A859E" />
                <Text style={styles.emptyTitle}>No vouchers found</Text>
                <Text style={styles.emptySubtitle}>Create a voucher or adjust your filters.</Text>
              </View>
            ) : (
              filteredVouchers.map((voucher) => (
                <VoucherCard
                  key={voucher._id}
                  voucher={voucher}
                  onEdit={() => openEditModal(voucher)}
                  onDelete={() => deleteVoucher(voucher._id)}
                  deleting={deleting}
                />
              ))
            )}
          </View>
        </ScrollView>
      )}

      <Modal visible={formVisible} transparent animationType="slide" onRequestClose={closeFormModal}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeFormModal} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingVoucher ? 'Edit Voucher' : 'Create Voucher'}</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={closeFormModal}>
                <Feather name="x" size={18} color="#9DA6BD" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
              <FieldLabel text="Voucher Code" />
              <TextInput
                value={formData.code}
                onChangeText={(text: string) => setFormData((prev) => ({ ...prev, code: text }))}
                style={styles.input}
                placeholder="Ex. FREESHIP50"
                placeholderTextColor="rgba(198,204,220,0.55)"
                autoCapitalize="characters"
              />

              <FieldLabel text="Category" />
              <View style={styles.categoryPickerRow}>
                {TAB_CONFIG.map((tab) => {
                  const active = formData.category === tab.key
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      style={[styles.categoryChip, active && styles.categoryChipActive]}
                      onPress={() => setFormData((prev) => ({ ...prev, category: tab.key }))}
                    >
                      <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>{tab.label}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <FieldLabel text="Badge" />
              <TextInput
                value={formData.badge}
                onChangeText={(text: string) => setFormData((prev) => ({ ...prev, badge: text }))}
                style={styles.input}
                placeholder="Ex. FREE SHIP or 3.3"
                placeholderTextColor="rgba(198,204,220,0.55)"
              />

              <FieldLabel text="Label" />
              <TextInput
                value={formData.label}
                onChangeText={(text: string) => setFormData((prev) => ({ ...prev, label: text }))}
                style={styles.input}
                placeholder="Ex. Limited redemption"
                placeholderTextColor="rgba(198,204,220,0.55)"
              />

              <FieldLabel text="Description" />
              <TextInput
                value={formData.description}
                onChangeText={(text: string) => setFormData((prev) => ({ ...prev, description: text }))}
                style={[styles.input, styles.inputMultiline]}
                placeholder="Ex. 10% off on orders over PHP 500.00"
                placeholderTextColor="rgba(198,204,220,0.55)"
                multiline
              />

              <FieldLabel text="Validity Text" />
              <TextInput
                value={formData.validText}
                onChangeText={(text: string) => setFormData((prev) => ({ ...prev, validText: text }))}
                style={styles.input}
                placeholder="Ex. Valid for 7 days after claiming"
                placeholderTextColor="rgba(198,204,220,0.55)"
              />

              <FieldLabel text="Left Value" />
              <TextInput
                value={formData.leftValue}
                onChangeText={(text: string) => setFormData((prev) => ({ ...prev, leftValue: text }))}
                style={styles.input}
                placeholder="Ex. PHP 50 off"
                placeholderTextColor="rgba(198,204,220,0.55)"
              />

              <FieldLabel text="Right Tag (optional)" />
              <TextInput
                value={formData.rightTag}
                onChangeText={(text: string) => setFormData((prev) => ({ ...prev, rightTag: text }))}
                style={styles.input}
                placeholder="Ex. x2"
                placeholderTextColor="rgba(198,204,220,0.55)"
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeFormModal} disabled={saving}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={saveVoucher} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#0E1117" /> : <Text style={styles.saveBtnText}>{editingVoucher ? 'Update' : 'Create'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const FieldLabel = ({ text }: { text: string }) => <Text style={styles.fieldLabel}>{text}</Text>

const VoucherCard = ({
  voucher,
  onEdit,
  onDelete,
  deleting,
}: {
  voucher: VoucherItem
  onEdit: () => void
  onDelete: () => void
  deleting: boolean
}) => {
  const isMinimumSpend = voucher.category === 'minimum-spend'

  return (
    <TouchableOpacity
      style={[styles.ticket, isMinimumSpend ? styles.ticketMinimum : styles.ticketDefault]}
      activeOpacity={0.9}
      onPress={onEdit}
    >
      {!!voucher.rightTag && (
        <View style={styles.multiplierTag}>
          <Text style={styles.multiplierText}>{voucher.rightTag}</Text>
        </View>
      )}

      <View style={styles.ticketLeft}>
        <Text style={styles.leftValue}>{voucher.leftValue}</Text>
        <Text style={styles.codeText}>{voucher.code}</Text>
      </View>

      <View style={styles.ticketDivider} />

      <View style={styles.ticketRight}>
        <View style={styles.badgeRow}>
          <Text style={styles.badge}>{voucher.badge}</Text>
          <Text style={styles.badgeMuted}>{voucher.label}</Text>
        </View>

        <Text style={styles.desc}>{voucher.description}</Text>
        <Text style={styles.validity}>{voucher.validText}</Text>

        <View style={styles.bottomRow}>
          <TouchableOpacity style={styles.editBtn} onPress={onEdit} activeOpacity={0.85}>
            <Feather name="edit-2" size={14} color="#0E1117" />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.deleteBtn, deleting && styles.deleteBtnDisabled]}
            onPress={onDelete}
            activeOpacity={0.85}
            disabled={deleting}
          >
            <Feather name="trash-2" size={14} color="#FFB8C5" />
            <Text style={styles.deleteBtnText}>{deleting ? 'Deleting...' : 'Delete'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0E1117' },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { color: 'rgba(160,174,192,0.75)', fontSize: 14 },
  content: { padding: 14, paddingBottom: 36, gap: 14 },

  toolbar: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchInput: {
    flex: 1,
    backgroundColor: '#1A1E2E',
    borderWidth: 1,
    borderColor: '#262D42',
    borderRadius: 12,
    color: '#E8EDF5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1A1E2E',
    borderWidth: 1,
    borderColor: '#262D42',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00C2C7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  createBtnText: { color: '#0E1117', fontSize: 13, fontWeight: '900' },
  refreshText: { color: '#7A859E', fontSize: 12, marginTop: -6 },

  tabsContainer: { gap: 8 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1A1E2E',
    borderWidth: 1,
    borderColor: '#262D42',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tabActive: { backgroundColor: '#00C2C7', borderColor: '#00C2C7' },
  tabText: { color: '#C6CCDC', fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: '#0E1117' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: '#E8EDF5', fontSize: 24, fontWeight: '900' },
  sectionHint: { color: '#7A859E', fontSize: 12, fontWeight: '700' },

  listWrap: { gap: 12 },
  emptyState: {
    backgroundColor: '#1A1E2E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262D42',
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  emptyTitle: { marginTop: 8, color: '#E8EDF5', fontSize: 16, fontWeight: '800' },
  emptySubtitle: { marginTop: 4, color: '#9DA6BD', fontSize: 12, textAlign: 'center' },

  ticket: {
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
  },
  ticketDefault: { backgroundColor: '#12353D', borderColor: '#2E6A75' },
  ticketMinimum: { backgroundColor: '#3B1C29', borderColor: '#6D334A' },
  multiplierTag: {
    position: 'absolute',
    top: 6,
    left: 6,
    zIndex: 3,
    backgroundColor: '#00C2C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
  },
  multiplierText: { color: '#08353A', fontWeight: '900', fontSize: 11 },
  ticketLeft: {
    width: 108,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 14,
  },
  leftValue: {
    color: '#39DDE3',
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '900',
  },
  codeText: { marginTop: 8, color: '#9DEFF2', fontSize: 10, fontWeight: '800' },
  ticketDivider: { width: 2, backgroundColor: 'rgba(255,255,255,0.12)', borderStyle: 'dashed' },
  ticketRight: { flex: 1, paddingVertical: 12, paddingHorizontal: 12 },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  badge: {
    color: '#E9FFFF',
    backgroundColor: 'rgba(0,194,199,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(0,194,199,0.45)',
    borderRadius: 7,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 2,
    fontWeight: '900',
    fontSize: 11,
  },
  badgeMuted: { color: '#7ED8DA', fontSize: 12, fontWeight: '700' },
  desc: { color: '#E8EDF5', fontWeight: '800', fontSize: 18, lineHeight: 22 },
  validity: { marginTop: 6, color: '#A6B2C8', fontSize: 12 },
  bottomRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editBtn: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    backgroundColor: '#00C2C7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editBtnText: { color: '#0E1117', fontWeight: '900', fontSize: 13 },
  deleteBtn: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    backgroundColor: 'rgba(255,90,110,0.16)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteBtnDisabled: { opacity: 0.6 },
  deleteBtnText: { color: '#FFB8C5', fontWeight: '900', fontSize: 13 },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalSheet: {
    maxHeight: '86%',
    backgroundColor: '#1A1E2E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#2A3148',
    paddingBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  modalTitle: { color: '#E8EDF5', fontSize: 18, fontWeight: '900' },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#12151F',
    borderWidth: 1,
    borderColor: '#2A3148',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  fieldLabel: {
    color: '#BFC8DC',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#12151F',
    borderWidth: 1,
    borderColor: '#2A3148',
    borderRadius: 12,
    color: '#E8EDF5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  inputMultiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  categoryPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    borderWidth: 1,
    borderColor: '#2A3148',
    borderRadius: 999,
    backgroundColor: '#12151F',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  categoryChipActive: {
    backgroundColor: '#00C2C7',
    borderColor: '#00C2C7',
  },
  categoryChipText: { color: '#9DA6BD', fontSize: 12, fontWeight: '800' },
  categoryChipTextActive: { color: '#0E1117' },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2A3148',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#12151F',
  },
  cancelBtnText: { color: '#9DA6BD', fontSize: 14, fontWeight: '800' },
  saveBtn: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#00C2C7',
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#0E1117', fontSize: 14, fontWeight: '900' },
})
