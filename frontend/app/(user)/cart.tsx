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
import { SafeAreaView } from 'react-native-safe-area-context';
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
};

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
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

/* ─────────────────────────────────────────
   Themed Confirm Modal
───────────────────────────────────────── */
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
  confirmLabel = 'Confirm', confirmColor = C.danger,
  onConfirm, onCancel,
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <Pressable style={cm.overlay} onPress={onCancel}>
      <Pressable style={cm.card} onPress={() => {}}>
        {/* Corner accents */}
        <View style={cm.cornerTL} /><View style={cm.cornerTR} />
        <View style={cm.cornerBL} /><View style={cm.cornerBR} />

        {/* Icon */}
        <View style={cm.iconWrap}>
          <Ionicons name="alert-circle" size={30} color={C.danger} />
          <View style={cm.iconDot} />
        </View>

        {/* Sys tag */}
        <View style={cm.sysRow}>
          <View style={cm.sysDash} /><Text style={cm.sysTag}>SYSTEM WARNING</Text><View style={cm.sysDash} />
        </View>

        <Text style={cm.title}>{title}</Text>
        <Text style={cm.message}>{message}</Text>
        <View style={cm.divider} />

        <View style={cm.btnRow}>
          <TouchableOpacity style={cm.cancelBtn} onPress={onCancel} activeOpacity={0.85}>
            <Text style={cm.cancelBtnText}>[ CANCEL ]</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[cm.confirmBtn, { backgroundColor: confirmColor }]}
            onPress={onConfirm} activeOpacity={0.85}
          >
            <View style={cm.btnScan} />
            <Text style={cm.confirmBtnText}>{confirmLabel}</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Pressable>
  </Modal>
);

const cm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  card: {
    width: '100%', backgroundColor: C.bgLayer,
    borderRadius: 18, borderWidth: 1, borderColor: C.border,
    padding: 28, alignItems: 'center',
    shadowColor: C.accent, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2, shadowRadius: 28, elevation: 18,
  },
  cornerTL: { position: 'absolute', top: -1, left: -1,   width: 14, height: 14, borderTopWidth: 2,    borderLeftWidth: 2,  borderColor: C.danger, borderTopLeftRadius: 18 },
  cornerTR: { position: 'absolute', top: -1, right: -1,  width: 14, height: 14, borderTopWidth: 2,    borderRightWidth: 2, borderColor: C.danger, borderTopRightRadius: 18 },
  cornerBL: { position: 'absolute', bottom: -1, left: -1,  width: 14, height: 14, borderBottomWidth: 2, borderLeftWidth: 2,  borderColor: C.danger, borderBottomLeftRadius: 18 },
  cornerBR: { position: 'absolute', bottom: -1, right: -1, width: 14, height: 14, borderBottomWidth: 2, borderRightWidth: 2, borderColor: C.danger, borderBottomRightRadius: 18 },
  iconWrap: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: C.dangerBg, borderWidth: 1, borderColor: C.dangerBorder,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  iconDot: {
    position: 'absolute', top: 5, right: 5,
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: C.danger, opacity: 0.8,
  },
  sysRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sysDash: { width: 16, height: 1, backgroundColor: C.danger, opacity: 0.4, marginHorizontal: 6 },
  sysTag: {
    fontSize: 8, color: C.danger, letterSpacing: 1.8, opacity: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  title: {
    fontSize: 18, fontWeight: '800', color: C.text,
    marginBottom: 8, textAlign: 'center', letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  message:  { fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  divider:  { width: '100%', height: 1, backgroundColor: C.border, marginBottom: 18 },
  btnRow:   { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingVertical: 13, alignItems: 'center',
    backgroundColor: C.surface,
  },
  cancelBtnText: {
    fontSize: 12, fontWeight: '700', color: C.textSub, letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  confirmBtn: {
    flex: 1, borderRadius: 10, paddingVertical: 13,
    alignItems: 'center', overflow: 'hidden',
  },
  btnScan: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 2, backgroundColor: 'rgba(255,255,255,0.25)',
  },
  confirmBtnText: {
    fontSize: 12, fontWeight: '800', color: C.bg, letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
});

/* ─────────────────────────────────────────
   Main Screen
───────────────────────────────────────── */
export default function Cart() {
  const router = useRouter();
  const [cartItems,        setCartItems]        = useState<CartItem[]>([]);
  const [claimedVouchers,  setClaimedVouchers]  = useState<VoucherItem[]>([]);
  const [selectedVoucherId,setSelectedVoucherId]= useState<string | null>(null);
  const [confirmVisible,   setConfirmVisible]   = useState(false);
  const [confirmConfig,    setConfirmConfig]     = useState({
    title: '', message: '', confirmLabel: 'Remove', confirmColor: C.danger, onConfirm: () => {},
  });

  const showConfirm = (
    title: string, message: string,
    confirmLabel: string, confirmColor: string,
    onConfirm: () => void
  ) => {
    setConfirmConfig({ title, message, confirmLabel, confirmColor, onConfirm });
    setConfirmVisible(true);
  };

  useFocusEffect(useCallback(() => { loadCart(); loadClaimedVouchers(); }, []));
  useEffect(() => { loadCart(); }, []);

  const loadCart = async () => {
    try { setCartItems(await loadCartAsync()); }
    catch (err) { console.error('Error loading cart:', err); setCartItems([]); }
  };

  const saveCart = (items: CartItem[]) => {
    setCartItems(items);
    try { saveCartItemsSync(items); }
    catch (err) { console.error('Error saving cart:', err); }
  };

  const loadClaimedVouchers = async () => {
    try {
      const token = await getItem('authToken');
      if (!token) { setClaimedVouchers([]); setSelectedVoucherId(null); return; }
      const headers = { Authorization: `Bearer ${token}` };
      const [allVouchersRes, claimedRes] = await Promise.all([
        axios.get(`${resolvedApiUrl}/vouchers`),
        axios.get(`${resolvedApiUrl}/my/vouchers/claimed`, { headers }),
      ]);
      const claimedSet = new Set<string>((claimedRes.data?.voucherIds || []).map((id: string) => String(id)));
      const claimed    = (allVouchersRes.data?.vouchers || []).filter((v: VoucherItem) => claimedSet.has(String(v._id)));
      setClaimedVouchers(claimed);
      setSelectedVoucherId((prev) => {
        if (prev && claimed.some((v: VoucherItem) => v._id === prev)) return prev;
        return claimed.length ? claimed[0]._id : null;
      });
    } catch (err) {
      console.error('Error loading vouchers:', err);
      setClaimedVouchers([]); setSelectedVoucherId(null);
    }
  };

  const selectedVoucher = claimedVouchers.find((v) => v._id === selectedVoucherId) || null;

  const handleIncreaseQty = (id: string) =>
    saveCart(cartItems.map(i => i._id === id ? { ...i, quantity: i.quantity + 1 } : i));
  const handleDecreaseQty = (id: string) =>
    saveCart(cartItems.map(i => i._id === id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i));
  const handleRemoveItem  = (id: string) =>
    showConfirm('Remove Unit', 'Remove this unit from your cart?', 'REMOVE', C.danger,
      () => { saveCart(cartItems.filter(i => i._id !== id)); setConfirmVisible(false); });
  const handleClearCart   = () =>
    showConfirm('Purge Cart', 'Remove all units from your cart?', 'PURGE ALL', C.danger,
      () => { saveCart([]); setConfirmVisible(false); });

  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tax      = subtotal * 0.1;
  const shipping = cartItems.length > 0 ? 150 : 0;

  const computeVoucherDiscount = (voucher: VoucherItem | null) => {
    if (!voucher) return 0;
    if (voucher.category === 'free-shipping') return shipping;
    const text = `${voucher.leftValue || ''} ${voucher.label || ''}`;
    const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
    const amountMatch  = text.match(/(\d+(?:\.\d+)?)/);
    if (percentMatch) {
      const pct = Number(percentMatch[1]);
      if (!Number.isNaN(pct)) return (subtotal + tax + shipping) * (pct / 100);
    }
    if (amountMatch) {
      const amt = Number(amountMatch[1]);
      if (!Number.isNaN(amt)) return amt;
    }
    return 0;
  };

  const voucherDiscountRaw = computeVoucherDiscount(selectedVoucher);
  const voucherDiscount    = Math.min(voucherDiscountRaw, subtotal + tax + shipping);
  const total              = Math.max(0, subtotal + tax + shipping - voucherDiscount);

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    router.push({
      pathname: '/(user)/checkout',
      params: {
        cartTotal:       total.toString(),
        voucherId:       selectedVoucher?._id || '',
        voucherCode:     selectedVoucher?.code || '',
        voucherDiscount: voucherDiscount.toFixed(2),
      },
    });
  };

  /* ── Empty State ── */
  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <ThemedConfirm
          visible={confirmVisible} title={confirmConfig.title}
          message={confirmConfig.message} confirmLabel={confirmConfig.confirmLabel}
          confirmColor={confirmConfig.confirmColor} onConfirm={confirmConfig.onConfirm}
          onCancel={() => setConfirmVisible(false)}
        />
        {/* Header */}
        <View style={s.pageHeader}>
          <View style={s.pageHeaderLeft}>
            <View style={s.pageHeaderTick} />
            <View>
              <Text style={s.pageTitle}>CART</Text>
              <Text style={s.pageSubtitle}>UNIT INVENTORY</Text>
            </View>
          </View>
          <View style={s.cartBadge}>
            <MaterialCommunityIcons name="cart-outline" size={16} color={C.accent} />
            <Text style={s.cartBadgeText}>0</Text>
          </View>
        </View>

        <View style={s.emptyContainer}>
          <View style={s.emptyIconWrap}>
            <MaterialCommunityIcons name="cart-outline" size={36} color={C.textDim} />
          </View>
          <Text style={s.emptyTitle}>CART IS EMPTY</Text>
          <Text style={s.emptyText}>No units queued for checkout</Text>
          <TouchableOpacity style={s.browseBtn} onPress={() => router.push('/(tabs)')} activeOpacity={0.85}>
            <View style={s.browseBtnScan} />
            <Feather name="zap" size={14} color={C.bg} style={{ marginRight: 8 }} />
            <Text style={s.browseBtnText}>BROWSE INVENTORY</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ThemedConfirm
        visible={confirmVisible} title={confirmConfig.title}
        message={confirmConfig.message} confirmLabel={confirmConfig.confirmLabel}
        confirmColor={confirmConfig.confirmColor} onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmVisible(false)}
      />

      {/* ══════════════════════════════════
          PAGE HEADER
      ══════════════════════════════════ */}
      <View style={s.pageHeader}>
        <TouchableOpacity 
          style={s.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Feather name="chevron-left" size={20} color={C.accent} />
        </TouchableOpacity>
        <View style={s.pageHeaderLeft}>
          <View style={s.pageHeaderTick} />
          <View>
            <Text style={s.pageTitle}>CART</Text>
            <Text style={s.pageSubtitle}>UNIT INVENTORY</Text>
          </View>
        </View>
        <View style={s.cartBadge}>
          <MaterialCommunityIcons name="cart-outline" size={16} color={C.accent} />
          <Text style={s.cartBadgeText}>{cartItems.length}</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

        {/* ══════════════════════════════════
            CART ITEMS
        ══════════════════════════════════ */}
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

        {/* ══════════════════════════════════
            VOUCHERS
        ══════════════════════════════════ */}
        <View style={s.panelCard}>
          {/* Corner accents */}
          <View style={s.panelTL} /><View style={s.panelTR} />

          <View style={s.panelHeader}>
            <View style={s.panelIconWrap}>
              <MaterialCommunityIcons name="ticket-percent-outline" size={15} color={C.accent} />
            </View>
            <View style={s.panelTitleBlock}>
              <View style={s.panelTick} />
              <Text style={s.panelTitle}>VOUCHER CODES</Text>
            </View>
          </View>

          <View style={s.panelDivider} />

          {!claimedVouchers.length ? (
            <Text style={s.voucherEmptyText}>No voucher codes claimed yet. Visit the Vouchers page.</Text>
          ) : (
            <View style={s.voucherList}>
              {claimedVouchers.map((voucher) => {
                const active = voucher._id === selectedVoucherId;
                return (
                  <TouchableOpacity
                    key={voucher._id}
                    style={[s.voucherChip, active && s.voucherChipActive]}
                    onPress={() => setSelectedVoucherId(voucher._id)}
                    activeOpacity={0.85}
                  >
                    {active && <View style={s.voucherChipRail} />}
                    <View style={{ flex: 1 }}>
                      <Text style={[s.voucherCode, active && s.voucherCodeActive]}>{voucher.code}</Text>
                      <Text style={s.voucherMeta}>{voucher.leftValue} · {voucher.validText}</Text>
                    </View>
                    <View style={[s.voucherApplyBadge, active && s.voucherApplyBadgeActive]}>
                      <Text style={[s.voucherApplyText, active && s.voucherApplyTextActive]}>
                        {active ? 'ACTIVE' : 'APPLY'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ══════════════════════════════════
            ORDER SUMMARY
        ══════════════════════════════════ */}
        <View style={s.panelCard}>
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
            <Text style={s.summaryValue}>₱{subtotal.toFixed(2)}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>TAX (10%)</Text>
            <Text style={s.summaryValue}>₱{tax.toFixed(2)}</Text>
          </View>
          <View style={s.summaryRow}>
            <View style={s.shippingLabelRow}>
              <Text style={s.summaryLabel}>SHIPPING</Text>
              <View style={s.flatRateBadge}>
                <Text style={s.flatRateText}>FLAT</Text>
              </View>
            </View>
            <Text style={s.summaryValue}>₱{shipping.toFixed(2)}</Text>
          </View>

          {voucherDiscount > 0 && (
            <View style={s.summaryRow}>
              <Text style={s.discountLabel}>
                DISCOUNT{selectedVoucher ? ` · ${selectedVoucher.code}` : ''}
              </Text>
              <Text style={s.discountValue}>-₱{voucherDiscount.toFixed(2)}</Text>
            </View>
          )}

          <View style={s.panelDivider} />

          <View style={s.summaryRow}>
            <Text style={s.totalLabel}>TOTAL</Text>
            <Text style={s.totalValue}>₱{total.toFixed(2)}</Text>
          </View>
        </View>

        {/* ══════════════════════════════════
            CHECKOUT BUTTON
        ══════════════════════════════════ */}
        <TouchableOpacity style={s.checkoutBtn} onPress={handleCheckout} activeOpacity={0.85}>
          <View style={s.checkoutBtnScan} />
          <MaterialCommunityIcons name="lock-outline" size={16} color={C.bg} style={{ marginRight: 8 }} />
          <Text style={s.checkoutBtnText}>PROCEED TO CHECKOUT</Text>
          <Feather name="arrow-right" size={15} color={C.bg} style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        {/* Secondary buttons */}
        <View style={s.secondaryBtns}>
          <TouchableOpacity style={s.continueBtn} onPress={() => router.push('/(tabs)')} activeOpacity={0.85}>
            <Feather name="arrow-left" size={13} color={C.accent} />
            <Text style={s.continueBtnText}>BROWSE MORE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.clearBtn} onPress={handleClearCart} activeOpacity={0.85}>
            <Feather name="trash-2" size={13} color={C.danger} />
            <Text style={s.clearBtnText}>PURGE CART</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─────────────────────────────────────────
   Cart Item Card
───────────────────────────────────────── */
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
      {/* Left accent rail */}
      <View style={s.cardRail} />

      {/* Image */}
      <View style={s.itemImageWrap}>
        {imgUrl ? (
          <Image source={{ uri: imgUrl }} style={s.itemImage} resizeMode="cover" />
        ) : (
          <View style={s.itemImagePlaceholder}>
            <MaterialCommunityIcons name="robot-outline" size={26} color={C.textDim} />
          </View>
        )}
        {/* Scan line on image */}
        <View style={s.imgScanLine} />
      </View>

      {/* Info */}
      <View style={s.itemInfo}>
        <Text style={s.itemName} numberOfLines={2}>{item.name}</Text>
        <Text style={s.itemUnitPrice}>₱{item.price.toFixed(2)} / unit</Text>
        <View style={s.qtyRow}>
          <TouchableOpacity style={s.qtyBtn} onPress={onDecreaseQty}>
            <Feather name="minus" size={12}
              color={item.quantity <= 1 ? C.textDim : C.accentText} />
          </TouchableOpacity>
          <View style={s.qtyDisplay}>
            <Text style={s.qtyText}>{item.quantity}</Text>
          </View>
          <TouchableOpacity style={s.qtyBtn} onPress={onIncreaseQty}>
            <Feather name="plus" size={12} color={C.accentText} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Total & Remove */}
      <View style={s.itemRight}>
        <Text style={s.itemTotal}>₱{itemTotal.toFixed(2)}</Text>
        <TouchableOpacity style={s.removeBtn} onPress={onRemove} activeOpacity={0.8}>
          <Feather name="trash-2" size={13} color={C.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

/* ─────────────────────────────────────────
   Styles
───────────────────────────────────────── */
const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: C.bg },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingBottom: 16 },

  /* Page Header */
  pageHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingTop: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.bgLayer,
  },
  pageHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn:        { width: 36, height: 36, borderRadius: 8, backgroundColor: C.accentGlow, borderWidth: 1, borderColor: C.borderBright, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  pageHeaderTick: { width: 3, height: 28, borderRadius: 2, backgroundColor: C.accent },
  pageTitle: {
    fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: 3,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  pageSubtitle: {
    fontSize: 8, color: C.textDim, letterSpacing: 2, marginTop: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  cartBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.accentGlow,
    borderWidth: 1, borderColor: C.borderBright,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  cartBadgeText: {
    fontSize: 13, fontWeight: '800', color: C.accent,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  /* Empty State */
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80, gap: 10 },
  emptyIconWrap: {
    width: 88, height: 88, borderRadius: 22,
    backgroundColor: C.accentGlow, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 16, fontWeight: '800', color: C.textSub, letterSpacing: 2.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  emptyText: {
    fontSize: 11, color: C.textDim, textAlign: 'center', letterSpacing: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  browseBtn: {
    flexDirection: 'row', alignItems: 'center', marginTop: 10,
    backgroundColor: C.accent, paddingHorizontal: 22, paddingVertical: 13,
    borderRadius: 10, overflow: 'hidden',
    shadowColor: C.accent, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 14, elevation: 8,
  },
  browseBtnScan: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.25)' },
  browseBtnText: {
    color: C.bg, fontWeight: '800', fontSize: 12, letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  /* Cart Item Card */
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 12, marginBottom: 10,
    overflow: 'hidden',
  },
  cardRail: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 3, backgroundColor: C.accentDim,
    borderTopLeftRadius: 14, borderBottomLeftRadius: 14,
  },
  itemImageWrap: { marginRight: 12, marginLeft: 6 },
  itemImage:     { width: 76, height: 76, borderRadius: 10, backgroundColor: C.bgLayer },
  itemImagePlaceholder: {
    width: 76, height: 76, borderRadius: 10,
    backgroundColor: C.bgLayer, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  imgScanLine: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 2, backgroundColor: C.accent, opacity: 0.3,
    borderBottomLeftRadius: 10, borderBottomRightRadius: 10,
  },
  itemInfo:      { flex: 1 },
  itemName: {
    fontSize: 13, fontWeight: '700', color: C.text,
    marginBottom: 3, lineHeight: 18,
  },
  itemUnitPrice: {
    fontSize: 11, color: C.accentText, fontWeight: '600', marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  qtyRow:    { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 7,
    backgroundColor: C.bgLayer, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyDisplay: {
    width: 36, height: 28, marginHorizontal: 6, borderRadius: 7,
    backgroundColor: C.accentGlow, borderWidth: 1, borderColor: C.borderBright,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyText: {
    fontSize: 13, fontWeight: '800', color: C.accent,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  itemRight:  { alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch', marginLeft: 10, paddingVertical: 2 },
  itemTotal: {
    fontSize: 14, fontWeight: '800', color: C.accentText,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  removeBtn: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: C.dangerBg, borderWidth: 1, borderColor: C.dangerBorder,
    alignItems: 'center', justifyContent: 'center',
  },

  /* Panel Card (vouchers + summary) */
  panelCard: {
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 16, padding: 18,
    marginBottom: 14, marginTop: 4,
  },
  panelTL: { position: 'absolute', top: -1, left: -1,  width: 14, height: 14, borderTopWidth: 1.5,    borderLeftWidth: 1.5,  borderColor: C.accent, borderTopLeftRadius: 16 },
  panelTR: { position: 'absolute', top: -1, right: -1, width: 14, height: 14, borderTopWidth: 1.5,    borderRightWidth: 1.5, borderColor: C.accent, borderTopRightRadius: 16 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  panelIconWrap: {
    width: 34, height: 34, borderRadius: 9,
    backgroundColor: C.accentGlow, borderWidth: 1, borderColor: C.borderBright,
    alignItems: 'center', justifyContent: 'center',
  },
  panelTitleBlock: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  panelTick:       { width: 2.5, height: 12, borderRadius: 1.5, backgroundColor: C.accent },
  panelTitle: {
    fontSize: 12, fontWeight: '800', color: C.text, letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  panelDivider: { height: 1, backgroundColor: C.border, marginBottom: 14 },

  /* Voucher chips */
  voucherList:         { gap: 10 },
  voucherChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 10, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.bgLayer, paddingHorizontal: 12, paddingVertical: 11,
    overflow: 'hidden',
  },
  voucherChipActive:   { borderColor: C.borderBright, backgroundColor: C.accentGlow },
  voucherChipRail:     { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: C.accent },
  voucherCode: {
    color: C.text, fontSize: 13, fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  voucherCodeActive:   { color: C.accentText },
  voucherMeta:         { marginTop: 3, color: C.textDim, fontSize: 10 },
  voucherApplyBadge: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surface,
  },
  voucherApplyBadgeActive: { borderColor: C.borderBright, backgroundColor: C.accentGlow },
  voucherApplyText: {
    color: C.textSub, fontSize: 9, fontWeight: '700', letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  voucherApplyTextActive: { color: C.accent },
  voucherEmptyText: { color: C.textDim, fontSize: 12, lineHeight: 18 },

  /* Summary rows */
  summaryRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  summaryLabel: {
    fontSize: 10, color: C.textSub, letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  summaryValue: {
    fontSize: 13, fontWeight: '700', color: C.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  discountLabel: {
    fontSize: 10, color: C.success, fontWeight: '700', letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  discountValue: {
    fontSize: 13, fontWeight: '800', color: C.success,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  shippingLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flatRateBadge: {
    backgroundColor: C.accentGlow, borderWidth: 1, borderColor: C.borderBright,
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  flatRateText: {
    fontSize: 8, color: C.accent, fontWeight: '700', letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  totalLabel: {
    fontSize: 14, fontWeight: '800', color: C.text, letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  totalValue: {
    fontSize: 22, fontWeight: '800', color: C.accent,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    shadowColor: C.accent, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 8,
  },

  /* Checkout Button */
  checkoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.accent, paddingVertical: 16, borderRadius: 12,
    marginBottom: 12, overflow: 'hidden',
    shadowColor: C.accent, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65, shadowRadius: 16, elevation: 10,
  },
  checkoutBtnScan: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 2, backgroundColor: 'rgba(255,255,255,0.25)',
  },
  checkoutBtnText: {
    color: C.bg, fontSize: 13, fontWeight: '800', letterSpacing: 2.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  /* Secondary Buttons */
  secondaryBtns: { flexDirection: 'row', gap: 10 },
  continueBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 13, borderRadius: 10, borderWidth: 1,
    borderColor: C.borderBright, backgroundColor: C.accentGlow,
  },
  continueBtnText: {
    color: C.accent, fontSize: 10, fontWeight: '700', letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  clearBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 13, borderRadius: 10, borderWidth: 1,
    borderColor: C.dangerBorder, backgroundColor: C.dangerBg,
  },
  clearBtnText: {
    color: C.danger, fontSize: 10, fontWeight: '700', letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
});