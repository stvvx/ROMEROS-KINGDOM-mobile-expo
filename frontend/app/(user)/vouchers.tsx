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
import { useFocusEffect, Stack, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { getItem } from '@/utils/storage';

/* ─── Types ─── */
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

/* ─── Category config — vector icons ─── */
const CATEGORY_CONFIG: Record<VoucherCategory, {
  iconLib: 'mci' | 'feather' | 'ion';
  iconName: string;
  color: string;
  bg: string;
  border: string;
  label: string;
}> = {
  'free-shipping':   { iconLib: 'mci',     iconName: 'truck-delivery-outline', color: C.accent,  bg: C.accentGlow,  border: C.borderBright,    label: 'FREE SHIPPING'    },
  'minimum-spend':   { iconLib: 'mci',     iconName: 'cash-multiple',          color: C.warn,    bg: C.warnBg,      border: C.warnBorder,      label: 'MINIMUM SPEND'    },
  'monthly-voucher': { iconLib: 'feather', iconName: 'gift',                   color: C.success, bg: C.successBg,   border: C.successBorder,   label: 'MONTHLY VOUCHERS' },
};

function CatIcon({ category, size, color }: { category: VoucherCategory; size: number; color: string }) {
  const cfg = CATEGORY_CONFIG[category];
  if (cfg.iconLib === 'mci')     return <MaterialCommunityIcons name={cfg.iconName as any} size={size} color={color} />;
  if (cfg.iconLib === 'feather') return <Feather name={cfg.iconName as any} size={size} color={color} />;
  return <Ionicons name={cfg.iconName as any} size={size} color={color} />;
}

/* ─── Months ─── */
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const CURRENT_MONTH           = new Date().getMonth() + 1;
const CLAIMABLE_MONTHLY_MONTH = CURRENT_MONTH + 1;

function getMonthlyLockReason(month?: number | null): string | null {
  if (month === undefined || month === null) return 'Not yet available';
  if (month < CURRENT_MONTH)             return 'Expired';
  if (month === CURRENT_MONTH)           return 'This month has passed';
  if (month === CLAIMABLE_MONTHLY_MONTH) return null;
  return 'Not yet available';
}

/* ─── API setup ─── */
let API_URL =
  process.env.NGROK_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:4000/api/v1';

const manifest: any = (Constants as any).manifest || (Constants as any).expoConfig;
const debuggerHost  = manifest?.debuggerHost?.split(':')[0];
if (debuggerHost && debuggerHost !== 'localhost') {
  API_URL = API_URL.replace('localhost', debuggerHost);
} else if (Platform.OS === 'android' && API_URL.includes('localhost')) {
  API_URL = API_URL.replace('localhost', '10.0.2.2');
}
API_URL = API_URL.trim().replace(/\/+$/, '');
if (!API_URL.endsWith('/api/v1')) API_URL = `${API_URL}/api/v1`;

/* ══════════════════════════════════════════════
   USED VOUCHER CARD
══════════════════════════════════════════════ */
const UsedVoucherCard = ({ voucher }: { voucher: VoucherItem }) => {
  const catCfg = CATEGORY_CONFIG[voucher.category];
  return (
    <View style={s.usedCard}>
      {/* Left panel */}
      <View style={s.usedCardLeft}>
        <View style={[s.cardLeftIconWrap, { backgroundColor: catCfg.bg, borderColor: catCfg.border }]}>
          <CatIcon category={voucher.category} size={16} color={catCfg.color} />
        </View>
        {voucher.category === 'monthly-voucher' && voucher.month && (
          <Text style={s.monthLabel}>{MONTHS[voucher.month - 1].slice(0, 3).toUpperCase()}</Text>
        )}
        <Text style={s.usedLeftValue}>{voucher.leftValue}</Text>
        {/* USED stamp */}
        <View style={s.usedStamp}>
          <Text style={s.usedStampText}>USED</Text>
        </View>
      </View>

      {/* Right panel */}
      <View style={s.cardRight}>
        <View style={s.badgeRow}>
          <View style={[s.badgeChip, { backgroundColor: catCfg.bg, borderColor: catCfg.border }]}>
            <Text style={[s.badgeChipText, { color: catCfg.color }]}>{voucher.badge}</Text>
          </View>
          {!!voucher.label && (
            <Text style={s.rightTagInline} numberOfLines={1}>{voucher.label}</Text>
          )}
        </View>
        <Text style={[s.description, { color: C.textSub }]} numberOfLines={2}>
          {voucher.description}
        </Text>
        <View style={s.innerDivider} />
        <Text style={s.usedCodeValue}>{voucher.code}</Text>
        <View style={s.cardBottom}>
          <View style={s.statusRow}>
            <MaterialCommunityIcons name="check-circle-outline" size={12} color={C.success} />
            <Text style={[s.statusLabel, { color: C.success }]}>FULLY REDEEMED</Text>
          </View>
        </View>
      </View>

      <View style={s.cornerTL} /><View style={s.cornerBR} />
    </View>
  );
};

/* ══════════════════════════════════════════════
   VOUCHER CARD (active / locked)
══════════════════════════════════════════════ */
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

  const statusColor = redeemed ? C.success : claimed ? C.accent : isLocked ? C.textDim : C.warn;
  const statusLabel = redeemed ? 'REDEEMED' : claimed ? 'CLAIMED' : isLocked ? monthlyLockReason!.toUpperCase() : 'UNCLAIMED';

  const StatusIconEl = () => {
    if (redeemed)  return <MaterialCommunityIcons name="check-circle-outline" size={12} color={statusColor} />;
    if (claimed)   return <Feather name="check" size={11} color={statusColor} />;
    if (isLocked)  return <Feather name="lock" size={11} color={statusColor} />;
    return <Feather name="circle" size={11} color={statusColor} />;
  };

  const btnLabel = isClaiming ? '' : redeemed ? 'USED' : claimed ? 'CLAIMED' : isLocked ? 'LOCKED' : 'CLAIM';

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={[s.card, isLocked && s.cardLocked]}
        android_ripple={{ color: 'rgba(0,168,255,0.06)' }}
      >
        {/* Left panel */}
        <View style={[s.cardLeft, { borderRightColor: C.border }]}>
          <View style={[s.cardLeftIconWrap, { backgroundColor: catCfg.bg, borderColor: catCfg.border }]}>
            <CatIcon category={voucher.category} size={16} color={isLocked ? C.textDim : catCfg.color} />
          </View>
          {voucher.category === 'monthly-voucher' && voucher.month && (
            <Text style={s.monthLabel}>{MONTHS[voucher.month - 1].slice(0, 3).toUpperCase()}</Text>
          )}
          <Text style={[s.leftValue, isLocked && { color: C.textDim }]}>
            {voucher.leftValue}
          </Text>
          {!!voucher.rightTag && (
            <View style={[s.multiTag, { borderColor: isLocked ? C.border : C.borderBright }]}>
              <Text style={[s.multiTagText, isLocked && { color: C.textDim }]}>
                {voucher.rightTag}
              </Text>
            </View>
          )}
        </View>

        {/* Right panel */}
        <View style={s.cardRight}>
          <View style={s.badgeRow}>
            <View style={[s.badgeChip, { backgroundColor: catCfg.bg, borderColor: catCfg.border }]}>
              <Text style={[s.badgeChipText, { color: isLocked ? C.textDim : catCfg.color }]}>
                {voucher.badge}
              </Text>
            </View>
            {!!voucher.label && (
              <Text style={s.rightTagInline} numberOfLines={1}>{voucher.label}</Text>
            )}
          </View>

          <Text style={[s.description, isLocked && { color: C.textDim }]} numberOfLines={2}>
            {voucher.description}
          </Text>
          <Text style={s.validity}>{voucher.validText}</Text>
          <View style={s.innerDivider} />
          <Text style={[s.codeValue, isLocked && { color: C.textDim }]}>{voucher.code}</Text>

          <View style={s.cardBottom}>
            <View style={s.statusRow}>
              <StatusIconEl />
              <Text style={[s.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
            </View>
            <Pressable
              disabled={btnDisabled}
              onPress={onClaim}
              style={[s.claimBtn, btnDisabled && s.claimBtnDisabled]}
              android_ripple={{ color: 'rgba(0,0,0,0.15)' }}
            >
              {isClaiming ? (
                <ActivityIndicator size="small" color={C.bg} />
              ) : (
                <Text style={[s.claimBtnText, btnDisabled && s.claimBtnTextDisabled]}>
                  {btnLabel}
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        {!isLocked && (
          <>
            <View style={[s.cornerTL, { backgroundColor: catCfg.color }]} />
            <View style={[s.cornerBR, { backgroundColor: catCfg.color }]} />
          </>
        )}
      </Pressable>
    </Animated.View>
  );
};

/* ══════════════════════════════════════════════
   CATEGORY SECTION
══════════════════════════════════════════════ */
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
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <View style={s.sectionHeaderLeft}>
          {/* Icon badge */}
          <View style={[s.sectionIconWrap, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
            <CatIcon category={category} size={14} color={cfg.color} />
          </View>
          <View style={s.sectionTitleBlock}>
            <View style={[s.sectionTick, { backgroundColor: cfg.color }]} />
            <Text style={[s.sectionTitle, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <View style={s.countBadge}>
            <Text style={s.countBadgeText}>{vouchers.length}</Text>
          </View>
        </View>
        {claimableCount > 0 && (
          <View style={[s.claimableTag, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
            <Text style={[s.claimableTagText, { color: cfg.color }]}>
              {claimableCount} OPEN
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

/* ══════════════════════════════════════════════
   USED TAB VIEW
══════════════════════════════════════════════ */
const UsedTabView = ({ vouchers, redeemedIds }: { vouchers: VoucherItem[]; redeemedIds: Set<string> }) => {
  const usedVouchers = vouchers.filter(v => redeemedIds.has(v._id));

  if (usedVouchers.length === 0) {
    return (
      <View style={s.emptyBox}>
        <View style={s.emptyIconWrap}>
          <Feather name="tag" size={32} color={C.textDim} />
        </View>
        <Text style={s.emptyTitle}>NO USED VOUCHERS</Text>
        <Text style={s.emptyText}>Vouchers you've redeemed at checkout will appear here.</Text>
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
      {/* Used banner */}
      <View style={s.usedBanner}>
        <View style={s.usedBannerIconWrap}>
          <MaterialCommunityIcons name="check-circle-outline" size={20} color={C.success} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.usedBannerTitle}>
            {usedVouchers.length} VOUCHER{usedVouchers.length !== 1 ? 'S' : ''} REDEEMED
          </Text>
          <Text style={s.usedBannerSub}>
            These tokens have been fully applied and are no longer valid.
          </Text>
        </View>
      </View>
      {categoryOrder.map(cat => {
        const items = grouped[cat];
        if (!items?.length) return null;
        const cfg = CATEGORY_CONFIG[cat];
        return (
          <View key={cat} style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.sectionHeaderLeft}>
                <View style={[s.sectionIconWrap, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                  <CatIcon category={cat} size={14} color={cfg.color} />
                </View>
                <View style={s.sectionTitleBlock}>
                  <View style={[s.sectionTick, { backgroundColor: cfg.color }]} />
                  <Text style={[s.sectionTitle, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
                <View style={s.countBadge}>
                  <Text style={s.countBadgeText}>{items.length}</Text>
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

/* ══════════════════════════════════════════════
   TAB CONFIG
══════════════════════════════════════════════ */
const TABS: {
  key: TabKey;
  label: string;
  iconLib: 'mci' | 'feather' | 'ion';
  iconName: string;
}[] = [
  { key: 'all',             label: 'ALL',     iconLib: 'feather', iconName: 'tag'                    },
  { key: 'free-shipping',   label: 'SHIP',    iconLib: 'mci',     iconName: 'truck-delivery-outline' },
  { key: 'minimum-spend',   label: 'SPEND',   iconLib: 'mci',     iconName: 'cash-multiple'          },
  { key: 'monthly-voucher', label: 'MONTHLY', iconLib: 'feather', iconName: 'gift'                   },
  { key: 'used',            label: 'USED',    iconLib: 'mci',     iconName: 'check-circle-outline'   },
];

function TabIcon({ tab, color }: { tab: (typeof TABS)[number]; size?: number; color: string }) {
  if (tab.iconLib === 'mci')     return <MaterialCommunityIcons name={tab.iconName as any} size={13} color={color} />;
  if (tab.iconLib === 'feather') return <Feather name={tab.iconName as any} size={13} color={color} />;
  return <Ionicons name={tab.iconName as any} size={13} color={color} />;
}

/* ══════════════════════════════════════════════
   MAIN SCREEN
══════════════════════════════════════════════ */
export default function UserVouchersScreen() {
  const [vouchers,    setVouchers]    = useState<VoucherItem[]>([]);
  const [claimedIds,  setClaimedIds]  = useState<Set<string>>(new Set());
  const [redeemedIds, setRedeemedIds] = useState<Set<string>>(new Set());
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [claimingId,  setClaimingId]  = useState<string | null>(null);
  const [activeTab,   setActiveTab]   = useState<TabKey>('all');

  const headerFade = useRef(new Animated.Value(0)).current;
  const router = useRouter();

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
        const headers    = { Authorization: `Bearer ${token}` };
        const claimedRes = await axios.get(`${API_URL}/my/vouchers/claimed`, { headers });
        setClaimedIds(new Set((claimedRes.data?.voucherIds           || []).map(String)));
        setRedeemedIds(new Set((claimedRes.data?.redeemedVoucherIds  || []).map(String)));
      } else {
        setClaimedIds(new Set()); setRedeemedIds(new Set());
      }
    } catch (e: any) {
      Alert.alert('LOAD FAILED', e?.response?.data?.message || 'Please try again.');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadVouchers(); }, []));

  const claimVoucher = async (voucherId: string) => {
    const token = await getItem('authToken');
    if (!token) { Alert.alert('AUTHENTICATION REQUIRED', 'Please sign in to claim vouchers.'); return; }
    try {
      setClaimingId(voucherId);
      const res = await axios.post(
        `${API_URL}/voucher/${voucherId}/claim`, {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setClaimedIds(prev => { const n = new Set(prev); n.add(voucherId);    return n; });
      setRedeemedIds(prev => { const n = new Set(prev); n.delete(voucherId); return n; });
      Alert.alert('VOUCHER CLAIMED', res.data?.message || 'Token secured. Enjoy your discount.');
    } catch (e: any) {
      Alert.alert('CLAIM FAILED', e?.response?.data?.message || 'Could not claim voucher.');
    } finally { setClaimingId(null); }
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

  function tabCount(key: TabKey) {
    if (key === 'all')  return vouchers.length;
    if (key === 'used') return redeemedIds.size;
    return vouchers.filter(v => v.category === key).length;
  }

  const showMonthlyNote =
    (activeTab === 'all' || activeTab === 'monthly-voucher') &&
    !!grouped['monthly-voucher']?.length;

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
        <View style={s.titleRow}>
          <TouchableOpacity 
            style={s.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="chevron-left" size={20} color={C.accent} />
          </TouchableOpacity>
          <View style={s.titleTick} />
          <View>
            <Text style={s.eyebrow}>ROMERO'S KINGDOM</Text>
            <Text style={s.title}>VOUCHER TOKENS</Text>
          </View>
        </View>

        <Text style={s.subtitle}>Claim exclusive tokens and apply them at checkout.</Text>

        {/* Stats pills */}
        {!loading && (
          <View style={s.pillRow}>
            {[
              { label: 'OPEN',     value: stats.available, color: C.accent  },
              { label: 'CLAIMED',  value: stats.claimed,   color: C.accentText },
              { label: 'USED',     value: stats.redeemed,  color: C.success },
              { label: 'TOTAL',    value: stats.total,     color: C.textSub },
            ].map(p => (
              <View key={p.label} style={s.pill}>
                <Text style={[s.pillValue, { color: p.color }]}>{p.value}</Text>
                <Text style={s.pillLabel}>{p.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Tab bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabBarContent}
          style={s.tabBar}
        >
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            const count    = tabCount(tab.key);
            const tabColor = isActive ? C.accent : C.textSub;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[s.tab, isActive && s.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <TabIcon tab={tab} color={tabColor} />
                <Text style={[s.tabText, isActive && s.tabTextActive]}>{tab.label}</Text>
                {count > 0 && (
                  <View style={[s.tabBadge, isActive && s.tabBadgeActive]}>
                    <Text style={[s.tabBadgeTxt, isActive && s.tabBadgeTxtActive]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* ══════════════════════════════════
          CONTENT
      ══════════════════════════════════ */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={s.loadingText}>SCANNING TOKENS...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.listContent}
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
                <View style={s.noteBox}>
                  <Ionicons name="information-circle-outline" size={15} color={C.success} style={{ marginTop: 1 }} />
                  <Text style={s.noteText}>
                    Monthly tokens unlock one at a time. Only the{' '}
                    <Text style={{ color: C.success, fontWeight: '700' }}>
                      {MONTHS[CLAIMABLE_MONTHLY_MONTH - 1]}
                    </Text>{' '}
                    token is claimable now. Past months are expired; future months are not yet available.
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
                <View style={s.emptyBox}>
                  <View style={s.emptyIconWrap}>
                    <Feather name="tag" size={32} color={C.textDim} />
                  </View>
                  <Text style={s.emptyTitle}>NO TOKENS AVAILABLE</Text>
                  <Text style={s.emptyText}>Check back soon — exclusive deals are incoming.</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

/* ─────────────────────────────────────────
   Styles
───────────────────────────────────────── */
const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: C.textDim, fontSize: 10, letterSpacing: 2.5, fontFamily: MONO, marginTop: 6 },

  /* Header */
  header: {
    backgroundColor: C.bgLayer,
    paddingTop: Platform.OS === 'ios' ? 52 : 34,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 0,
  },
  statusBar:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.bg },
  statusLeft:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusPulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.success, shadowColor: C.success, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 4, elevation: 2 },
  statusText:  { color: C.textDim, fontSize: 9, fontWeight: '700', letterSpacing: 1.8, fontFamily: MONO },

  titleRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 14 },
  backBtn:   { width: 36, height: 36, borderRadius: 8, backgroundColor: C.accentGlow, borderWidth: 1, borderColor: C.borderBright, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  titleTick: { width: 3, height: 30, borderRadius: 2, backgroundColor: C.accent },
  eyebrow:   { color: C.accent, fontSize: 9, letterSpacing: 2.5, fontWeight: '700', fontFamily: MONO },
  title:     { color: C.text, fontSize: 18, fontWeight: '900', letterSpacing: 3, fontFamily: MONO },
  subtitle:  { color: C.textDim, fontSize: 11, marginTop: 0, marginBottom: 14, lineHeight: 16, paddingHorizontal: 20 },

  /* Pills */
  pillRow:   { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 16 },
  pill:      { flex: 1, backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 10, alignItems: 'center' },
  pillValue: { fontSize: 15, fontWeight: '800', fontFamily: MONO },
  pillLabel: { color: C.textDim, fontSize: 7, marginTop: 3, textAlign: 'center', letterSpacing: 1.5, fontFamily: MONO },

  /* Tab bar */
  tabBar:        { marginHorizontal: -20 },
  tabBarContent: { paddingHorizontal: 20, gap: 4 },
  tab:           { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 12, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabActive:     { borderBottomColor: C.accent },
  tabText:       { color: C.textSub, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, fontFamily: MONO },
  tabTextActive: { color: C.accentText },
  tabBadge:      { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  tabBadgeActive:    { backgroundColor: C.accent, borderColor: C.accent },
  tabBadgeTxt:       { color: C.textSub, fontSize: 8, fontWeight: '800', fontFamily: MONO },
  tabBadgeTxtActive: { color: C.bg },

  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 60, gap: 4 },

  /* Section */
  section:           { marginBottom: 20 },
  sectionHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIconWrap:   { width: 32, height: 32, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitleBlock: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTick:       { width: 2.5, height: 11, borderRadius: 1.5 },
  sectionTitle:      { fontSize: 10, fontWeight: '800', letterSpacing: 2.5, fontFamily: MONO },
  countBadge:        { backgroundColor: C.surface, borderRadius: 7, borderWidth: 1, borderColor: C.border, paddingHorizontal: 7, paddingVertical: 2 },
  countBadgeText:    { color: C.textDim, fontSize: 10, fontWeight: '700', fontFamily: MONO },
  claimableTag:      { borderRadius: 16, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 4 },
  claimableTagText:  { fontSize: 8, fontWeight: '800', letterSpacing: 1, fontFamily: MONO },

  /* Active voucher card */
  card: {
    flexDirection: 'row', backgroundColor: C.surface,
    borderRadius: 14, borderWidth: 1, borderColor: C.border,
    overflow: 'hidden', marginBottom: 10,
  },
  cardLocked: { opacity: 0.48 },

  /* Used voucher card */
  usedCard: {
    flexDirection: 'row', backgroundColor: C.bgLayer,
    borderRadius: 14, borderWidth: 1, borderColor: C.border,
    overflow: 'hidden', marginBottom: 10,
  },
  usedCardLeft:    { width: 90, justifyContent: 'center', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8, borderRightWidth: 1, borderStyle: 'dashed', borderRightColor: C.border, gap: 6 },
  usedLeftValue:   { color: C.textSub, fontSize: 17, fontWeight: '900', textAlign: 'center', lineHeight: 22, fontFamily: MONO },
  usedStamp:       { borderWidth: 1.5, borderColor: C.success, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, transform: [{ rotate: '-12deg' }] },
  usedStampText:   { color: C.success, fontSize: 8, fontWeight: '900', letterSpacing: 1.5, fontFamily: MONO },
  usedCodeValue:   { color: C.textDim, fontSize: 12, fontWeight: '800', letterSpacing: 2, marginBottom: 4, textDecorationLine: 'line-through', fontFamily: MONO },

  /* Card shared */
  cardLeftIconWrap:{ width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  cardLeft:        { width: 90, justifyContent: 'center', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8, borderRightWidth: 1, borderStyle: 'dashed', gap: 4 },
  monthLabel:      { color: C.textDim, fontSize: 8, fontWeight: '700', letterSpacing: 1.5, fontFamily: MONO, textAlign: 'center' },
  leftValue:       { color: C.accentText, fontSize: 17, fontWeight: '900', textAlign: 'center', lineHeight: 22, fontFamily: MONO },
  multiTag:        { borderRadius: 7, borderWidth: 1, paddingHorizontal: 5, paddingVertical: 2, marginTop: 2 },
  multiTagText:    { color: C.accentText, fontSize: 9, fontWeight: '800', fontFamily: MONO },

  cardRight:      { flex: 1, paddingHorizontal: 12, paddingVertical: 12, gap: 3 },
  badgeRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' },
  badgeChip:      { borderRadius: 6, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3 },
  badgeChipText:  { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, fontFamily: MONO },
  rightTagInline: { color: C.textSub, fontSize: 10, flexShrink: 1 },
  description:    { color: C.text, fontSize: 12, lineHeight: 17 },
  validity:       { color: C.textDim, fontSize: 9, marginTop: 1, fontFamily: MONO },

  innerDivider: { height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: C.border, marginVertical: 8 },

  codeValue: { color: C.accent, fontSize: 12, fontWeight: '900', letterSpacing: 2.5, marginBottom: 4, fontFamily: MONO },

  cardBottom:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 2 },
  statusRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  statusLabel: { fontSize: 9, fontWeight: '700', flexShrink: 1, letterSpacing: 1, fontFamily: MONO },

  claimBtn: {
    backgroundColor: C.accent, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 8, minWidth: 58, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.accent, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55, shadowRadius: 8, elevation: 5,
    overflow: 'hidden',
  },
  claimBtnDisabled: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, shadowOpacity: 0, elevation: 0 },
  claimBtnText:     { color: C.bg, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, fontFamily: MONO },
  claimBtnTextDisabled: { color: C.textDim, fontSize: 9 },

  cornerTL: { position: 'absolute', top: 0,    left: 0,  width: 14, height: 1.5, opacity: 0.6 },
  cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 1.5, opacity: 0.6 },

  /* Used banner */
  usedBanner:        { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.successBg, borderWidth: 1, borderColor: C.successBorder, borderRadius: 12, padding: 14, marginBottom: 16 },
  usedBannerIconWrap:{ width: 40, height: 40, borderRadius: 10, backgroundColor: C.successBg, borderWidth: 1, borderColor: C.successBorder, alignItems: 'center', justifyContent: 'center' },
  usedBannerTitle:   { color: C.success, fontSize: 11, fontWeight: '800', letterSpacing: 2, fontFamily: MONO },
  usedBannerSub:     { color: C.textSub, fontSize: 11, marginTop: 2, lineHeight: 16 },

  /* Empty state */
  emptyBox:     { marginTop: 40, alignItems: 'center', gap: 10, paddingHorizontal: 20 },
  emptyIconWrap:{ width: 80, height: 80, borderRadius: 20, backgroundColor: C.accentGlow, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle:   { color: C.textSub, fontSize: 13, fontWeight: '800', letterSpacing: 2.5, fontFamily: MONO },
  emptyText:    { color: C.textDim, textAlign: 'center', lineHeight: 18, fontSize: 12 },

  /* Note box */
  noteBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.successBg, borderWidth: 1, borderColor: C.successBorder, borderRadius: 11, padding: 12, marginBottom: 16 },
  noteText: { color: C.textSub, fontSize: 11, lineHeight: 18, flex: 1 },
});
