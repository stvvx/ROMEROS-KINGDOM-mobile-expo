import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import axios from 'axios';
import Constants from 'expo-constants';
import { useFocusEffect, Stack } from 'expo-router';

import { getItem } from '@/utils/storage';

/* ── Types ── */
type VoucherCategory = 'free-shipping' | 'minimum-spend' | 'monthly-voucher';
type TabKey = VoucherCategory | 'all' | 'used';

interface VoucherItem {
  _id: string;
  code: string;
  category: VoucherCategory;
  badge: string;
  label: string;
  description: string;
  validText: string;
  leftValue: string;
  rightTag?: string;
  month?: number;
}

/* ── Design tokens ── */
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
  purple:     '#c0000a',
  purpleBg:   'rgba(192,0,10,0.10)',
} as const;

/* ── Category config ── */
const CATEGORY_CONFIG: Record<VoucherCategory, {
  icon: string; color: string; bg: string; label: string;
}> = {
  'free-shipping':   { icon: '🚚', color: C.info,    bg: C.infoBg,    label: 'Free Shipping'    },
  'minimum-spend':   { icon: '💰', color: C.warning, bg: C.warningBg, label: 'Minimum Spend'    },
  'monthly-voucher': { icon: '🎁', color: C.mint,    bg: C.successBg, label: 'Monthly Vouchers' },
};

/* ── Months ── */
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const CURRENT_MONTH           = new Date().getMonth() + 1;
const CLAIMABLE_MONTHLY_MONTH = CURRENT_MONTH + 1;

function getMonthlyLockReason(month?: number | null): string | null {
  if (month === undefined || month === null) return 'Not yet available';
  if (month < CURRENT_MONTH)                return 'Expired';
  if (month === CURRENT_MONTH)              return 'This month has passed';
  if (month === CLAIMABLE_MONTHLY_MONTH)    return null;
  return 'Not yet available';
}

/* ── API setup ── */
let API_URL =
  process.env.NGROK_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:4000/api/v1';

const manifest: any = (Constants as any).manifest || (Constants as any).expoConfig;
const debuggerHost = manifest?.debuggerHost?.split(':')[0];
if (debuggerHost && debuggerHost !== 'localhost') {
  API_URL = API_URL.replace('localhost', debuggerHost);
} else if (Platform.OS === 'android' && API_URL.includes('localhost')) {
  API_URL = API_URL.replace('localhost', '10.0.2.2');
}
API_URL = API_URL.trim().replace(/\/+$/, '');
if (!API_URL.endsWith('/api/v1')) API_URL = `${API_URL}/api/v1`;

/* ==============================================
   USED VOUCHER CARD
============================================== */
const UsedVoucherCard = ({ voucher }: { voucher: VoucherItem }) => {
  const catCfg = CATEGORY_CONFIG[voucher.category];
  return (
    <View style={styles.usedCard}>
      <View style={styles.usedCardLeft}>
        {voucher.category === 'monthly-voucher' && voucher.month && (
          <Text style={styles.monthLabel}>{MONTHS[voucher.month - 1]}</Text>
        )}
        <Text style={styles.usedLeftValue}>{voucher.leftValue}</Text>
        <View style={styles.usedStamp}>
          <Text style={styles.usedStampText}>USED</Text>
        </View>
      </View>

      <View style={styles.cardRight}>
        <View style={styles.badgeRow}>
          <View style={[styles.badgeChip, { backgroundColor: catCfg.bg, borderColor: catCfg.color }]}>
            <Text style={[styles.badgeChipText, { color: catCfg.color }]}>{voucher.badge}</Text>
          </View>
          {!!voucher.label && (
            <Text style={styles.rightTagInline} numberOfLines={1}>{voucher.label}</Text>
          )}
        </View>
        <Text style={[styles.description, { color: C.textSub }]} numberOfLines={2}>
          {voucher.description}
        </Text>
        <View style={styles.innerDivider} />
        <Text style={styles.usedCodeValue}>{voucher.code}</Text>
        <View style={styles.cardBottom}>
          <View style={styles.statusRow}>
            <Text style={{ fontSize: 11 }}>✦</Text>
            <Text style={[styles.statusLabel, { color: C.accent }]}>Fully Redeemed</Text>
          </View>
        </View>
      </View>

      <View style={[styles.corner, styles.cornerTL, { backgroundColor: C.accent }]} />
      <View style={[styles.corner, styles.cornerBR, { backgroundColor: C.accent }]} />
    </View>
  );
};

/* ==============================================
   VOUCHER CARD (active/locked)
============================================== */
const VoucherCard = ({
  voucher, claimed, redeemed, isClaiming, onClaim,
}: {
  voucher: VoucherItem;
  claimed: boolean;
  redeemed: boolean;
  isClaiming: boolean;
  onClaim: () => void;
}) => {
  const scale  = useRef(new Animated.Value(1)).current;
  const catCfg = CATEGORY_CONFIG[voucher.category];

  const pressIn  = () => Animated.spring(scale, { toValue: 0.977, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,     useNativeDriver: true }).start();

  const monthlyLockReason =
    voucher.category === 'monthly-voucher' ? getMonthlyLockReason(voucher.month) : null;
  const isLocked    = !!monthlyLockReason;
  const btnDisabled = claimed || redeemed || isClaiming || isLocked;

  const statusColor = redeemed ? C.accent : claimed ? C.mint : isLocked ? C.textSub : C.warning;
  const statusLabel = redeemed ? 'Redeemed' : claimed ? 'Claimed' : isLocked ? monthlyLockReason! : 'Not Claimed';
  const statusIcon  = redeemed ? '✦' : claimed ? '✓' : isLocked ? '🔒' : '◌';
  const btnLabel    = isClaiming ? '' : redeemed ? 'Redeemed' : claimed ? 'Claimed' : isLocked ? 'Locked' : 'Claim';

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={[styles.card, isLocked && styles.cardLocked]}
        android_ripple={{ color: 'rgba(128,0,7,0.06)' }}
      >
        <View style={[styles.cardLeft, { borderRightColor: C.border }]}>
          {voucher.category === 'monthly-voucher' && voucher.month && (
            <Text style={styles.monthLabel}>{MONTHS[voucher.month - 1]}</Text>
          )}
          <Text style={[styles.leftValue, isLocked && { color: C.textSub }]}>
            {voucher.leftValue}
          </Text>
          {!!voucher.rightTag && (
            <View style={styles.multiTag}>
              <Text style={[styles.multiTagText, isLocked && { color: C.textSub }]}>
                {voucher.rightTag}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardRight}>
          <View style={styles.badgeRow}>
            <View style={[styles.badgeChip, { backgroundColor: catCfg.bg, borderColor: catCfg.color }]}>
              <Text style={[styles.badgeChipText, { color: catCfg.color }]}>{voucher.badge}</Text>
            </View>
            {!!voucher.label && (
              <Text style={styles.rightTagInline} numberOfLines={1}>{voucher.label}</Text>
            )}
          </View>

          <Text style={[styles.description, isLocked && { color: C.textDim }]} numberOfLines={2}>
            {voucher.description}
          </Text>
          <Text style={styles.validity}>{voucher.validText}</Text>
          <View style={styles.innerDivider} />
          <Text style={[styles.codeValue, isLocked && { color: C.textSub }]}>
            {voucher.code}
          </Text>

          <View style={styles.cardBottom}>
            <View style={styles.statusRow}>
              <Text style={{ fontSize: 11 }}>{statusIcon}</Text>
              <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
            </View>
            <Pressable
              disabled={btnDisabled}
              onPress={onClaim}
              style={[styles.claimBtn, btnDisabled && styles.claimBtnDisabled]}
              android_ripple={{ color: 'rgba(0,0,0,0.15)' }}
            >
              {isClaiming ? (
                <ActivityIndicator size="small" color={C.text} />
              ) : (
                <Text style={[styles.claimBtnText, btnDisabled && styles.claimBtnTextDisabled]}>
                  {btnLabel}
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        {!isLocked && (
          <>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </>
        )}
      </Pressable>
    </Animated.View>
  );
};

/* ==============================================
   CATEGORY SECTION
============================================== */
const CategorySection = ({
  category, vouchers, claimedIds, redeemedIds, claimingId, onClaim,
}: {
  category: VoucherCategory;
  vouchers: VoucherItem[];
  claimedIds: Set<string>;
  redeemedIds: Set<string>;
  claimingId: string | null;
  onClaim: (id: string) => void;
}) => {
  const cfg = CATEGORY_CONFIG[category];
  const claimableCount = vouchers.filter(v => {
    if (claimedIds.has(v._id) || redeemedIds.has(v._id)) return false;
    if (v.category === 'monthly-voucher' && getMonthlyLockReason(v.month) !== null) return false;
    return true;
  }).length;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={{ fontSize: 16 }}>{cfg.icon}</Text>
          <Text style={styles.sectionTitle}>{cfg.label}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{vouchers.length}</Text>
          </View>
        </View>
        {claimableCount > 0 && (
          <View style={[styles.claimableTag, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
            <Text style={[styles.claimableTagText, { color: cfg.color }]}>
              {claimableCount} available
            </Text>
          </View>
        )}
      </View>
      {vouchers.map(v => (
        <VoucherCard
          key={v._id}
          voucher={v}
          claimed={claimedIds.has(v._id)}
          redeemed={redeemedIds.has(v._id)}
          isClaiming={claimingId === v._id}
          onClaim={() => onClaim(v._id)}
        />
      ))}
    </View>
  );
};

/* ==============================================
   USED TAB VIEW
============================================== */
const UsedTabView = ({ vouchers, redeemedIds }: { vouchers: VoucherItem[]; redeemedIds: Set<string> }) => {
  const usedVouchers = vouchers.filter(v => redeemedIds.has(v._id));

  if (usedVouchers.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>🎫</Text>
        <Text style={styles.emptyTitle}>No used vouchers yet</Text>
        <Text style={styles.emptyText}>Vouchers you've redeemed at checkout will appear here.</Text>
      </View>
    );
  }

  const grouped: Partial<Record<VoucherCategory, VoucherItem[]>> = {};
  for (const v of usedVouchers) {
    if (!grouped[v.category]) grouped[v.category] = [];
    grouped[v.category]!.push(v);
  }

  const categoryOrder: VoucherCategory[] = ['free-shipping', 'minimum-spend', 'monthly-voucher'];

  return (
    <>
      <View style={styles.usedBanner}>
        <Text style={{ fontSize: 20 }}>✦</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.usedBannerTitle}>
            {usedVouchers.length} voucher{usedVouchers.length !== 1 ? 's' : ''} used
          </Text>
          <Text style={styles.usedBannerSub}>
            These vouchers have been fully redeemed and can no longer be used.
          </Text>
        </View>
      </View>
      {categoryOrder.map(cat => {
        const items = grouped[cat];
        if (!items?.length) return null;
        const cfg = CATEGORY_CONFIG[cat];
        return (
          <View key={cat} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Text style={{ fontSize: 16 }}>{cfg.icon}</Text>
                <Text style={styles.sectionTitle}>{cfg.label}</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{items.length}</Text>
                </View>
              </View>
            </View>
            {items.map(v => <UsedVoucherCard key={v._id} voucher={v} />)}
          </View>
        );
      })}
    </>
  );
};

/* ==============================================
   MAIN SCREEN
============================================== */
const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'all',             label: 'All',        icon: '🏷️' },
  { key: 'free-shipping',   label: 'Shipping',   icon: '🚚' },
  { key: 'minimum-spend',   label: 'Min. Spend', icon: '💰' },
  { key: 'monthly-voucher', label: 'Monthly',    icon: '🎁' },
  { key: 'used',            label: 'Used',       icon: '✦'  },
];

export default function UserVouchersScreen() {
  const [vouchers,    setVouchers]    = useState<VoucherItem[]>([]);
  const [claimedIds,  setClaimedIds]  = useState<Set<string>>(new Set());
  const [redeemedIds, setRedeemedIds] = useState<Set<string>>(new Set());
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [claimingId,  setClaimingId]  = useState<string | null>(null);
  const [activeTab,   setActiveTab]   = useState<TabKey>('all');

  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, []);

  const loadVouchers = async (isPullToRefresh = false) => {
    try {
      isPullToRefresh ? setRefreshing(true) : setLoading(true);
      const [allRes, token] = await Promise.all([
        axios.get(`${API_URL}/vouchers`),
        getItem('authToken'),
      ]);
      setVouchers(allRes.data?.vouchers || []);
      if (token) {
        const headers = { Authorization: `Bearer ${token}` };
        const claimedRes = await axios.get(`${API_URL}/my/vouchers/claimed`, { headers });
        setClaimedIds(new Set((claimedRes.data?.voucherIds || []).map(String)));
        setRedeemedIds(new Set((claimedRes.data?.redeemedVoucherIds || []).map(String)));
      } else {
        setClaimedIds(new Set());
        setRedeemedIds(new Set());
      }
    } catch (e: any) {
      Alert.alert('Could not load vouchers', e?.response?.data?.message || 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadVouchers(); }, []));

  const claimVoucher = async (voucherId: string) => {
    const token = await getItem('authToken');
    if (!token) { Alert.alert('Login required', 'Please sign in to claim vouchers.'); return; }
    try {
      setClaimingId(voucherId);
      const res = await axios.post(
        `${API_URL}/voucher/${voucherId}/claim`, {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setClaimedIds(prev => { const n = new Set(prev); n.add(voucherId); return n; });
      setRedeemedIds(prev => { const n = new Set(prev); n.delete(voucherId); return n; });
      Alert.alert('Voucher claimed! 🎉', res.data?.message || 'Enjoy your discount.');
    } catch (e: any) {
      Alert.alert('Claim failed', e?.response?.data?.message || 'Could not claim voucher.');
    } finally {
      setClaimingId(null);
    }
  };

  const grouped = useMemo(() => {
    const base = activeTab === 'all' || activeTab === 'used'
      ? vouchers
      : vouchers.filter(v => v.category === activeTab);
    const map: Partial<Record<VoucherCategory, VoucherItem[]>> = {};
    for (const v of base) {
      if (!map[v.category]) map[v.category] = [];
      map[v.category]!.push(v);
    }
    if (map['monthly-voucher']) {
      map['monthly-voucher'].sort((a, b) => (a.month ?? 0) - (b.month ?? 0));
    }
    return map;
  }, [vouchers, activeTab]);

  const categoryOrder: VoucherCategory[] = ['free-shipping', 'minimum-spend', 'monthly-voucher'];

  const stats = {
    total:    vouchers.length,
    claimed:  claimedIds.size,
    redeemed: redeemedIds.size,
    available: vouchers.filter(v => {
      if (claimedIds.has(v._id) || redeemedIds.has(v._id)) return false;
      if (v.category === 'monthly-voucher' && getMonthlyLockReason(v.month) !== null) return false;
      return true;
    }).length,
  };

  function tabCount(key: TabKey): number {
    if (key === 'all')  return vouchers.length;
    if (key === 'used') return redeemedIds.size;
    return vouchers.filter(v => v.category === key).length;
  }

  const showMonthlyNote =
    (activeTab === 'all' || activeTab === 'monthly-voucher') &&
    !!grouped['monthly-voucher']?.length;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* HEADER */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <Text style={styles.eyebrow}>◈ DRIFT N' DASH</Text>
        <Text style={styles.title}>My Vouchers</Text>
        <Text style={styles.subtitle}>Claim exclusive deals and save on your next order.</Text>

        {!loading && (
          <View style={styles.pillRow}>
            {[
              { label: 'Available', value: stats.available, accent: true  },
              { label: 'Claimed',   value: stats.claimed                  },
              { label: 'Used',      value: stats.redeemed,  purple: true  },
              { label: 'Total',     value: stats.total                    },
            ].map(p => (
              <View key={p.label} style={styles.pill}>
                <Text style={[
                  styles.pillValue,
                  p.accent && { color: C.mint },
                  p.purple && { color: C.accent },
                ]}>
                  {p.value}
                </Text>
                <Text style={styles.pillLabel}>{p.label}</Text>
              </View>
            ))}
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
          style={styles.tabBar}
        >
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            const count    = tabCount(tab.key);
            const isUsed   = tab.key === 'used';
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, isActive && styles.tabActive, isActive && isUsed && styles.tabActiveUsed]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={{ fontSize: 13 }}>{tab.icon}</Text>
                <Text style={[
                  styles.tabText,
                  isActive && styles.tabTextActive,
                  isActive && isUsed && { color: C.accentText },
                ]}>
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View style={[
                    styles.tabBadge,
                    isActive && styles.tabBadgeActive,
                    isActive && isUsed && { backgroundColor: C.accent, borderColor: C.accent },
                  ]}>
                    <Text style={[styles.tabBadgeTxt, isActive && styles.tabBadgeTxtActive]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* CONTENT */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={styles.loadingText}>Loading your vouchers...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadVouchers(true)}
              tintColor={C.accent}
              colors={[C.accent]}
            />
          }
        >
          {activeTab === 'used' && (
            <UsedTabView vouchers={vouchers} redeemedIds={redeemedIds} />
          )}

          {activeTab !== 'used' && (
            <>
              {showMonthlyNote && (
                <View style={styles.noteBox}>
                  <Text style={styles.noteIcon}>i</Text>
                  <Text style={styles.noteText}>
                    Monthly vouchers unlock one at a time. Only the{' '}
                    <Text style={{ color: C.mint, fontWeight: '700' }}>April</Text> voucher
                    is claimable right now. Past months are expired; future months are not yet available.
                  </Text>
                </View>
              )}

              {categoryOrder.map(cat => {
                const items = grouped[cat];
                if (!items?.length) return null;
                return (
                  <CategorySection
                    key={cat}
                    category={cat}
                    vouchers={items}
                    claimedIds={claimedIds}
                    redeemedIds={redeemedIds}
                    claimingId={claimingId}
                    onClaim={claimVoucher}
                  />
                );
              })}

              {vouchers.length === 0 && (
                <View style={styles.emptyBox}>
                  <Text style={{ fontSize: 48, marginBottom: 12 }}>🏷️</Text>
                  <Text style={styles.emptyTitle}>No vouchers yet</Text>
                  <Text style={styles.emptyText}>Check back soon — exclusive deals are on their way.</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

/* ==============================================
   STYLES
============================================== */
const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingText: { color: C.textSub, fontSize: 14 },

  header: {
    backgroundColor: C.bgLayer,
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingHorizontal: 20,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  eyebrow:  { color: C.accent, fontSize: 10, letterSpacing: 3, fontWeight: '700', marginBottom: 4 },
  title:    { color: C.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: C.textSub, fontSize: 13, marginTop: 4, marginBottom: 14, lineHeight: 18 },

  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  pill:    { flex: 1, backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 10, alignItems: 'center' },
  pillValue: { color: C.accent, fontSize: 15, fontWeight: '800' },
  pillLabel: { color: C.textSub, fontSize: 9, marginTop: 3, textAlign: 'center' },

  tabBar:        { marginHorizontal: -20 },
  tabBarContent: { paddingHorizontal: 20, gap: 4 },
  tab:           { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabActive:     { borderBottomColor: C.accent },
  tabActiveUsed: { borderBottomColor: C.accentText },
  tabText:       { color: C.textSub, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: C.accentText, fontWeight: '700' },
  tabBadge:      { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  tabBadgeActive:    { backgroundColor: C.accent, borderColor: C.accent },
  tabBadgeTxt:       { color: C.textSub, fontSize: 9, fontWeight: '800' },
  tabBadgeTxtActive: { color: C.text },

  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 60, gap: 4 },

  section:           { marginBottom: 20 },
  sectionHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle:      { color: C.text, fontSize: 16, fontWeight: '800' },
  countBadge:        { backgroundColor: C.surface, borderRadius: 8, borderWidth: 1, borderColor: C.border, paddingHorizontal: 7, paddingVertical: 2 },
  countBadgeText:    { color: C.textSub, fontSize: 11, fontWeight: '700' },
  claimableTag:      { borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  claimableTagText:  { fontSize: 11, fontWeight: '700' },

  card:     { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 10 },
  cardLocked: { opacity: 0.52 },

  usedCard:     { flexDirection: 'row', backgroundColor: C.bgLayer, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(128,0,7,0.3)', overflow: 'hidden', marginBottom: 10 },
  usedCardLeft: { width: 88, justifyContent: 'center', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8, borderRightWidth: 1, borderStyle: 'dashed', borderRightColor: 'rgba(128,0,7,0.25)', gap: 6 },
  usedLeftValue:{ color: C.textSub, fontSize: 19, fontWeight: '900', textAlign: 'center', lineHeight: 23 },
  usedStamp:    { borderWidth: 1.5, borderColor: C.accent, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, transform: [{ rotate: '-12deg' }] },
  usedStampText:{ color: C.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  usedCodeValue:{ color: C.textSub, fontSize: 14, fontWeight: '900', letterSpacing: 2, marginBottom: 4, textDecorationLine: 'line-through', textDecorationColor: C.textSub },

  usedBanner:      { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.purpleBg, borderWidth: 1, borderColor: 'rgba(128,0,7,0.35)', borderRadius: 14, padding: 14, marginBottom: 16 },
  usedBannerTitle: { color: C.accent, fontSize: 14, fontWeight: '800' },
  usedBannerSub:   { color: C.textSub, fontSize: 12, marginTop: 2, lineHeight: 16 },

  cardLeft:   { width: 88, justifyContent: 'center', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8, borderRightWidth: 1, borderStyle: 'dashed', gap: 4 },
  monthLabel: { color: C.textSub, fontSize: 9, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2, textAlign: 'center' },
  leftValue:  { color: C.mint, fontSize: 19, fontWeight: '900', textAlign: 'center', lineHeight: 23 },
  multiTag:   { backgroundColor: 'rgba(128,0,7,0.12)', borderRadius: 8, borderWidth: 1, borderColor: C.accent, paddingHorizontal: 5, paddingVertical: 2, marginTop: 2 },
  multiTagText: { color: C.accentText, fontSize: 10, fontWeight: '800' },

  cardRight:      { flex: 1, paddingHorizontal: 12, paddingVertical: 12, gap: 3 },
  badgeRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' },
  badgeChip:      { borderRadius: 6, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3 },
  badgeChipText:  { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  rightTagInline: { color: C.textSub, fontSize: 11, flexShrink: 1 },
  description:    { color: C.text, fontSize: 12, lineHeight: 17 },
  validity:       { color: C.textSub, fontSize: 10, marginTop: 2 },

  innerDivider: { height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: C.border, marginVertical: 8 },

  codeValue: { color: C.accentText, fontSize: 14, fontWeight: '900', letterSpacing: 2, marginBottom: 4 },

  cardBottom:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 2 },
  statusRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  statusLabel: { fontSize: 11, fontWeight: '700', flexShrink: 1 },

  claimBtn:             { backgroundColor: C.accent, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, minWidth: 60, alignItems: 'center', justifyContent: 'center', shadowColor: C.accent, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 },
  claimBtnDisabled:     { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, shadowOpacity: 0, elevation: 0 },
  claimBtnText:         { color: C.text, fontSize: 11, fontWeight: '800' },
  claimBtnTextDisabled: { color: C.textSub, fontSize: 10 },

  corner:   { position: 'absolute', backgroundColor: C.accent, opacity: 0.4 },
  cornerTL: { top: 0, left: 0, width: 14, height: 1.5 },
  cornerBR: { bottom: 0, right: 0, width: 14, height: 1.5 },

  emptyBox:  { marginTop: 40, alignItems: 'center', gap: 8, paddingHorizontal: 20 },
  emptyTitle:{ color: C.text, fontSize: 18, fontWeight: '700' },
  emptyText: { color: C.textSub, textAlign: 'center', lineHeight: 20, fontSize: 13 },

  noteBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.successBg, borderWidth: 1, borderColor: C.mint, borderRadius: 12, padding: 12, marginBottom: 16 },
  noteIcon: { color: C.mint, fontSize: 12, fontWeight: '800', marginTop: 1 },
  noteText: { color: C.textSub, fontSize: 12, lineHeight: 18, flex: 1 },
});