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

// ─── STATUS OPTIONS ────────────────────────────────────────────
const STATUS_OPTIONS = ['Processing', 'Shipped', 'Delivered', 'Cancelled']

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Processing':
      return { bg: 'rgba(255,202,40,0.12)', border: 'rgba(255,202,40,0.25)', text: '#ffca28', icon: 'hourglass' }
    case 'Shipped':
      return { bg: 'rgba(33,150,243,0.12)', border: 'rgba(33,150,243,0.25)', text: '#2196F3', icon: 'truck-outline' }
    case 'Delivered':
      return { bg: 'rgba(76,175,80,0.12)', border: 'rgba(76,175,80,0.25)', text: '#4caf50', icon: 'check-circle' }
    case 'Cancelled':
      return { bg: 'rgba(255,107,107,0.12)', border: 'rgba(255,107,107,0.25)', text: '#ff6b6b', icon: 'close-circle' }
    default:
      return { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.07)', text: '#fff', icon: 'help-circle' }
  }
}

// ─── MAIN SCREEN ──────────────────────────────────────────────
export default function OrderManagement() {
  const dispatch = useAppDispatch()
  const { orders, loading, refreshing, updating } = useAppSelector((state) => state.adminOrder)
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
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

  const fetchOrders = (opts?: { silent?: boolean }) => dispatch(fetchAdminOrders(opts))

  useEffect(() => {
    fetchOrders()
  }, [])

  const openOrderModal = (order: any) => {
    setSelectedOrder(order)
    setModalVisible(true)
  }

  const closeModal = () => {
    setModalVisible(false)
    setSelectedOrder(null)
  }

  const updateStatus = async (status: string) => {
    if (!selectedOrder) return
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
  const shippedCount = orders.filter(o => o.orderStatus === 'Shipped').length
  const deliveredCount = orders.filter(o => o.orderStatus === 'Delivered').length
  const cancelledCount = orders.filter(o => o.orderStatus === 'Cancelled').length

  if (loading && orders.length === 0) {
    return (
      <View style={s.root}>
        <AdminHeader title="Orders" icon="package-variant-closed" />
        <View style={s.loader}>
          <ActivityIndicator size="large" color="#2280b0" />
          <Text style={s.loaderText}>Loading orders...</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={s.root}>
      <AdminHeader title="Orders" icon="package-variant-closed" />

      {/* Themed Alert */}
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
        <TouchableOpacity style={s.refreshBtn} onPress={() => fetchOrders()}>
          <Feather name="refresh-cw" size={15} color="#2280b0" />
        </TouchableOpacity>
      </View>

      {/* ── Stats Row ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.statsRow}
        scrollEventThrottle={16}
      >
        <View style={s.statCard}>
          <MaterialCommunityIcons name="package-variant" size={20} color="#2280b0" />
          <Text style={s.statNum}>{orders.length}</Text>
          <Text style={s.statLabel}>Total</Text>
        </View>
        <View style={s.statCard}>
          <MaterialCommunityIcons name="clock-outline" size={20} color="#ffca28" />
          <Text style={s.statNum}>{processingCount}</Text>
          <Text style={s.statLabel} numberOfLines={2}>Processing</Text>
        </View>
        <View style={s.statCard}>
          <MaterialCommunityIcons name="truck-outline" size={20} color="#2196F3" />
          <Text style={s.statNum}>{shippedCount}</Text>
          <Text style={s.statLabel}>Shipped</Text>
        </View>
        <View style={s.statCard}>
          <Ionicons name="checkmark-circle" size={20} color="#4caf50" />
          <Text style={s.statNum}>{deliveredCount}</Text>
          <Text style={s.statLabel} numberOfLines={2}>Delivered</Text>
        </View>
        <View style={s.statCard}>
          <MaterialCommunityIcons name="close-circle" size={20} color="#ff6b6b" />
          <Text style={s.statNum}>{cancelledCount}</Text>
          <Text style={s.statLabel}>Cancelled</Text>
        </View>
      </ScrollView>

      {/* ── List ── */}
      {orders.length === 0 ? (
        <View style={s.emptyState}>
          <View style={s.emptyIconWrap}>
            <MaterialCommunityIcons name="package-variant" size={36} color="rgba(160,174,192,0.4)" />
          </View>
          <Text style={s.emptyTitle}>No orders found</Text>
          <Text style={s.emptySubtitle}>Orders will appear here as customers place them</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
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
                    <MaterialCommunityIcons name="package-variant" size={18} color="#2280b0" />
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
                  <Feather name="chevron-right" size={16} color="rgba(160,174,192,0.4)" style={{ marginTop: 6 }} />
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

            {/* Handle */}
            <View style={s.modalHandle} />

            {/* Modal Header */}
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Update Order</Text>
                <Text style={s.modalSubtitle}>Change order status</Text>
              </View>
              <TouchableOpacity onPress={closeModal} style={s.modalCloseBtn}>
                <Feather name="x" size={18} color="rgba(160,174,192,0.7)" />
              </TouchableOpacity>
            </View>

            <View style={s.modalDivider} />

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedOrder && (
                <>
                  {/* Order info panel */}
                  <View style={s.orderInfoPanel}>
                    <View style={s.orderNumberBg}>
                      <MaterialCommunityIcons name="package-variant" size={24} color="#2280b0" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.userInfoName}>Order #{selectedOrder._id.slice(-6).toUpperCase()}</Text>
                      <Text style={s.userInfoEmail}>₱{selectedOrder.totalPrice} • {new Date(selectedOrder.createdAt).toLocaleDateString()}</Text>
                    </View>
                  </View>

                  {/* Status Selection */}
                  <Text style={s.sectionLabel}>Order Status</Text>
                  <View style={s.statusGrid}>
                    {STATUS_OPTIONS.map((status) => {
                      const isSelected = selectedOrder.orderStatus === status
                      const color = getStatusColor(status)
                      return (
                        <TouchableOpacity
                          key={status}
                          style={[
                            s.statusOption,
                            isSelected && s.statusOptionSelected,
                            { borderColor: color.border, backgroundColor: isSelected ? color.bg : 'rgba(255,255,255,0.04)' }
                          ]}
                          onPress={() => updateStatus(status)}
                          disabled={updating}
                          activeOpacity={0.8}
                        >
                          <MaterialCommunityIcons name={color.icon as any} size={20} color={color.text} />
                          <Text style={[s.statusOptionText, { color: isSelected ? color.text : 'rgba(160,174,192,0.6)' }]}>{status}</Text>
                          {isSelected && <Feather name="check" size={14} color={color.text} style={{ marginLeft: 4 }} />}
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </>
              )}
            </ScrollView>

            {/* Actions */}
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
  root: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingVertical: 2,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: 90,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statNum: { fontSize: 20, fontWeight: '800', color: '#fff', lineHeight: 24 },
  statLabel: {
    fontSize: 9,
    color: 'rgba(160,174,192,0.6)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
    lineHeight: 11,
    marginTop: 2,
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
  emptyTitle: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  emptySubtitle: { fontSize: 13, color: 'rgba(160,174,192,0.4)' },

  // ── Order Card ──
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginHorizontal: 18,
    marginBottom: 10,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  orderNumberBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(34,128,176,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34,128,176,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 3 },
  cardEmail: { fontSize: 12, color: 'rgba(160,174,192,0.55)' },
  cardRight: { alignItems: 'flex-end' },
  priceAndStatus: { alignItems: 'flex-end', marginBottom: 6 },
  cardPrice: { fontSize: 14, fontWeight: '800', color: '#00C2C7', marginBottom: 6 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },

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
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 2 },
  modalSubtitle: { fontSize: 12, color: 'rgba(160,174,192,0.6)' },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 20 },
  orderInfoPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  userInfoName: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 3 },
  userInfoEmail: { fontSize: 12, color: 'rgba(160,174,192,0.55)' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 12, marginTop: 4 },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  statusOption: {
    flex: 1,
    minWidth: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    paddingVertical: 12,
  },
  statusOptionSelected: { borderWidth: 2 },
  statusOptionText: { fontSize: 12, fontWeight: '600' },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
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
})