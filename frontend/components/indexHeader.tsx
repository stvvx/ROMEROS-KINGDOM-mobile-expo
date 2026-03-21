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
  bg:         '#1a0204',
  bgLayer:    '#200305',
  surface:    '#2a0508',
  border:     '#3d0a0d',
  accent:     '#800007',
  accentGlow: 'rgba(128,0,7,0.14)',
  accentText: '#c0000a',
  text:       '#F9F9F9',
  textSub:    '#996250',
  textDim:    '#4a2020',
} as const;

const SIDE_PAD = 16;

/* ════════════════════════════════════════
   CAR LOGO — SVG (side profile silhouette)
════════════════════════════════════════ */
const CarLogo = ({ size = 44 }: { size?: number }) => (
  <Svg width={size} height={size * 0.75} viewBox="0 0 120 70" fill="none">
    <Path d="M6 46 Q6 54 14 54 L106 54 Q114 54 114 46 L114 40 L6 40 Z" fill="#800007" />
    <Path d="M28 40 Q32 22 42 16 Q52 10 60 10 Q72 10 82 16 Q90 22 94 40 Z" fill="#800007" />
    <Path d="M76 40 Q80 26 86 20 Q90 16 93 18 L94 40 Z" fill="#3d0003" opacity="0.85" />
    <Path d="M28 40 Q30 26 36 19 Q40 14 44 14 Q48 12 52 11 L58 11 Q56 20 54 40 Z" fill="#3d0003" opacity="0.85" />
    <Path d="M56 40 Q57 18 62 11 Q70 10 78 14 Q82 22 80 40 Z" fill="#3d0003" opacity="0.7" />
    <Path d="M42 16 Q60 8 82 16" stroke="#996250" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.8" />
    <Path d="M10 43 Q60 39 110 43" stroke="#996250" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5" />
    <Path d="M100 54 Q114 54 116 50 Q117 47 114 46 L114 54 Z" fill="#3d0003" />
    <Path d="M20 54 Q6 54 4 50 Q3 47 6 46 L6 54 Z" fill="#3d0003" />
    <Path d="M104 38 Q108 37 112 39 Q113 41 110 42 L104 42 Z" fill="#F9F9F9" opacity="0.95" />
    <Path d="M16 38 Q12 37 8 39 Q7 41 10 42 L16 42 Z" fill="#996250" opacity="0.9" />
    <Path d="M82 54 Q82 64 92 64 Q102 64 102 54 Z" fill="#1a0204" />
    <Path d="M84 54 Q84 62 92 62 Q100 62 100 54 Z" fill="#2a0508" />
    <Path d="M87 54 Q87 59 92 59 Q97 59 97 54 Z" fill="#800007" opacity="0.6" />
    <Path d="M18 54 Q18 64 28 64 Q38 64 38 54 Z" fill="#1a0204" />
    <Path d="M20 54 Q20 62 28 62 Q36 62 36 54 Z" fill="#2a0508" />
    <Path d="M23 54 Q23 59 28 59 Q33 59 33 54 Z" fill="#800007" opacity="0.6" />
    <Path d="M58 43 Q64 42 70 43 Q70 45 64 45 Q58 45 58 43 Z" fill="#996250" opacity="0.7" />
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
  const normalizedCategories = React.useMemo(() => {
    const raw = Array.isArray(categories) ? categories : [];
    const cleaned = raw
      .map((c) => String(c ?? '').trim())
      .filter(Boolean);

    const withAll = cleaned.some((c) => c.toLowerCase() === 'all')
      ? cleaned
      : ['All', ...cleaned];

    const seen = new Set<string>();
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
    <Animated.View style={[s.mobileHeader, { opacity: headerFade }]}>

      {/* ── Top row ── */}
      <View style={s.topRow}>

        {/* ── Brand lockup ── */}
        <View style={s.brandLockup}>

          {/* Car logo with glow ring */}
          <View style={s.logoWrap}>
            <View style={s.logoGlowRing} />
            <CarLogo size={44} />
          </View>

          {/* Wordmark */}
          <View style={s.wordmark}>
            <View style={s.eyebrowRow}>
              <View style={s.accentBar} />
              <Text style={s.eyebrowText}>DRIFT N'</Text>
            </View>
            <Text style={s.titleText}>DASH</Text>
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
            placeholder="Search hot wheels..."
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
        {normalizedCategories.map((cat) => (
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

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  logoWrap: {
    width: 64,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoGlowRing: {
    position: 'absolute',
    width: 64,
    height: 48,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(128,0,7,0.5)',
    backgroundColor: 'rgba(128,0,7,0.08)',
    shadowColor: '#800007',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 6,
  },

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
    marginLeft: 9,
  },
  tagText: {
    color: C.textDim,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 2.8,
    marginLeft: 9,
    marginTop: 2,
  },

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
  badgeTxt: { color: C.text, fontSize: 8, fontWeight: '800' },

  hamburgerLines: { gap: 4, alignItems: 'flex-end' },
  hamburgerLine:  { width: 20, height: 2, borderRadius: 2, backgroundColor: C.text },

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

  chipRow:        { flexDirection: 'row', gap: 8, paddingVertical: 4, paddingHorizontal: 2 },
  chip:           { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  chipActive:     { backgroundColor: 'rgba(128,0,7,0.18)', borderColor: C.accent, shadowColor: C.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 4 },
  chipActiveDot:  { width: 5, height: 5, borderRadius: 3, backgroundColor: C.accent, marginLeft: 2 },
  chipText:       { color: C.textSub,    fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
  chipTextActive: { color: C.accentText, fontWeight: '700' },
});