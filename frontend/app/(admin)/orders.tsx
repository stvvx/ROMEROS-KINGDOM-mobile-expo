import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import AdminHeader from '@/components/adminHeader'
import AdminToast from '@/components/admin-toast'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchAdminOrders, updateAdminOrderStatus } from '@/store/slices/adminOrderSlice'
import { useLocalSearchParams } from 'expo-router'
import { Stack } from 'expo-router'

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

// ─── STATUS OPTIONS ────────────────────────────────────────────
const STATUS_OPTIONS = ['Processing', 'Shipped', 'Delivered', 'Cancelled'] as const

type OrderStatus = (typeof STATUS_OPTIONS)[number]

const ALLOWED_NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered'],
  Delivered: [],
  Cancelled: [],
}

const isValidStatusTransition = (from: string, to: string) => {
  const f = from as OrderStatus
  const t = to as OrderStatus
  const options = (ALLOWED_NEXT_STATUS as any)[f] as OrderStatus[] | undefined
  if (!options) return false
  return options.includes(t)
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Processing':
      return { bg: 'rgba(255,202,40,0.12)', border: 'rgba(255,202,40,0.25)', text: '#ffca28',  icon: 'hourglass'      }
    case 'Shipped':
      return { bg: 'rgba(192,0,10,0.12)',   border: 'rgba(192,0,10,0.25)',   text: '#c0000a',  icon: 'truck-outline'  }
    case 'Delivered':
      return { bg: 'rgba(153,98,80,0.15)',  border: 'rgba(153,98,80,0.3)',   text: '#996250',  icon: 'check-circle'   }
    case 'Cancelled':
      return { bg: 'rgba(255,90,110,0.10)', border: 'rgba(255,90,110,0.25)', text: '#FF5A6E',  icon: 'close-circle'   }
    default:
      return { bg: 'rgba(200,160,144,0.08)', border: 'rgba(200,160,144,0.15)', text: '#c8a090', icon: 'help-circle'   }
  }
}

const formatMoney = (n: any) => {
  const num = Number(n)
  if (Number.isNaN(num)) return String(n ?? '')
  return `₱${num.toFixed(2)}`
}

const safeText = (v: any) => (v === null || v === undefined ? '' : String(v))

// ─── MAIN SCREEN ──────────────────────────────────────────────
export default function OrderManagement() {
  const params = useLocalSearchParams<{ openOrderId?: string | string[] }>()
  const openOrderId = Array.isArray(params?.openOrderId) ? params.openOrderId[0] : params?.openOrderId

  const dispatch = useAppDispatch()
  const { orders, loading, refreshing, updating } = useAppSelector((state) => state.adminOrder)
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [alertVisible, setAlertVisible] = useState(false)
  const [alertType, setAlertType] = useState<'success' | 'error'>('success')
  const [alertTitle, setAlertTitle] = useState('')
  const [alertMessage, setAlertMessage] = useState('')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')

  const showAlert = (type: 'success' | 'error', title: string, message: string) => {
    setAlertType(type); setAlertTitle(title); setAlertMessage(message); setAlertVisible(true)
  }

  const fetchOrders = (opts?: { silent?: boolean }) => dispatch(fetchAdminOrders(opts))

  useEffect(() => { fetchOrders() }, [])

  // Open order details when navigated from a push notification
  useEffect(() => {
    if (!openOrderId) return
    if (!orders || orders.length === 0) return

    const match = orders.find((o: any) => String(o?._id) === String(openOrderId))
    if (!match) return

    // Avoid re-opening if already open
    if (selectedOrder && String(selectedOrder?._id) === String(openOrderId)) return

    openOrderModal(match)
  }, [openOrderId, orders])

  const openOrderModal = (order: any) => { setSelectedOrder(order); setModalVisible(true) }
  const closeModal = () => { setModalVisible(false); setSelectedOrder(null) }

  const updateStatus = async (status: string) => {
    if (!selectedOrder) return

    const currentStatus = String(selectedOrder.orderStatus || '')
    const nextStatus = String(status)

    if (currentStatus === nextStatus) return

    // Lock rules:
    // - Processing -> Shipped/Cancelled only
    // - Shipped -> Delivered only (cannot go back to Processing and cannot Cancel)
    // - Delivered/Canceled -> no further changes
    if (!isValidStatusTransition(currentStatus, nextStatus)) {
      showAlert('error', 'Invalid Status Change', `You cannot change status from ${currentStatus} to ${nextStatus}.`)
      return
    }

    try {
      await dispatch(updateAdminOrderStatus({ orderId: selectedOrder._id, status })).unwrap()
      closeModal()
      fetchOrders({ silent: true })
      showAlert('success', 'Status Updated', `Order status has been updated to ${status}.`)
    } catch (err: any) {
      showAlert('error', 'Update Failed', err || 'Something went wrong. Please try again.')
    }
  }

  const processingCount = orders.filter(o => o.orderStatus === 'Processing').length
  const shippedCount    = orders.filter(o => o.orderStatus === 'Shipped').length
  const deliveredCount  = orders.filter(o => o.orderStatus === 'Delivered').length
  const cancelledCount  = orders.filter(o => o.orderStatus === 'Cancelled').length

  const sortedOrders = [...orders].sort((a: any, b: any) => {
    const at = new Date(a?.createdAt || 0).getTime()
    const bt = new Date(b?.createdAt || 0).getTime()
    return sortDir === 'desc' ? bt - at : at - bt
  })

  if (loading && orders.length === 0) {
    return (
      <View style={s.root}>
        <AdminHeader title="Orders" icon="package-variant-closed" />
        <View style={s.loader}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={s.loaderText}>Loading orders...</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <AdminHeader title="Orders" icon="package-variant-closed" hideMenu />

      <AdminToast
        visible={alertVisible}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />

      {/* ── Page Header ── */}
      <View style={s.pageHeader}>
        <View>
          <Text style={s.pageTitle}>Order Management</Text>
          <Text style={s.pageSubtitle}>Track and manage customer orders</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            style={s.refreshBtn}
            onPress={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
            activeOpacity={0.85}
          >
            <Feather name={sortDir === 'desc' ? 'arrow-down' : 'arrow-up'} size={15} color={C.accent} />
          </TouchableOpacity>
          <TouchableOpacity style={s.refreshBtn} onPress={() => fetchOrders()}>
            <Feather name="refresh-cw" size={15} color={C.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── List ── */}
      {orders.length === 0 ? (
        <View style={s.emptyState}>
          <View style={s.emptyIconWrap}>
            <MaterialCommunityIcons name="package-variant" size={36} color={C.textDim} />
          </View>
          <Text style={s.emptyTitle}>No orders found</Text>
          <Text style={s.emptySubtitle}>Orders will appear here as customers place them</Text>
        </View>
      ) : (
        <FlatList
          data={sortedOrders}
          keyExtractor={(item) => item._id}
          onRefresh={() => fetchOrders({ silent: true })}
          refreshing={refreshing}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const statusColor = getStatusColor(item.orderStatus)
            return (
              <TouchableOpacity style={s.card} onPress={() => openOrderModal(item)} activeOpacity={0.75}>
                <View style={s.cardLeft}>
                  <View style={s.orderNumberBg}>
                    <MaterialCommunityIcons name="package-variant" size={18} color={C.accent} />
                  </View>
                  <View style={s.cardInfo}>
                    <Text style={s.cardTitle}>Order #{item._id.slice(-6).toUpperCase()}</Text>
                    <Text style={s.cardEmail}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                  </View>
                </View>

                <View style={s.cardRight}>
                  <View style={s.priceAndStatus}>
                    <Text style={s.cardPrice}>₱{item.totalPrice}</Text>
                    <View style={[s.statusBadge, { backgroundColor: statusColor.bg, borderColor: statusColor.border }]}>
                      <MaterialCommunityIcons name={statusColor.icon as any} size={10} color={statusColor.text} />
                      <Text style={[s.statusBadgeText, { color: statusColor.text }]}>{item.orderStatus}</Text>
                    </View>
                  </View>
                  <Feather name="chevron-right" size={16} color={C.textDim} style={{ marginTop: 6 }} />
                </View>
              </TouchableOpacity>
            )
          }}
        />
      )}

      {/* ── Order Detail Modal ── */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={s.modalOverlay}>
          <Pressable style={s.modalBackdrop} onPress={closeModal} />
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />

            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Order Details</Text>
                <Text style={s.modalSubtitle}>Review order and change status</Text>
              </View>
              <TouchableOpacity onPress={closeModal} style={s.modalCloseBtn}>
                <Feather name="x" size={18} color={C.textSub} />
              </TouchableOpacity>
            </View>

            <View style={s.modalDivider} />

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedOrder && (
                <>
                  <View style={s.orderInfoPanel}>
                    <View style={s.orderNumberBg}>
                      <MaterialCommunityIcons name="package-variant" size={24} color={C.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.userInfoName}>Order #{selectedOrder._id.slice(-6).toUpperCase()}</Text>
                      <Text style={s.userInfoEmail}>
                        {formatMoney(selectedOrder.totalPrice)} • {new Date(selectedOrder.createdAt).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* Customer */}
                  <Text style={s.sectionLabel}>Customer</Text>
                  <View style={s.detailCard}>
                    <View style={s.detailRow}>
                      <Text style={s.detailKey}>Name</Text>
                      <Text style={s.detailVal}>{safeText(selectedOrder.user?.name || selectedOrder.shippingInfo?.name || '—')}</Text>
                    </View>
                    <View style={s.detailRow}>
                      <Text style={s.detailKey}>Email</Text>
                      <Text style={s.detailVal}>{safeText(selectedOrder.user?.email || selectedOrder.shippingInfo?.email || '—')}</Text>
                    </View>
                    <View style={s.detailRow}>
                      <Text style={s.detailKey}>Phone</Text>
                      <Text style={s.detailVal}>{safeText(selectedOrder.shippingInfo?.phoneNo || selectedOrder.shippingInfo?.phone || '—')}</Text>
                    </View>
                  </View>

                  {/* Shipping */}
                  <Text style={s.sectionLabel}>Shipping</Text>
                  <View style={s.detailCard}>
                    <View style={s.detailRow}>
                      <Text style={s.detailKey}>Address</Text>
                      <Text style={s.detailVal}>
                        {safeText(
                          selectedOrder.shippingInfo?.address ||
                            selectedOrder.shippingInfo?.street ||
                            selectedOrder.shippingInfo?.fullAddress ||
                            '—'
                        )}
                      </Text>
                    </View>
                    <View style={s.detailRow}>
                      <Text style={s.detailKey}>City</Text>
                      <Text style={s.detailVal}>{safeText(selectedOrder.shippingInfo?.city || '—')}</Text>
                    </View>
                    <View style={s.detailRow}>
                      <Text style={s.detailKey}>Postal</Text>
                      <Text style={s.detailVal}>{safeText(selectedOrder.shippingInfo?.postalCode || '—')}</Text>
                    </View>
                    <View style={s.detailRow}>
                      <Text style={s.detailKey}>Country</Text>
                      <Text style={s.detailVal}>{safeText(selectedOrder.shippingInfo?.country || '—')}</Text>
                    </View>
                  </View>

                  {/* Items */}
                  <Text style={s.sectionLabel}>Items</Text>
                  <View style={s.detailCard}>
                    {(selectedOrder.orderItems || []).length === 0 ? (
                      <Text style={s.detailVal}>No items</Text>
                    ) : (
                      (selectedOrder.orderItems || []).map((it: any, idx: number) => {
                        const key = it?._id || it?.product?._id || `${idx}-${it?.name || 'item'}`
                        const title = it?.name || it?.product?.name || 'Item'
                        const qty = it?.quantity ?? it?.qty ?? 1
                        const price = it?.price ?? it?.product?.price
                        const lineTotal = Number(price ?? 0) * Number(qty ?? 1)
                        return (
                          <View key={key} style={[s.itemRow, idx === 0 ? { marginTop: 2 } : null]}>
                            <View style={{ flex: 1 }}>
                              <Text style={s.itemName} numberOfLines={2}>{title}</Text>
                              <Text style={s.itemMeta}>
                                Qty: {qty} • Price: {formatMoney(price)}
                              </Text>
                            </View>
                            <Text style={s.itemTotal}>{formatMoney(lineTotal)}</Text>
                          </View>
                        )
                      })
                    )}
                  </View>

                  {/* Totals */}
                  <Text style={s.sectionLabel}>Payment Summary</Text>
                  <View style={s.detailCard}>
                    <View style={s.detailRow}>
                      <Text style={s.detailKey}>Items</Text>
                      <Text style={s.detailVal}>{formatMoney(selectedOrder.itemsPrice)}</Text>
                    </View>
                    <View style={s.detailRow}>
                      <Text style={s.detailKey}>Shipping</Text>
                      <Text style={s.detailVal}>{formatMoney(selectedOrder.shippingPrice)}</Text>
                    </View>
                    <View style={s.detailRow}>
                      <Text style={s.detailKey}>Tax</Text>
                      <Text style={s.detailVal}>{formatMoney(selectedOrder.taxPrice)}</Text>
                    </View>
                    <View style={[s.detailRow, { marginTop: 6 }]}>
                      <Text style={[s.detailKey, { color: C.text, fontWeight: '800' }]}>Total</Text>
                      <Text style={[s.detailVal, { color: C.mint, fontWeight: '800' }]}>{formatMoney(selectedOrder.totalPrice)}</Text>
                    </View>
                  </View>

                  {/* Status */}
                  <Text style={s.sectionLabel}>Order Status</Text>
                  <View style={s.statusGrid}>
                    {STATUS_OPTIONS.map((status) => {
                      const isSelected = selectedOrder.orderStatus === status
                      const color = getStatusColor(status)
                      const currentStatus = String(selectedOrder.orderStatus || '')
                      const canSelect = isSelected ? false : isValidStatusTransition(currentStatus, String(status))
                      const isDisabled = updating || !canSelect
                      return (
                        <TouchableOpacity
                          key={status}
                          style={[
                            s.statusOption,
                            isSelected && s.statusOptionSelected,
                            {
                              borderColor: color.border,
                              backgroundColor: isSelected ? color.bg : C.surface,
                              opacity: isDisabled && !isSelected ? 0.45 : 1,
                            },
                          ]}
                          onPress={() => updateStatus(status)}
                          disabled={isDisabled}
                          activeOpacity={0.8}
                        >
                          <MaterialCommunityIcons name={color.icon as any} size={20} color={color.text} />
                          <Text style={[s.statusOptionText, { color: isSelected ? color.text : C.textSub }]}>{status}</Text>
                          {isSelected && <Feather name="check" size={14} color={color.text} style={{ marginLeft: 4 }} />}
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={closeModal} disabled={updating}>
                <Text style={s.cancelBtnText}>Close</Text>
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

  statsRow:  { flexDirection: 'row', paddingHorizontal: 18, paddingVertical: 2, gap: 10, marginBottom: 16 },
  statCard:  { width: 90, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', gap: 6 },
  statNum:   { fontSize: 20, fontWeight: '800', color: C.accent, lineHeight: 24 },
  statLabel: { fontSize: 9, color: C.textSub, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center', lineHeight: 11, marginTop: 2 },

  emptyState:   { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80, gap: 10 },
  emptyIconWrap:{ width: 72, height: 72, borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: C.textSub },
  emptySubtitle:{ fontSize: 13, color: C.textDim },

  card:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.surface, marginHorizontal: 18, marginBottom: 10, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
  cardLeft:      { flexDirection: 'row', alignItems: 'center', flex: 1 },
  orderNumberBg: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(128,0,7,0.15)', borderWidth: 1, borderColor: 'rgba(128,0,7,0.3)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardInfo:      { flex: 1 },
  cardTitle:     { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 3 },
  cardEmail:     { fontSize: 12, color: C.textSub },
  cardRight:     { alignItems: 'flex-end' },
  priceAndStatus:{ alignItems: 'flex-end', marginBottom: 6 },
  cardPrice:     { fontSize: 14, fontWeight: '800', color: C.mint, marginBottom: 6 },
  statusBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  statusBadgeText:{ fontSize: 10, fontWeight: '700' },

  modalOverlay:  { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
  modalSheet:    { backgroundColor: C.bgLayer, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12, maxHeight: '88%', borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.border },
  modalHandle:   { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 18 },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  modalTitle:    { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 2 },
  modalSubtitle: { fontSize: 12, color: C.textSub },
  modalCloseBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  modalDivider:  { height: 1, backgroundColor: C.border, marginBottom: 20 },

  orderInfoPanel: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: C.border },
  userInfoName:   { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 3 },
  userInfoEmail:  { fontSize: 12, color: C.textSub },
  sectionLabel:   { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 12, marginTop: 4 },

  detailCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, marginBottom: 18 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  detailKey: { color: C.textSub, fontSize: 12, fontWeight: '700' },
  detailVal: { color: C.text, fontSize: 12, fontWeight: '600', flex: 1, textAlign: 'right' },

  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(200,160,144,0.12)' },
  itemName: { color: C.text, fontSize: 13, fontWeight: '800', marginBottom: 4 },
  itemMeta: { color: C.textSub, fontSize: 11, fontWeight: '600' },
  itemTotal: { color: C.mint, fontSize: 12, fontWeight: '800' },

  statusGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statusOption:        { flex: 1, minWidth: '48%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, borderWidth: 1, paddingVertical: 12 },
  statusOptionSelected:{ borderWidth: 2 },
  statusOptionText:    { fontSize: 12, fontWeight: '600' },

  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn:    { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 13, paddingVertical: 14, alignItems: 'center', backgroundColor: 'rgba(249,249,249,0.04)' },
  cancelBtnText:{ fontSize: 14, fontWeight: '700', color: C.textSub },
})