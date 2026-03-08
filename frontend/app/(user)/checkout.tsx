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
import { useRouter } from 'expo-router';
import axios from 'axios';
import { getItem, removeItem } from '@/utils/storage';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const API_URL =
  process.env.NGROK_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:4000/api/v1';

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
    success: { icon: 'checkmark-circle' as const, color: '#4caf50', bg: 'rgba(76,175,80,0.12)',    border: 'rgba(76,175,80,0.3)',    btn: '#4caf50', label: 'Great!'  },
    error:   { icon: 'alert-circle'      as const, color: '#ff6b6b', bg: 'rgba(255,107,107,0.12)',  border: 'rgba(255,107,107,0.3)',  btn: '#ff6b6b', label: 'Got it' },
    warning: { icon: 'warning'           as const, color: '#ffca28', bg: 'rgba(255,202,40,0.12)',   border: 'rgba(255,202,40,0.3)',   btn: '#e6b800', label: 'Okay'   },
    info:    { icon: 'information-circle' as const,color: '#2280b0', bg: 'rgba(34,128,176,0.12)',   border: 'rgba(34,128,176,0.3)',   btn: '#2280b0', label: 'Got it' },
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
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  card:     { width: '100%', backgroundColor: '#16213e', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 24 }, shadowOpacity: 0.6, shadowRadius: 40, elevation: 20 },
  iconWrap: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title:    { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8, textAlign: 'center' },
  message:  { fontSize: 13, color: 'rgba(160,174,192,0.75)', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  divider:  { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 20 },
  btn:      { width: '100%', borderRadius: 13, paddingVertical: 14, alignItems: 'center' },
  btnText:  { fontSize: 14, fontWeight: '700', color: '#fff' },
});

// ─── MAIN SCREEN ─────────────────────────────────────────────
export default function Checkout() {
  const router = useRouter();
  const [loading, setLoading]             = useState(false);
  const [cartItems, setCartItems]         = useState<any[]>([]);
  const [itemsPrice, setItemsPrice]       = useState(0);
  const [taxPrice, setTaxPrice]           = useState(0);
  const [shippingPrice, setShippingPrice] = useState(0);
  const [totalPrice, setTotalPrice]       = useState(0);

  const [address, setAddress]     = useState('');
  const [city, setCity]           = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry]     = useState('');
  const [phoneNo, setPhoneNo]     = useState('');

  // Alert state
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
        const data = await getItem('cartItems');
        const items = data ? JSON.parse(data) : [];
        setCartItems(items);
        const sub      = items.reduce((s: number, it: any) => s + it.price * it.quantity, 0);
        const tax      = parseFloat((sub * 0.1).toFixed(2));
        const shipping = items.length > 0 ? 150 : 0;
        setItemsPrice(sub);
        setTaxPrice(tax);
        setShippingPrice(shipping);
        setTotalPrice(parseFloat((sub + tax + shipping).toFixed(2)));
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
    if (cartItems.length === 0) {
      showAlert('warning', 'Cart Empty', 'Add items before placing an order.');
      return;
    }
    if (!address || !city || !postalCode || !country || !phoneNo) {
      showAlert('warning', 'Missing Info', 'Please fill in all shipping information.');
      return;
    }

    setLoading(true);
    try {
      const token = await getItem('authToken');
      if (!token) {
        showAlert('error', 'Not Signed In', 'Please sign in to place an order.', () => {
          setAlertVisible(false);
          router.push('/(auth)/login');
        });
        return;
      }

      const orderItems = cartItems.map((it: any) => ({
        name:     it.name,
        quantity: it.quantity,
        image:    it.images?.[0]?.url || '',
        price:    it.price,
        product:  it._id || it.product || it.id,
      }));

      const payload = {
        orderItems,
        shippingInfo: { address, city, postalCode, country, phoneNo },
        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
        paymentInfo: { id: 'COD', status: 'Cash On Delivery' },
      };

      const res = await axios.post(`${API_URL}/order/new`, payload, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        timeout: 15000,
      });

      if (res.data.success) {
        showAlert('success', 'Order Placed!', 'Your order was placed successfully (Cash on Delivery).', async () => {
          setAlertVisible(false);
          await removeItem('cartItems');
          router.replace('/(tabs)');
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
          <Feather name="arrow-left" size={18} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Checkout</Text>
          <Text style={s.headerSubtitle}>Cash on Delivery</Text>
        </View>
        {/* Spacer to balance the back button */}
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

        {/* ── Order Summary Card ── */}
        <View style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <View style={s.sectionIconWrap}>
              <Feather name="file-text" size={16} color="#2280b0" />
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
              <MaterialCommunityIcons name="map-marker-outline" size={16} color="#2280b0" />
            </View>
            <Text style={s.sectionTitle}>Shipping Information</Text>
          </View>
          <View style={s.sectionDivider} />

          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>Street Address</Text>
            <TextInput
              style={s.input}
              value={address}
              onChangeText={setAddress}
              placeholder="e.g. 123 Main Street"
              placeholderTextColor="rgba(160,174,192,0.35)"
            />
          </View>

          <View style={s.inputRow}>
            <View style={[s.inputGroup, { flex: 1 }]}>
              <Text style={s.inputLabel}>City</Text>
              <TextInput
                style={s.input}
                value={city}
                onChangeText={setCity}
                placeholder="City"
                placeholderTextColor="rgba(160,174,192,0.35)"
              />
            </View>
            <View style={[s.inputGroup, { flex: 1 }]}>
              <Text style={s.inputLabel}>Postal Code</Text>
              <TextInput
                style={s.input}
                value={postalCode}
                onChangeText={setPostalCode}
                placeholder="0000"
                placeholderTextColor="rgba(160,174,192,0.35)"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>Country</Text>
            <TextInput
              style={s.input}
              value={country}
              onChangeText={setCountry}
              placeholder="e.g. Philippines"
              placeholderTextColor="rgba(160,174,192,0.35)"
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>Phone Number</Text>
            <View style={s.phoneInputWrap}>
              <Feather name="phone" size={14} color="rgba(160,174,192,0.4)" style={s.phoneIcon} />
              <TextInput
                style={[s.input, s.phoneInput]}
                value={phoneNo}
                onChangeText={setPhoneNo}
                placeholder="+63 900 000 0000"
                placeholderTextColor="rgba(160,174,192,0.35)"
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        {/* ── Payment Method Card ── */}
        <View style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <View style={s.sectionIconWrap}>
              <MaterialCommunityIcons name="cash" size={16} color="#2280b0" />
            </View>
            <Text style={s.sectionTitle}>Payment Method</Text>
          </View>
          <View style={s.sectionDivider} />

          <View style={s.codOption}>
            <View style={s.codIconWrap}>
              <MaterialCommunityIcons name="cash-multiple" size={22} color="#4caf50" />
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
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <MaterialCommunityIcons name="lock-outline" size={17} color="#0E1117" />
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
  root:          { flex: 1, backgroundColor: '#1a1a2e' },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingBottom: 16 },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter:   { alignItems: 'center' },
  headerTitle:    { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
  headerSubtitle: { fontSize: 11, color: 'rgba(160,174,192,0.5)', marginTop: 1 },

  // ── Section Cards ──
  sectionCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 18,
    padding: 18,
    marginTop: 16,
  },
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionIconWrap:{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(34,128,176,0.15)', borderWidth: 1, borderColor: 'rgba(34,128,176,0.3)', alignItems: 'center', justifyContent: 'center' },
  sectionTitle:   { fontSize: 15, fontWeight: '800', color: '#fff' },
  sectionDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 14 },

  // ── Summary Rows ──
  summaryRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  summaryLabel:    { fontSize: 13, color: 'rgba(160,174,192,0.6)' },
  summaryValue:    { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.75)' },
  shippingLabelRow:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  flatRateBadge:   { backgroundColor: 'rgba(34,128,176,0.12)', borderWidth: 1, borderColor: 'rgba(34,128,176,0.25)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  flatRateText:    { fontSize: 9, color: '#2280b0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  totalLabel:      { fontSize: 15, fontWeight: '800', color: '#fff' },
  totalValue:      { fontSize: 22, fontWeight: '800', color: '#00C2C7' },

  // ── Form Inputs ──
  inputGroup:    { marginBottom: 14 },
  inputRow:      { flexDirection: 'row', gap: 12 },
  inputLabel:    { fontSize: 11, fontWeight: '700', color: 'rgba(160,174,192,0.55)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#fff',
    fontSize: 14,
  },
  phoneInputWrap: { position: 'relative' },
  phoneIcon:      { position: 'absolute', left: 14, top: 14, zIndex: 1 },
  phoneInput:     { paddingLeft: 38 },

  // ── COD Option ──
  codOption:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  codIconWrap:   { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(76,175,80,0.12)', borderWidth: 1, borderColor: 'rgba(76,175,80,0.3)', alignItems: 'center', justifyContent: 'center' },
  codTitle:      { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2 },
  codSubtitle:   { fontSize: 12, color: 'rgba(160,174,192,0.5)' },
  codSelectedDot:{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#4caf50', borderWidth: 3, borderColor: 'rgba(76,175,80,0.3)' },

  // ── Place Order Button ──
  placeOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#00C2C7',
    paddingVertical: 17,
    borderRadius: 14,
    marginTop: 20,
  },
  placeOrderBtnLoading: { opacity: 0.7 },
  placeOrderBtnText:    { color: '#0E1117', fontSize: 16, fontWeight: '800' },
});