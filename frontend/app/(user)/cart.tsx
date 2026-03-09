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
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { saveCartItemsSync, loadCartAsync } from '@/utils/cartDb';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const API_URL =
  process.env.NGROK_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:4000/api/v1';

interface CartItem {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  images?: { url: string }[];
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
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  card:           { width: '100%', backgroundColor: '#16213e', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 24 }, shadowOpacity: 0.6, shadowRadius: 40, elevation: 20 },
  iconWrap:       { width: 64, height: 64, borderRadius: 18, backgroundColor: 'rgba(255,107,107,0.12)', borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title:          { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 8, textAlign: 'center' },
  message:        { fontSize: 13, color: 'rgba(160,174,192,0.75)', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  divider:        { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 20 },
  btnRow:         { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn:      { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 13, paddingVertical: 13, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  cancelBtnText:  { fontSize: 14, fontWeight: '700', color: 'rgba(160,174,192,0.7)' },
  confirmBtn:     { flex: 1, borderRadius: 13, paddingVertical: 13, alignItems: 'center' },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

// ─── MAIN SCREEN ──────────────────────────────────────────────
export default function Cart() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

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

  useFocusEffect(useCallback(() => { loadCart(); }, []));
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
  const total    = subtotal + tax + shipping;

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    router.push({ pathname: '/(user)/checkout', params: { cartTotal: total.toString() } });
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
            <MaterialCommunityIcons name="cart-outline" size={18} color="#2280b0" />
            <Text style={s.cartBadgeText}>0</Text>
          </View>
        </View>
        <View style={s.emptyContainer}>
          <View style={s.emptyIconWrap}>
            <MaterialCommunityIcons name="cart-outline" size={40} color="rgba(160,174,192,0.35)" />
          </View>
          <Text style={s.emptyTitle}>Your cart is empty</Text>
          <Text style={s.emptyText}>Add items from the store to get started</Text>
          <TouchableOpacity style={s.browseBtn} onPress={() => router.push('/(tabs)')} activeOpacity={0.85}>
            <Feather name="shopping-bag" size={15} color="#fff" />
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
          <MaterialCommunityIcons name="cart-outline" size={18} color="#2280b0" />
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

        {/* ── Order Summary ── */}
        <View style={s.summaryCard}>
          <View style={s.summaryCardHeader}>
            <View style={s.summaryIconWrap}>
              <Feather name="file-text" size={16} color="#2280b0" />
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

          <View style={s.summaryDivider} />

          <View style={s.summaryRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalValue}>₱{total.toFixed(2)}</Text>
          </View>
        </View>

        {/* ── Checkout Button ── */}
        <TouchableOpacity style={s.checkoutBtn} onPress={handleCheckout} activeOpacity={0.85}>
          <MaterialCommunityIcons name="lock-outline" size={17} color="#fff" />
          <Text style={s.checkoutBtnText}>Proceed to Checkout</Text>
        </TouchableOpacity>

        {/* ── Secondary Buttons ── */}
        <View style={s.secondaryBtns}>
          <TouchableOpacity style={s.continueBtn} onPress={() => router.push('/(tabs)')} activeOpacity={0.85}>
            <Feather name="arrow-left" size={14} color="#2280b0" />
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
            <MaterialCommunityIcons name="package-variant" size={28} color="rgba(160,174,192,0.3)" />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={s.itemInfo}>
        <Text style={s.itemName} numberOfLines={2}>{item.name}</Text>
        <Text style={s.itemUnitPrice}>₱{item.price.toFixed(2)} / pc</Text>
        <View style={s.qtyRow}>
          <TouchableOpacity style={s.qtyBtn} onPress={onDecreaseQty}>
            <Feather name="minus" size={13} color={item.quantity <= 1 ? 'rgba(160,174,192,0.25)' : '#fff'} />
          </TouchableOpacity>
          <View style={s.qtyDisplay}>
            <Text style={s.qtyText}>{item.quantity}</Text>
          </View>
          <TouchableOpacity style={s.qtyBtn} onPress={onIncreaseQty}>
            <Feather name="plus" size={13} color="#fff" />
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
  root:          { flex: 1, backgroundColor: '#1a1a2e' },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingBottom: 16 },

  // ── Page Header ──
  pageHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 20, paddingBottom: 16 },
  pageTitle:     { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 0.3, marginBottom: 2 },
  pageSubtitle:  { fontSize: 12, color: 'rgba(160,174,192,0.6)' },
  cartBadge:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(34,128,176,0.12)', borderWidth: 1, borderColor: 'rgba(34,128,176,0.25)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  cartBadgeText: { fontSize: 13, fontWeight: '800', color: '#2280b0' },

  // ── Empty State ──
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80, gap: 10 },
  emptyIconWrap:  { width: 88, height: 88, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle:     { fontSize: 18, fontWeight: '800', color: 'rgba(255,255,255,0.7)' },
  emptyText:      { fontSize: 13, color: 'rgba(160,174,192,0.45)', textAlign: 'center' },
  browseBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, backgroundColor: '#2280b0', paddingHorizontal: 22, paddingVertical: 13, borderRadius: 13 },
  browseBtnText:  { color: '#fff', fontWeight: '700', fontSize: 14 },

  // ── Cart Item Card ──
  card:                { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: 12, marginBottom: 10 },
  itemImageWrap:       { marginRight: 12 },
  itemImage:           { width: 76, height: 76, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)' },
  itemImagePlaceholder:{ width: 76, height: 76, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  itemInfo:            { flex: 1 },
  itemName:            { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 3, lineHeight: 19 },
  itemUnitPrice:       { fontSize: 12, color: '#00C2C7', fontWeight: '600', marginBottom: 10 },
  qtyRow:              { flexDirection: 'row', alignItems: 'center' },
  qtyBtn:              { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  qtyDisplay:          { width: 36, height: 28, marginHorizontal: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', alignItems: 'center', justifyContent: 'center' },
  qtyText:             { fontSize: 13, fontWeight: '800', color: '#fff' },
  itemRight:           { alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch', marginLeft: 10, paddingVertical: 2 },
  itemTotal:           { fontSize: 15, fontWeight: '800', color: '#fff' },
  removeBtn:           { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,107,107,0.1)', borderWidth: 1, borderColor: 'rgba(255,107,107,0.25)', alignItems: 'center', justifyContent: 'center' },

  // ── Order Summary ──
  summaryCard:       { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 18, padding: 18, marginBottom: 16, marginTop: 6 },
  summaryCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  summaryIconWrap:   { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(34,128,176,0.15)', borderWidth: 1, borderColor: 'rgba(34,128,176,0.3)', alignItems: 'center', justifyContent: 'center' },
  summaryCardTitle:  { fontSize: 15, fontWeight: '800', color: '#fff' },
  summaryDivider:    { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 14 },
  summaryRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  summaryLabel:      { fontSize: 13, color: 'rgba(160,174,192,0.6)' },
  summaryValue:      { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.75)' },
  shippingLabelRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flatRateBadge:     { backgroundColor: 'rgba(34,128,176,0.12)', borderWidth: 1, borderColor: 'rgba(34,128,176,0.25)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  flatRateText:      { fontSize: 9, color: '#2280b0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  totalLabel:        { fontSize: 15, fontWeight: '800', color: '#fff' },
  totalValue:        { fontSize: 22, fontWeight: '800', color: '#00C2C7' },

  // ── Buttons ──
  checkoutBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#2280b0', paddingVertical: 16, borderRadius: 14, marginBottom: 12 },
  checkoutBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  secondaryBtns:   { flexDirection: 'row', gap: 10 },
  continueBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(34,128,176,0.3)', backgroundColor: 'rgba(34,128,176,0.08)' },
  continueBtnText: { color: '#2280b0', fontSize: 13, fontWeight: '700' },
  clearBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(255,107,107,0.25)', backgroundColor: 'rgba(255,107,107,0.07)' },
  clearBtnText:    { color: '#ff6b6b', fontSize: 13, fontWeight: '700' },
});