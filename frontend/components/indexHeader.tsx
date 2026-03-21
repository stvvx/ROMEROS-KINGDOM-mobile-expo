import React, { useRef } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import Svg, { Circle, Line, Path, Rect, G } from 'react-native-svg';

/* ── Design tokens — Blue Robotics ── */
const C = {
  bg:          '#020B18',
  bgLayer:     '#040F1F',
  surface:     '#071828',
  border:      '#0D2440',
  accent:      '#00A8FF',
  accentDim:   '#005A8E',
  accentGlow:  'rgba(0,168,255,0.12)',
  accentText:  '#33BBFF',
  steel:       '#1E3A5F',
  text:        '#E8F4FF',
  textSub:     'rgba(120,180,230,0.75)',
  textDim:     'rgba(60,110,170,0.5)',
  success:     '#00D4AA',
} as const;

const SIDE_PAD = 16;
const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

/* ════════════════════════════════════════
   ROBOT HEAD ICON — SVG (humanoid face)
════════════════════════════════════════ */
const RobotIcon = ({ size = 46 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 80 80" fill="none">
    {/* Antenna stem + orb */}
    <Rect x="38" y="3" width="4" height="10" rx="2" fill={C.accentDim} />
    <Circle cx="40" cy="2.5" r="3.5" fill={C.accent} opacity="0.95" />
    {/* Neck */}
    <Rect x="33" y="63" width="14" height="8" rx="3" fill={C.steel} />
    <Rect x="35" y="65" width="10" height="2" rx="1" fill={C.accent} opacity="0.45" />
    {/* Head shell */}
    <Rect x="12" y="13" width="56" height="52" rx="10" fill={C.steel} />
    <Rect x="12" y="13" width="56" height="52" rx="10"
      stroke={C.accent} strokeWidth="1.2" fill="none" opacity="0.75" />
    {/* Panel seam below top */}
    <Line x1="12" y1="25" x2="68" y2="25" stroke={C.accent} strokeWidth="0.6" opacity="0.3" />
    {/* Forehead status LED */}
    <Circle cx="40" cy="19.5" r="2.5" fill={C.success} opacity="0.9" />
    {/* Visor bar */}
    <Rect x="17" y="28" width="46" height="16" rx="5" fill="#0A1E35" />
    <Rect x="17" y="28" width="46" height="16" rx="5"
      stroke={C.accent} strokeWidth="0.8" fill="none" opacity="0.6" />
    {/* Left eye socket + pupil */}
    <Rect x="21" y="31" width="16" height="10" rx="3" fill={C.accentDim} />
    <Rect x="21" y="31" width="16" height="10" rx="3" fill={C.accent} opacity="0.7" />
    <Circle cx="29" cy="36" r="3" fill={C.accent} opacity="0.95" />
    <Circle cx="27.5" cy="34.5" r="1" fill="#E8F4FF" opacity="0.85" />
    {/* Right eye socket + pupil */}
    <Rect x="43" y="31" width="16" height="10" rx="3" fill={C.accentDim} />
    <Rect x="43" y="31" width="16" height="10" rx="3" fill={C.accent} opacity="0.7" />
    <Circle cx="51" cy="36" r="3" fill={C.accent} opacity="0.95" />
    <Circle cx="49.5" cy="34.5" r="1" fill="#E8F4FF" opacity="0.85" />
    {/* Nose sensor */}
    <Circle cx="40" cy="49" r="1.8" fill={C.accent} opacity="0.7" />
    {/* Mouth / speaker grille */}
    <Rect x="22" y="54" width="36" height="7" rx="3.5" fill="#0A1E35" />
    <Rect x="22" y="54" width="36" height="7" rx="3.5"
      stroke={C.accent} strokeWidth="0.7" fill="none" opacity="0.5" />
    <Line x1="28" y1="55.5" x2="28" y2="59.5" stroke={C.accent} strokeWidth="0.8" opacity="0.55" />
    <Line x1="33" y1="55.5" x2="33" y2="59.5" stroke={C.accent} strokeWidth="0.8" opacity="0.55" />
    <Line x1="38" y1="55.5" x2="38" y2="59.5" stroke={C.accent} strokeWidth="0.8" opacity="0.55" />
    <Line x1="43" y1="55.5" x2="43" y2="59.5" stroke={C.accent} strokeWidth="0.8" opacity="0.55" />
    <Line x1="48" y1="55.5" x2="48" y2="59.5" stroke={C.accent} strokeWidth="0.8" opacity="0.55" />
    <Line x1="53" y1="55.5" x2="53" y2="59.5" stroke={C.accent} strokeWidth="0.8" opacity="0.55" />
    {/* Ear bolts */}
    <Rect x="7" y="30" width="6" height="18" rx="3" fill={C.steel}
      stroke={C.accent} strokeWidth="0.8" />
    <Line x1="10" y1="34" x2="10" y2="44" stroke={C.accent} strokeWidth="0.6" opacity="0.4" />
    <Rect x="67" y="30" width="6" height="18" rx="3" fill={C.steel}
      stroke={C.accent} strokeWidth="0.8" />
    <Line x1="70" y1="34" x2="70" y2="44" stroke={C.accent} strokeWidth="0.6" opacity="0.4" />
    {/* Cheek circuit dots */}
    <Circle cx="18" cy="50" r="1.5" fill={C.accent} opacity="0.45" />
    <Circle cx="62" cy="50" r="1.5" fill={C.accent} opacity="0.45" />
  </Svg>
);

/* ════════════════════════════════════════
   CATEGORY ICON MAP
════════════════════════════════════════ */
type IconLib = 'feather' | 'mci' | 'ion';
interface CatIconCfg { lib: IconLib; name: string }

function getCatIcon(label: string): CatIconCfg {
  const key = label.toLowerCase().replace(/\s+/g, '');
  const map: Record<string, CatIconCfg> = {
    all:         { lib: 'mci',     name: 'view-grid-outline'       },
    electronics: { lib: 'mci',     name: 'lightning-bolt'          },
    phones:      { lib: 'feather', name: 'smartphone'              },
    laptops:     { lib: 'feather', name: 'monitor'                 },
    computers:   { lib: 'feather', name: 'monitor'                 },
    accessories: { lib: 'feather', name: 'headphones'              },
    clothing:    { lib: 'ion',     name: 'shirt-outline'           },
    shoes:       { lib: 'mci',     name: 'shoe-sneaker'            },
    bags:        { lib: 'mci',     name: 'bag-personal-outline'    },
    watches:     { lib: 'feather', name: 'watch'                   },
    jewelry:     { lib: 'mci',     name: 'diamond-outline'         },
    food:        { lib: 'mci',     name: 'food-outline'            },
    drinks:      { lib: 'mci',     name: 'cup-outline'             },
    grocery:     { lib: 'mci',     name: 'cart-outline'            },
    beauty:      { lib: 'mci',     name: 'shimmer'                 },
    health:      { lib: 'mci',     name: 'pill'                    },
    sports:      { lib: 'mci',     name: 'basketball-outline'      },
    toys:        { lib: 'mci',     name: 'gamepad-variant-outline' },
    books:       { lib: 'feather', name: 'book-open'               },
    furniture:   { lib: 'mci',     name: 'sofa-outline'            },
    home:        { lib: 'feather', name: 'home'                    },
    tools:       { lib: 'feather', name: 'tool'                    },
    automotive:  { lib: 'mci',     name: 'car-outline'             },
    garden:      { lib: 'mci',     name: 'flower-outline'          },
    pets:        { lib: 'mci',     name: 'paw-outline'             },
    art:         { lib: 'feather', name: 'pen-tool'                },
    music:       { lib: 'feather', name: 'music'                   },
    games:       { lib: 'mci',     name: 'dice-multiple-outline'   },
    babies:      { lib: 'mci',     name: 'baby-carriage'           },
    stationery:  { lib: 'feather', name: 'edit-2'                  },
  };
  for (const [k, v] of Object.entries(map)) {
    if (key.includes(k)) return v;
  }
  return { lib: 'mci', name: 'tag-outline' };
}

const CatIconComponent = ({ label, size, color }: { label: string; size: number; color: string }) => {
  const cfg = getCatIcon(label);
  if (cfg.lib === 'feather') return <Feather name={cfg.name as any} size={size} color={color} />;
  if (cfg.lib === 'ion')     return <Ionicons name={cfg.name as any} size={size} color={color} />;
  return <MaterialCommunityIcons name={cfg.name as any} size={size} color={color} />;
};

/* ════════════════════════════════════════
   CHIP
════════════════════════════════════════ */
const Chip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => {
  const scale    = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.spring(scale, { toValue: 0.92, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true }).start();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}
        activeOpacity={1} style={[s.chip, active && s.chipActive]}
      >
        <CatIconComponent label={label} size={11} color={active ? C.accentText : C.textSub} />
        <Text style={[s.chipText, active && s.chipTextActive]}>{label.toUpperCase()}</Text>
        {active && <View style={s.chipDot} />}
      </TouchableOpacity>
    </Animated.View>
  );
};

/* ════════════════════════════════════════
   PROPS
════════════════════════════════════════ */
export interface IndexHeaderProps {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onSearchSubmit: () => void;
  onSearchClear: () => void;
  filterOpen: boolean;
  onToggleFilter: () => void;
  animatedFilterH: Animated.AnimatedInterpolation<number>;
  price: [number, number];
  onPriceChange: (val: number) => void;
  categories: string[];
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
  onMenuOpen: () => void;
  cartCount: number;
  notifCount: number;
  headerFade: Animated.Value;
}

/* ════════════════════════════════════════
   COMPONENT
════════════════════════════════════════ */
export default function IndexHeader({
  searchQuery, onSearchChange, onSearchSubmit, onSearchClear,
  filterOpen, onToggleFilter, animatedFilterH,
  price, onPriceChange,
  categories, activeCategory, onCategoryChange,
  onMenuOpen, cartCount, notifCount, headerFade,
}: IndexHeaderProps) {

  const normalizedCategories = React.useMemo(() => {
    const raw     = Array.isArray(categories) ? categories : [];
    const cleaned = raw.map((c) => String(c ?? '').trim()).filter(Boolean);
    const withAll = cleaned.some((c) => c.toLowerCase() === 'all') ? cleaned : ['All', ...cleaned];
    const seen    = new Set<string>();
    const result: string[] = [];
    for (const c of withAll) {
      const key = c.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(c);
    }
    return result;
  }, [categories]);

  return (
    <Animated.View style={[s.header, { opacity: headerFade }]}>

      {/* ══ ZONE 1 — HUD status strip ══ */}
      <View style={s.hudStrip}>
        <View style={s.hudOnline} />
        <Text style={s.hudText}>UNIT-7  ·  COMMERCE OS  ·  v2.4</Text>
        <View style={s.hudBlue} />
      </View>

      {/* ══ ZONE 2 — Brand row: menu | robot+name | cart+bell ══ */}
      <View style={s.brandRow}>

        {/* Left: hamburger */}
        <TouchableOpacity style={s.iconBtn} onPress={onMenuOpen} activeOpacity={0.75}>
          <View style={s.menuLines}>
            <View style={s.menuLine} />
            <View style={[s.menuLine, { width: 13, backgroundColor: C.accent }]} />
            <View style={s.menuLine} />
          </View>
          {(cartCount + notifCount > 0) && (
            <View style={s.iconBadge}>
              <Text style={s.iconBadgeTxt}>{cartCount + notifCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Center: robot badge + wordmark */}
        <View style={s.brandCenter}>
          <View style={s.robotBadge}>
            <View style={s.robotGlowRing} />
            <RobotIcon size={44} />
          </View>
          <View>
            <Text style={s.wordEyebrow}>ROMERO'S</Text>
            <Text style={s.wordTitle}>KINGDOM</Text>
          </View>
        </View>

        {/* Right: bell + cart */}
        <View style={s.rightRow}>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.75}>
            <Feather name="bell" size={16} color={notifCount > 0 ? C.accent : C.textSub} />
            {notifCount > 0 && (
              <View style={s.iconBadge}><Text style={s.iconBadgeTxt}>{notifCount}</Text></View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.75}>
            <Feather name="shopping-cart" size={16} color={cartCount > 0 ? C.accent : C.textSub} />
            {cartCount > 0 && (
              <View style={s.iconBadge}><Text style={s.iconBadgeTxt}>{cartCount}</Text></View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ══ ZONE 3 — Decorative divider ══ */}
      <View style={s.divRow}>
        <View style={s.divTick} />
        <View style={s.divLine} />
        <View style={s.divDiamond} />
        <View style={s.divLine} />
        <View style={s.divTick} />
      </View>

      {/* ══ ZONE 4 — Search bar (filter toggle embedded inside) ══ */}
      <View style={s.searchRow}>
        <View style={[s.searchBox, filterOpen && s.searchBoxOn]}>
          <View style={s.searchBracket} />
          <Feather name="cpu" size={14} color={C.accent} style={{ marginLeft: 6 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Query the inventory..."
            placeholderTextColor={C.textDim}
            value={searchQuery}
            onChangeText={onSearchChange}
            onSubmitEditing={onSearchSubmit}
            returnKeyType="search"
            selectionColor={C.accent}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={onSearchClear}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={13} color={C.textSub} />
            </TouchableOpacity>
          )}
          <View style={s.searchSep} />
          <TouchableOpacity
            onPress={onToggleFilter}
            style={[s.filterBtn, filterOpen && s.filterBtnOn]}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Feather name="sliders" size={14} color={filterOpen ? C.accent : C.textSub} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ══ ZONE 5 — Collapsible price filter ══ */}
      <Animated.View style={[s.filterPanel, { height: animatedFilterH, overflow: 'hidden' }]}>
        <View style={s.filterInner}>
          <View style={s.filterHeader}>
            <View style={s.filterTick} />
            <Text style={s.filterLabel}>PRICE RANGE</Text>
            <Text style={s.filterValue}>₱{price[0].toLocaleString()} — ₱{price[1].toLocaleString()}</Text>
          </View>
          <Slider
            minimumValue={1} maximumValue={10000} step={50} value={price[1]}
            onValueChange={(v) => onPriceChange(Math.max(price[0] + 50, v))}
            minimumTrackTintColor={C.accent}
            maximumTrackTintColor={C.border}
            thumbTintColor={C.accent}
            style={{ height: 32, marginTop: 2 }}
          />
        </View>
      </Animated.View>

      {/* ══ ZONE 6 — Category chips ══ */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipRow}
      >
        {normalizedCategories.map((cat) => (
          <Chip key={cat} label={cat} active={activeCategory === cat}
            onPress={() => onCategoryChange(cat)} />
        ))}
      </ScrollView>

    </Animated.View>
  );
}

/* ════════════════════════════════════════
   STYLES
════════════════════════════════════════ */
const s = StyleSheet.create({
  header: {
    backgroundColor: C.bgLayer,
    paddingTop: Platform.OS === 'ios' ? 52 : 34,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  // ── Zone 1: HUD strip ──
  hudStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    backgroundColor: 'rgba(0,168,255,0.04)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,168,255,0.09)',
    gap: 8,
  },
  hudOnline: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#00D4AA' },
  hudBlue:   { width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.accent, opacity: 0.7 },
  hudText: {
    color: C.textSub, fontSize: 9, letterSpacing: 2.5, fontFamily: MONO,
  },

  // ── Zone 2: Brand row ──
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIDE_PAD,
    paddingTop: 12,
    paddingBottom: 10,
  },

  iconBtn: {
    width: 44, height: 44,
    borderRadius: 10,
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center',
  },
  menuLines: { gap: 5, alignItems: 'flex-start' },
  menuLine:  { width: 20, height: 2, borderRadius: 1.5, backgroundColor: C.text },
  iconBadge: {
    position: 'absolute', top: -4, right: -4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: C.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  iconBadgeTxt: { color: C.bg, fontSize: 8, fontWeight: '800' },

  brandCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  robotBadge: {
    width: 54, height: 54,
    borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: 'rgba(0,168,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  robotGlowRing: {
    position: 'absolute',
    width: 54, height: 54,
    borderRadius: 14,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 8,
  },
  wordEyebrow: {
    color: C.accent, fontSize: 10, fontWeight: '800',
    letterSpacing: 3, fontFamily: MONO, lineHeight: 13,
  },
  wordTitle: {
    color: C.text, fontSize: 21, fontWeight: '900',
    letterSpacing: 1.5, fontFamily: MONO, lineHeight: 25,
  },

  rightRow: { flexDirection: 'row', gap: 8 },

  // ── Zone 3: Divider ──
  divRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SIDE_PAD,
    marginBottom: 10,
    gap: 4,
  },
  divTick:    { width: 2, height: 10, borderRadius: 1, backgroundColor: C.accent, opacity: 0.65 },
  divLine:    { flex: 1, height: 1, backgroundColor: C.border },
  divDiamond: {
    width: 6, height: 6, borderRadius: 1,
    backgroundColor: C.accent,
    transform: [{ rotate: '45deg' }],
    opacity: 0.8,
  },

  // ── Zone 4: Search ──
  searchRow: { paddingHorizontal: SIDE_PAD, marginBottom: 8 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
    height: 46,
    paddingRight: 10,
    gap: 8,
    overflow: 'hidden',
  },
  searchBoxOn:  { borderColor: C.accent },
  searchBracket:{ width: 3, alignSelf: 'stretch', backgroundColor: C.accentDim },
  searchInput: {
    flex: 1, color: C.text, fontSize: 14, paddingVertical: 0,
    fontFamily: MONO,
  },
  searchSep: { width: 1, height: 22, backgroundColor: C.border, marginHorizontal: 2 },
  filterBtn: {
    width: 28, height: 28, borderRadius: 7,
    justifyContent: 'center', alignItems: 'center',
  },
  filterBtnOn: { backgroundColor: C.accentGlow },

  // ── Zone 5: Filter panel ──
  filterPanel: { marginHorizontal: SIDE_PAD, marginBottom: 4 },
  filterInner: {
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  filterHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterTick:   { width: 2.5, height: 10, borderRadius: 1.5, backgroundColor: C.accent },
  filterLabel: {
    color: C.accent, fontSize: 9, letterSpacing: 3,
    fontWeight: '700', fontFamily: MONO, flex: 1,
  },
  filterValue: { color: C.text, fontSize: 12, fontWeight: '600', fontFamily: MONO },

  // ── Zone 6: Chips ──
  chipRow: {
    flexDirection: 'row', gap: 7,
    paddingVertical: 8, paddingHorizontal: SIDE_PAD,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
  },
  chipActive: {
    backgroundColor: C.accentGlow, borderColor: C.accent,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45, shadowRadius: 8, elevation: 4,
  },
  chipDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.accent, marginLeft: 1 },
  chipText: {
    color: C.textSub, fontSize: 9, fontWeight: '600',
    letterSpacing: 1, fontFamily: MONO,
  },
  chipTextActive: { color: C.accentText, fontWeight: '700' },
});