import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  TextInput,
  Image,
  ScrollView,
  Platform,
  StatusBar,
  useWindowDimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { getItem, removeItem } from '@/utils/storage';
import { loadCartAsync } from '@/utils/cartDb';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchProducts as fetchProductsAction, resetProducts } from '@/store/slices/productSlice';
import Slider from '@react-native-community/slider';
import axios from 'axios';
import Constants from 'expo-constants';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import IndexHeader from '@/components/indexHeader';

/* ─────────────────────────────────────────
   API URL Resolution
───────────────────────────────────────── */
let API_URL =
  process.env.NGROK_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:4000/api/v1';

const manifest: any =
  (Constants as any).manifest || (Constants as any).expoConfig;
const debuggerHost = manifest?.debuggerHost
  ? manifest.debuggerHost.split(':')[0]
  : null;

if (debuggerHost && debuggerHost !== 'localhost') {
  API_URL = API_URL.replace('localhost', debuggerHost);
} else if (Platform.OS === 'android' && API_URL.includes('localhost')) {
  API_URL = API_URL.replace('localhost', '10.0.2.2');
}

API_URL = API_URL.trim().replace(/\/+$/, '');
if (!API_URL.endsWith('/api/v1')) {
  API_URL = `${API_URL}/api/v1`;
}

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
interface IProduct {
  _id: string;
  name: string;
  price: number;
  description?: string;
  images?: { url: string }[];
  ratings?: number;
  numOfReviews?: number;
  category?: string;
}

type CategoryItem = { _id: string; name: string; count?: number };

/* ─────────────────────────────────────────
   Design Tokens — Blue Robotics
───────────────────────────────────────── */
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
  danger:      '#FF4060',
  dangerBg:    'rgba(255,64,96,0.10)',
  success:     '#00D4AA',
  white:       '#FFFFFF',
  scanLine:    'rgba(0,168,255,0.22)',
};

/* ─────────────────────────────────────────
   Responsive helpers
───────────────────────────────────────── */
const SIDE_PAD = 16;
const CARD_GAP = 10;

function useGrid() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  const numCols = useMemo(() => {
    if (!isWeb) return 2;
    if (width >= 900) return 4;
    if (width >= 600) return 3;
    return 2;
  }, [width, isWeb]);

  const cardWidth = useMemo(() => {
    const totalGap  = CARD_GAP * (numCols - 1);
    const available = width - SIDE_PAD * 2 - totalGap;
    return Math.floor(available / numCols);
  }, [width, numCols]);

  const maxContentWidth = isWeb ? Math.min(width, 1440) : width;
  return { numCols, cardWidth, maxContentWidth, screenWidth: width, isWeb };
}

/* ─────────────────────────────────────────
   Star Rating
───────────────────────────────────────── */
const StarRating = ({ rating = 0, size = 10 }: { rating?: number; size?: number }) => (
  <View style={{ flexDirection: 'row', gap: 1 }}>
    {[1, 2, 3, 4, 5].map((s) => (
      <MaterialCommunityIcons
        key={s}
        name={s <= Math.round(rating) ? 'star' : 'star-outline'}
        size={size}
        color={s <= Math.round(rating) ? C.accent : C.textDim}
      />
    ))}
  </View>
);

/* ─────────────────────────────────────────
   Animated Loader — cyber ring
───────────────────────────────────────── */
const FuturisticLoader = () => {
  const spin  = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 900, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1,   duration: 550, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 550, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View style={s.loaderWrap}>
      <Animated.View style={[s.loaderRing, { transform: [{ rotate }] }]} />
      <Animated.Text style={[s.loaderLabel, { opacity: pulse }]}>SCANNING</Animated.Text>
    </View>
  );
};

/* ─────────────────────────────────────────
   Product Card
───────────────────────────────────────── */
const ProductCard = React.memo(({ item, index, cardWidth, isWeb }: {
  item: IProduct; index: number; cardWidth: number; isWeb: boolean;
}) => {
  const router = useRouter();
  const fade  = useRef(new Animated.Value(0)).current;
  const ty    = useRef(new Animated.Value(24)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const glow  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 420, delay: (index % 8) * 55, useNativeDriver: true }),
      Animated.timing(ty,   { toValue: 0, duration: 420, delay: (index % 8) * 55, useNativeDriver: true }),
    ]).start();
  }, []);

  const pressIn  = () => Animated.parallel([
    Animated.spring(scale, { toValue: 0.965, useNativeDriver: true }),
    Animated.timing(glow, { toValue: 1, duration: 130, useNativeDriver: false }),
  ]).start();

  const pressOut = () => Animated.parallel([
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
    Animated.timing(glow, { toValue: 0, duration: 180, useNativeDriver: false }),
  ]).start();

  const borderColor = glow.interpolate({ inputRange: [0, 1], outputRange: [C.border, C.accent] });
  const imgUrl      = item.images?.[0]?.url;
  const imgHeight   = isWeb ? cardWidth * 1.0 : cardWidth * 0.88;

  return (
    <Animated.View style={{ width: cardWidth, opacity: fade, transform: [{ translateY: ty }, { scale }], marginBottom: CARD_GAP + 2 }}>
      <Animated.View style={[s.card, { borderColor }]}>
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={pressIn}
          onPressOut={pressOut}
          onPress={() => router.push({ pathname: '/(user)/ProductDetails', params: { id: item._id } })}
        >
          <View style={[s.cardImgWrap, { height: imgHeight }]}>
            {imgUrl ? (
              <Image source={{ uri: imgUrl }} style={s.cardImg} resizeMode="cover" />
            ) : (
              <View style={s.cardImgPlaceholder}>
                <MaterialCommunityIcons name="robot-outline" size={isWeb ? 42 : 34} color={C.textDim} />
              </View>
            )}
            {/* Cyan scan-line shimmer */}
            <View style={s.scanLine} />
            {/* Corner circuit ticks */}
            <View style={s.cardCornerTL} />
            <View style={s.cardCornerTR} />
            {item.category ? (
              <View style={s.catBadge}>
                <Text style={s.catBadgeText}>{item.category.toUpperCase()}</Text>
              </View>
            ) : null}
          </View>

          <View style={[s.cardBody, isWeb && s.cardBodyWeb]}>
            {/* Left accent bracket */}
            <View style={s.cardBracket} />
            <Text style={[s.cardName, isWeb && s.cardNameWeb]} numberOfLines={2}>{item.name}</Text>
            {(item.ratings ?? 0) > 0 && (
              <View style={s.cardRatingRow}>
                <StarRating rating={item.ratings} size={isWeb ? 11 : 9} />
                {item.numOfReviews != null && <Text style={s.cardReviews}>({item.numOfReviews})</Text>}
              </View>
            )}
            <View style={s.cardFooter}>
              <View>
                <Text style={s.priceTag}>UNIT COST</Text>
                <Text style={[s.cardPrice, isWeb && s.cardPriceWeb]}>₱{item.price.toLocaleString()}</Text>
              </View>
              <TouchableOpacity style={s.addBtn} activeOpacity={0.75}>
                <Feather name="plus" size={16} color={C.accent} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[s.corner, s.cornerTL]} />
          <View style={[s.corner, s.cornerBR]} />
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
});

/* ─────────────────────────────────────────
   Category icon map
───────────────────────────────────────── */
type IconLib = 'feather' | 'mci' | 'ion';
interface CatIconCfg { lib: IconLib; name: string }

function getCatIcon(label: string): CatIconCfg {
  const key = label.toLowerCase().replace(/\s+/g, '');
  const map: Record<string, CatIconCfg> = {
    all:         { lib: 'mci',     name: 'view-grid-outline' },
    electronics: { lib: 'mci',     name: 'lightning-bolt' },
    phones:      { lib: 'feather', name: 'smartphone' },
    laptops:     { lib: 'feather', name: 'monitor' },
    computers:   { lib: 'feather', name: 'monitor' },
    accessories: { lib: 'feather', name: 'headphones' },
    clothing:    { lib: 'ion',     name: 'shirt-outline' },
    shoes:       { lib: 'mci',     name: 'shoe-sneaker' },
    bags:        { lib: 'mci',     name: 'bag-personal-outline' },
    watches:     { lib: 'feather', name: 'watch' },
    jewelry:     { lib: 'mci',     name: 'diamond-outline' },
    food:        { lib: 'mci',     name: 'food-outline' },
    drinks:      { lib: 'mci',     name: 'cup-outline' },
    grocery:     { lib: 'mci',     name: 'cart-outline' },
    beauty:      { lib: 'mci',     name: 'shimmer' },
    health:      { lib: 'mci',     name: 'pill' },
    sports:      { lib: 'mci',     name: 'basketball-outline' },
    toys:        { lib: 'mci',     name: 'gamepad-variant-outline' },
    books:       { lib: 'feather', name: 'book-open' },
    furniture:   { lib: 'mci',     name: 'sofa-outline' },
    home:        { lib: 'feather', name: 'home' },
    tools:       { lib: 'feather', name: 'tool' },
    automotive:  { lib: 'mci',     name: 'car-outline' },
    garden:      { lib: 'mci',     name: 'flower-outline' },
    pets:        { lib: 'mci',     name: 'paw-outline' },
    art:         { lib: 'feather', name: 'pen-tool' },
    music:       { lib: 'feather', name: 'music' },
    games:       { lib: 'mci',     name: 'dice-multiple-outline' },
    babies:      { lib: 'mci',     name: 'baby-carriage' },
    stationery:  { lib: 'feather', name: 'edit-2' },
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

/* ─────────────────────────────────────────
   Category Chip
───────────────────────────────────────── */
export const Chip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => {
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

/* ─────────────────────────────────────────
   Home Screen
───────────────────────────────────────── */
export default function Home() {
  const { keyword: routeKw } = useLocalSearchParams<{ keyword?: string }>();
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const { numCols, cardWidth, maxContentWidth, isWeb } = useGrid();

  const {
    products, productsCount, filteredCount, resPerPage,
    loading, loadingMore, error, hasMore,
  } = useAppSelector((state) => state.product);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cartCount,  setCartCount]  = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const [profile,    setProfile]    = useState<{ name?: string; avatar?: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          const token = await getItem('authToken');
          if (!mounted) return;
          setIsLoggedIn(!!token);
          const rawUser = await getItem('user');
          if (mounted && rawUser) {
            try {
              const u = JSON.parse(rawUser);
              if (u?.role === 'admin') { router.replace('/(admin)/dashboard'); return; }
              setProfile({ name: u.name, avatar: u.avatar?.url || u.avatar || undefined });
            } catch { setProfile({ name: rawUser }); }
          }
        } catch { setIsLoggedIn(false); }
        try {
          const items = await loadCartAsync();
          if (mounted) setCartCount(items.reduce((sum: number, i: any) => sum + i.quantity, 0));
        } catch (err) { console.warn('[home] cart load error', err); }
        await fetchNotificationCount();
      })();
      return () => { mounted = false; };
    }, [])
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await getItem('authToken');
        if (!mounted) return;
        setIsLoggedIn(!!token);
        const rawUser = await getItem('user');
        if (mounted && rawUser) {
          try {
            const u = JSON.parse(rawUser);
            if (u?.role === 'admin') { router.replace('/(admin)/dashboard'); return; }
            setProfile({ name: u.name, avatar: u.avatar?.url || u.avatar || undefined });
          } catch { setProfile({ name: rawUser }); }
        }
      } catch { setIsLoggedIn(false); }
      try {
        const items = await loadCartAsync();
        if (mounted) setCartCount(items.reduce((sum: number, i: any) => sum + i.quantity, 0));
      } catch (err) { console.warn('[home] cart load error', err); }
      await fetchNotificationCount();
    })();
    return () => { mounted = false; };
  }, []);

  /* Filter state */
  const [categories,     setCategories]     = useState<CategoryItem[]>([{ _id: 'All', name: 'All' }]);
  const [price,          setPrice]          = useState<[number, number]>([1, 10000]);
  const [currentPage,    setCurrentPage]    = useState(1);
  const [activeCategory, setActiveCategory] = useState<CategoryItem>({ _id: 'All', name: 'All' });
  const [filterOpen,     setFilterOpen]     = useState(false);
  const [menuOpen,       setMenuOpen]       = useState(false);

  const visibleProducts = useMemo(() => {
    if (activeCategory._id === 'All') return products;

    const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase();
    const accepted = new Set([
      normalize(activeCategory._id),
      normalize(activeCategory.name),
    ]);

    return products.filter((p) => accepted.has(normalize(p.category)));
  }, [products, activeCategory]);

  /* Live Search */
  const [searchQuery,   setSearchQuery]   = useState(routeKw ?? '');
  const [activeKeyword, setActiveKeyword] = useState(routeKw ?? '');
  const searchDebounce  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setActiveKeyword(text.trim());
      setCurrentPage(1);
      dispatch(resetProducts());
    }, 400);
  };

  const handleSearchClear = () => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    setSearchQuery('');
    setActiveKeyword('');
    setCurrentPage(1);
    dispatch(resetProducts());
    router.push('/');
  };

  const handleSearchSubmit = () => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    const q = searchQuery.trim();
    setActiveKeyword(q);
    setCurrentPage(1);
    dispatch(resetProducts());
    router.push(q ? { pathname: '/', params: { keyword: q } } : '/');
  };

  /* Animations */
  const headerFade         = useRef(new Animated.Value(0)).current;
  const filterH            = useRef(new Animated.Value(0)).current;
  const menuSlide          = useRef(new Animated.Value(-300)).current;
  const menuOverlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    Animated.timing(filterH, { toValue: filterOpen ? 1 : 0, duration: 260, useNativeDriver: false }).start();
  }, [filterOpen]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(menuSlide,          { toValue: menuOpen ? 0 : -300, duration: 280, useNativeDriver: true }),
      Animated.timing(menuOverlayOpacity, { toValue: menuOpen ? 1 : 0,    duration: 280, useNativeDriver: true }),
    ]).start();
  }, [menuOpen]);

  const animatedFilterH = filterH.interpolate({ inputRange: [0, 1], outputRange: [0, 140] });

  const fetchCategories = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/products/categories`, { timeout: 8000 });
      const raw: any = res.data?.categories ?? res.data ?? [];
      const cats: CategoryItem[] = Array.isArray(raw)
        ? raw.map((c: any): CategoryItem => {
            if (typeof c === 'string') {
              const value = c.trim();
              return { _id: value, name: value };
            }
            const id   = c?._id ?? c?.id ?? c?.value;
            const name = c?.name ?? c?.category;
            return {
              _id: id ? String(id).trim() : '',
              name: name ? String(name).trim() : '',
              count: c?.count,
            };
          }).filter((c) => Boolean(c._id) && Boolean(c.name))
        : [];

      if (cats.length > 0) {
        const seen = new Set<string>();
        const unique = cats.filter((c) => {
          const key = `${c._id.toLowerCase()}::${c.name.toLowerCase()}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setCategories([{ _id: 'All', name: 'All' }, ...unique]);
      }
    } catch {}
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    dispatch(resetProducts());
  }, [activeKeyword, price, activeCategory]);

  const fetchProducts = useCallback(async (page: number, isLoadMore = false) => {
    // Send both id and label so backend can match legacy (name) and newer (id) category values.
    const categoryFilter = activeCategory._id === 'All'
      ? undefined
      : `${activeCategory._id}|||${activeCategory.name}`;
    await dispatch(fetchProductsAction({ page, isLoadMore, price, keyword: activeKeyword, category: categoryFilter }));
  }, [activeKeyword, price, activeCategory]);

  useEffect(() => { fetchProducts(1, false); }, [fetchProducts]);

  const loadMoreProducts = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchProducts(nextPage, true);
    }
  }, [loadingMore, hasMore, loading, currentPage, fetchProducts]);

  const fetchNotificationCount = useCallback(async () => {
    try {
      const token = await getItem('authToken');
      if (!token) { setNotifCount(0); return; }
      const res  = await axios.get(`${API_URL}/notifications`, { headers: { Authorization: `Bearer ${token}` }, timeout: 8000 });
      const list = res.data?.notifications || [];
      setNotifCount(Array.isArray(list) ? list.filter((n: any) => !n.isRead).length : 0);
    } catch { setNotifCount(0); }
  }, []);

  useEffect(() => { fetchCategories(); }, []);

  const handleLogout = async () => {
    try {
      await removeItem('authToken');
      await removeItem('user');
      setIsLoggedIn(false);
      setCartCount(0);
      setNotifCount(0);

      const goAfterLogout = () => {
        if (Platform.OS === 'web') { window.location.href = '/'; }
        else { router.replace('/(tabs)'); }
      };

      if (Platform.OS === 'web') {
        window.alert('You have been logged out successfully.');
        goAfterLogout();
      } else {
        Alert.alert('Logged Out', 'You have been logged out successfully.', [
          { text: 'OK', onPress: goAfterLogout },
        ]);
      }
    } catch { Alert.alert('Error', 'Failed to logout. Please try again.'); }
  };

  const handleLoginPress  = () => router.push('/(auth)/login');

  const handleCartPress = () => {
    if (isLoggedIn) { router.push('/(user)/cart'); }
    else {
      Alert.alert('Authentication Required', 'Please sign in to access your cart.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/(auth)/login') },
      ]);
    }
  };

  const handleNotificationPress = () => {
    if (isLoggedIn) { setNotifCount(0); router.push('/(user)/notifications'); }
    else {
      Alert.alert('Authentication Required', 'Please sign in to view notifications.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/(auth)/login') },
      ]);
    }
  };

  const webLayout = isWeb && maxContentWidth >= 900;

  /* ─────────────────── RENDER ─────────────────── */
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ══ WEB: Top Navbar ══ */}
      {isWeb && (
        <View style={s.webNav}>
          <View style={[s.webNavInner, { maxWidth: maxContentWidth }]}>

            {/* Brand */}
            <View style={s.webNavBrand}>
              <View style={s.webNavBrandIcon}>
                <MaterialCommunityIcons name="robot-outline" size={18} color={C.accent} />
                {/* status dot */}
                <View style={s.navStatusDot} />
              </View>
              <View>
                <Text style={s.webNavTitle}>ROMERO'S KINGDOM</Text>
                <Text style={s.webNavTagline}>AUTONOMOUS COMMERCE UNIT</Text>
              </View>
            </View>

            {/* Search */}
            <View style={s.webSearchBox}>
              <Feather name="cpu" size={15} color={C.accent} />
              <TextInput
                style={s.webSearchInput}
                placeholder="Query the inventory..."
                placeholderTextColor={C.textDim}
                value={searchQuery}
                onChangeText={handleSearchChange}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
                selectionColor={C.accent}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={handleSearchClear}>
                  <Feather name="x" size={14} color={C.textSub} />
                </TouchableOpacity>
              )}
            </View>

            {/* Nav actions */}
            <View style={s.webNavRight}>
              {!isLoggedIn ? (
                <TouchableOpacity style={s.webNavBtn} onPress={handleLoginPress}>
                  <Feather name="shield" size={13} color={C.text} />
                  <Text style={s.webNavBtnTxt}>SIGN IN</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity style={s.webNavBtn} onPress={handleCartPress}>
                    <Feather name="shopping-cart" size={13} color={C.text} />
                    <Text style={s.webNavBtnTxt}>CART</Text>
                    {cartCount > 0 && <View style={s.badge}><Text style={s.badgeTxt}>{cartCount}</Text></View>}
                  </TouchableOpacity>
                  <TouchableOpacity style={s.webNavBtn} onPress={handleNotificationPress}>
                    <Feather name="bell" size={13} color={C.text} />
                    <Text style={s.webNavBtnTxt}>ALERTS</Text>
                    {notifCount > 0 && <View style={s.badge}><Text style={s.badgeTxt}>{notifCount}</Text></View>}
                  </TouchableOpacity>
                  <TouchableOpacity style={s.webNavProfile} onPress={() => router.push('/(user)/UserProfile')}>
                    {profile?.avatar ? (
                      <Image source={{ uri: profile.avatar }} style={s.webAvatar} />
                    ) : (
                      <Feather name="user" size={15} color={C.text} />
                    )}
                    <Text style={s.webNavName}>{profile?.name ?? 'OPERATOR'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.webNavBtn} onPress={handleLogout}>
                    <Feather name="log-out" size={13} color={C.text} />
                    <Text style={s.webNavBtnTxt}>EXIT</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      )}

      {/* ══ MOBILE: Header ══ */}
      {!isWeb && (
        <IndexHeader
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onSearchSubmit={handleSearchSubmit}
          onSearchClear={handleSearchClear}
          filterOpen={filterOpen}
          onToggleFilter={() => setFilterOpen((v) => !v)}
          animatedFilterH={animatedFilterH}
          price={price}
          onPriceChange={(val) => setPrice([price[0], val])}
          categories={categories.map((c) => c.name)}
          activeCategory={activeCategory.name}
          onCategoryChange={(name) => {
            const target = name.trim().toLowerCase();
            const found = categories.find((c) => c.name.trim().toLowerCase() === target);
            setActiveCategory(found ?? { _id: 'All', name: 'All' });
          }}
          onMenuOpen={() => setMenuOpen(true)}
          onCartPress={handleCartPress}
          onNotificationPress={handleNotificationPress}
          cartCount={cartCount}
          notifCount={notifCount}
          headerFade={headerFade}
        />
      )}

      {/* ══ BODY ══ */}
      <View style={[s.body, webLayout && s.bodyWeb, isWeb && { alignItems: 'center' }]}>

        {/* Web Sidebar */}
        {webLayout && (
          <View style={s.sidebar}>
            <View style={s.sidebarTitleRow}>
              <View style={s.sidebarTitleTick} />
              <Text style={s.sidebarTitle}>FILTERS</Text>
            </View>
            <View style={s.sidebarSection}>
              <Text style={s.sidebarLabel}>PRICE RANGE</Text>
              <Text style={s.sidebarValue}>₱{price[0].toLocaleString()} — ₱{price[1].toLocaleString()}</Text>
              <Slider
                minimumValue={1} maximumValue={10000} step={50} value={price[1]}
                onValueChange={(v) => setPrice([price[0], Math.max(price[0] + 50, v)])}
                minimumTrackTintColor={C.accent}
                maximumTrackTintColor={C.border}
                thumbTintColor={C.accent}
                style={{ height: 36, marginTop: 6 }}
              />
            </View>
            <View style={s.sidebarSection}>
              <Text style={s.sidebarLabel}>CATEGORIES</Text>
              <View style={s.sidebarCats}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat._id}
                    onPress={() => setActiveCategory(cat)}
                    style={[s.sidebarCatRow, activeCategory._id === cat._id && s.sidebarCatRowActive]}
                  >
                    <CatIconComponent label={cat.name} size={14} color={activeCategory._id === cat._id ? C.accent : C.textSub} />
                    <Text style={[s.sidebarCatTxt, activeCategory._id === cat._id && s.sidebarCatTxtActive]}>{cat.name}</Text>
                    {activeCategory._id === cat._id && (
                      <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <View style={s.sidebarActiveLine} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Main Content */}
        <View style={[s.main, webLayout && s.mainWeb]}>
          {isWeb && !webLayout && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.chipRow, { marginBottom: 12 }]}>
              {categories.map((cat) => (
                <Chip key={cat._id} label={cat.name} active={activeCategory._id === cat._id} onPress={() => setActiveCategory(cat)} />
              ))}
            </ScrollView>
          )}

          {loading ? (
            <FuturisticLoader />
          ) : error ? (
            <View style={s.centerWrap}>
              <View style={s.errorBox}>
                <Feather name="alert-triangle" size={36} color={C.danger} />
                <Text style={s.errorTitle}>UPLINK FAILURE</Text>
                <Text style={s.errorMsg}>{error}</Text>
                <TouchableOpacity style={s.retryBtn} onPress={() => fetchProducts(1, false)}>
                  <Text style={s.retryTxt}>RETRY</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : visibleProducts.length === 0 ? (
            <View style={s.centerWrap}>
              <MaterialCommunityIcons name="robot-confused-outline" size={52} color={C.textDim} />
              <Text style={s.emptyTitle}>NO UNITS FOUND</Text>
              <Text style={s.emptyMsg}>Adjust filters or query parameters</Text>
            </View>
          ) : (
            <FlatList<IProduct>
              key={`grid-${numCols}`}
              data={visibleProducts}
              keyExtractor={(item) => item._id}
              numColumns={numCols}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[s.grid, isWeb && s.gridWeb]}
              columnWrapperStyle={numCols > 1 ? s.gridRow : undefined}
              renderItem={({ item, index }) => (
                <ProductCard item={item} index={index} cardWidth={cardWidth} isWeb={isWeb} />
              )}
              ListHeaderComponent={
                <View style={s.resultsBar}>
                  <View style={s.resultsBarTick} />
                  <Text style={s.resultsCount}>{visibleProducts.length.toLocaleString()} UNITS INDEXED</Text>
                  {activeKeyword ? <Text style={s.resultsKw}>· "{activeKeyword}"</Text> : null}
                  {activeCategory._id !== 'All' ? <Text style={s.resultsCat}>· {activeCategory.name}</Text> : null}
                </View>
              }
              ListFooterComponent={
                <View style={s.footer}>
                  {loadingMore && (
                    <View style={s.loadingMoreContainer}>
                      <ActivityIndicator size="small" color={C.accent} />
                      <Text style={s.loadingMoreText}>FETCHING DATA...</Text>
                    </View>
                  )}
                  {!hasMore && visibleProducts.length > 0 && (
                    <View style={s.endOfListContainer}>
                      <MaterialCommunityIcons name="check-circle-outline" size={16} color={C.textDim} style={{ marginBottom: 4 }} />
                      <Text style={s.endOfListText}>END OF INVENTORY</Text>
                    </View>
                  )}
                </View>
              }
              onEndReached={loadMoreProducts}
              onEndReachedThreshold={0.3}
              refreshing={loading}
              onRefresh={() => { setCurrentPage(1); fetchProducts(1, false); }}
            />
          )}
        </View>
      </View>



      {/* ══ MOBILE: Hamburger Drawer ══ */}
      {!isWeb && menuOpen && (
        <>
          <Animated.View style={[s.drawerBackdrop, { opacity: menuOverlayOpacity }]}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setMenuOpen(false)} />
          </Animated.View>

          <Animated.View style={[s.drawerPanel, { transform: [{ translateX: menuSlide }] }]}>
            <View style={s.drawerHeader}>
              <View style={s.drawerBrandRow}>
                <View style={s.drawerBrandIcon}>
                  <MaterialCommunityIcons name="robot-outline" size={18} color={C.accent} />
                </View>
                <View>
                  <Text style={s.drawerEyebrow}>ROMERO'S KINGDOM</Text>
                  <Text style={s.drawerTitle}>MENU</Text>
                </View>
              </View>
              <TouchableOpacity style={s.drawerCloseBtn} onPress={() => setMenuOpen(false)}>
                <Feather name="x" size={18} color={C.textSub} />
              </TouchableOpacity>
            </View>

            {isLoggedIn && (
              <TouchableOpacity
                style={s.drawerProfile}
                onPress={() => { setMenuOpen(false); router.push('/(user)/UserProfile'); }}
              >
                <View style={s.drawerAvatarWrap}>
                  {profile?.avatar ? (
                    <Image source={{ uri: profile.avatar }} style={s.drawerAvatar} />
                  ) : (
                    <Feather name="user" size={26} color={C.textSub} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.drawerProfileName}>{profile?.name ?? 'OPERATOR'}</Text>
                  <Text style={s.drawerProfileSub}>VIEW PROFILE →</Text>
                </View>
              </TouchableOpacity>
            )}

            <View style={s.drawerDivider} />

            {!isLoggedIn ? (
              <TouchableOpacity style={s.drawerItem} onPress={() => { setMenuOpen(false); handleLoginPress(); }}>
                <Feather name="shield" size={20} color={C.textSub} style={s.drawerIconStyle} />
                <Text style={s.drawerItemLabel}>Sign In</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={s.drawerItem} onPress={() => { setMenuOpen(false); handleCartPress(); }}>
                  <Feather name="shopping-cart" size={20} color={C.textSub} style={s.drawerIconStyle} />
                  <Text style={s.drawerItemLabel}>Cart</Text>
                  {cartCount > 0 && <View style={s.drawerBadge}><Text style={s.drawerBadgeTxt}>{cartCount}</Text></View>}
                </TouchableOpacity>

                <TouchableOpacity style={s.drawerItem} onPress={() => { setMenuOpen(false); handleNotificationPress(); }}>
                  <Feather name="bell" size={20} color={C.textSub} style={s.drawerIconStyle} />
                  <Text style={s.drawerItemLabel}>Notifications</Text>
                  {notifCount > 0 && <View style={s.drawerBadge}><Text style={s.drawerBadgeTxt}>{notifCount}</Text></View>}
                </TouchableOpacity>

                <TouchableOpacity style={s.drawerItem} onPress={() => { setMenuOpen(false); router.push('/(user)/UserProfile'); }}>
                  <Feather name="user" size={20} color={C.textSub} style={s.drawerIconStyle} />
                  <Text style={s.drawerItemLabel}>My Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.drawerItem} onPress={() => { setMenuOpen(false); router.push('/(user)/orders'); }}>
                  <MaterialCommunityIcons name="package-variant-closed" size={20} color={C.textSub} style={s.drawerIconStyle} />
                  <Text style={s.drawerItemLabel}>My Orders</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.drawerItem} onPress={() => { setMenuOpen(false); router.push('/(user)/vouchers'); }}>
                  <MaterialCommunityIcons name="ticket-percent-outline" size={20} color={C.textSub} style={s.drawerIconStyle} />
                  <Text style={s.drawerItemLabel}>My Vouchers</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.drawerItem} onPress={() => { setMenuOpen(false); router.push('/(user)/review'); }}>
                  <MaterialCommunityIcons name="star-outline" size={20} color={C.textSub} style={s.drawerIconStyle} />
                  <Text style={s.drawerItemLabel}>My Reviews</Text>
                </TouchableOpacity>

                <View style={s.drawerDivider} />

                <TouchableOpacity style={[s.drawerItem, s.drawerItemDanger]} onPress={() => { setMenuOpen(false); handleLogout(); }}>
                  <Feather name="log-out" size={20} color={C.danger} style={s.drawerIconStyle} />
                  <Text style={[s.drawerItemLabel, { color: C.danger }]}>Logout</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </>
      )}
    </View>
  );
}

/* ─────────────────────────────────────────
   StyleSheet
───────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // ── Loader ──
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 18, minHeight: 300 },
  loaderRing: {
    width: 50, height: 50, borderRadius: 25, borderWidth: 2.5,
    borderTopColor: 'transparent',
    borderLeftColor: C.accentDim,
    borderRightColor: C.accent,
    borderBottomColor: C.accent,
  },
  loaderLabel: {
    color: C.accent, fontSize: 10, letterSpacing: 5, fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  // ── Web Nav ──
  webNav: {
    backgroundColor: C.bgLayer,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    alignItems: 'center',
    zIndex: 100,
    ...(Platform.OS === 'web' ? ({ position: 'sticky', top: 0 } as any) : {}),
  },
  webNavInner: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SIDE_PAD * 2, paddingVertical: 14, gap: 20,
  },
  webNavBrand:    { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 220 },
  webNavBrandIcon: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  navStatusDot: {
    position: 'absolute', top: 2, right: 2,
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: C.success,
    shadowColor: C.success, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 4, elevation: 3,
  },
  webNavTitle: {
    color: C.text, fontSize: 13, fontWeight: '800', letterSpacing: 2.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  webNavTagline: {
    color: C.accentDim, fontSize: 7, fontWeight: '700', letterSpacing: 2, marginTop: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  webSearchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 8,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, height: 44, gap: 8, maxWidth: 540,
  },
  webSearchInput: {
    flex: 1, color: C.text, fontSize: 14, paddingVertical: 0,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  webNavRight:   { minWidth: 200, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end' },
  webNavBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.surface,
  },
  webNavBtnTxt: {
    color: C.text, fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  webNavProfile: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  webAvatar:  { width: 32, height: 32, borderRadius: 8 },
  webNavName: {
    color: C.text, fontSize: 11, fontWeight: '700', letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  badge:    { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center' },
  badgeTxt: { color: C.bg, fontSize: 8, fontWeight: '800' },

  // ── Body layout ──
  body:    { flex: 1 },
  bodyWeb: { flexDirection: 'row', justifyContent: 'center' },

  // ── Sidebar ──
  sidebar: {
    width: 220, backgroundColor: C.bgLayer, borderRightWidth: 1, borderRightColor: C.border,
    paddingHorizontal: 20, paddingTop: 28, paddingBottom: 40,
    ...(Platform.OS === 'web' ? ({ position: 'sticky', top: 73, alignSelf: 'flex-start', height: '100vh' } as any) : {}),
  },
  sidebarTitleRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  sidebarTitleTick:    { width: 3, height: 14, backgroundColor: C.accent, borderRadius: 2 },
  sidebarTitle:        {
    color: C.accent, fontSize: 10, letterSpacing: 3, fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  sidebarSection:      { marginBottom: 24, borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 20 },
  sidebarLabel:        {
    color: C.textSub, fontSize: 9, letterSpacing: 2, fontWeight: '700', marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  sidebarValue:        { color: C.text, fontSize: 13, fontWeight: '600' },
  sidebarCats:         { gap: 4, marginTop: 4 },
  sidebarCatRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 6 },
  sidebarCatRowActive: { backgroundColor: C.accentGlow, borderLeftWidth: 2, borderLeftColor: C.accent },
  sidebarActiveLine:   { width: 4, height: 4, borderRadius: 2, backgroundColor: C.accent },
  sidebarCatTxt:       { color: C.textSub, fontSize: 13, fontWeight: '500', flex: 1 },
  sidebarCatTxtActive: { color: C.accentText, fontWeight: '700' },

  // ── Main content ──
  main:    { flex: 1 },
  mainWeb: { maxWidth: 1220, width: '100%' },

  // ── Results bar ──
  resultsBar:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, marginTop: 16 },
  resultsBarTick:{ width: 3, height: 12, backgroundColor: C.accent, borderRadius: 2, marginRight: 2 },
  resultsCount: {
    color: C.accent, fontSize: 9, fontWeight: '700', letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  resultsKw:    { color: C.textSub,    fontSize: 12 },
  resultsCat:   { color: C.accentText, fontSize: 12, fontWeight: '600' },

  // ── Grid ──
  grid:    { paddingHorizontal: SIDE_PAD, paddingBottom: 80 },
  gridWeb: { paddingHorizontal: SIDE_PAD * 2, paddingTop: 4 },
  gridRow: { justifyContent: 'space-between' },

  // ── Card ──
  card:             { backgroundColor: C.surface, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  cardImgWrap:      { width: '100%', backgroundColor: C.bgLayer, overflow: 'hidden' },
  cardImg:          { width: '100%', height: '100%' },
  cardImgPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bgLayer },
  scanLine:         { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: C.accent, opacity: 0.3 },
  cardCornerTL:     { position: 'absolute', top: 0,    left: 0,  width: 14, height: 2, backgroundColor: C.accent, opacity: 0.7 },
  cardCornerTR:     { position: 'absolute', top: 0,    right: 0, width: 14, height: 2, backgroundColor: C.accent, opacity: 0.7 },
  catBadge:         { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.7)', borderWidth: 1, borderColor: C.accentDim, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  catBadgeText:     {
    color: C.accent, fontSize: 7, fontWeight: '700', letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  cardBody:         { padding: 10, gap: 4 },
  cardBodyWeb:      { padding: 12, gap: 5 },
  cardBracket:      { position: 'absolute', left: 0, top: 0, bottom: 0, width: 2.5, backgroundColor: C.accentDim, borderRadius: 1 },
  cardName:         { color: C.text, fontSize: 12, fontWeight: '600', lineHeight: 17, paddingLeft: 6 },
  cardNameWeb:      { fontSize: 13 },
  cardRatingRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardReviews:      { color: C.textDim, fontSize: 9 },
  cardFooter:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 },
  priceTag:         {
    color: C.textDim, fontSize: 7, letterSpacing: 1.5, fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  cardPrice:        { color: C.accentText, fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  cardPriceWeb:     { fontSize: 16 },
  addBtn:           { width: 30, height: 30, borderRadius: 8, backgroundColor: C.accentGlow, borderWidth: 1, borderColor: C.accent, justifyContent: 'center', alignItems: 'center' },
  corner:           { position: 'absolute', backgroundColor: C.accent, opacity: 0.5 },
  cornerTL:         { top: 0,    left: 0,  width: 16, height: 1.5 },
  cornerBR:         { bottom: 0, right: 0, width: 16, height: 1.5 },

  // ── States ──
  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SIDE_PAD, gap: 10, minHeight: 300 },
  errorBox:   { backgroundColor: C.dangerBg, borderWidth: 1, borderColor: C.danger, borderRadius: 14, padding: 26, alignItems: 'center', width: '100%', maxWidth: 320, gap: 8 },
  errorTitle: {
    color: C.danger, fontSize: 12, fontWeight: '700', letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  errorMsg:   { color: C.textSub, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  retryBtn:   { marginTop: 8, paddingHorizontal: 28, paddingVertical: 11, borderRadius: 8, backgroundColor: C.danger },
  retryTxt:   {
    color: C.white, fontWeight: '700', fontSize: 11, letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  emptyTitle: {
    color: C.textSub, fontSize: 14, fontWeight: '700', letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  emptyMsg:   { color: C.textDim, fontSize: 12 },

  // ── Footer / load more ──
  footer:               { paddingVertical: 20 },
  loadingMoreContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, paddingVertical: 16 },
  loadingMoreText:      {
    color: C.accent, fontSize: 10, fontWeight: '700', letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  endOfListContainer:   { paddingVertical: 24, alignItems: 'center', gap: 4 },
  endOfListText:        {
    color: C.textDim, fontSize: 10, fontWeight: '600', letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  // ── Debug bar ──
  debugBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.9)', paddingVertical: 4, paddingHorizontal: 10 },
  debugTxt:  { color: C.accent, fontSize: 9, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  // ── Category chips ──
  chipRow:        { flexDirection: 'row', gap: 8, paddingVertical: 4, paddingHorizontal: 2 },
  chip:           { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  chipActive:     { backgroundColor: C.accentGlow, borderColor: C.accent, shadowColor: C.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 8, elevation: 4 },
  chipActiveDot:  { width: 5, height: 5, borderRadius: 3, backgroundColor: C.accent, marginLeft: 2 },
  chipText:       {
    color: C.textSub, fontSize: 10, fontWeight: '600', letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  chipTextActive: { color: C.accentText, fontWeight: '700' },

  // ── Drawer ──
  drawerBackdrop:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 200 },
  drawerPanel:       { position: 'absolute', top: 0, left: 0, bottom: 0, width: 280, backgroundColor: C.bgLayer, borderRightWidth: 1, borderRightColor: C.border, zIndex: 201, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: 40 },
  drawerHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 20 },
  drawerBrandRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  drawerBrandIcon:   { width: 36, height: 36, borderRadius: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  drawerEyebrow:     {
    color: C.accent, fontSize: 8, letterSpacing: 2.5, fontWeight: '700', marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  drawerTitle:       {
    color: C.text, fontSize: 20, fontWeight: '800', letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  drawerCloseBtn:    { width: 38, height: 38, borderRadius: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  drawerProfile:     { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 16, marginBottom: 16, padding: 14, backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  drawerAvatarWrap:  { width: 48, height: 48, borderRadius: 10, backgroundColor: C.bgLayer, borderWidth: 1, borderColor: C.accentDim, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  drawerAvatar:      { width: 48, height: 48, borderRadius: 10 },
  drawerProfileName: {
    color: C.text, fontSize: 13, fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  drawerProfileSub:  {
    color: C.accent, fontSize: 9, marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  drawerDivider:     { height: 1, backgroundColor: C.border, marginHorizontal: 16, marginVertical: 10 },
  drawerItem:        { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 22, paddingVertical: 14 },
  drawerItemDanger:  { marginTop: 4 },
  drawerIconStyle:   { width: 28, textAlign: 'center' } as any,
  drawerItemLabel:   { flex: 1, color: C.text, fontSize: 14, fontWeight: '600', letterSpacing: 0.5 },
  drawerBadge:       { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  drawerBadgeTxt:    { color: C.bg, fontSize: 10, fontWeight: '800' },
});