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
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

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

/* ─── Palette — Blue Robotics ─── */
const C = {
  bg:          '#020B18',
  bgLayer:     '#040F1F',
  surface:     '#071828',
  surfaceHigh: '#0A2035',
  border:      '#0D2440',
  borderBright:'rgba(0,168,255,0.45)',
  accent:      '#00A8FF',
  accentDim:   '#005A8E',
  accentGlow:  'rgba(0,168,255,0.1)',
  accentText:  '#33BBFF',
  text:        '#E8F4FF',
  textSub:     'rgba(120,180,230,0.7)',
  textDim:     'rgba(60,110,170,0.45)',
  danger:      '#FF4060',
  dangerBg:    'rgba(255,64,96,0.08)',
  dangerBorder:'rgba(255,64,96,0.22)',
  success:     '#00D4AA',
  successBg:   'rgba(0,212,170,0.08)',
  successBorder:'rgba(0,212,170,0.3)',
  warn:        '#F59E0B',
  warnBg:      'rgba(245,158,11,0.1)',
  warnBorder:  'rgba(245,158,11,0.28)',
} as const;

const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

/* ─── Status config — icon names from vector libs ─── */
const STATUS_CONFIG: Record<string, {
  color: string; bg: string; border: string;
  iconLib: 'mci' | 'feather' | 'ion'; iconName: string; label: string;
}> = {
  Processing: { color: C.warn,    bg: C.warnBg,    border: C.warnBorder,    iconLib: 'mci',     iconName: 'clock-outline',           label: 'PROCESSING' },
  Shipped:    { color: C.accent,  bg: C.accentGlow,border: C.borderBright,  iconLib: 'mci',     iconName: 'truck-delivery-outline',  label: 'SHIPPED'    },
  Delivered:  { color: C.success, bg: C.successBg, border: C.successBorder, iconLib: 'mci',     iconName: 'check-circle-outline',    label: 'DELIVERED'  },
  Cancelled:  { color: C.danger,  bg: C.dangerBg,  border: C.dangerBorder,  iconLib: 'feather', iconName: 'x-circle',                label: 'CANCELLED'  },
};

function getStatus(status: string) {
  return STATUS_CONFIG[status] ?? {
    color: C.accent, bg: C.accentGlow, border: C.borderBright,
    iconLib: 'mci' as const, iconName: 'circle-outline', label: status.toUpperCase(),
  };
}

function StatusIcon({ status, size, color }: { status: string; size: number; color: string }) {
  const cfg = getStatus(status);
  if (cfg.iconLib === 'mci')     return <MaterialCommunityIcons name={cfg.iconName as any} size={size} color={color} />;
  if (cfg.iconLib === 'feather') return <Feather name={cfg.iconName as any} size={size} color={color} />;
  return <Ionicons name={cfg.iconName as any} size={size} color={color} />;
}

/* ─── Helpers ─── */
function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatPrice(n: number) {
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ─── Summary pill ─── */
const SummaryPill = ({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) => (
  <View style={s.pill}>
    <Text style={[s.pillValue, accent && { color: C.success }]}>{value}</Text>
    <Text style={s.pillLabel}>{label}</Text>
  </View>
);

/* ─── Status badge ─── */
const StatusBadge = ({ status }: { status: string }) => {
  const cfg = getStatus(status);
  return (
    <View style={[s.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <StatusIcon status={status} size={12} color={cfg.color} />
      <Text style={[s.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
};

/* ─── Order card ─── */
const OrderCard = ({ order, onPress }: { order: Order; onPress: () => void }) => {
  const scale    = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.spring(scale, { toValue: 0.977, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,     useNativeDriver: true }).start();
  const firstItem = order.orderItems[0];

  return (
    <Animated.View style={{ transform: [{ scale }], marginBottom: 12 }}>
      <TouchableOpacity
        style={s.card}
        activeOpacity={1}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
      >
        {/* Left accent rail */}
        <View style={[s.cardRail, { backgroundColor: getStatus(order.orderStatus).color }]} />

        <View style={s.cardContent}>
          <View style={s.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={s.orderId} numberOfLines={1}>
                #{order._id.slice(-10).toUpperCase()}
              </Text>
              <Text style={s.orderDate}>{formatDate(order.createdAt)}</Text>
            </View>
            <StatusBadge status={order.orderStatus} />
          </View>

          <View style={s.cardItemRow}>
            {firstItem?.image ? (
              <Image source={{ uri: firstItem.image }} style={s.itemThumb} resizeMode="cover" />
            ) : (
              <View style={[s.itemThumb, s.thumbPlaceholder]}>
                <MaterialCommunityIcons name="package-variant-closed" size={22} color={C.textDim} />
              </View>
            )}
            {/* Image scan-line */}
            <View style={s.thumbScanLine} />

            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.itemName} numberOfLines={2}>{firstItem?.name ?? '—'}</Text>
              {order.orderItems.length > 1 && (
                <Text style={s.moreItems}>
                  +{order.orderItems.length - 1} more unit{order.orderItems.length - 1 > 1 ? 's' : ''}
                </Text>
              )}
            </View>
          </View>

          <View style={s.cardFooter}>
            <View>
              <Text style={s.totalLabel}>TOTAL</Text>
              <Text style={s.totalAmount}>{formatPrice(order.totalPrice)}</Text>
            </View>
            <View style={s.cardCtaRow}>
              <Text style={s.cardCta}>VIEW DETAILS</Text>
              <Feather name="arrow-right" size={12} color={C.accent} style={{ marginLeft: 4 }} />
            </View>
          </View>
        </View>

        {/* Corner ticks */}
        <View style={s.cornerTL} /><View style={s.cornerBR} />
      </TouchableOpacity>
    </Animated.View>
  );
};

/* ─── Order Detail Sheet ─── */
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
    <Animated.View style={[s.detailOverlay, { opacity: fade }]}>
      <TouchableOpacity style={s.detailBackdrop} activeOpacity={1} onPress={close} />
      <Animated.View style={[s.detailSheet, { transform: [{ translateY: slideY }] }]}>
        {/* Sheet corner accents */}
        <View style={[s.sheetCornerTL, { borderColor: cfg.color }]} />
        <View style={[s.sheetCornerTR, { borderColor: cfg.color }]} />

        {/* Header */}
        <View style={s.detailHeader}>
          <View style={{ flex: 1 }}>
            <View style={s.detailTitleRow}>
              <View style={[s.detailTitleTick, { backgroundColor: cfg.color }]} />
              <Text style={s.detailTitle}>ORDER DETAILS</Text>
            </View>
            <Text style={s.detailId}>#{order._id.slice(-10).toUpperCase()}</Text>
          </View>
          <TouchableOpacity style={s.detailCloseBtn} onPress={close}>
            <Feather name="x" size={16} color={C.textSub} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={order.orderItems}
          keyExtractor={(i) => i._id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          ListHeaderComponent={
            <>
              {/* Status banner */}
              <View style={[s.statusBanner, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                <View style={[s.statusBannerIconWrap, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                  <StatusIcon status={order.orderStatus} size={20} color={cfg.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.statusBannerTagRow}>
                    <View style={[s.statusBannerTick, { backgroundColor: cfg.color }]} />
                    <Text style={[s.statusBannerTitle, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                  <Text style={s.statusBannerSub}>
                    {order.orderStatus === 'Delivered'  && order.deliveredAt ? `Delivered on ${formatDate(order.deliveredAt)}` :
                     order.orderStatus === 'Processing' ? 'Your order is being prepared' :
                     order.orderStatus === 'Shipped'    ? 'Unit in transit to your address' :
                     order.orderStatus === 'Cancelled'  ? 'This order was cancelled' : ''}
                  </Text>
                </View>
              </View>

              {/* Shipping info */}
              <View style={s.detailSection}>
                <View style={s.sectionLabelRow}>
                  <View style={s.sectionTick} />
                  <Text style={s.sectionTitle}>DELIVERY COORDINATES</Text>
                </View>
                <View style={s.sectionRail} />
                <Text style={s.detailText}>{order.shippingInfo.address}, {order.shippingInfo.city}</Text>
                <Text style={s.detailText}>{order.shippingInfo.postalCode}, {order.shippingInfo.country}</Text>
                <View style={s.detailPhoneRow}>
                  <Feather name="phone" size={11} color={C.textDim} />
                  <Text style={s.detailText}> {order.shippingInfo.phoneNo}</Text>
                </View>
              </View>

              {/* Items header */}
              <View style={s.sectionLabelRow}>
                <View style={s.sectionTick} />
                <Text style={s.sectionTitle}>ORDER UNITS</Text>
              </View>
            </>
          }
          renderItem={({ item }) => (
            <View style={s.detailItemRow}>
              {/* Rail tint */}
              <View style={s.detailItemRail} />
              {item.image ? (
                <Image source={{ uri: item.image }} style={s.detailItemImg} resizeMode="cover" />
              ) : (
                <View style={[s.detailItemImg, s.thumbPlaceholder]}>
                  <MaterialCommunityIcons name="package-variant-closed" size={18} color={C.textDim} />
                </View>
              )}
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.detailItemName} numberOfLines={2}>{item.name}</Text>
                <Text style={s.detailItemMeta}>{formatPrice(item.price)} × {item.quantity}</Text>
              </View>
              <Text style={s.detailItemTotal}>{formatPrice(item.price * item.quantity)}</Text>
            </View>
          )}
          ListFooterComponent={
            <View style={s.detailPriceBox}>
              {/* Corner accents on price box */}
              <View style={s.pBoxTL} /><View style={s.pBoxTR} />

              <View style={s.priceRow}>
                <Text style={s.priceLabel}>UNITS</Text>
                <Text style={s.priceValue}>{formatPrice(order.itemsPrice)}</Text>
              </View>
              <View style={s.priceRow}>
                <Text style={s.priceLabel}>TAX</Text>
                <Text style={s.priceValue}>{formatPrice(order.taxPrice)}</Text>
              </View>
              <View style={s.priceRow}>
                <Text style={s.priceLabel}>SHIPPING</Text>
                <Text style={s.priceValue}>{formatPrice(order.shippingPrice)}</Text>
              </View>
              <View style={s.priceDivider} />
              <View style={s.priceRow}>
                <Text style={[s.priceLabel, { color: C.text, letterSpacing: 2.5 }]}>TOTAL</Text>
                <Text style={s.priceTotalValue}>{formatPrice(order.totalPrice)}</Text>
              </View>
              {order.paidAt && (
                <Text style={s.paidText}>PAID ON {formatDate(order.paidAt).toUpperCase()}</Text>
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
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const { orderId: deepLinkOrderId } = useLocalSearchParams<{ orderId?: string }>();
  const { orders, loading, refreshing, error, needsAuth } = useAppSelector((state) => state.order);
  const [selected,  setSelected]  = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'reviews'>('orders');
  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, []);

  useEffect(() => { dispatch(fetchMyOrders()); }, []);

  useEffect(() => {
    if (deepLinkOrderId) {
      const target = orders.find((order) => order._id === deepLinkOrderId);
      if (target) setSelected(target as Order);
    }
  }, [orders, deepLinkOrderId]);

  const stats = {
    total:     orders.length,
    delivered: orders.filter(o => o.orderStatus === 'Delivered').length,
    active:    orders.filter(o => ['Processing', 'Shipped'].includes(o.orderStatus)).length,
    spent:     orders.reduce((sum, o) => sum + o.totalPrice, 0),
  };

  /* ── Unauthenticated ── */
  if (!loading && needsAuth) {
    return (
      <View style={s.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <View style={s.authIconWrap}>
          <Feather name="shield" size={32} color={C.textDim} />
        </View>
        <Text style={s.authTitle}>NOT AUTHENTICATED</Text>
        <Text style={s.authSub}>Sign in to view your orders</Text>
        <TouchableOpacity style={s.primaryBtn} onPress={() => router.push('/(auth)/login')}>
          <View style={s.primaryBtnScan} />
          <Feather name="shield" size={13} color={C.bg} style={{ marginRight: 7 }} />
          <Text style={s.primaryBtnText}>SIGN IN</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <View style={s.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={s.loadingText}>LOADING ORDERS...</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ══════════════════════════════════
          HEADER
      ══════════════════════════════════ */}
      <Animated.View style={[s.header, { opacity: headerFade }]}>
        {/* Status bar */}
        <View style={s.statusBar}>
          <View style={s.statusLeft}>
            <View style={s.statusPulse} />
            <Text style={s.statusText}>SYSTEM ONLINE</Text>
          </View>
          <Text style={s.statusText}>RK-OS v2.4</Text>
        </View>

        {/* Title */}
        <View style={s.headerTop}>
          <TouchableOpacity 
            style={s.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="chevron-left" size={20} color={C.accent} />
          </TouchableOpacity>
          <View style={s.headerLeft}>
            <View style={s.headerTick} />
            <View>
              <Text style={s.eyebrow}>ROMERO'S KINGDOM</Text>
              <Text style={s.title}>MY ACCOUNT</Text>
            </View>
          </View>
        </View>

        {/* Tab bar */}
        <View style={s.tabBar}>
          <TouchableOpacity
            style={[s.tab, activeTab === 'orders' && s.tabActive]}
            onPress={() => setActiveTab('orders')}
          >
            <MaterialCommunityIcons name="package-variant-closed" size={13} color={activeTab === 'orders' ? C.accentText : C.textSub} style={{ marginRight: 5 }} />
            <Text style={[s.tabText, activeTab === 'orders' && s.tabTextActive]}>ORDERS</Text>
            {stats.active > 0 && (
              <View style={s.tabBadge}>
                <Text style={s.tabBadgeTxt}>{stats.active}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, activeTab === 'reviews' && s.tabActive]}
            onPress={() => router.push('/(user)/review')}
          >
            <Ionicons name="star-outline" size={13} color={activeTab === 'reviews' ? C.accentText : C.textSub} style={{ marginRight: 5 }} />
            <Text style={[s.tabText, activeTab === 'reviews' && s.tabTextActive]}>REVIEWS</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Summary pills */}
      <View style={s.pillRow}>
        <SummaryPill label="TOTAL"     value={stats.total} />
        <SummaryPill label="DELIVERED" value={stats.delivered} accent />
        <SummaryPill label="ACTIVE"    value={stats.active} />
        <SummaryPill label="SPENT"     value={formatPrice(stats.spent)} />
      </View>

      {error ? (
        <View style={s.errorBox}>
          <Feather name="alert-triangle" size={14} color={C.danger} />
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => dispatch(fetchMyOrders())}>
            <View style={s.retryBtnScan} />
            <Text style={s.retryTxt}>RETRY</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          contentContainerStyle={s.list}
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
            <View style={s.emptyBox}>
              <View style={s.emptyIconWrap}>
                <MaterialCommunityIcons name="package-variant-closed" size={36} color={C.textDim} />
              </View>
              <Text style={s.emptyTitle}>NO ORDERS YET</Text>
              <Text style={s.emptyText}>Your order history will appear here after your first purchase.</Text>
              <TouchableOpacity style={s.secondaryBtn} onPress={() => router.push('/(tabs)')}>
                <View style={s.secondaryBtnScan} />
                <Feather name="zap" size={13} color={C.bg} style={{ marginRight: 7 }} />
                <Text style={s.secondaryBtnText}>BROWSE INVENTORY</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <OrderCard order={item as Order} onPress={() => setSelected(item as Order)} />
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
const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg },
  center:      { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  loadingText: { color: C.textDim, fontSize: 10, letterSpacing: 2.5, fontFamily: MONO, marginTop: 10 },

  /* Auth guard */
  authIconWrap: { width: 80, height: 80, borderRadius: 20, backgroundColor: C.accentGlow, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  authTitle:    { color: C.text,    fontSize: 14, fontWeight: '800', letterSpacing: 2.5, fontFamily: MONO },
  authSub:      { color: C.textDim, fontSize: 11 },
  primaryBtn:   { flexDirection: 'row', alignItems: 'center', backgroundColor: C.accent, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 10, overflow: 'hidden', shadowColor: C.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 14, elevation: 8 },
  primaryBtnScan:{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  primaryBtnText:{ color: C.bg, fontWeight: '800', fontSize: 12, letterSpacing: 2, fontFamily: MONO },

  /* Header */
  header: { backgroundColor: C.bgLayer, paddingTop: Platform.OS === 'ios' ? 52 : 34, borderBottomWidth: 1, borderBottomColor: C.border },
  statusBar:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.bg },
  statusLeft:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusPulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.success, shadowColor: C.success, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 4, elevation: 2 },
  statusText:  { color: C.textDim, fontSize: 9, fontWeight: '700', letterSpacing: 1.8, fontFamily: MONO },
  headerTop:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  backBtn:     { width: 36, height: 36, borderRadius: 8, backgroundColor: C.accentGlow, borderWidth: 1, borderColor: C.borderBright, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTick:  { width: 3, height: 30, borderRadius: 2, backgroundColor: C.accent },
  eyebrow:     { color: C.accent, fontSize: 9, letterSpacing: 2.5, fontWeight: '700', fontFamily: MONO },
  title:       { color: C.text, fontSize: 20, fontWeight: '900', letterSpacing: 3, fontFamily: MONO },

  /* Tab bar */
  tabBar:        { flexDirection: 'row', paddingHorizontal: 16, gap: 4 },
  tab:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabActive:     { borderBottomColor: C.accent },
  tabText:       { color: C.textSub, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, fontFamily: MONO },
  tabTextActive: { color: C.accentText },
  tabBadge:      { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, marginLeft: 6 },
  tabBadgeTxt:   { color: C.bg, fontSize: 9, fontWeight: '800', fontFamily: MONO },

  /* Summary pills */
  pillRow:   { flexDirection: 'row', padding: 14, gap: 8 },
  pill:      { flex: 1, backgroundColor: C.surface, borderRadius: 11, borderWidth: 1, borderColor: C.border, padding: 10, alignItems: 'center' },
  pillValue: { color: C.accent, fontSize: 14, fontWeight: '800', fontFamily: MONO },
  pillLabel: { color: C.textDim, fontSize: 8, marginTop: 3, textAlign: 'center', letterSpacing: 1, fontFamily: MONO },

  list: { paddingHorizontal: 16, paddingBottom: 60, paddingTop: 4 },

  /* Order card */
  card:        { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden', flexDirection: 'row' },
  cardRail:    { width: 3 },
  cardContent: { flex: 1, padding: 14, gap: 12 },
  cardTop:     { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  orderId:     { color: C.text, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, fontFamily: MONO },
  orderDate:   { color: C.textDim, fontSize: 10, marginTop: 3, fontFamily: MONO },

  statusBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 16, borderWidth: 1 },
  statusBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2, fontFamily: MONO },

  cardItemRow:     { flexDirection: 'row', gap: 12, alignItems: 'center' },
  itemThumb:       { width: 58, height: 58, borderRadius: 9, backgroundColor: C.bgLayer, borderWidth: 1, borderColor: C.border },
  thumbPlaceholder:{ justifyContent: 'center', alignItems: 'center' },
  thumbScanLine:   { position: 'absolute', bottom: 0, left: 0, width: 58, height: 2, backgroundColor: C.accent, opacity: 0.25, borderBottomLeftRadius: 9 },
  itemName:        { color: C.text, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  moreItems:       { color: C.textDim, fontSize: 10, fontFamily: MONO },

  cardFooter:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10 },
  totalLabel:  { color: C.textDim, fontSize: 7, letterSpacing: 2.5, fontWeight: '700', fontFamily: MONO },
  totalAmount: { color: C.accentText, fontSize: 15, fontWeight: '800', fontFamily: MONO },
  cardCtaRow:  { flexDirection: 'row', alignItems: 'center' },
  cardCta:     { color: C.accent, fontSize: 9, fontWeight: '700', letterSpacing: 1.5, fontFamily: MONO },

  cornerTL: { position: 'absolute', top: 0,    left: 3,  width: 14, height: 1.5, backgroundColor: C.accent, opacity: 0.5 },
  cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 1.5, backgroundColor: C.accent, opacity: 0.5 },

  /* Error */
  errorBox:    { margin: 20, padding: 18, backgroundColor: C.dangerBg, borderRadius: 12, borderWidth: 1, borderColor: C.danger, alignItems: 'center', gap: 10 },
  errorText:   { color: C.danger, fontSize: 12, textAlign: 'center' },
  retryBtn:    { backgroundColor: C.danger, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 9, overflow: 'hidden' },
  retryBtnScan:{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  retryTxt:    { color: C.bg, fontWeight: '800', fontSize: 11, letterSpacing: 2, fontFamily: MONO },

  /* Empty state */
  emptyBox:     { marginTop: 40, alignItems: 'center', gap: 10, paddingHorizontal: 20 },
  emptyIconWrap:{ width: 80, height: 80, borderRadius: 20, backgroundColor: C.accentGlow, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle:   { color: C.textSub, fontSize: 14, fontWeight: '800', letterSpacing: 2.5, fontFamily: MONO },
  emptyText:    { color: C.textDim, textAlign: 'center', lineHeight: 20, fontSize: 12 },
  secondaryBtn: { marginTop: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: C.accent, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, overflow: 'hidden', shadowColor: C.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12, elevation: 7 },
  secondaryBtnScan:{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  secondaryBtnText:{ color: C.bg, fontWeight: '800', fontSize: 11, letterSpacing: 2, fontFamily: MONO },

  /* Detail sheet */
  detailOverlay:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', zIndex: 100 },
  detailBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.78)' },
  detailSheet:    { backgroundColor: C.bgLayer, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.border, maxHeight: '85%' },
  sheetCornerTL:  { position: 'absolute', top: -1, left: -1,  width: 14, height: 14, borderTopWidth: 2, borderLeftWidth: 2,  borderTopLeftRadius: 24 },
  sheetCornerTR:  { position: 'absolute', top: -1, right: -1, width: 14, height: 14, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 24 },
  detailHeader:   { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12 },
  detailTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  detailTitleTick:{ width: 3, height: 14, borderRadius: 2 },
  detailTitle:    { color: C.text, fontSize: 15, fontWeight: '800', letterSpacing: 2.5, fontFamily: MONO },
  detailId:       { color: C.textDim, fontSize: 10, marginTop: 1, fontFamily: MONO },
  detailCloseBtn: { width: 36, height: 36, borderRadius: 9, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },

  statusBanner:       { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1, padding: 14, marginVertical: 14 },
  statusBannerIconWrap:{ width: 42, height: 42, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  statusBannerTagRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 3 },
  statusBannerTick:   { width: 2.5, height: 10, borderRadius: 1.5 },
  statusBannerTitle:  { fontSize: 12, fontWeight: '800', letterSpacing: 2, fontFamily: MONO },
  statusBannerSub:    { color: C.textSub, fontSize: 11 },

  detailSection:  { backgroundColor: C.surface, borderRadius: 11, borderWidth: 1, borderColor: C.border, padding: 14, gap: 4, marginBottom: 16, overflow: 'hidden' },
  sectionLabelRow:{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  sectionTick:    { width: 2.5, height: 10, borderRadius: 1.5, backgroundColor: C.accent },
  sectionTitle:   { color: C.accent, fontSize: 8, letterSpacing: 2.5, fontWeight: '700', fontFamily: MONO },
  sectionRail:    { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: C.accentDim },
  detailText:     { color: C.textSub, fontSize: 12, lineHeight: 20, paddingLeft: 6 },
  detailPhoneRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 6 },

  detailItemRow:   { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, overflow: 'hidden' },
  detailItemRail:  { position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, backgroundColor: C.accentDim },
  detailItemImg:   { width: 52, height: 52, borderRadius: 9, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, marginLeft: 6 },
  detailItemName:  { color: C.text, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  detailItemMeta:  { color: C.textDim, fontSize: 11, fontFamily: MONO },
  detailItemTotal: { color: C.accentText, fontSize: 13, fontWeight: '800', fontFamily: MONO },

  detailPriceBox:  { marginTop: 16, backgroundColor: C.surface, borderRadius: 13, borderWidth: 1, borderColor: C.border, padding: 16, gap: 10 },
  pBoxTL:          { position: 'absolute', top: -1, left: -1,  width: 12, height: 12, borderTopWidth: 1.5, borderLeftWidth: 1.5,  borderColor: C.accent, borderTopLeftRadius: 13 },
  pBoxTR:          { position: 'absolute', top: -1, right: -1, width: 12, height: 12, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: C.accent, borderTopRightRadius: 13 },
  priceRow:        { flexDirection: 'row', justifyContent: 'space-between' },
  priceLabel:      { color: C.textDim, fontSize: 9, letterSpacing: 2, fontFamily: MONO },
  priceValue:      { color: C.textSub, fontSize: 12, fontFamily: MONO },
  priceDivider:    { height: 1, backgroundColor: C.border, marginVertical: 2 },
  priceTotalValue: { color: C.accent, fontSize: 16, fontWeight: '800', fontFamily: MONO, shadowColor: C.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 6 },
  paidText:        { color: C.textDim, fontSize: 9, marginTop: 4, textAlign: 'right', letterSpacing: 1.5, fontFamily: MONO },
});