import React, { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal,
  Pressable,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import AdminHeader from '@/components/adminHeader'
import AdminToast from '@/components/admin-toast'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { deleteAdminReview, fetchAdminReviews } from '@/store/slices/adminReviewSlice'

// ─── TYPES ────────────────────────────────────────────────────
interface AdminReviewItem {
  reviewId: string
  productId: string
  productName: string
  productImage?: string
  rating: number
  comment: string
  userId?: string
  userName?: string
  userEmail?: string
  createdAt: string
}


// ─── CONFIRM DIALOG ───────────────────────────────────────────
interface ConfirmDialogProps {
  visible: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible, title, message, onConfirm, onCancel, isLoading = false,
}) => (
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
          <TouchableOpacity style={cd.cancelBtn} onPress={onCancel} disabled={isLoading} activeOpacity={0.8}>
            <Text style={cd.cancelBtnText}>Cancel</Text>
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
                <Text style={cd.confirmBtnText}>Delete</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </Pressable>
    </Pressable>
  </Modal>
)

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

// ─── STAR ROW ─────────────────────────────────────────────────
const StarRow = ({ rating }: { rating: number }) => (
  <View style={{ flexDirection: 'row', gap: 3 }}>
    {[1, 2, 3, 4, 5].map((s) => (
      <MaterialCommunityIcons
        key={s}
        name={s <= Math.round(rating) ? 'star' : 'star-outline'}
        size={14}
        color={s <= Math.round(rating) ? '#ffca28' : 'rgba(160,174,192,0.25)'}
      />
    ))}
  </View>
)

// ─── MAIN SCREEN ─────────────────────────────────────────────
export default function AdminReview() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { reviews, loading, refreshing, deletingId } = useAppSelector((state) => state.adminReview)
  const [ratingFilter, setRatingFilter] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Confirm dialog state
  const [confirmVisible, setConfirmVisible] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<AdminReviewItem | null>(null)

  // Themed alert state
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

  useEffect(() => {
    fetchReviews()
  }, [])

  const fetchReviews = async (opts?: { silent?: boolean }) => {
    try {
      setError(null)
      await dispatch(fetchAdminReviews(opts)).unwrap()
    } catch (err: any) {
      setError(err || 'Failed to load reviews')
    }
  }

  // Show confirm dialog instead of Alert
  const handleDelete = (item: AdminReviewItem) => {
    setPendingDelete(item)
    setConfirmVisible(true)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      setConfirmVisible(false)
      await dispatch(deleteAdminReview({ reviewId: pendingDelete.reviewId, productId: pendingDelete.productId })).unwrap()
      showAlert('success', 'Deleted', 'Review has been removed successfully.')
    } catch (err: any) {
      const msg = err || 'Failed to delete review'
      showAlert('error', 'Delete Failed', msg)
    } finally {
      setPendingDelete(null)
    }
  }

  const filtered = useMemo(() => {
    if (!ratingFilter) return reviews
    return reviews.filter((r) => Math.round(r.rating) === ratingFilter)
  }, [reviews, ratingFilter])

  const stats = useMemo(() => {
    if (!reviews.length) return { avg: 0, count: 0 }
    const total = reviews.reduce((s, r) => s + r.rating, 0)
    return { avg: total / reviews.length, count: reviews.length }
  }, [reviews])

  const fiveStarCount = reviews.filter(r => Math.round(r.rating) === 5).length
  const lowRatedCount = reviews.filter(r => Math.round(r.rating) <= 2).length

  if (loading) {
    return (
      <View style={s.root}>
        <AdminHeader title="Reviews" icon="star-outline" />
        <View style={s.loader}>
          <ActivityIndicator size="large" color="#2280b0" />
          <Text style={s.loaderText}>Loading reviews...</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={s.root}>
      <AdminHeader title="Reviews" icon="star-outline" />

      {/* Themed Alert */}
      <AdminToast
        visible={alertVisible}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        visible={confirmVisible}
        title="Delete Review"
        message="Remove this review permanently? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => {
          setConfirmVisible(false)
          setPendingDelete(null)
        }}
        isLoading={!!deletingId}
      />

      {/* ── Page Header ── */}
      <View style={s.pageHeader}>
        <View>
          <Text style={s.pageTitle}>Reviews</Text>
          <Text style={s.pageSubtitle}>Monitor and manage product reviews</Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={() => fetchReviews()}>
          <Feather name="refresh-cw" size={15} color="#2280b0" />
        </TouchableOpacity>
      </View>

      {/* ── Stats Row ── */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <MaterialCommunityIcons name="star-outline" size={20} color="#2280b0" />
          <Text style={s.statNum}>{stats.count}</Text>
          <Text style={s.statLabel}>Total</Text>
        </View>
        <View style={s.statCard}>
          <MaterialCommunityIcons name="star" size={20} color="#ffca28" />
          <Text style={s.statNum}>{stats.avg.toFixed(1)}</Text>
          <Text style={s.statLabel}>Avg Rating</Text>
        </View>
        <View style={s.statCard}>
          <MaterialCommunityIcons name="star-check" size={20} color="#4caf50" />
          <Text style={s.statNum}>{fiveStarCount}</Text>
          <Text style={s.statLabel}>5-Star</Text>
        </View>
        <View style={s.statCard}>
          <MaterialCommunityIcons name="star-off" size={20} color="#ff6b6b" />
          <Text style={s.statNum}>{lowRatedCount}</Text>
          <Text style={s.statLabel}>Low Rated</Text>
        </View>
      </View>

      {/* ── Rating Filter ── */}
      <View style={s.filterWrap}>
        <Text style={s.filterLabel}>Filter by rating</Text>
        <View style={s.chipRow}>
          {([null, 5, 4, 3, 2, 1] as (number | null)[]).map((r) => {
            const active = ratingFilter === r
            const label = r ? `${r}★` : 'All'
            return (
              <TouchableOpacity
                key={label}
                style={[s.chip, active && s.chipActive]}
                onPress={() => setRatingFilter(r)}
                activeOpacity={0.8}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* ── Error ── */}
      {error ? (
        <View style={s.errorWrap}>
          <Ionicons name="alert-circle" size={16} color="#ff6b6b" style={{ marginRight: 6 }} />
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* ── List ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.reviewId}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 28, gap: 10 }}
        onRefresh={() => fetchReviews({ silent: true })}
        refreshing={refreshing}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <View style={s.emptyIconWrap}>
              <MaterialCommunityIcons name="star-off" size={36} color="rgba(160,174,192,0.4)" />
            </View>
            <Text style={s.emptyTitle}>No reviews found</Text>
            <Text style={s.emptySubtitle}>
              {ratingFilter ? 'Try a different rating filter' : 'Reviews will appear here once customers start rating products'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            {/* Card Top */}
            <View style={s.cardTop}>
              <View style={s.productIconWrap}>
                <MaterialCommunityIcons name="package-variant" size={20} color="#2280b0" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.productName}>{item.productName}</Text>
                <Text style={s.metaText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
              <View style={s.ratingBadge}>
                <MaterialCommunityIcons name="star" size={12} color="#ffca28" />
                <Text style={s.ratingText}>{item.rating.toFixed(1)}</Text>
              </View>
            </View>

            {/* Stars */}
            <StarRow rating={item.rating} />

            {/* User */}
            <View style={s.userRow}>
              <View style={s.userAvatar}>
                <Text style={s.userAvatarText}>
                  {(item.userName || 'U')[0].toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={s.userName}>{item.userName || 'Unknown user'}</Text>
                {item.userEmail ? <Text style={s.userEmail}>{item.userEmail}</Text> : null}
              </View>
            </View>

            {/* Comment */}
            <View style={s.commentWrap}>
              <Text style={s.commentText}>{item.comment}</Text>
            </View>

            {/* Actions */}
            <View style={s.divider} />
            <View style={s.actionRow}>
              <TouchableOpacity
                style={s.viewBtn}
                onPress={() => router.push({ pathname: '/(user)/ProductDetails', params: { id: item.productId } })}
                activeOpacity={0.8}
              >
                <Feather name="external-link" size={13} color="#2280b0" style={{ marginRight: 5 }} />
                <Text style={s.viewBtnText}>View Product</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.deleteBtn, deletingId === item.reviewId && s.deleteBtnBusy]}
                onPress={() => handleDelete(item)}
                disabled={deletingId === item.reviewId}
                activeOpacity={0.8}
              >
                {deletingId === item.reviewId ? (
                  <ActivityIndicator size="small" color="#ff6b6b" />
                ) : (
                  <>
                    <Feather name="trash-2" size={13} color="#ff6b6b" style={{ marginRight: 5 }} />
                    <Text style={s.deleteBtnText}>Delete</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
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
  statLabel: {
    fontSize: 9,
    color: 'rgba(160,174,192,0.6)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // ── Filter ──
  filterWrap: {
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(160,174,192,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipActive: {
    borderColor: 'rgba(255,202,40,0.5)',
    backgroundColor: 'rgba(255,202,40,0.1)',
  },
  chipText: { color: 'rgba(160,174,192,0.7)', fontWeight: '700', fontSize: 12 },
  chipTextActive: { color: '#ffca28' },

  // ── Error ──
  errorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    marginBottom: 10,
    backgroundColor: 'rgba(255,107,107,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.25)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: { color: '#ff6b6b', fontSize: 13, fontWeight: '600', flex: 1 },

  // ── Empty ──
  emptyState: {
    paddingTop: 60,
    justifyContent: 'center',
    alignItems: 'center',
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
  emptySubtitle: { fontSize: 13, color: 'rgba(160,174,192,0.4)', textAlign: 'center', paddingHorizontal: 20 },

  // ── Review Card ──
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  productIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: 'rgba(34,128,176,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,128,176,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 2 },
  metaText:    { fontSize: 11, color: 'rgba(160,174,192,0.5)' },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255,202,40,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,202,40,0.3)',
  },
  ratingText: { color: '#ffca28', fontWeight: '800', fontSize: 13 },

  // User row
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userAvatar: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(34,128,176,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34,128,176,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  userName:  { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  userEmail: { fontSize: 11, color: 'rgba(160,174,192,0.5)' },

  // Comment
  commentWrap: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  commentText: { color: 'rgba(160,174,192,0.85)', fontSize: 13, lineHeight: 20 },

  // Actions
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(34,128,176,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34,128,176,0.25)',
  },
  viewBtnText: { color: '#2280b0', fontWeight: '700', fontSize: 12 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,107,107,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.25)',
  },
  deleteBtnBusy: { opacity: 0.6 },
  deleteBtnText: { color: '#ff6b6b', fontWeight: '700', fontSize: 12 },
})