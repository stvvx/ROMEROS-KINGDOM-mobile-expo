import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import { getItem } from '@/utils/storage';
import { loadCartAsync, saveCartItemsSync } from '@/utils/cartDb';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const API_URL =
  process.env.NGROK_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:4000/api/v1';

// ─── DESIGN TOKENS ────────────────────────────────────────────
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
  textBody:   '#c8a090',
  danger:     '#FF5A6E',
}

// ─── THEMED ALERT MODAL ──────────────────────────────────────
interface ThemedAlertProps {
  visible: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  onClose: () => void;
}

const ThemedAlert: React.FC<ThemedAlertProps> = ({ visible, type, title, message, onClose }) => {
  const config = {
    success: { icon: 'checkmark-circle' as const, color: C.mint,   bg: 'rgba(153,98,80,0.12)', border: 'rgba(153,98,80,0.3)',  btn: C.accent,  label: 'Great!'  },
    error:   { icon: 'alert-circle'     as const, color: C.danger, bg: 'rgba(255,90,110,0.1)', border: 'rgba(255,90,110,0.28)', btn: C.danger,  label: 'Got it'  },
    warning: { icon: 'warning'          as const, color: '#ffca28', bg: 'rgba(255,202,40,0.1)', border: 'rgba(255,202,40,0.28)', btn: '#e6b800', label: 'Okay'    },
    info:    { icon: 'information-circle' as const, color: C.accent, bg: 'rgba(128,0,7,0.1)',  border: 'rgba(128,0,7,0.28)',   btn: C.accent,  label: 'Got it'  },
  }[type];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={al.overlay} onPress={onClose}>
        <Pressable style={al.card} onPress={() => {}}>
          <View style={[al.iconWrap, { backgroundColor: config.bg, borderColor: config.border, borderWidth: 1 }]}>
            <Ionicons name={config.icon} size={32} color={config.color} />
          </View>
          <Text style={al.title}>{title}</Text>
          <Text style={al.message}>{message}</Text>
          <View style={al.divider} />
          <TouchableOpacity style={[al.btn, { backgroundColor: config.btn }]} onPress={onClose} activeOpacity={0.85}>
            <Text style={al.btnText}>{config.label}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const al = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  card:     { width: '100%', backgroundColor: C.surface, borderRadius: 22, borderWidth: 1, borderColor: C.border, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 24 }, shadowOpacity: 0.6, shadowRadius: 40, elevation: 20 },
  iconWrap: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title:    { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 8, textAlign: 'center' },
  message:  { fontSize: 13, color: C.textBody, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  divider:  { width: '100%', height: 1, backgroundColor: C.border, marginBottom: 20 },
  btn:      { width: '100%', borderRadius: 13, paddingVertical: 14, alignItems: 'center' },
  btnText:  { fontSize: 14, fontWeight: '700', color: C.text },
});

// ─── MAIN SCREEN ─────────────────────────────────────────────
export default function Checkout() {
  const router = useRouter();
  const { voucherId, voucherCode, voucherDiscount } = useLocalSearchParams<{ voucherId?: string; voucherCode?: string; voucherDiscount?: string }>();
  const [loading, setLoading]             = useState(false);
  const [cartItems, setCartItems]         = useState<any[]>([]);
  const [itemsPrice, setItemsPrice]       = useState(0);
  const [taxPrice, setTaxPrice]           = useState(0);
  const [shippingPrice, setShippingPrice] = useState(0);
  const [totalPrice, setTotalPrice]       = useState(0);

  const [address, setAddress]       = useState('');
  const [city, setCity]             = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry]       = useState('');
  const [phoneNo, setPhoneNo]       = useState('');

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType]       = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [alertTitle, setAlertTitle]     = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertOnClose, setAlertOnClose] = useState<() => void>(() => () => {});

  const showAlert = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    onClose?: () => void,
  ) => {
    setAlertType(type);
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertOnClose(() => onClose ?? (() => setAlertVisible(false)));
    setAlertVisible(true);
  };

  useEffect(() => {
    (async () => {
      try {
        const items = await loadCartAsync();
        setCartItems(items);
        const sub      = items.reduce((s: number, it: any) => s + it.price * it.quantity, 0);
        const tax      = parseFloat((sub * 0.1).toFixed(2));
        const shipping = items.length > 0 ? 150 : 0;
        const parsedDiscount = parseFloat(String(voucherDiscount || '0')) || 0;
        const preDiscountTotal = sub + tax + shipping;
        const appliedDiscount = Math.min(parsedDiscount, preDiscountTotal);
        setItemsPrice(sub);
        setTaxPrice(tax);
        setShippingPrice(shipping);
        setTotalPrice(parseFloat((preDiscountTotal - appliedDiscount).toFixed(2)));
        try {
          const rawUser = await getItem('user');
          if (rawUser) {
            const u    = JSON.parse(rawUser);
            const addr = u.address || '';
            if (addr) {
              setAddress(addr);
              const parts = addr.split(',').map((p: string) => p.trim());
              if (parts.length >= 2) setCity(parts[1] || '');
              if (parts.length >= 3) setPostalCode(parts[2] || '');
              if (parts.length >= 4) setCountry(parts[3] || '');
            }
          }
        } catch (_) {}
      } catch (err) {
        console.error('Error loading cart for checkout:', err);
      }
    })();
  }, []);

  const placeOrderCOD = async () => {
    if (cartItems.length === 0) { showAlert('warning', 'Cart Empty', 'Add items before placing an order.'); return; }
    if (!address || !city || !postalCode || !country || !phoneNo) {
      showAlert('warning', 'Missing Info', 'Please fill in all shipping information.'); return;
    }

    setLoading(true);
    try {
      const token = await getItem('authToken');
      if (!token) {
        showAlert('error', 'Not Signed In', 'Please sign in to place an order.', () => {
          setAlertVisible(false); router.push('/(auth)/login');
        });
        return;
      }

      const orderItems = cartItems.map((it: any) => ({
        name: it.name, quantity: it.quantity,
        image: it.images?.[0]?.url || '',
        price: it.price, product: it._id || it.product || it.id,
      }));

      const payload = {
        orderItems,
        shippingInfo: { address, city, postalCode, country, phoneNo },
        itemsPrice, taxPrice, shippingPrice, totalPrice,
        paymentInfo: { id: 'COD', status: 'Cash On Delivery' },
        voucherId: voucherId || undefined,
      };

      const res = await axios.post(`${API_URL}/order/new`, payload, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        timeout: 15000,
      });

      if (res.data.success) {
        showAlert('success', 'Order Placed!', 'Your order was placed successfully (Cash on Delivery).', async () => {
          setAlertVisible(false); saveCartItemsSync([]); router.replace('/(tabs)');
        });
      } else {
        showAlert('error', 'Order Failed', res.data.message || 'Could not place order.');
      }
    } catch (err: any) {
      console.error('Checkout error:', err?.response || err);
      let msg = 'Checkout failed';
      const resp = err?.response;
      if (resp) {
        if (typeof resp.data === 'string') {
          const titleMatch = resp.data.match(/<title>(.*?)<\/title>/i);
          msg = titleMatch ? titleMatch[1] : `Server error (${resp.status})`;
        } else if (resp.data && typeof resp.data === 'object') {
          msg = resp.data.message || JSON.stringify(resp.data);
        } else {
          msg = `Server error (${resp.status})`;
        }
      } else {
        msg = err?.message || msg;
      }
      showAlert('error', 'Checkout Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <ThemedAlert
        visible={alertVisible}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        onClose={alertOnClose}
      />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <Feather name="arrow-left" size={18} color={C.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Checkout</Text>
          <Text style={s.headerSubtitle}>Cash on Delivery</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

        {/* ── Order Summary Card ── */}
        <View style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <View style={s.sectionIconWrap}>
              <Feather name="file-text" size={16} color={C.accent} />
            </View>
            <Text style={s.sectionTitle}>Order Summary</Text>
          </View>
          <View style={s.sectionDivider} />

          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Subtotal</Text>
            <Text style={s.summaryValue}>₱{itemsPrice.toFixed(2)}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Tax (10%)</Text>
            <Text style={s.summaryValue}>₱{taxPrice.toFixed(2)}</Text>
          </View>
          <View style={s.summaryRow}>
            <View style={s.shippingLabelRow}>
              <Text style={s.summaryLabel}>Shipping</Text>
              <View style={s.flatRateBadge}>
                <Text style={s.flatRateText}>Flat rate</Text>
              </View>
            </View>
            <Text style={s.summaryValue}>₱{shippingPrice.toFixed(2)}</Text>
          </View>

          {!!voucherDiscount && (parseFloat(String(voucherDiscount)) || 0) > 0 && (
            <View style={s.summaryRow}>
              <Text style={s.discountLabel}>Voucher Discount{voucherCode ? ` (${voucherCode})` : ''}</Text>
              <Text style={s.discountValue}>-₱{(parseFloat(String(voucherDiscount)) || 0).toFixed(2)}</Text>
            </View>
          )}

          <View style={s.sectionDivider} />

          <View style={s.summaryRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalValue}>₱{totalPrice.toFixed(2)}</Text>
          </View>
        </View>

        {/* ── Shipping Information Card ── */}
        <View style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <View style={s.sectionIconWrap}>
              <MaterialCommunityIcons name="map-marker-outline" size={16} color={C.accent} />
            </View>
            <Text style={s.sectionTitle}>Shipping Information</Text>
          </View>
          <View style={s.sectionDivider} />

          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>Street Address</Text>
            <TextInput style={s.input} value={address} onChangeText={setAddress} placeholder="e.g. 123 Main Street" placeholderTextColor={C.border} />
          </View>

          <View style={s.inputRow}>
            <View style={[s.inputGroup, { flex: 1 }]}>
              <Text style={s.inputLabel}>City</Text>
              <TextInput style={s.input} value={city} onChangeText={setCity} placeholder="City" placeholderTextColor={C.border} />
            </View>
            <View style={[s.inputGroup, { flex: 1 }]}>
              <Text style={s.inputLabel}>Postal Code</Text>
              <TextInput style={s.input} value={postalCode} onChangeText={setPostalCode} placeholder="0000" placeholderTextColor={C.border} keyboardType="numeric" />
            </View>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>Country</Text>
            <TextInput style={s.input} value={country} onChangeText={setCountry} placeholder="e.g. Philippines" placeholderTextColor={C.border} />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>Phone Number</Text>
            <View style={s.phoneInputWrap}>
              <Feather name="phone" size={14} color={C.textSub} style={s.phoneIcon} />
              <TextInput style={[s.input, s.phoneInput]} value={phoneNo} onChangeText={setPhoneNo} placeholder="+63 900 000 0000" placeholderTextColor={C.border} keyboardType="phone-pad" />
            </View>
          </View>
        </View>

        {/* ── Payment Method Card ── */}
        <View style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <View style={s.sectionIconWrap}>
              <MaterialCommunityIcons name="cash" size={16} color={C.accent} />
            </View>
            <Text style={s.sectionTitle}>Payment Method</Text>
          </View>
          <View style={s.sectionDivider} />

          <View style={s.codOption}>
            <View style={s.codIconWrap}>
              <MaterialCommunityIcons name="cash-multiple" size={22} color={C.mint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.codTitle}>Cash on Delivery</Text>
              <Text style={s.codSubtitle}>Pay when your order arrives</Text>
            </View>
            <View style={s.codSelectedDot} />
          </View>
        </View>

        {/* ── Place Order Button ── */}
        <TouchableOpacity
          style={[s.placeOrderBtn, loading && s.placeOrderBtnLoading]}
          onPress={placeOrderCOD}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={C.text} size="small" />
          ) : (
            <>
              <MaterialCommunityIcons name="lock-outline" size={17} color={C.text} />
              <Text style={s.placeOrderBtnText}>Place Order</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────
const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: C.bg },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingBottom: 16 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn:        { width: 38, height: 38, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  headerCenter:   { alignItems: 'center' },
  headerTitle:    { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: 0.2 },
  headerSubtitle: { fontSize: 11, color: C.textSub, marginTop: 1 },

  sectionCard:    { backgroundColor: 'rgba(249,249,249,0.03)', borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 18, marginTop: 16 },
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionIconWrap:{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(128,0,7,0.12)', borderWidth: 1, borderColor: 'rgba(128,0,7,0.28)', alignItems: 'center', justifyContent: 'center' },
  sectionTitle:   { fontSize: 15, fontWeight: '800', color: C.text },
  sectionDivider: { height: 1, backgroundColor: C.border, marginBottom: 14 },

  summaryRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  summaryLabel:     { fontSize: 13, color: C.textSub },
  summaryValue:     { fontSize: 13, fontWeight: '700', color: 'rgba(249,249,249,0.75)' },
  discountLabel:    { fontSize: 13, color: C.mint, fontWeight: '700' },
  discountValue:    { fontSize: 13, fontWeight: '800', color: C.mint },
  shippingLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flatRateBadge:    { backgroundColor: 'rgba(128,0,7,0.1)', borderWidth: 1, borderColor: 'rgba(128,0,7,0.25)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  flatRateText:     { fontSize: 9, color: C.accent, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  totalLabel:       { fontSize: 15, fontWeight: '800', color: C.text },
  totalValue:       { fontSize: 22, fontWeight: '800', color: C.accent },

  inputGroup:    { marginBottom: 14 },
  inputRow:      { flexDirection: 'row', gap: 12 },
  inputLabel:    { fontSize: 11, fontWeight: '700', color: C.textSub, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 },
  input:         { backgroundColor: 'rgba(249,249,249,0.04)', borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, color: C.text, fontSize: 14 },
  phoneInputWrap:{ position: 'relative' },
  phoneIcon:     { position: 'absolute', left: 14, top: 14, zIndex: 1 },
  phoneInput:    { paddingLeft: 38 },

  codOption:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  codIconWrap:   { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(153,98,80,0.12)', borderWidth: 1, borderColor: 'rgba(153,98,80,0.3)', alignItems: 'center', justifyContent: 'center' },
  codTitle:      { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 2 },
  codSubtitle:   { fontSize: 12, color: C.textSub },
  codSelectedDot:{ width: 18, height: 18, borderRadius: 9, backgroundColor: C.mint, borderWidth: 3, borderColor: 'rgba(153,98,80,0.3)' },

  placeOrderBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.accent, paddingVertical: 17, borderRadius: 14, marginTop: 20, shadowColor: C.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
  placeOrderBtnLoading: { opacity: 0.7 },
  placeOrderBtnText:    { color: C.text, fontSize: 16, fontWeight: '800' },
});