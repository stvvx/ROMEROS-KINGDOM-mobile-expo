import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { saveCartItemsSync, loadCartAsync } from '@/utils/cartDb';
import { getItem } from '@/utils/storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const API_URL =
  process.env.NGROK_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:4000/api/v1';

const manifest: any = (Constants as any).manifest || (Constants as any).expoConfig;
const debuggerHost = manifest?.debuggerHost?.split(':')[0];

let resolvedApiUrl = API_URL;
if (debuggerHost && debuggerHost !== 'localhost') {
  resolvedApiUrl = resolvedApiUrl.replace('localhost', debuggerHost);
} else if (Platform.OS === 'android' && resolvedApiUrl.includes('localhost')) {
  resolvedApiUrl = resolvedApiUrl.replace('localhost', '10.0.2.2');
}

resolvedApiUrl = resolvedApiUrl.trim().replace(/\/+$/, '');
if (!resolvedApiUrl.endsWith('/api/v1')) {
  resolvedApiUrl = `${resolvedApiUrl}/api/v1`;
}

interface CartItem {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  images?: { url: string }[];
}

type VoucherCategory = 'free-shipping' | 'minimum-spend' | 'monthly-voucher';

interface VoucherItem {
  _id: string;
  code: string;
  category: VoucherCategory;
  label: string;
  leftValue: string;
  validText: string;
}

// ─── THEMED CONFIRM MODAL ─────────────────────────────────────
interface ThemedConfirmProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ThemedConfirm: React.FC<ThemedConfirmProps> = ({
  visible, title, message,
  confirmLabel = 'Confirm', confirmColor = '#ff6b6b',
  onConfirm, onCancel,
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <Pressable style={cm.overlay} onPress={onCancel}>
      <Pressable style={cm.card} onPress={() => {}}>
        <View style={cm.iconWrap}>
          <Ionicons name="alert-circle" size={32} color="#ff6b6b" />
        </View>
        <Text style={cm.title}>{title}</Text>
        <Text style={cm.message}>{message}</Text>
        <View style={cm.divider} />
        <View style={cm.btnRow}>
          <TouchableOpacity style={cm.cancelBtn} onPress={onCancel} activeOpacity={0.85}>
            <Text style={cm.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[cm.confirmBtn, { backgroundColor: confirmColor }]} onPress={onConfirm} activeOpacity={0.85}>
            <Text style={cm.confirmBtnText}>{confirmLabel}</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Pressable>
  </Modal>
);

const cm = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  card:           { width: '100%', backgroundColor: '#2a0508', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(153,98,80,0.2)', padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 24 }, shadowOpacity: 0.6, shadowRadius: 40, elevation: 20 },
  iconWrap:       { width: 64, height: 64, borderRadius: 18, backgroundColor: 'rgba(255,107,107,0.1)', borderWidth: 1, borderColor: 'rgba(255,107,107,0.28)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title:          { fontSize: 20, fontWeight: '800', color: '#F9F9F9', marginBottom: 8, textAlign: 'center' },
  message:        { fontSize: 13, color: 'rgba(153,98,80,0.8)', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  divider:        { width: '100%', height: 1, backgroundColor: 'rgba(153,98,80,0.15)', marginBottom: 20 },
  btnRow:         { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn:      { flex: 1, borderWidth: 1, borderColor: 'rgba(153,98,80,0.2)', borderRadius: 13, paddingVertical: 13, alignItems: 'center', backgroundColor: 'rgba(249,249,249,0.04)' },
  cancelBtnText:  { fontSize: 14, fontWeight: '700', color: 'rgba(153,98,80,0.7)' },
  confirmBtn:     { flex: 1, borderRadius: 13, paddingVertical: 13, alignItems: 'center' },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#F9F9F9' },
});

// ─── MAIN SCREEN ──────────────────────────────────────────────
export default function Cart() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [claimedVouchers, setClaimedVouchers] = useState<VoucherItem[]>([]);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '', message: '', confirmLabel: 'Remove', confirmColor: '#ff6b6b', onConfirm: () => {},
  });

  const showConfirm = (
    title: string, message: string,
    confirmLabel: string, confirmColor: string,
    onConfirm: () => void
  ) => {
    setConfirmConfig({ title, message, confirmLabel, confirmColor, onConfirm });
    setConfirmVisible(true);
  };

  useFocusEffect(useCallback(() => {
    loadCart();
    loadClaimedVouchers();
  }, []));
  useEffect(() => { loadCart(); }, []);

  const loadCart = async () => {
    try {
      setCartItems(await loadCartAsync());
    } catch (err) {
      console.error('Error loading cart:', err);
      setCartItems([]);
    }
  };

  const saveCart = (items: CartItem[]) => {
    setCartItems(items);
    try {
      saveCartItemsSync(items);
    } catch (err) {
      console.error('Error saving cart:', err);
    }
  };

  const loadClaimedVouchers = async () => {
    try {
      const token = await getItem('authToken');
      if (!token) {
        setClaimedVouchers([]);
        setSelectedVoucherId(null);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const [allVouchersRes, claimedRes] = await Promise.all([
        axios.get(`${resolvedApiUrl}/vouchers`),
        axios.get(`${resolvedApiUrl}/my/vouchers/claimed`, { headers }),
      ]);

      const claimedSet = new Set<string>((claimedRes.data?.voucherIds || []).map((id: string) => String(id)));
      const claimed = (allVouchersRes.data?.vouchers || []).filter((v: VoucherItem) => claimedSet.has(String(v._id)));

      setClaimedVouchers(claimed);
      setSelectedVoucherId((prev) => {
        if (prev && claimed.some((voucher: VoucherItem) => voucher._id === prev)) return prev;
        return claimed.length ? claimed[0]._id : null;
      });
    } catch (err) {
      console.error('Error loading claimed vouchers for cart:', err);
      setClaimedVouchers([]);
      setSelectedVoucherId(null);
    }
  };

  const selectedVoucher = claimedVouchers.find((voucher) => voucher._id === selectedVoucherId) || null;

  const handleIncreaseQty = (id: string) =>
    saveCart(cartItems.map(item => item._id === id ? { ...item, quantity: item.quantity + 1 } : item));

  const handleDecreaseQty = (id: string) =>
    saveCart(cartItems.map(item => item._id === id ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item));

  const handleRemoveItem = (id: string) => {
    showConfirm(
      'Remove Item',
      'Are you sure you want to remove this item from your cart?',
      'Remove', '#ff6b6b',
      () => { saveCart(cartItems.filter(item => item._id !== id)); setConfirmVisible(false); }
    );
  };

  const handleClearCart = () => {
    showConfirm(
      'Clear Cart',
      'Are you sure you want to remove all items from your cart?',
      'Clear All', '#ff6b6b',
      () => { saveCart([]); setConfirmVisible(false); }
    );
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax      = subtotal * 0.1;
  const shipping = cartItems.length > 0 ? 150 : 0;

  const computeVoucherDiscount = (voucher: VoucherItem | null) => {
    if (!voucher) return 0;
    if (voucher.category === 'free-shipping') return shipping;
    const text = `${voucher.leftValue || ''} ${voucher.label || ''}`;
    const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
    const amountMatch = text.match(/(\d+(?:\.\d+)?)/);
    if (percentMatch) {
      const percent = Number(percentMatch[1]);
      if (!Number.isNaN(percent)) return (subtotal + tax + shipping) * (percent / 100);
    }
    if (amountMatch) {
      const amount = Number(amountMatch[1]);
      if (!Number.isNaN(amount)) return amount;
    }
    return 0;
  };

  const voucherDiscountRaw = computeVoucherDiscount(selectedVoucher);
  const voucherDiscount = Math.min(voucherDiscountRaw, subtotal + tax + shipping);
  const total = Math.max(0, subtotal + tax + shipping - voucherDiscount);

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    router.push({
      pathname: '/(user)/checkout',
      params: {
        cartTotal: total.toString(),
        voucherId: selectedVoucher?._id || '',
        voucherCode: selectedVoucher?.code || '',
        voucherDiscount: voucherDiscount.toFixed(2),
      },
    });
  };

  // ── Empty State ──
  if (cartItems.length === 0) {
    return (
      <View style={s.root}>
        <ThemedConfirm
          visible={confirmVisible}
          title={confirmConfig.title}
          message={confirmConfig.message}
          confirmLabel={confirmConfig.confirmLabel}
          confirmColor={confirmConfig.confirmColor}
          onConfirm={confirmConfig.onConfirm}
          onCancel={() => setConfirmVisible(false)}
        />
        <View style={s.pageHeader}>
          <View>
            <Text style={s.pageTitle}>Shopping Cart</Text>
            <Text style={s.pageSubtitle}>Your selected items</Text>
          </View>
          <View style={s.cartBadge}>
            <MaterialCommunityIcons name="cart-outline" size={18} color="#800007" />
            <Text style={s.cartBadgeText}>0</Text>
          </View>
        </View>
        <View style={s.emptyContainer}>
          <View style={s.emptyIconWrap}>
            <MaterialCommunityIcons name="cart-outline" size={40} color="rgba(153,98,80,0.35)" />
          </View>
          <Text style={s.emptyTitle}>Your cart is empty</Text>
          <Text style={s.emptyText}>Add items from the store to get started</Text>
          <TouchableOpacity style={s.browseBtn} onPress={() => router.push('/(tabs)')} activeOpacity={0.85}>
            <Feather name="shopping-bag" size={15} color="#F9F9F9" />
            <Text style={s.browseBtnText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <ThemedConfirm
        visible={confirmVisible}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmLabel={confirmConfig.confirmLabel}
        confirmColor={confirmConfig.confirmColor}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmVisible(false)}
      />

      {/* ── Page Header ── */}
      <View style={s.pageHeader}>
        <View>
          <Text style={s.pageTitle}>Shopping Cart</Text>
          <Text style={s.pageSubtitle}>Your selected items</Text>
        </View>
        <View style={s.cartBadge}>
          <MaterialCommunityIcons name="cart-outline" size={18} color="#800007" />
          <Text style={s.cartBadgeText}>{cartItems.length}</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

        {/* ── Cart Items ── */}
        <FlatList
          data={cartItems}
          keyExtractor={item => item._id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <CartItemCard
              item={item}
              onIncreaseQty={() => handleIncreaseQty(item._id)}
              onDecreaseQty={() => handleDecreaseQty(item._id)}
              onRemove={() => handleRemoveItem(item._id)}
            />
          )}
        />

        {/* ── Claimed Vouchers ── */}
        <View style={s.voucherCard}>
          <View style={s.summaryCardHeader}>
            <View style={s.summaryIconWrap}>
              <MaterialCommunityIcons name="ticket-percent-outline" size={16} color="#800007" />
            </View>
            <Text style={s.summaryCardTitle}>Your Claimed Vouchers</Text>
          </View>

          <View style={s.summaryDivider} />

          {!claimedVouchers.length ? (
            <Text style={s.voucherEmptyText}>No claimed vouchers yet. Claim one in the Vouchers page.</Text>
          ) : (
            <View style={s.voucherListWrap}>
              {claimedVouchers.map((voucher) => {
                const active = voucher._id === selectedVoucherId;
                return (
                  <TouchableOpacity
                    key={voucher._id}
                    style={[s.voucherChip, active && s.voucherChipActive]}
                    onPress={() => setSelectedVoucherId(voucher._id)}
                    activeOpacity={0.85}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[s.voucherCode, active && s.voucherCodeActive]}>{voucher.code}</Text>
                      <Text style={s.voucherMeta}>{voucher.leftValue} • {voucher.validText}</Text>
                    </View>
                    <Text style={[s.voucherApply, active && s.voucherApplyActive]}>{active ? 'Applied' : 'Apply'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Order Summary ── */}
        <View style={s.summaryCard}>
          <View style={s.summaryCardHeader}>
            <View style={s.summaryIconWrap}>
              <Feather name="file-text" size={16} color="#800007" />
            </View>
            <Text style={s.summaryCardTitle}>Order Summary</Text>
          </View>

          <View style={s.summaryDivider} />

          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Subtotal</Text>
            <Text style={s.summaryValue}>₱{subtotal.toFixed(2)}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Tax (10%)</Text>
            <Text style={s.summaryValue}>₱{tax.toFixed(2)}</Text>
          </View>
          <View style={s.summaryRow}>
            <View style={s.shippingLabelRow}>
              <Text style={s.summaryLabel}>Shipping</Text>
              <View style={s.flatRateBadge}>
                <Text style={s.flatRateText}>Flat rate</Text>
              </View>
            </View>
            <Text style={s.summaryValue}>₱{shipping.toFixed(2)}</Text>
          </View>

          {voucherDiscount > 0 && (
            <View style={s.summaryRow}>
              <Text style={s.discountLabel}>Voucher Discount{selectedVoucher ? ` (${selectedVoucher.code})` : ''}</Text>
              <Text style={s.discountValue}>-₱{voucherDiscount.toFixed(2)}</Text>
            </View>
          )}

          <View style={s.summaryDivider} />

          <View style={s.summaryRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalValue}>₱{total.toFixed(2)}</Text>
          </View>
        </View>

        {/* ── Checkout Button ── */}
        <TouchableOpacity style={s.checkoutBtn} onPress={handleCheckout} activeOpacity={0.85}>
          <MaterialCommunityIcons name="lock-outline" size={17} color="#F9F9F9" />
          <Text style={s.checkoutBtnText}>Proceed to Checkout</Text>
        </TouchableOpacity>

        {/* ── Secondary Buttons ── */}
        <View style={s.secondaryBtns}>
          <TouchableOpacity style={s.continueBtn} onPress={() => router.push('/(tabs)')} activeOpacity={0.85}>
            <Feather name="arrow-left" size={14} color="#800007" />
            <Text style={s.continueBtnText}>Keep Shopping</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.clearBtn} onPress={handleClearCart} activeOpacity={0.85}>
            <Feather name="trash-2" size={14} color="#ff6b6b" />
            <Text style={s.clearBtnText}>Clear Cart</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  );
}

// ─── CART ITEM CARD ──────────────────────────────────────────
interface CartItemCardProps {
  item: CartItem;
  onIncreaseQty: () => void;
  onDecreaseQty: () => void;
  onRemove: () => void;
}

const CartItemCard = ({ item, onIncreaseQty, onDecreaseQty, onRemove }: CartItemCardProps) => {
  const itemTotal = item.price * item.quantity;
  const imgUrl    = item.images?.[0]?.url;

  return (
    <View style={s.card}>
      {/* Image */}
      <View style={s.itemImageWrap}>
        {imgUrl ? (
          <Image source={{ uri: imgUrl }} style={s.itemImage} resizeMode="cover" />
        ) : (
          <View style={s.itemImagePlaceholder}>
            <MaterialCommunityIcons name="car-sports" size={28} color="rgba(153,98,80,0.35)" />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={s.itemInfo}>
        <Text style={s.itemName} numberOfLines={2}>{item.name}</Text>
        <Text style={s.itemUnitPrice}>₱{item.price.toFixed(2)} / pc</Text>
        <View style={s.qtyRow}>
          <TouchableOpacity style={s.qtyBtn} onPress={onDecreaseQty}>
            <Feather name="minus" size={13} color={item.quantity <= 1 ? 'rgba(153,98,80,0.25)' : '#F9F9F9'} />
          </TouchableOpacity>
          <View style={s.qtyDisplay}>
            <Text style={s.qtyText}>{item.quantity}</Text>
          </View>
          <TouchableOpacity style={s.qtyBtn} onPress={onIncreaseQty}>
            <Feather name="plus" size={13} color="#F9F9F9" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Total & Remove */}
      <View style={s.itemRight}>
        <Text style={s.itemTotal}>₱{itemTotal.toFixed(2)}</Text>
        <TouchableOpacity style={s.removeBtn} onPress={onRemove} activeOpacity={0.8}>
          <Feather name="trash-2" size={14} color="#ff6b6b" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── STYLES ──────────────────────────────────────────────────
const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#1a0204' },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingBottom: 16 },

  // ── Page Header ──
  pageHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 20, paddingBottom: 16 },
  pageTitle:     { fontSize: 22, fontWeight: '800', color: '#F9F9F9', letterSpacing: 0.3, marginBottom: 2 },
  pageSubtitle:  { fontSize: 12, color: 'rgba(153,98,80,0.65)' },
  cartBadge:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(128,0,7,0.1)', borderWidth: 1, borderColor: 'rgba(128,0,7,0.28)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  cartBadgeText: { fontSize: 13, fontWeight: '800', color: '#800007' },

  // ── Empty State ──
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80, gap: 10 },
  emptyIconWrap:  { width: 88, height: 88, borderRadius: 26, backgroundColor: 'rgba(128,0,7,0.06)', borderWidth: 1, borderColor: 'rgba(128,0,7,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle:     { fontSize: 18, fontWeight: '800', color: 'rgba(249,249,249,0.7)' },
  emptyText:      { fontSize: 13, color: 'rgba(153,98,80,0.55)', textAlign: 'center' },
  browseBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, backgroundColor: '#800007', paddingHorizontal: 22, paddingVertical: 13, borderRadius: 13, shadowColor: '#800007', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  browseBtnText:  { color: '#F9F9F9', fontWeight: '700', fontSize: 14 },

  // ── Cart Item Card ──
  card:                { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(249,249,249,0.04)', borderWidth: 1, borderColor: 'rgba(153,98,80,0.15)', borderRadius: 16, padding: 12, marginBottom: 10 },
  itemImageWrap:       { marginRight: 12 },
  itemImage:           { width: 76, height: 76, borderRadius: 12, backgroundColor: 'rgba(128,0,7,0.08)' },
  itemImagePlaceholder:{ width: 76, height: 76, borderRadius: 12, backgroundColor: 'rgba(128,0,7,0.06)', borderWidth: 1, borderColor: 'rgba(128,0,7,0.15)', alignItems: 'center', justifyContent: 'center' },
  itemInfo:            { flex: 1 },
  itemName:            { fontSize: 14, fontWeight: '700', color: '#F9F9F9', marginBottom: 3, lineHeight: 19 },
  itemUnitPrice:       { fontSize: 12, color: '#996250', fontWeight: '600', marginBottom: 10 },
  qtyRow:              { flexDirection: 'row', alignItems: 'center' },
  qtyBtn:              { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(249,249,249,0.06)', borderWidth: 1, borderColor: 'rgba(153,98,80,0.2)', alignItems: 'center', justifyContent: 'center' },
  qtyDisplay:          { width: 36, height: 28, marginHorizontal: 6, borderRadius: 8, backgroundColor: 'rgba(128,0,7,0.08)', borderWidth: 1, borderColor: 'rgba(128,0,7,0.2)', alignItems: 'center', justifyContent: 'center' },
  qtyText:             { fontSize: 13, fontWeight: '800', color: '#F9F9F9' },
  itemRight:           { alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch', marginLeft: 10, paddingVertical: 2 },
  itemTotal:           { fontSize: 15, fontWeight: '800', color: '#F9F9F9' },
  removeBtn:           { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,107,107,0.08)', borderWidth: 1, borderColor: 'rgba(255,107,107,0.22)', alignItems: 'center', justifyContent: 'center' },

  // ── Voucher & Summary Cards ──
  voucherCard:       { backgroundColor: 'rgba(249,249,249,0.03)', borderWidth: 1, borderColor: 'rgba(153,98,80,0.15)', borderRadius: 18, padding: 18, marginBottom: 14, marginTop: 4 },
  voucherListWrap:   { gap: 10 },
  voucherChip:       { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(153,98,80,0.15)', backgroundColor: 'rgba(249,249,249,0.03)', paddingHorizontal: 12, paddingVertical: 11 },
  voucherChipActive: { borderColor: 'rgba(128,0,7,0.45)', backgroundColor: 'rgba(128,0,7,0.1)' },
  voucherCode:       { color: '#F9F9F9', fontSize: 13, fontWeight: '800' },
  voucherCodeActive: { color: '#800007' },
  voucherMeta:       { marginTop: 3, color: 'rgba(153,98,80,0.65)', fontSize: 11 },
  voucherApply:      { color: '#996250', fontSize: 12, fontWeight: '700' },
  voucherApplyActive:{ color: '#800007' },
  voucherEmptyText:  { color: 'rgba(153,98,80,0.65)', fontSize: 12, lineHeight: 18 },
  summaryCard:       { backgroundColor: 'rgba(249,249,249,0.03)', borderWidth: 1, borderColor: 'rgba(153,98,80,0.15)', borderRadius: 18, padding: 18, marginBottom: 16, marginTop: 6 },
  summaryCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  summaryIconWrap:   { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(128,0,7,0.12)', borderWidth: 1, borderColor: 'rgba(128,0,7,0.28)', alignItems: 'center', justifyContent: 'center' },
  summaryCardTitle:  { fontSize: 15, fontWeight: '800', color: '#F9F9F9' },
  summaryDivider:    { height: 1, backgroundColor: 'rgba(153,98,80,0.15)', marginBottom: 14 },
  summaryRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  summaryLabel:      { fontSize: 13, color: 'rgba(153,98,80,0.65)' },
  summaryValue:      { fontSize: 13, fontWeight: '700', color: 'rgba(249,249,249,0.75)' },
  discountLabel:     { fontSize: 13, color: '#996250', fontWeight: '700' },
  discountValue:     { fontSize: 13, fontWeight: '800', color: '#996250' },
  shippingLabelRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flatRateBadge:     { backgroundColor: 'rgba(128,0,7,0.1)', borderWidth: 1, borderColor: 'rgba(128,0,7,0.25)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  flatRateText:      { fontSize: 9, color: '#800007', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  totalLabel:        { fontSize: 15, fontWeight: '800', color: '#F9F9F9' },
  totalValue:        { fontSize: 22, fontWeight: '800', color: '#800007' },

  // ── Buttons ──
  checkoutBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#800007', paddingVertical: 16, borderRadius: 14, marginBottom: 12, shadowColor: '#800007', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
  checkoutBtnText: { color: '#F9F9F9', fontSize: 15, fontWeight: '800' },
  secondaryBtns:   { flexDirection: 'row', gap: 10 },
  continueBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(128,0,7,0.28)', backgroundColor: 'rgba(128,0,7,0.07)' },
  continueBtnText: { color: '#800007', fontSize: 13, fontWeight: '700' },
  clearBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(255,107,107,0.22)', backgroundColor: 'rgba(255,107,107,0.06)' },
  clearBtnText:    { color: '#ff6b6b', fontSize: 13, fontWeight: '700' },
});