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
  { key: 'free-shipping',   label: 'Free Shipping',   icon: 'truck-fast-outline' },
  { key: 'minimum-spend',   label: 'Minimum Spend',   icon: 'cash-multiple'      },
  { key: 'monthly-voucher', label: 'Monthly Voucher', icon: 'calendar-month'     },
]

const emptyForm: VoucherForm = {
  code: '', category: 'free-shipping', badge: '', label: '',
  description: '', validText: '', leftValue: '', rightTag: '',
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
    setAlertType(type); setAlertTitle(title); setAlertMessage(message); setAlertVisible(true)
  }

  const fetchVouchers = async (isPullToRefresh = false) => {
    try {
      await dispatch(fetchAdminVouchers({ silent: isPullToRefresh })).unwrap()
    } catch (error: any) {
      showAlert('error', 'Load Failed', error || 'Could not fetch vouchers')
    }
  }

  useEffect(() => { fetchVouchers() }, [])

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
      code: voucher.code, category: voucher.category, badge: voucher.badge,
      label: voucher.label, description: voucher.description,
      validText: voucher.validText, leftValue: voucher.leftValue,
      rightTag: voucher.rightTag || '',
    })
    setFormVisible(true)
  }

  const closeFormModal = () => {
    if (saving) return
    setFormVisible(false); setEditingVoucher(null); setFormData(emptyForm)
  }

  const validateForm = () => {
    if (!formData.code.trim())        return 'Voucher code is required.'
    if (!formData.badge.trim())       return 'Badge is required.'
    if (!formData.label.trim())       return 'Label is required.'
    if (!formData.description.trim()) return 'Description is required.'
    if (!formData.validText.trim())   return 'Validity text is required.'
    if (!formData.leftValue.trim())   return 'Left value is required.'
    return ''
  }

  const saveVoucher = async () => {
    const err = validateForm()
    if (err) { showAlert('error', 'Validation Error', err); return }
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
        text: 'Delete', style: 'destructive',
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
      <AdminHeader title="Vouchers" icon="ticket-percent" />

      <AdminToast
        visible={alertVisible}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />

      {loading && vouchers.length === 0 ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={styles.loaderText}>Loading vouchers...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Toolbar */}
          <View style={styles.toolbar}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search voucher code"
              placeholderTextColor={C.textDim}
              style={styles.searchInput}
            />
            <TouchableOpacity style={styles.iconBtn} onPress={() => fetchVouchers(true)} activeOpacity={0.85}>
              <Feather name="refresh-cw" size={15} color={C.accent} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.createBtn} onPress={openCreateModal} activeOpacity={0.85}>
              <Feather name="plus" size={15} color={C.text} />
              <Text style={styles.createBtnText}>New</Text>
            </TouchableOpacity>
          </View>

          {refreshing && <Text style={styles.refreshText}>Refreshing vouchers...</Text>}

          {/* Tabs */}
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
                    color={active ? C.text : C.textSub}
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
                <MaterialCommunityIcons name="ticket-confirmation-outline" size={40} color={C.textDim} />
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

      {/* Form Modal */}
      <Modal visible={formVisible} transparent animationType="slide" onRequestClose={closeFormModal}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeFormModal} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingVoucher ? 'Edit Voucher' : 'Create Voucher'}</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={closeFormModal}>
                <Feather name="x" size={18} color={C.textSub} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
              <FieldLabel text="Voucher Code" />
              <TextInput
                value={formData.code}
                onChangeText={(text: string) => setFormData((prev) => ({ ...prev, code: text }))}
                style={styles.input}
                placeholder="Ex. FREESHIP50"
                placeholderTextColor={C.textDim}
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
              <TextInput value={formData.badge} onChangeText={(text: string) => setFormData((prev) => ({ ...prev, badge: text }))} style={styles.input} placeholder="Ex. FREE SHIP or 3.3" placeholderTextColor={C.textDim} />

              <FieldLabel text="Label" />
              <TextInput value={formData.label} onChangeText={(text: string) => setFormData((prev) => ({ ...prev, label: text }))} style={styles.input} placeholder="Ex. Limited redemption" placeholderTextColor={C.textDim} />

              <FieldLabel text="Description" />
              <TextInput value={formData.description} onChangeText={(text: string) => setFormData((prev) => ({ ...prev, description: text }))} style={[styles.input, styles.inputMultiline]} placeholder="Ex. 10% off on orders over PHP 500.00" placeholderTextColor={C.textDim} multiline />

              <FieldLabel text="Validity Text" />
              <TextInput value={formData.validText} onChangeText={(text: string) => setFormData((prev) => ({ ...prev, validText: text }))} style={styles.input} placeholder="Ex. Valid for 7 days after claiming" placeholderTextColor={C.textDim} />

              <FieldLabel text="Left Value" />
              <TextInput value={formData.leftValue} onChangeText={(text: string) => setFormData((prev) => ({ ...prev, leftValue: text }))} style={styles.input} placeholder="Ex. PHP 50 off" placeholderTextColor={C.textDim} />

              <FieldLabel text="Right Tag (optional)" />
              <TextInput value={formData.rightTag} onChangeText={(text: string) => setFormData((prev) => ({ ...prev, rightTag: text }))} style={styles.input} placeholder="Ex. x2" placeholderTextColor={C.textDim} />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeFormModal} disabled={saving}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={saveVoucher} disabled={saving}>
                {saving
                  ? <ActivityIndicator size="small" color={C.text} />
                  : <Text style={styles.saveBtnText}>{editingVoucher ? 'Update' : 'Create'}</Text>
                }
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
  voucher, onEdit, onDelete, deleting,
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
            <Feather name="edit-2" size={14} color={C.text} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.deleteBtn, deleting && styles.deleteBtnDisabled]}
            onPress={onDelete}
            activeOpacity={0.85}
            disabled={deleting}
          >
            <Feather name="trash-2" size={14} color={C.danger} />
            <Text style={styles.deleteBtnText}>{deleting ? 'Deleting...' : 'Delete'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  page:       { flex: 1, backgroundColor: C.bg },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { color: C.textSub, fontSize: 14 },
  content:    { padding: 14, paddingBottom: 36, gap: 14 },

  toolbar:       { flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchInput:   { flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, color: C.text, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
  iconBtn:       { width: 40, height: 40, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  createBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, shadowColor: C.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  createBtnText: { color: C.text, fontSize: 13, fontWeight: '900' },
  refreshText:   { color: C.textDim, fontSize: 12, marginTop: -6 },

  tabsContainer:  { gap: 8 },
  tab:            { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  tabActive:      { backgroundColor: C.accent, borderColor: C.accent },
  tabText:        { color: C.textSub, fontWeight: '700', fontSize: 13 },
  tabTextActive:  { color: C.text, fontWeight: '800' },

  sectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle:   { color: C.text, fontSize: 24, fontWeight: '900' },
  sectionHint:    { color: C.textDim, fontSize: 12, fontWeight: '700' },

  listWrap:       { gap: 12 },
  emptyState:     { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, alignItems: 'center', paddingVertical: 28, paddingHorizontal: 16 },
  emptyTitle:     { marginTop: 8, color: C.textSub, fontSize: 16, fontWeight: '800' },
  emptySubtitle:  { marginTop: 4, color: C.textDim, fontSize: 12, textAlign: 'center' },

  // ── Voucher Card ──
  ticket:         { borderRadius: 16, overflow: 'hidden', flexDirection: 'row', borderWidth: 1 },
  ticketDefault:  { backgroundColor: '#3d0a0d', borderColor: '#6b1218' },
  ticketMinimum:  { backgroundColor: '#3a0808', borderColor: '#6d1010' },
  multiplierTag:  { position: 'absolute', top: 6, left: 6, zIndex: 3, backgroundColor: C.accent, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
  multiplierText: { color: C.text, fontWeight: '900', fontSize: 11 },

  ticketLeft:   { width: 108, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 14 },
  leftValue:    { color: C.mint, fontSize: 16, lineHeight: 20, textAlign: 'center', fontWeight: '900' },
  codeText:     { marginTop: 8, color: C.textSub, fontSize: 10, fontWeight: '800' },
  ticketDivider:{ width: 2, backgroundColor: 'rgba(200,160,144,0.15)', borderStyle: 'dashed' },
  ticketRight:  { flex: 1, paddingVertical: 12, paddingHorizontal: 12 },

  badgeRow:  { flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 },
  badge:     { color: C.text, backgroundColor: 'rgba(128,0,7,0.22)', borderWidth: 1, borderColor: 'rgba(128,0,7,0.45)', borderRadius: 7, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 2, fontWeight: '900', fontSize: 11 },
  badgeMuted:{ color: C.textSub, fontSize: 12, fontWeight: '700' },
  desc:      { color: C.text, fontWeight: '800', fontSize: 18, lineHeight: 22 },
  validity:  { marginTop: 6, color: C.textSub, fontSize: 12 },

  bottomRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editBtn:   { flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, shadowColor: C.accent, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 },
  editBtnText:   { color: C.text, fontWeight: '900', fontSize: 13 },
  deleteBtn:     { flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: 'rgba(255,90,110,0.12)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,90,110,0.25)' },
  deleteBtnDisabled: { opacity: 0.6 },
  deleteBtnText: { color: C.danger, fontWeight: '900', fontSize: 13 },

  // ── Modal ──
  modalOverlay:  { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalSheet:    { maxHeight: '86%', backgroundColor: C.bgLayer, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderColor: C.border, paddingBottom: 16 },
  modalHandle:   { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 },
  modalTitle:    { color: C.text, fontSize: 18, fontWeight: '900' },
  modalCloseBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  modalBody:     { paddingHorizontal: 16, paddingBottom: 12 },

  fieldLabel: { color: C.textSub, fontSize: 12, fontWeight: '800', marginBottom: 6, marginTop: 10, textTransform: 'uppercase' },
  input:      { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, color: C.text, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  inputMultiline: { minHeight: 70, textAlignVertical: 'top' },

  categoryPickerRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip:            { borderWidth: 1, borderColor: C.border, borderRadius: 999, backgroundColor: C.surface, paddingHorizontal: 10, paddingVertical: 8 },
  categoryChipActive:      { backgroundColor: C.accent, borderColor: C.accent },
  categoryChipText:        { color: C.textSub, fontSize: 12, fontWeight: '800' },
  categoryChipTextActive:  { color: C.text },

  modalActions:   { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 8 },
  cancelBtn:      { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 12, alignItems: 'center', paddingVertical: 12, backgroundColor: C.surface },
  cancelBtnText:  { color: C.textSub, fontSize: 14, fontWeight: '800' },
  saveBtn:        { flex: 1, borderRadius: 12, alignItems: 'center', paddingVertical: 12, backgroundColor: C.accent, shadowColor: C.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  saveBtnDisabled:{ opacity: 0.7 },
  saveBtnText:    { color: C.text, fontSize: 14, fontWeight: '900' },
})