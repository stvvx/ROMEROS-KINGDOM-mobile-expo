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
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

/* ── Design tokens ── */
const C = {
  bg:         '#0E1117',
  bgLayer:    '#12151F',
  surface:    '#1A1E2E',
  border:     '#262D42',
  accent:     '#00C2C7',
  accentGlow: 'rgba(0,194,199,0.12)',
  accentText: '#00E5EB',
  text:       '#E8EDF5',
  textSub:    '#7A859E',
  textDim:    '#353D52',
} as const;

const SIDE_PAD = 16;

/* ════════════════════════════════════════
   ROBOT LOGO — SVG
   Futuristic toy-robot head with:
   glowing visor eyes, angular helmet,
   antenna, grille mouth, panel rivets
════════════════════════════════════════ */
const RobotLogo = ({ size = 44 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 44 44">
    <Defs>
      <LinearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#1E2740" stopOpacity="1" />
        <Stop offset="1" stopColor="#0E1117" stopOpacity="1" />
      </LinearGradient>
      <LinearGradient id="visorL" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0"   stopColor="#00E5EB" stopOpacity="1"   />
        <Stop offset="1"   stopColor="#00C2C7" stopOpacity="0.7" />
      </LinearGradient>
      <LinearGradient id="antennaGrad" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#00E5EB" stopOpacity="1"   />
        <Stop offset="1" stopColor="#00C2C7" stopOpacity="0.2" />
      </LinearGradient>
    </Defs>

    {/* ── Antenna ── */}
    <Rect x="20.5" y="1.5" width="3" height="6.5" rx="1.5" fill="url(#antennaGrad)" />
    <Circle cx="22" cy="1.8" r="2.2" fill="#00E5EB" opacity="0.95" />
    <Circle cx="22" cy="1.8" r="1"   fill="#fff"    opacity="0.7"  />

    {/* ── Head outer shell (bevel) ── */}
    <Rect x="4.5" y="8" width="35" height="29" rx="5.5" fill={C.border} />
    {/* Head fill */}
    <Rect x="5.5" y="9" width="33" height="27" rx="4.5" fill="url(#bodyGrad)" />

    {/* ── Helmet top ridge ── */}
    <Rect x="10" y="11" width="24" height="1.5" rx="0.75" fill={C.accent} opacity="0.35" />

    {/* ── Ear vents ── */}
    {/* Left */}
    <Rect x="1.5" y="17" width="4"   height="11" rx="2"   fill={C.border}  />
    <Rect x="2.5" y="18" width="2"   height="3"  rx="1"   fill={C.accent}  opacity="0.55" />
    <Rect x="2.5" y="23" width="2"   height="2"  rx="1"   fill={C.accent}  opacity="0.25" />
    {/* Right */}
    <Rect x="38.5" y="17" width="4"  height="11" rx="2"   fill={C.border}  />
    <Rect x="39.5" y="18" width="2"  height="3"  rx="1"   fill={C.accent}  opacity="0.55" />
    <Rect x="39.5" y="23" width="2"  height="2"  rx="1"   fill={C.accent}  opacity="0.25" />

    {/* ── Visor housing ── */}
    <Rect x="8.5" y="15.5" width="27" height="10" rx="3" fill="#060A10" />
    {/* Visor inner ambient glow strip */}
    <Rect x="9.5" y="16.5" width="25" height="8" rx="2" fill={C.accent} opacity="0.05" />

    {/* Left eye */}
    <Rect x="10.5" y="17.5" width="10" height="6" rx="2" fill="url(#visorL)" opacity="0.95" />
    {/* Left eye glint */}
    <Rect x="11.5" y="18.5" width="4.5" height="2" rx="1" fill="#fff" opacity="0.4" />
    {/* Left eye scan line */}
    <Rect x="10.5" y="22"   width="10"  height="0.8" rx="0.4" fill="#00E5EB" opacity="0.3" />

    {/* Right eye */}
    <Rect x="23.5" y="17.5" width="10" height="6" rx="2" fill="url(#visorL)" opacity="0.95" />
    {/* Right eye glint */}
    <Rect x="24.5" y="18.5" width="4.5" height="2" rx="1" fill="#fff" opacity="0.4" />
    {/* Right eye scan line */}
    <Rect x="23.5" y="22"   width="10"  height="0.8" rx="0.4" fill="#00E5EB" opacity="0.3" />

    {/* Bridge between eyes */}
    <Rect x="21.5" y="18.5" width="1" height="4" rx="0.5" fill="#060A10" opacity="0.9" />

    {/* ── Mouth grille ── */}
    <Rect x="11" y="28" width="22" height="6" rx="2.5" fill="#080C15" />
    {/* Grille bars */}
    <Line x1="14"  y1="29.5" x2="14"  y2="32.5" stroke={C.accent} strokeWidth="1.2" opacity="0.45" strokeLinecap="round" />
    <Line x1="17"  y1="29.5" x2="17"  y2="32.5" stroke={C.accent} strokeWidth="1.2" opacity="0.45" strokeLinecap="round" />
    <Line x1="20"  y1="29.5" x2="20"  y2="32.5" stroke={C.accent} strokeWidth="1.2" opacity="0.7"  strokeLinecap="round" />
    <Line x1="23"  y1="29.5" x2="23"  y2="32.5" stroke={C.accent} strokeWidth="1.2" opacity="0.7"  strokeLinecap="round" />
    <Line x1="26"  y1="29.5" x2="26"  y2="32.5" stroke={C.accent} strokeWidth="1.2" opacity="0.45" strokeLinecap="round" />
    <Line x1="29"  y1="29.5" x2="29"  y2="32.5" stroke={C.accent} strokeWidth="1.2" opacity="0.45" strokeLinecap="round" />

    {/* ── Status dot (chin) ── */}
    <Circle cx="22" cy="35.5" r="1.2" fill={C.accent} opacity="0.7" />

    {/* ── Bottom panel line ── */}
    <Rect x="7" y="34" width="30" height="1" rx="0.5" fill={C.accent} opacity="0.12" />

    {/* ── Corner rivets ── */}
    <Circle cx="9"  cy="12"   r="1.1" fill={C.accent} opacity="0.3" />
    <Circle cx="35" cy="12"   r="1.1" fill={C.accent} opacity="0.3" />
    <Circle cx="9"  cy="33.5" r="1.1" fill={C.accent} opacity="0.3" />
    <Circle cx="35" cy="33.5" r="1.1" fill={C.accent} opacity="0.3" />
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
        <CatIconComponent label={label} size={12} color={active ? C.accentText : C.textSub} />
        <Text style={[s.chipText, active && s.chipTextActive]}>{label.toUpperCase()}</Text>
        {active && <View style={s.chipActiveDot} />}
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
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onSearchClear,
  filterOpen,
  onToggleFilter,
  animatedFilterH,
  price,
  onPriceChange,
  categories,
  activeCategory,
  onCategoryChange,
  onMenuOpen,
  cartCount,
  notifCount,
  headerFade,
}: IndexHeaderProps) {
  return (
    <Animated.View style={[s.mobileHeader, { opacity: headerFade }]}>

      {/* ── Top row ── */}
      <View style={s.topRow}>

        {/* ── Brand lockup ── */}
        <View style={s.brandLockup}>

          {/* Robot logo with glow ring */}
          <View style={s.logoWrap}>
            <View style={s.logoGlowRing} />
            <RobotLogo size={44} />
          </View>

          {/* Wordmark */}
          <View style={s.wordmark}>
            {/* ROMEROS line with leading accent bar */}
            <View style={s.eyebrowRow}>
              <View style={s.accentBar} />
              <Text style={s.eyebrowText}>ROMEROS</Text>
            </View>
            {/* KINGDOM — the big title, indented past the bar */}
            <Text style={s.titleText}>KINGDOM</Text>
          </View>
        </View>

        {/* ── Action buttons ── */}
        <View style={s.actions}>
          <TouchableOpacity
            style={[s.iconBtn, filterOpen && s.iconBtnOn]}
            onPress={onToggleFilter}
          >
            <Feather
              name="sliders"
              size={17}
              color={filterOpen ? C.accentText : C.textSub}
            />
          </TouchableOpacity>

          <TouchableOpacity style={s.iconBtn} onPress={onMenuOpen}>
            <View style={s.hamburgerLines}>
              <View style={s.hamburgerLine} />
              <View style={[s.hamburgerLine, { width: 15 }]} />
              <View style={[s.hamburgerLine, { width: 20 }]} />
            </View>
            {(cartCount > 0 || notifCount > 0) && (
              <View style={s.badge}>
                <Text style={s.badgeTxt}>{cartCount + notifCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Search bar ── */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Feather name="search" size={15} color={C.accent} />
          <TextInput
            style={s.searchInput}
            placeholder="Search products..."
            placeholderTextColor={C.textDim}
            value={searchQuery}
            onChangeText={onSearchChange}
            onSubmitEditing={onSearchSubmit}
            returnKeyType="search"
            selectionColor={C.accent}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={onSearchClear}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={14} color={C.textSub} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Collapsible filter panel ── */}
      <Animated.View
        style={[s.filterPanel, { height: animatedFilterH, overflow: 'hidden' }]}
      >
        <Text style={s.filterLabel}>PRICE RANGE</Text>
        <Text style={s.filterValue}>
          ₱{price[0].toLocaleString()} — ₱{price[1].toLocaleString()}
        </Text>
        <Slider
          minimumValue={1}
          maximumValue={10000}
          step={50}
          value={price[1]}
          onValueChange={(v) => onPriceChange(Math.max(price[0] + 50, v))}
          minimumTrackTintColor={C.accent}
          maximumTrackTintColor={C.border}
          thumbTintColor={C.accent}
          style={{ height: 36, marginTop: 4 }}
        />
      </Animated.View>

      {/* ── Category chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipRow}
      >
        {categories.map((cat) => (
          <Chip
            key={cat}
            label={cat}
            active={activeCategory === cat}
            onPress={() => onCategoryChange(cat)}
          />
        ))}
      </ScrollView>

    </Animated.View>
  );
}

/* ════════════════════════════════════════
   STYLES
════════════════════════════════════════ */
const s = StyleSheet.create({
  mobileHeader: {
    backgroundColor: C.bgLayer,
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingHorizontal: SIDE_PAD,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  /* Top row */
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  /* Brand */
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  /* Logo */
  logoWrap: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoGlowRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(0,194,199,0.4)',
    backgroundColor: 'rgba(0,194,199,0.07)',
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 6,
  },

  /* Wordmark */
  wordmark: {
    justifyContent: 'center',
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 1,
  },
  accentBar: {
    width: 3,
    height: 11,
    borderRadius: 2,
    backgroundColor: C.accent,
  },
  eyebrowText: {
    color: C.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 3.5,
  },
  titleText: {
    color: C.text,
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: 0.8,
    lineHeight: 25,
    marginLeft: 9,  // visual alignment past the accentBar
  },
  tagText: {
    color: C.textDim,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 2.8,
    marginLeft: 9,
    marginTop: 2,
  },

  /* Actions */
  actions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnOn: {
    borderColor: C.accent,
    backgroundColor: C.accentGlow,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: C.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeTxt: { color: C.bg, fontSize: 8, fontWeight: '800' },

  hamburgerLines: { gap: 4, alignItems: 'flex-end' },
  hamburgerLine:  { width: 20, height: 2, borderRadius: 2, backgroundColor: C.text },

  /* Search */
  searchRow: { marginBottom: 12 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  searchInput: { flex: 1, color: C.text, fontSize: 14, paddingVertical: 0 },

  /* Filter */
  filterPanel: {
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
  },
  filterLabel: { color: C.accent, fontSize: 9, letterSpacing: 3, fontWeight: '700' },
  filterValue: { color: C.text, fontSize: 13, fontWeight: '600', marginTop: 3 },

  /* Chips */
  chipRow:        { flexDirection: 'row', gap: 8, paddingVertical: 4, paddingHorizontal: 2 },
  chip:           { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  chipActive:     { backgroundColor: 'rgba(0,194,199,0.18)', borderColor: C.accent, shadowColor: C.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 4 },
  chipActiveDot:  { width: 5, height: 5, borderRadius: 3, backgroundColor: C.accent, marginLeft: 2 },
  chipText:       { color: C.textSub,    fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
  chipTextActive: { color: C.accentText, fontWeight: '700' },
});