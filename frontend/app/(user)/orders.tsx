import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { fetchMyOrders } from '@/store/slices/orderSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

/* ─── Types ─── */
interface OrderItem {
  _id: string;
  name: string;
  quantity: number;
  image: string;
  price: number;
  product: string;
}

interface Order {
  _id: string;
  orderItems: OrderItem[];
  shippingInfo: {
    address: string;
    city: string;
    phoneNo: string;
    postalCode: string;
    country: string;
  };
  paymentInfo?: { id?: string; status?: string };
  itemsPrice: number;
  taxPrice: number;
  shippingPrice: number;
  totalPrice: number;
  orderStatus: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | string;
  paidAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

/* ─── Design tokens ─── */
const C = {
  bg:         '#1a0204',
  bgLayer:    '#200305',
  surface:    '#2a0508',
  border:     '#3d0a0d',
  accent:     '#800007',
  accentText: '#c0000a',
  mint:       '#996250',
  text:       '#F9F9F9',
  textSub:    '#996250',
  textDim:    '#4a2020',
  danger:     '#FF5A6E',
  dangerBg:   'rgba(255,90,110,0.10)',
  warning:    '#FFB347',
  warningBg:  'rgba(255,179,71,0.12)',
  success:    '#996250',
  successBg:  'rgba(153,98,80,0.12)',
  info:       '#c0000a',
  infoBg:     'rgba(192,0,10,0.10)',
} as const;

/* ─── Status config ─── */
const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  Processing: { color: C.warning,  bg: C.warningBg,  icon: '⏳', label: 'Processing' },
  Shipped:    { color: C.info,     bg: C.infoBg,     icon: '🚚', label: 'Shipped'    },
  Delivered:  { color: C.success,  bg: C.successBg,  icon: '✅', label: 'Delivered'  },
  Cancelled:  { color: C.danger,   bg: C.dangerBg,   icon: '✕',  label: 'Cancelled'  },
};

function getStatus(status: string) {
  return STATUS_CONFIG[status] ?? { color: C.accent, bg: 'transparent', icon: '•', label: status };
}

/* ─── Helpers ─── */
function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatPrice(n: number) {
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ─── Summary pills ─── */
const SummaryPill = ({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) => (
  <View style={styles.pill}>
    <Text style={[styles.pillValue, accent && { color: C.mint }]}>{value}</Text>
    <Text style={styles.pillLabel}>{label}</Text>
  </View>
);

/* ─── Status badge ─── */
const StatusBadge = ({ status }: { status: string }) => {
  const cfg = getStatus(status);
  return (
    <View style={[styles.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
      <Text style={{ fontSize: 11 }}>{cfg.icon}</Text>
      <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
};

/* ─── Order card ─── */
const OrderCard = ({ order, onPress }: { order: Order; onPress: () => void }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn  = () => Animated.spring(scale, { toValue: 0.977, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,     useNativeDriver: true }).start();

  const firstItem = order.orderItems[0];

  return (
    <Animated.View style={{ transform: [{ scale }], marginBottom: 12 }}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={1}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderId} numberOfLines={1}>
              #{order._id.slice(-10).toUpperCase()}
            </Text>
            <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
          </View>
          <StatusBadge status={order.orderStatus} />
        </View>

        <View style={styles.cardItemRow}>
          {firstItem?.image ? (
            <Image source={{ uri: firstItem.image }} style={styles.itemThumb} resizeMode="cover" />
          ) : (
            <View style={[styles.itemThumb, styles.thumbPlaceholder]}>
              <Text style={{ fontSize: 22 }}>📦</Text>
            </View>
          )}
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.itemName} numberOfLines={2}>{firstItem?.name ?? '—'}</Text>
            {order.orderItems.length > 1 && (
              <Text style={styles.moreItems}>
                +{order.orderItems.length - 1} more item{order.orderItems.length - 1 > 1 ? 's' : ''}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalAmount}>{formatPrice(order.totalPrice)}</Text>
          </View>
          <Text style={styles.cardCta}>View details →</Text>
        </View>

        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerBR]} />
      </TouchableOpacity>
    </Animated.View>
  );
};

/* ─── Expanded Order Detail Modal ─── */
const OrderDetail = ({ order, onClose }: { order: Order; onClose: () => void }) => {
  const slideY = useRef(new Animated.Value(50)).current;
  const fade   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,   { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start();
  }, []);

  const close = () => {
    Animated.parallel([
      Animated.timing(fade,   { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 50, duration: 200, useNativeDriver: true }),
    ]).start(onClose);
  };

  const cfg = getStatus(order.orderStatus);

  return (
    <Animated.View style={[styles.detailOverlay, { opacity: fade }]}>
      <TouchableOpacity style={styles.detailBackdrop} activeOpacity={1} onPress={close} />
      <Animated.View style={[styles.detailSheet, { transform: [{ translateY: slideY }] }]}>
        <View style={styles.detailHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.detailTitle}>Order Details</Text>
            <Text style={styles.detailId}>#{order._id.slice(-10).toUpperCase()}</Text>
          </View>
          <TouchableOpacity style={styles.detailCloseBtn} onPress={close}>
            <Text style={styles.detailCloseTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={order.orderItems}
          keyExtractor={(i) => i._id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          ListHeaderComponent={
            <>
              <View style={[styles.statusBanner, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
                <Text style={{ fontSize: 22 }}>{cfg.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.statusBannerTitle, { color: cfg.color }]}>{cfg.label}</Text>
                  {order.orderStatus === 'Delivered' && order.deliveredAt && (
                    <Text style={styles.statusBannerSub}>Delivered on {formatDate(order.deliveredAt)}</Text>
                  )}
                  {order.orderStatus === 'Processing' && (
                    <Text style={styles.statusBannerSub}>Your order is being prepared</Text>
                  )}
                  {order.orderStatus === 'Shipped' && (
                    <Text style={styles.statusBannerSub}>On the way to your address</Text>
                  )}
                  {order.orderStatus === 'Cancelled' && (
                    <Text style={styles.statusBannerSub}>This order was cancelled</Text>
                  )}
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>SHIPPING ADDRESS</Text>
                <Text style={styles.detailText}>{order.shippingInfo.address}, {order.shippingInfo.city}</Text>
                <Text style={styles.detailText}>{order.shippingInfo.postalCode}, {order.shippingInfo.country}</Text>
                <Text style={styles.detailText}>📞 {order.shippingInfo.phoneNo}</Text>
              </View>

              <Text style={styles.sectionTitle}>ORDER ITEMS</Text>
            </>
          }
          renderItem={({ item }) => (
            <View style={styles.detailItemRow}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.detailItemImg} resizeMode="cover" />
              ) : (
                <View style={[styles.detailItemImg, styles.thumbPlaceholder]}>
                  <Text>📦</Text>
                </View>
              )}
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.detailItemName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.detailItemMeta}>{formatPrice(item.price)} × {item.quantity}</Text>
              </View>
              <Text style={styles.detailItemTotal}>{formatPrice(item.price * item.quantity)}</Text>
            </View>
          )}
          ListFooterComponent={
            <View style={styles.detailPriceBox}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Items</Text>
                <Text style={styles.priceValue}>{formatPrice(order.itemsPrice)}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Tax</Text>
                <Text style={styles.priceValue}>{formatPrice(order.taxPrice)}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Shipping</Text>
                <Text style={styles.priceValue}>{formatPrice(order.shippingPrice)}</Text>
              </View>
              <View style={styles.priceDivider} />
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: C.text, fontWeight: '700' }]}>Total</Text>
                <Text style={styles.priceTotalValue}>{formatPrice(order.totalPrice)}</Text>
              </View>
              {order.paidAt && (
                <Text style={styles.paidText}>Paid on {formatDate(order.paidAt)}</Text>
              )}
            </View>
          }
        />
      </Animated.View>
    </Animated.View>
  );
};

/* ─── Main Screen ─── */
export default function Orders() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { orderId: deepLinkOrderId } = useLocalSearchParams<{ orderId?: string }>();
  const { orders, loading, refreshing, error, needsAuth } = useAppSelector((state) => state.order);
  const [selected, setSelected]   = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'reviews'>('orders');

  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    dispatch(fetchMyOrders());
  }, []);

  useEffect(() => {
    if (deepLinkOrderId) {
      const target = orders.find((order) => order._id === deepLinkOrderId);
      if (target) setSelected(target);
    }
  }, [orders, deepLinkOrderId]);

  const stats = {
    total:     orders.length,
    delivered: orders.filter(o => o.orderStatus === 'Delivered').length,
    active:    orders.filter(o => ['Processing', 'Shipped'].includes(o.orderStatus)).length,
    spent:     orders.reduce((s, o) => s + o.totalPrice, 0),
  };

  /* ── Unauthenticated ── */
  if (!loading && needsAuth) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <Text style={{ fontSize: 36, marginBottom: 16 }}>🔒</Text>
        <Text style={styles.emptyTitle}>Sign in to see orders</Text>
        <Text style={styles.emptyText}>Track your purchases and delivery status here.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.primaryBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Loading your orders…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>◈ DRIFT N' DASH</Text>
            <Text style={styles.title}>My Account</Text>
          </View>
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'orders' && styles.tabActive]}
            onPress={() => setActiveTab('orders')}
          >
            <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>
              📦  Orders
            </Text>
            {stats.active > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeTxt}>{stats.active}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'reviews' && styles.tabActive]}
            onPress={() => router.push('/(user)/review')}
          >
            <Text style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}>
              ★  Reviews
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Summary pills */}
      <View style={styles.pillRow}>
        <SummaryPill label="Total Orders" value={stats.total} />
        <SummaryPill label="Delivered"    value={stats.delivered} accent />
        <SummaryPill label="Active"       value={stats.active} />
        <SummaryPill label="Total Spent"  value={formatPrice(stats.spent)} />
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => dispatch(fetchMyOrders())}>
            <Text style={styles.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => dispatch(fetchMyOrders({ silent: true }))}
              tintColor={C.accent}
              colors={[C.accent]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🛒</Text>
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptyText}>Start shopping and your orders will appear here.</Text>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/(tabs)')}>
                <Text style={styles.secondaryBtnText}>Browse Products</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <OrderCard order={item} onPress={() => setSelected(item)} />
          )}
        />
      )}

      {selected && (
        <OrderDetail order={selected} onClose={() => setSelected(null)} />
      )}
    </View>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 8 },
  loadingText: { color: C.textSub, marginTop: 12, fontSize: 14 },

  header: {
    backgroundColor: C.bgLayer,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 20,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  eyebrow:   { color: C.accent, fontSize: 10, letterSpacing: 3, fontWeight: '700' },
  title:     { color: C.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },

  tabBar:        { flexDirection: 'row', gap: 4 },
  tab:           { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabActive:     { borderBottomColor: C.accent },
  tabText:       { color: C.textSub, fontSize: 14, fontWeight: '600', letterSpacing: 0.3 },
  tabTextActive: { color: C.accentText, fontWeight: '700' },
  tabBadge:      { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  tabBadgeTxt:   { color: C.text, fontSize: 9, fontWeight: '800' },

  pillRow:   { flexDirection: 'row', padding: 14, gap: 8 },
  pill:      { flex: 1, backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 10, alignItems: 'center' },
  pillValue: { color: C.accent, fontSize: 15, fontWeight: '800' },
  pillLabel: { color: C.textSub, fontSize: 9, marginTop: 3, textAlign: 'center' },

  list: { paddingHorizontal: 16, paddingBottom: 60, paddingTop: 4 },

  card:        { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, gap: 12, overflow: 'hidden' },
  cardTop:     { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  orderId:     { color: C.text, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  orderDate:   { color: C.textSub, fontSize: 11, marginTop: 3 },

  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  statusText:  { fontSize: 11, fontWeight: '700' },

  cardItemRow:     { flexDirection: 'row', gap: 12, alignItems: 'center' },
  itemThumb:       { width: 58, height: 58, borderRadius: 10, backgroundColor: C.bgLayer, borderWidth: 1, borderColor: C.border },
  thumbPlaceholder:{ justifyContent: 'center', alignItems: 'center' },
  itemName:        { color: C.text, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  moreItems:       { color: C.textSub, fontSize: 11 },

  cardFooter:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10 },
  totalLabel:  { color: C.textSub, fontSize: 8, letterSpacing: 2, fontWeight: '700' },
  totalAmount: { color: C.mint, fontSize: 16, fontWeight: '800' },
  cardCta:     { color: C.accent, fontSize: 12, fontWeight: '700' },

  corner:   { position: 'absolute', backgroundColor: C.accent, opacity: 0.4 },
  cornerTL: { top: 0, left: 0, width: 14, height: 1.5 },
  cornerBR: { bottom: 0, right: 0, width: 14, height: 1.5 },

  errorBox:  { margin: 20, padding: 20, backgroundColor: C.dangerBg, borderRadius: 14, borderWidth: 1, borderColor: C.danger, alignItems: 'center', gap: 10 },
  errorText: { color: C.danger, fontSize: 13, textAlign: 'center' },
  retryBtn:  { backgroundColor: C.danger, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryTxt:  { color: '#fff', fontWeight: '700', fontSize: 12 },

  emptyBox:         { marginTop: 40, alignItems: 'center', gap: 8, paddingHorizontal: 20 },
  emptyTitle:       { color: C.text, fontSize: 18, fontWeight: '700' },
  emptyText:        { color: C.textSub, textAlign: 'center', lineHeight: 20 },
  primaryBtn:       { marginTop: 12, backgroundColor: C.accent, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12, shadowColor: C.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  primaryBtnText:   { color: C.text, fontWeight: '800', fontSize: 14 },
  secondaryBtn:     { marginTop: 10, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderColor: C.accent, borderWidth: 1 },
  secondaryBtnText: { color: C.accent, fontWeight: '700' },

  detailOverlay:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', zIndex: 100 },
  detailBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
  detailSheet:    { backgroundColor: C.bgLayer, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: C.border, maxHeight: '85%' },
  detailHeader:   { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12 },
  detailTitle:    { color: C.text, fontSize: 17, fontWeight: '800' },
  detailId:       { color: C.textSub, fontSize: 12, marginTop: 2 },
  detailCloseBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  detailCloseTxt: { color: C.textSub, fontSize: 14, fontWeight: '700' },

  statusBanner:      { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, borderWidth: 1, padding: 14, marginVertical: 14 },
  statusBannerTitle: { fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
  statusBannerSub:   { color: C.textSub, fontSize: 12, marginTop: 2 },

  detailSection: { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, gap: 4, marginBottom: 14 },
  sectionTitle:  { color: C.textSub, fontSize: 9, letterSpacing: 2, fontWeight: '700', marginBottom: 10 },
  detailText:    { color: C.text, fontSize: 13, lineHeight: 20 },

  detailItemRow:   { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  detailItemImg:   { width: 52, height: 52, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  detailItemName:  { color: C.text, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  detailItemMeta:  { color: C.textSub, fontSize: 12 },
  detailItemTotal: { color: C.mint, fontSize: 13, fontWeight: '800' },

  detailPriceBox:  { marginTop: 16, backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16, gap: 8 },
  priceRow:        { flexDirection: 'row', justifyContent: 'space-between' },
  priceLabel:      { color: C.textSub, fontSize: 13 },
  priceValue:      { color: C.text, fontSize: 13 },
  priceDivider:    { height: 1, backgroundColor: C.border, marginVertical: 4 },
  priceTotalValue: { color: C.mint, fontSize: 16, fontWeight: '800' },
  paidText:        { color: C.textSub, fontSize: 11, marginTop: 4, textAlign: 'right' },
});