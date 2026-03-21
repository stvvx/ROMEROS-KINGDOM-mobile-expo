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
  Platform,
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

/* ─────────────────────────────────────────
   Palette — Blue Robotics
───────────────────────────────────────── */
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
  warn:        '#F59E0B',
  warnBg:      'rgba(245,158,11,0.1)',
  warnBorder:  'rgba(245,158,11,0.28)',
};

const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

/* ─────────────────────────────────────────
   Themed Alert Modal
───────────────────────────────────────── */
interface ThemedAlertProps {
  visible: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  onClose: () => void;
}

const ThemedAlert: React.FC<ThemedAlertProps> = ({
  visible, type, title, message, onClose,
}) => {
  const config = {
    success: { icon: 'checkmark-circle' as const, color: C.success, bg: 'rgba(0,212,170,0.1)',  border: 'rgba(0,212,170,0.3)',  btn: C.success, tag: 'SYSTEM OK',      label: '[ CONFIRM ]'  },
    error:   { icon: 'alert-circle'     as const, color: C.danger,  bg: C.dangerBg,              border: C.dangerBorder,          btn: C.danger,  tag: 'SYSTEM ERROR',  label: '[ DISMISS ]'  },
    warning: { icon: 'warning'          as const, color: C.warn,    bg: C.warnBg,                border: C.warnBorder,            btn: C.warn,    tag: 'SYSTEM WARNING',label: '[ OKAY ]'     },
    info:    { icon: 'information-circle' as const, color: C.accent, bg: C.accentGlow,            border: C.borderBright,          btn: C.accent,  tag: 'SYSTEM INFO',   label: '[ GOT IT ]'   },
  }[type];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={al.overlay} onPress={onClose}>
        <Pressable style={al.card} onPress={() => {}}>
          {/* Corner accents — tinted to alert type */}
          <View style={[al.cornerTL, { borderColor: config.color }]} />
          <View style={[al.cornerTR, { borderColor: config.color }]} />
          <View style={[al.cornerBL, { borderColor: config.color }]} />
          <View style={[al.cornerBR, { borderColor: config.color }]} />

          {/* Icon */}
          <View style={[al.iconWrap, { backgroundColor: config.bg, borderColor: config.border }]}>
            <Ionicons name={config.icon} size={30} color={config.color} />
            <View style={[al.iconDot, { backgroundColor: config.color }]} />
          </View>

          {/* Sys tag */}
          <View style={al.sysRow}>
            <View style={[al.sysDash, { backgroundColor: config.color }]} />
            <Text style={[al.sysTag, { color: config.color }]}>{config.tag}</Text>
            <View style={[al.sysDash, { backgroundColor: config.color }]} />
          </View>

          <Text style={al.title}>{title}</Text>
          <Text style={al.message}>{message}</Text>
          <View style={al.divider} />

          <TouchableOpacity
            style={[al.btn, { backgroundColor: config.btn, overflow: 'hidden' }]}
            onPress={onClose} activeOpacity={0.85}
          >
            <View style={al.btnScan} />
            <Text style={al.btnText}>{config.label}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const al = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28,
  },
  card: {
    width: '100%', backgroundColor: C.bgLayer,
    borderRadius: 18, borderWidth: 1, borderColor: C.border,
    padding: 28, alignItems: 'center',
    shadowColor: C.accent, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2, shadowRadius: 28, elevation: 18,
  },
  cornerTL: { position: 'absolute', top: -1, left: -1,   width: 14, height: 14, borderTopWidth: 2,    borderLeftWidth: 2,  borderTopLeftRadius: 18 },
  cornerTR: { position: 'absolute', top: -1, right: -1,  width: 14, height: 14, borderTopWidth: 2,    borderRightWidth: 2, borderTopRightRadius: 18 },
  cornerBL: { position: 'absolute', bottom: -1, left: -1,  width: 14, height: 14, borderBottomWidth: 2, borderLeftWidth: 2,  borderBottomLeftRadius: 18 },
  cornerBR: { position: 'absolute', bottom: -1, right: -1, width: 14, height: 14, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 18 },
  iconWrap: {
    width: 64, height: 64, borderRadius: 16,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  iconDot: { position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: 3.5, opacity: 0.8 },
  sysRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sysDash: { width: 14, height: 1, opacity: 0.45, marginHorizontal: 6 },
  sysTag:  { fontSize: 8, letterSpacing: 1.8, opacity: 0.85, fontFamily: MONO },
  title:   { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 8, textAlign: 'center', letterSpacing: 1.5, fontFamily: MONO },
  message: { fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  divider: { width: '100%', height: 1, backgroundColor: C.border, marginBottom: 18 },
  btn:     { width: '100%', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnScan: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  btnText: { fontSize: 12, fontWeight: '800', color: C.bg, letterSpacing: 2, fontFamily: MONO },
});

/* ─────────────────────────────────────────
   Input Field Helper
───────────────────────────────────────── */
interface FieldProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: any;
  leftIcon?: React.ReactNode;
  style?: any;
}

const Field: React.FC<FieldProps> = ({
  label, value, onChangeText, placeholder, keyboardType, leftIcon, style,
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={fi.group}>
      <View style={fi.labelRow}>
        <View style={fi.tick} />
        <Text style={fi.label}>{label}</Text>
      </View>
      <View style={[fi.wrap, focused && fi.wrapFocused, style]}>
        <View style={fi.rail} />
        {leftIcon && <View style={fi.iconWrap}>{leftIcon}</View>}
        <TextInput
          style={fi.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.textDim}
          keyboardType={keyboardType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={C.accent}
        />
      </View>
    </View>
  );
};

const fi = StyleSheet.create({
  group:      { marginBottom: 14 },
  labelRow:   { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  tick:       { width: 2.5, height: 10, borderRadius: 1.5, backgroundColor: C.accent },
  label:      { fontSize: 9, fontWeight: '700', color: C.accent, letterSpacing: 2, fontFamily: MONO },
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,168,255,0.04)',
    borderWidth: 1, borderColor: C.border,
    borderRadius: 9, overflow: 'hidden', height: 48,
  },
  wrapFocused:{ borderColor: C.accent, backgroundColor: 'rgba(0,168,255,0.08)' },
  rail:       { width: 3, alignSelf: 'stretch', backgroundColor: C.accentDim },
  iconWrap:   { paddingLeft: 12, paddingRight: 4 },
  input:      { flex: 1, color: C.text, fontSize: 14, paddingHorizontal: 12, height: '100%', fontFamily: MONO },
});

/* ─────────────────────────────────────────
   Main Screen
───────────────────────────────────────── */
export default function Checkout() {
  const router = useRouter();
  const { voucherId, voucherCode, voucherDiscount } = useLocalSearchParams<{
    voucherId?: string; voucherCode?: string; voucherDiscount?: string;
  }>();

  const [loading,       setLoading]       = useState(false);
  const [cartItems,     setCartItems]     = useState<any[]>([]);
  const [itemsPrice,    setItemsPrice]    = useState(0);
  const [taxPrice,      setTaxPrice]      = useState(0);
  const [shippingPrice, setShippingPrice] = useState(0);
  const [totalPrice,    setTotalPrice]    = useState(0);

  const [address,    setAddress]    = useState('');
  const [city,       setCity]       = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country,    setCountry]    = useState('');
  const [phoneNo,    setPhoneNo]    = useState('');

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType,    setAlertType]    = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [alertTitle,   setAlertTitle]   = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertOnClose, setAlertOnClose] = useState<() => void>(() => () => {});

  const showAlert = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string, message: string,
    onClose?: () => void,
  ) => {
    setAlertType(type); setAlertTitle(title); setAlertMessage(message);
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
        const parsedDiscount   = parseFloat(String(voucherDiscount || '0')) || 0;
        const preDiscountTotal = sub + tax + shipping;
        const appliedDiscount  = Math.min(parsedDiscount, preDiscountTotal);
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
      } catch (err) { console.error('Error loading cart for checkout:', err); }
    })();
  }, []);

  const placeOrderCOD = async () => {
    if (cartItems.length === 0) { showAlert('warning', 'CART EMPTY', 'Add units before placing an order.'); return; }
    if (!address || !city || !postalCode || !country || !phoneNo) {
      showAlert('warning', 'MISSING DATA', 'Fill in all shipping information fields.'); return;
    }
    setLoading(true);
    try {
      const token = await getItem('authToken');
      if (!token) {
        showAlert('error', 'NOT AUTHENTICATED', 'Sign in to place an order.', () => {
          setAlertVisible(false); router.push('/(auth)/login');
        });
        return;
      }
      const orderItems = cartItems.map((it: any) => ({
        name: it.name, quantity: it.quantity,
        image: it.images?.[0]?.url || '', price: it.price,
        product: it._id || it.product || it.id,
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
        showAlert('success', 'ORDER CONFIRMED', 'Your order was placed successfully. Cash on Delivery.', async () => {
          setAlertVisible(false); saveCartItemsSync([]); router.replace('/(tabs)');
        });
      } else {
        showAlert('error', 'ORDER FAILED', res.data.message || 'Could not place order.');
      }
    } catch (err: any) {
      console.error('Checkout error:', err?.response || err);
      let msg = 'Checkout failed';
      const resp = err?.response;
      if (resp) {
        if (typeof resp.data === 'string') {
          const m = resp.data.match(/<title>(.*?)<\/title>/i);
          msg = m ? m[1] : `Server error (${resp.status})`;
        } else if (resp.data && typeof resp.data === 'object') {
          msg = resp.data.message || JSON.stringify(resp.data);
        } else { msg = `Server error (${resp.status})`; }
      } else { msg = err?.message || msg; }
      showAlert('error', 'CHECKOUT ERROR', msg);
    } finally { setLoading(false); }
  };

  return (
    <View style={s.root}>
      <ThemedAlert
        visible={alertVisible} type={alertType}
        title={alertTitle} message={alertMessage} onClose={alertOnClose}
      />

      {/* ══════════════════════════════════
          HEADER
      ══════════════════════════════════ */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <Feather name="arrow-left" size={17} color={C.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <View style={s.headerTitleRow}>
            <View style={s.headerTick} />
            <Text style={s.headerTitle}>CHECKOUT</Text>
          </View>
          <Text style={s.headerSubtitle}>CASH ON DELIVERY PROTOCOL</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

        {/* ══════════════════════════════════
            ORDER SUMMARY PANEL
        ══════════════════════════════════ */}
        <View style={s.panel}>
          <View style={s.panelTL} /><View style={s.panelTR} />
          <View style={s.panelHeader}>
            <View style={s.panelIconWrap}>
              <Feather name="file-text" size={15} color={C.accent} />
            </View>
            <View style={s.panelTitleBlock}>
              <View style={s.panelTick} />
              <Text style={s.panelTitle}>ORDER SUMMARY</Text>
            </View>
          </View>
          <View style={s.panelDivider} />

          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>SUBTOTAL</Text>
            <Text style={s.summaryValue}>₱{itemsPrice.toFixed(2)}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>TAX (10%)</Text>
            <Text style={s.summaryValue}>₱{taxPrice.toFixed(2)}</Text>
          </View>
          <View style={s.summaryRow}>
            <View style={s.shippingRow}>
              <Text style={s.summaryLabel}>SHIPPING</Text>
              <View style={s.flatBadge}><Text style={s.flatBadgeText}>FLAT</Text></View>
            </View>
            <Text style={s.summaryValue}>₱{shippingPrice.toFixed(2)}</Text>
          </View>

          {!!voucherDiscount && (parseFloat(String(voucherDiscount)) || 0) > 0 && (
            <View style={s.summaryRow}>
              <Text style={s.discountLabel}>DISCOUNT{voucherCode ? ` · ${voucherCode}` : ''}</Text>
              <Text style={s.discountValue}>-₱{(parseFloat(String(voucherDiscount)) || 0).toFixed(2)}</Text>
            </View>
          )}

          <View style={s.panelDivider} />
          <View style={s.summaryRow}>
            <Text style={s.totalLabel}>TOTAL</Text>
            <Text style={s.totalValue}>₱{totalPrice.toFixed(2)}</Text>
          </View>
        </View>

        {/* ══════════════════════════════════
            SHIPPING INFORMATION PANEL
        ══════════════════════════════════ */}
        <View style={s.panel}>
          <View style={s.panelTL} /><View style={s.panelTR} />
          <View style={s.panelHeader}>
            <View style={s.panelIconWrap}>
              <MaterialCommunityIcons name="map-marker-outline" size={15} color={C.accent} />
            </View>
            <View style={s.panelTitleBlock}>
              <View style={s.panelTick} />
              <Text style={s.panelTitle}>DELIVERY COORDINATES</Text>
            </View>
          </View>
          <View style={s.panelDivider} />

          <Field label="Street Address"  value={address}    onChangeText={setAddress}    placeholder="e.g. 123 Main Street" />

          <View style={s.inputRow}>
            <View style={{ flex: 1 }}>
              <Field label="City"         value={city}       onChangeText={setCity}       placeholder="City" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Postal Code"  value={postalCode} onChangeText={setPostalCode} placeholder="0000" keyboardType="numeric" />
            </View>
          </View>

          <Field label="Country"        value={country}    onChangeText={setCountry}    placeholder="e.g. Philippines" />
          <Field
            label="Phone Number"
            value={phoneNo}
            onChangeText={setPhoneNo}
            placeholder="+63 900 000 0000"
            keyboardType="phone-pad"
            leftIcon={<Feather name="phone" size={13} color={C.textSub} />}
          />
        </View>

        {/* ══════════════════════════════════
            PAYMENT METHOD PANEL
        ══════════════════════════════════ */}
        <View style={s.panel}>
          <View style={s.panelTL} /><View style={s.panelTR} />
          <View style={s.panelHeader}>
            <View style={s.panelIconWrap}>
              <MaterialCommunityIcons name="cash" size={15} color={C.accent} />
            </View>
            <View style={s.panelTitleBlock}>
              <View style={s.panelTick} />
              <Text style={s.panelTitle}>PAYMENT PROTOCOL</Text>
            </View>
          </View>
          <View style={s.panelDivider} />

          <View style={s.codOption}>
            <View style={s.codIconWrap}>
              <MaterialCommunityIcons name="cash-multiple" size={22} color={C.accentText} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.codTitle}>CASH ON DELIVERY</Text>
              <Text style={s.codSubtitle}>Pay when your order arrives</Text>
            </View>
            {/* Active indicator */}
            <View style={s.codActivePill}>
              <View style={s.codPulseDot} />
              <Text style={s.codActiveText}>ACTIVE</Text>
            </View>
          </View>
        </View>

        {/* ══════════════════════════════════
            PLACE ORDER BUTTON
        ══════════════════════════════════ */}
        <TouchableOpacity
          style={[s.placeOrderBtn, loading && s.placeOrderBtnLoading]}
          onPress={placeOrderCOD}
          disabled={loading}
          activeOpacity={0.85}
        >
          <View style={s.placeOrderBtnScan} />
          {loading ? (
            <ActivityIndicator color={C.bg} size="small" />
          ) : (
            <>
              <MaterialCommunityIcons name="lock-outline" size={16} color={C.bg} style={{ marginRight: 8 }} />
              <Text style={s.placeOrderBtnText}>CONFIRM ORDER</Text>
              <Feather name="arrow-right" size={15} color={C.bg} style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

/* ─────────────────────────────────────────
   Styles
───────────────────────────────────────── */
const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: C.bg },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingBottom: 16 },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.bgLayer,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter:   { alignItems: 'center' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTick:     { width: 3, height: 14, borderRadius: 2, backgroundColor: C.accent },
  headerTitle: {
    fontSize: 16, fontWeight: '800', color: C.text, letterSpacing: 3,
    fontFamily: MONO,
  },
  headerSubtitle: {
    fontSize: 8, color: C.textDim, letterSpacing: 1.5, marginTop: 2,
    fontFamily: MONO,
  },

  /* Panel (shared card structure) */
  panel: {
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 16, padding: 18, marginTop: 16,
  },
  panelTL: { position: 'absolute', top: -1, left: -1,  width: 14, height: 14, borderTopWidth: 1.5,    borderLeftWidth: 1.5,  borderColor: C.accent, borderTopLeftRadius: 16 },
  panelTR: { position: 'absolute', top: -1, right: -1, width: 14, height: 14, borderTopWidth: 1.5,    borderRightWidth: 1.5, borderColor: C.accent, borderTopRightRadius: 16 },
  panelHeader:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  panelIconWrap:   { width: 34, height: 34, borderRadius: 9, backgroundColor: C.accentGlow, borderWidth: 1, borderColor: C.borderBright, alignItems: 'center', justifyContent: 'center' },
  panelTitleBlock: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  panelTick:       { width: 2.5, height: 12, borderRadius: 1.5, backgroundColor: C.accent },
  panelTitle: {
    fontSize: 11, fontWeight: '800', color: C.text, letterSpacing: 2.5,
    fontFamily: MONO,
  },
  panelDivider: { height: 1, backgroundColor: C.border, marginBottom: 14 },

  /* Summary */
  summaryRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  summaryLabel: {
    fontSize: 9, color: C.textSub, letterSpacing: 1.8,
    fontFamily: MONO,
  },
  summaryValue: {
    fontSize: 13, fontWeight: '700', color: C.text,
    fontFamily: MONO,
  },
  discountLabel: {
    fontSize: 9, color: C.success, fontWeight: '700', letterSpacing: 1.8,
    fontFamily: MONO,
  },
  discountValue: {
    fontSize: 13, fontWeight: '800', color: C.success,
    fontFamily: MONO,
  },
  shippingRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flatBadge:     { backgroundColor: C.accentGlow, borderWidth: 1, borderColor: C.borderBright, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  flatBadgeText: { fontSize: 7, color: C.accent, fontWeight: '700', letterSpacing: 1, fontFamily: MONO },
  totalLabel: {
    fontSize: 13, fontWeight: '800', color: C.text, letterSpacing: 2.5,
    fontFamily: MONO,
  },
  totalValue: {
    fontSize: 22, fontWeight: '800', color: C.accent,
    fontFamily: MONO,
    shadowColor: C.accent, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 8,
  },

  /* Input layout helpers */
  inputRow: { flexDirection: 'row', gap: 12 },

  /* COD option */
  codOption: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  codIconWrap: {
    width: 44, height: 44, borderRadius: 11,
    backgroundColor: C.accentGlow, borderWidth: 1, borderColor: C.borderBright,
    alignItems: 'center', justifyContent: 'center',
  },
  codTitle: {
    fontSize: 12, fontWeight: '800', color: C.text, marginBottom: 2, letterSpacing: 1.5,
    fontFamily: MONO,
  },
  codSubtitle:  { fontSize: 11, color: C.textSub },
  codActivePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,212,170,0.1)',
    borderWidth: 1, borderColor: 'rgba(0,212,170,0.3)',
    borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5,
  },
  codPulseDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: C.success,
    shadowColor: C.success, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9, shadowRadius: 4, elevation: 2,
  },
  codActiveText: {
    fontSize: 8, fontWeight: '800', color: C.success, letterSpacing: 1.5,
    fontFamily: MONO,
  },

  /* Place Order Button */
  placeOrderBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.accent, paddingVertical: 17,
    borderRadius: 12, marginTop: 20, overflow: 'hidden',
    shadowColor: C.accent, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65, shadowRadius: 16, elevation: 10,
  },
  placeOrderBtnScan: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 2, backgroundColor: 'rgba(255,255,255,0.25)',
  },
  placeOrderBtnLoading: { opacity: 0.6 },
  placeOrderBtnText: {
    color: C.bg, fontSize: 13, fontWeight: '800', letterSpacing: 2.5,
    fontFamily: MONO,
  },
});