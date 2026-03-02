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
import Slider from '@react-native-community/slider';
import axios from 'axios';
import Constants from 'expo-constants';

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

/* ─────────────────────────────────────────
   Design Tokens — "Clean Futurism"
───────────────────────────────────────── */
const C = {
  bg:         '#0E1117',
  bgLayer:    '#12151F',
  surface:    '#1A1E2E',
  border:     '#262D42',
  accent:     '#00C2C7',
  accentDim:  '#007F84',
  accentGlow: 'rgba(0,194,199,0.12)',
  accentText: '#00E5EB',
  mint:       '#3DFFC0',
  text:       '#E8EDF5',
  textSub:    '#7A859E',
  textDim:    '#353D52',
  danger:     '#FF5A6E',
  dangerBg:   'rgba(255,90,110,0.10)',
  white:      '#FFFFFF',
};

/* ─────────────────────────────────────────
   Responsive helpers
   • Web ≥ 900px  → 4 columns
   • Web 600-899  → 3 columns
   • Mobile / <600 → 2 columns
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
    const totalGap = CARD_GAP * (numCols - 1);
    const available = width - SIDE_PAD * 2 - totalGap;
    return Math.floor(available / numCols);
  }, [width, numCols]);

  // On web, cap the content to a max-width container
  const maxContentWidth = isWeb ? Math.min(width, 1440) : width;

  return { numCols, cardWidth, maxContentWidth, screenWidth: width, isWeb };
}

/* ─────────────────────────────────────────
   Star Rating
───────────────────────────────────────── */
const StarRating = ({
  rating = 0,
  size = 10,
}: {
  rating?: number;
  size?: number;
}) => (
  <View style={{ flexDirection: 'row', gap: 1 }}>
    {[1, 2, 3, 4, 5].map((s) => (
      <Text
        key={s}
        style={{
          fontSize: size,
          color: s <= Math.round(rating) ? C.accent : C.textDim,
        }}
      >
        ★
      </Text>
    ))}
  </View>
);

/* ─────────────────────────────────────────
   Animated Loader
───────────────────────────────────────── */
const FuturisticLoader = () => {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1100,
        useNativeDriver: true,
      })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.3,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={s.loaderWrap}>
      <Animated.View
        style={[s.loaderRing, { transform: [{ rotate }] }]}
      />
      <Animated.Text style={[s.loaderLabel, { opacity: pulse }]}>
        LOADING
      </Animated.Text>
    </View>
  );
};

/* ─────────────────────────────────────────
   Product Card
───────────────────────────────────────── */
const ProductCard = React.memo(
  ({
    item,
    index,
    cardWidth,
    isWeb,
  }: {
    item: IProduct;
    index: number;
    cardWidth: number;
    isWeb: boolean;
  }) => {
    const router = useRouter();
    const fade = useRef(new Animated.Value(0)).current;
    const ty = useRef(new Animated.Value(24)).current;
    const scale = useRef(new Animated.Value(1)).current;
    const glow = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 420,
          delay: (index % 8) * 55,
          useNativeDriver: true,
        }),
        Animated.timing(ty, {
          toValue: 0,
          duration: 420,
          delay: (index % 8) * 55,
          useNativeDriver: true,
        }),
      ]).start();
    }, []);

    const pressIn = () => {
      Animated.parallel([
        Animated.spring(scale, { toValue: 0.965, useNativeDriver: true }),
        Animated.timing(glow, {
          toValue: 1,
          duration: 130,
          useNativeDriver: false,
        }),
      ]).start();
    };

    const pressOut = () => {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 180,
          useNativeDriver: false,
        }),
      ]).start();
    };

    const borderColor = glow.interpolate({
      inputRange: [0, 1],
      outputRange: [C.border, C.accent],
    });

    const imgUrl = item.images?.[0]?.url;
    // Image height: taller ratio on web cards since they're narrower
    const imgHeight = isWeb ? cardWidth * 1.0 : cardWidth * 0.88;

    return (
      <Animated.View
        style={{
          width: cardWidth,
          opacity: fade,
          transform: [{ translateY: ty }, { scale }],
          marginBottom: CARD_GAP + 2,
        }}
      >
        <Animated.View style={[s.card, { borderColor }]}>
          <TouchableOpacity
            activeOpacity={1}
            onPressIn={pressIn}
            onPressOut={pressOut}
            onPress={() => router.push({
              pathname: '/(user)/ProductDetails',
              params: { id: item._id }
            })}
          >
            {/* Product Image */}
            <View style={[s.cardImgWrap, { height: imgHeight }]}>
              {imgUrl ? (
                <Image
                  source={{ uri: imgUrl }}
                  style={s.cardImg}
                  resizeMode="cover"
                />
              ) : (
                <View style={s.cardImgPlaceholder}>
                  <Text style={{ fontSize: isWeb ? 42 : 34 }}>📦</Text>
                </View>
              )}
              <View style={s.scanLine} />
              {item.category ? (
                <View style={s.catBadge}>
                  <Text style={s.catBadgeText}>
                    {item.category.toUpperCase()}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Card Body */}
            <View style={[s.cardBody, isWeb && s.cardBodyWeb]}>
              <Text
                style={[s.cardName, isWeb && s.cardNameWeb]}
                numberOfLines={2}
              >
                {item.name}
              </Text>

              {(item.ratings ?? 0) > 0 && (
                <View style={s.cardRatingRow}>
                  <StarRating rating={item.ratings} size={isWeb ? 11 : 9} />
                  {item.numOfReviews != null && (
                    <Text style={s.cardReviews}>({item.numOfReviews})</Text>
                  )}
                </View>
              )}

              <View style={s.cardFooter}>
                <View>
                  <Text style={s.priceTag}>PRICE</Text>
                  <Text style={[s.cardPrice, isWeb && s.cardPriceWeb]}>
                    ₱{item.price.toLocaleString()}
                  </Text>
                </View>
                <TouchableOpacity style={s.addBtn} activeOpacity={0.75}>
                  <Text style={s.addBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Corner accents */}
            <View style={[s.corner, s.cornerTL]} />
            <View style={[s.corner, s.cornerBR]} />
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    );
  }
);

/* ─────────────────────────────────────────
   Category icon map
───────────────────────────────────────── */
const CATEGORY_ICONS: Record<string, string> = {
  all:         '◈',
  electronics: '⚡',
  phones:      '📱',
  laptops:     '💻',
  computers:   '🖥',
  accessories: '🎧',
  clothing:    '👕',
  shoes:       '👟',
  bags:        '👜',
  watches:     '⌚',
  jewelry:     '💎',
  food:        '🍔',
  drinks:      '🥤',
  grocery:     '🛒',
  beauty:      '💄',
  health:      '💊',
  sports:      '⚽',
  toys:        '🎮',
  books:       '📚',
  furniture:   '🪑',
  home:        '🏠',
  tools:       '🔧',
  automotive:  '🚗',
  garden:      '🌱',
  pets:        '🐾',
  art:         '🎨',
  music:       '🎵',
  games:       '🎲',
  babies:      '👶',
  stationery:  '✏️',
};

function getCatIcon(label: string): string {
  const key = label.toLowerCase().replace(/\s+/g, '');
  for (const [k, v] of Object.entries(CATEGORY_ICONS)) {
    if (key.includes(k)) return v;
  }
  return '•';
}

/* ─────────────────────────────────────────
   Category Chip
───────────────────────────────────────── */
const Chip = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn  = () => Animated.spring(scale, { toValue: 0.92, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true }).start();

  const icon = getCatIcon(label);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={1}
        style={[s.chip, active && s.chipActive]}
      >
        <Text style={s.chipIcon}>{icon}</Text>
        <Text style={[s.chipText, active && s.chipTextActive]}>
          {label.toUpperCase()}
        </Text>
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
  const router = useRouter();
  const { numCols, cardWidth, maxContentWidth, isWeb } = useGrid();

  /* Auth State */
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const [profile, setProfile] = useState<{ name?: string; avatar?: string } | null>(null);

  /* Check auth on mount and when focused */
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          const token = await getItem('authToken');
          if (!mounted) return;
          console.log('[Index] Auth check - Token found:', !!token);
          setIsLoggedIn(!!token);

          const cartData = await getItem('cartItems');
          const items = cartData ? JSON.parse(cartData) : [];
          const count = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
          setCartCount(count);
          console.log('[Index] Cart count:', count);
          // Load stored user profile for header display
          const rawUser = await getItem('user');
          if (mounted && rawUser) {
            try {
              const u = JSON.parse(rawUser);
              setProfile({ name: u.name, avatar: u.avatar?.url || u.avatar || undefined });
            } catch (err) {
              setProfile({ name: rawUser });
            }
          }
          await fetchNotificationCount();
        } catch (err) {
          console.error('Error checking auth:', err);
          setIsLoggedIn(false);
        }
      })();

      return () => {
        mounted = false;
      };
    }, [])
  );

  /* Also check on component mount */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await getItem('authToken');
        if (!mounted) return;
        console.log('[Index] Initial mount auth check - Token found:', !!token);
        setIsLoggedIn(!!token);

        const cartData = await getItem('cartItems');
        const items = cartData ? JSON.parse(cartData) : [];
        const count = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
        setCartCount(count);
        const rawUser = await getItem('user');
        if (mounted && rawUser) {
          try {
            const u = JSON.parse(rawUser);
            setProfile({ name: u.name, avatar: u.avatar?.url || u.avatar || undefined });
          } catch (err) {
            setProfile({ name: rawUser });
          }
        }
        await fetchNotificationCount();
      } catch (err) {
        console.error('Error in mount auth check:', err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /* State */
  const [products, setProducts] = useState<IProduct[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [productsCount, setProductsCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [resPerPage, setResPerPage] = useState(8);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [price, setPrice] = useState<[number, number]>([1, 10000]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState(routeKw ?? '');
  const [activeCategory, setActiveCategory] = useState('All');
  const [filterOpen, setFilterOpen] = useState(false);

  /* Animations */
  const headerFade = useRef(new Animated.Value(0)).current;
  const filterH = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    Animated.timing(filterH, {
      toValue: filterOpen ? 1 : 0,
      duration: 260,
      useNativeDriver: false,
    }).start();
  }, [filterOpen]);

  const animatedFilterH = filterH.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 140],
  });

  /* ── Fetch categories from your API ── */
  const fetchCategories = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/products/categories`, {
        timeout: 8000,
      });
      const raw: any = res.data?.categories ?? res.data ?? [];
      const cats: string[] = Array.isArray(raw)
        ? raw.map((c: any) =>
            typeof c === 'string' ? c : c?.category ?? c?._id ?? String(c)
          )
        : [];
      if (cats.length > 0) {
        setCategories(['All', ...cats]);
      }
    } catch {
      // Silently fall back — categories will remain ['All']
      // If your API exposes categories differently, adjust the endpoint above.
    }
  }, []);

  /* ── Reset pagination when filters change ── */
  useEffect(() => {
    setCurrentPage(1);
    setProducts([]);
    setHasMore(true);
  }, [routeKw, price, activeCategory]);

  /* ── Fetch products with pagination ── */
  const fetchProducts = useCallback(async (page: number, isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        'price[gte]': price[0].toString(),
        'price[lte]': price[1].toString(),
      });

      if (routeKw) params.append('keyword', routeKw);
      if (activeCategory !== 'All') params.append('category', activeCategory);

      const res = await axios.get(`${API_URL}/products?${params}`, {
        timeout: 10000,
      });

      const fetched: IProduct[] = res.data.products ?? [];
      
      // Update products based on whether we're loading more or starting fresh
      setProducts(prev => isLoadMore ? [...prev, ...fetched] : fetched);
      setProductsCount(res.data.productsCount ?? 0);
      setFilteredCount(res.data.filteredProductsCount ?? 0);
      setResPerPage(res.data.resPerPage ?? 8);
      
      // Check if there are more products to load
      // Always use filteredProductsCount — backend now returns it correctly for all filter combos
      const totalCount = res.data.filteredProductsCount ?? res.data.productsCount ?? 0;
      const hasMoreProducts = fetched.length > 0 && (page * (res.data.resPerPage ?? 8)) < totalCount;
      setHasMore(hasMoreProducts);

      // Derive categories from products if API has no dedicated endpoint
      // Use functional update to avoid stale closure on `categories`
      setCategories((prev) => {
        if (prev.length <= 1 && fetched.length > 0) {
          const derived = [
            'All',
            ...Array.from(
              new Set(fetched.map((p) => p.category).filter(Boolean) as string[])
            ),
          ];
          return derived;
        }
        return prev;
      });
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to fetch products'
      );
      if (!isLoadMore) {
        setProducts([]);
      }
    } finally {
      if (isLoadMore) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [routeKw, price, activeCategory]);

  /* ── Initial fetch and page changes ── */
  useEffect(() => {
    fetchProducts(1, false);
  }, [fetchProducts]);

  /* ── Load more function for infinite scroll ── */
  const loadMoreProducts = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchProducts(nextPage, true);
    }
  }, [loadingMore, hasMore, loading, currentPage, fetchProducts]);

  /* ── Fetch notification count ── */
  const fetchNotificationCount = useCallback(async () => {
    try {
      const token = await getItem('authToken');
      if (!token) {
        setNotifCount(0);
        return;
      }
      const res = await axios.get(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 8000,
      });
      const list = res.data?.notifications || [];
      const unread = Array.isArray(list)
        ? list.filter((n: any) => !n.isRead).length
        : 0;
      setNotifCount(unread);
    } catch (err) {
      setNotifCount(0);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSearch = () => {
    const q = searchQuery.trim();
    router.push(q ? { pathname: '/', params: { keyword: q } } : '/');
  };

  // Fixed logout function for both web and mobile
  const handleLogout = async () => {
    try {
      // Clear all auth-related items from storage
      await removeItem('authToken');
      await removeItem('user');
      await removeItem('cartItems'); // Optional: clear cart on logout
      
      // Update local state
      setIsLoggedIn(false);
      setCartCount(0);
      setNotifCount(0);
      
      // Navigate to home - use different approach for web vs mobile
      if (Platform.OS === 'web') {
        // For web, use window.location for a hard refresh to clear any in-memory state
        window.location.href = '/';
      } else {
        // For mobile, use router with a replace to clear history
        router.replace('/(tabs)');
      }
    } catch (err) {
      console.error('Error logging out:', err);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  // Fixed login navigation
  const handleLoginPress = () => {
    // For mobile, ensure we're navigating correctly within the tabs structure
    if (Platform.OS === 'web') {
      router.push('/(auth)/login');
    } else {
      // For mobile, we need to navigate to the auth screen
      router.push('/(auth)/login');
    }
  };

  // Fixed cart navigation
  const handleCartPress = () => {
    if (isLoggedIn) {
      router.push('/(user)/cart');
    } else {
      // If not logged in, show alert and redirect to login
      Alert.alert(
        'Login Required',
        'Please login to view your cart',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/(auth)/login') }
        ]
      );
    }
  };

  const handleNotificationPress = () => {
    if (isLoggedIn) {
      setNotifCount(0);
      router.push('/(user)/notifications');
    } else {
      Alert.alert(
        'Login Required',
        'Please login to view your notifications',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/(auth)/login') }
        ]
      );
    }
  };

  /* ─── Web Sidebar layout vs Mobile stacked layout ─── */
  const webLayout = isWeb && maxContentWidth >= 900;

  /* ─── Render Home Screen ─── */
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ══ WEB: Top Navbar ══ */}
      {isWeb && (
        <View style={s.webNav}>
          <View
            style={[s.webNavInner, { maxWidth: maxContentWidth }]}
          >
            <View style={s.webNavBrand}>
              <Text style={s.webNavEyebrow}>◈</Text>
              <Text style={s.webNavTitle}>ROMEROS</Text>
            </View>

            {/* Search — center on web */}
            <View style={s.webSearchBox}>
              <Text style={s.searchIcon}>⌕</Text>
              <TextInput
                style={s.webSearchInput}
                placeholder="Search products…"
                placeholderTextColor={C.textDim}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                selectionColor={C.accent}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    router.push('/');
                  }}
                >
                  <Text style={{ color: C.textSub, fontSize: 14 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={s.webNavRight}>
              {!isLoggedIn ? (
                <TouchableOpacity 
                  style={s.webNavBtn}
                  onPress={handleLoginPress}
                >
                  <Text style={s.webNavBtnTxt}>🔐 Sign In</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity 
                    style={s.webNavBtn}
                    onPress={handleCartPress}
                  >
                    <Text style={s.webNavBtnTxt}>🛒 Cart</Text>
                    {cartCount > 0 && (
                      <View style={s.badge}>
                        <Text style={s.badgeTxt}>{cartCount}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                    <TouchableOpacity
                      style={s.webNavBtn}
                      onPress={handleNotificationPress}
                    >
                      <Text style={s.webNavBtnTxt}>🔔 Notify</Text>
                      {notifCount > 0 && (
                        <View style={s.badge}>
                          <Text style={s.badgeTxt}>{notifCount}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  <TouchableOpacity
                    style={s.webNavProfile}
                    onPress={() => router.push('/(user)/UserProfile')}
                  >
                    {profile?.avatar ? (
                      <Image source={{ uri: profile.avatar }} style={s.webAvatar} />
                    ) : (
                      <Text style={s.webNavBtnTxt}>👤</Text>
                    )}
                    <Text style={s.webNavName}>{profile?.name ?? 'Profile'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={s.webNavBtn}
                    onPress={handleLogout}
                  >
                    <Text style={s.webNavBtnTxt}>Logout</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      )}

      {/* ══ MOBILE: Header ══ */}
      {!isWeb && (
        <Animated.View style={[s.mobileHeader, { opacity: headerFade }]}>
          <View style={s.mobileHeaderTop}>
            <View>
              <Text style={s.eyebrow}>ROMEROS</Text>
              <Text style={s.mobileTitle}>KINGDOM</Text>
            </View>
            <View style={s.mobileHeaderRight}>
              <TouchableOpacity
                style={[s.iconBtn, filterOpen && s.iconBtnOn]}
                onPress={() => setFilterOpen((v) => !v)}
              >
                <Text style={s.iconBtnTxt}>⚙</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.iconBtn}
                onPress={handleNotificationPress}
              >
                <Text style={s.iconBtnTxt}>🔔</Text>
                {notifCount > 0 && (
                  <View style={s.badge}>
                    <Text style={s.badgeTxt}>{notifCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              {!isLoggedIn ? (
                <TouchableOpacity 
                  style={s.iconBtn}
                  onPress={handleLoginPress}
                >
                  <Text style={s.iconBtnTxt}>🔐</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity 
                    style={s.iconBtn}
                    onPress={handleCartPress}
                  >
                    <Text style={s.iconBtnTxt}>🛒</Text>
                    {cartCount > 0 && (
                      <View style={s.badge}>
                        <Text style={s.badgeTxt}>{cartCount}</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={s.profileBtnMobile}
                    onPress={() => router.push('/(user)/UserProfile')}
                  >
                    {profile?.avatar ? (
                      <Image source={{ uri: profile.avatar }} style={s.mobileAvatar} />
                    ) : (
                      <Text style={s.iconBtnTxt}>👤</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={s.iconBtn}
                    onPress={handleLogout}
                  >
                    <Text style={s.iconBtnTxt}>⇦</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Mobile Search */}
          <View style={s.mobileSearchRow}>
            <View style={s.mobileSearchBox}>
              <Text style={s.searchIcon}>⌕</Text>
              <TextInput
                style={s.mobileSearchInput}
                placeholder="Search products…"
                placeholderTextColor={C.textDim}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                selectionColor={C.accent}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    router.push('/');
                  }}
                >
                  <Text style={{ color: C.textSub, fontSize: 14 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Mobile Filter Panel */}
          <Animated.View
            style={[
              s.filterPanel,
              { height: animatedFilterH, overflow: 'hidden' },
            ]}
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
              onValueChange={(v) =>
                setPrice([price[0], Math.max(price[0] + 50, v)])
              }
              minimumTrackTintColor={C.accent}
              maximumTrackTintColor={C.border}
              thumbTintColor={C.accent}
              style={{ height: 36, marginTop: 4 }}
            />
          </Animated.View>

          {/* Mobile Category Chips */}
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
                onPress={() => setActiveCategory(cat)}
              />
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* ══ BODY ══ */}
      <View
        style={[
          s.body,
          webLayout && s.bodyWeb,
          isWeb && { alignItems: 'center' },
        ]}
      >
        {/* ── Web Sidebar ── */}
        {webLayout && (
          <View style={s.sidebar}>
            <Text style={s.sidebarTitle}>FILTERS</Text>

            {/* Price filter */}
            <View style={s.sidebarSection}>
              <Text style={s.sidebarLabel}>PRICE RANGE</Text>
              <Text style={s.sidebarValue}>
                ₱{price[0].toLocaleString()} — ₱{price[1].toLocaleString()}
              </Text>
              <Slider
                minimumValue={1}
                maximumValue={10000}
                step={50}
                value={price[1]}
                onValueChange={(v) =>
                  setPrice([price[0], Math.max(price[0] + 50, v)])
                }
                minimumTrackTintColor={C.accent}
                maximumTrackTintColor={C.border}
                thumbTintColor={C.accent}
                style={{ height: 36, marginTop: 6 }}
              />
            </View>

            {/* Categories */}
            <View style={s.sidebarSection}>
              <Text style={s.sidebarLabel}>CATEGORIES</Text>
              <View style={s.sidebarCats}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setActiveCategory(cat)}
                    style={[
                      s.sidebarCatRow,
                      activeCategory === cat && s.sidebarCatRowActive,
                    ]}
                  >
                    <Text style={[
                      s.sidebarCatIcon,
                      activeCategory === cat && { color: C.accent },
                    ]}>
                      {getCatIcon(cat)}
                    </Text>
                    <Text
                      style={[
                        s.sidebarCatTxt,
                        activeCategory === cat && s.sidebarCatTxtActive,
                      ]}
                    >
                      {cat}
                    </Text>
                    {activeCategory === cat && (
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

        {/* ── Main Content ── */}
        <View style={[s.main, webLayout && s.mainWeb]}>
          {/* Web category chips (when not sidebar layout) */}
          {isWeb && !webLayout && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[s.chipRow, { marginBottom: 12 }]}
            >
              {categories.map((cat) => (
                <Chip
                  key={cat}
                  label={cat}
                  active={activeCategory === cat}
                  onPress={() => setActiveCategory(cat)}
                />
              ))}
            </ScrollView>
          )}

          {loading ? (
            <FuturisticLoader />
          ) : error ? (
            <View style={s.centerWrap}>
              <View style={s.errorBox}>
                <Text style={{ fontSize: 36, color: C.danger }}>⚠</Text>
                <Text style={s.errorTitle}>Connection Error</Text>
                <Text style={s.errorMsg}>{error}</Text>
                <TouchableOpacity
                  style={s.retryBtn}
                  onPress={() => fetchProducts(1, false)}
                >
                  <Text style={s.retryTxt}>RETRY</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : products.length === 0 ? (
            <View style={s.centerWrap}>
              <Text style={{ fontSize: 52, color: C.textDim }}>◈</Text>
              <Text style={s.emptyTitle}>No Products Found</Text>
              <Text style={s.emptyMsg}>
                Try adjusting your filters or search
              </Text>
            </View>
          ) : (
            <FlatList<IProduct>
              key={`grid-${numCols}`} // re-mount when columns change
              data={products}
              keyExtractor={(item) => item._id}
              numColumns={numCols}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                s.grid,
                isWeb && s.gridWeb,
              ]}
              columnWrapperStyle={
                numCols > 1 ? s.gridRow : undefined
              }
              renderItem={({ item, index }) => (
                <ProductCard
                  item={item}
                  index={index}
                  cardWidth={cardWidth}
                  isWeb={isWeb}
                />
              )}
              ListHeaderComponent={
                <View style={s.resultsBar}>
                  <Text style={s.resultsCount}>
                    {products.length.toLocaleString()} PRODUCTS
                  </Text>
                  {routeKw ? (
                    <Text style={s.resultsKw}>for "{routeKw}"</Text>
                  ) : null}
                  {activeCategory !== 'All' ? (
                    <Text style={s.resultsCat}>· {activeCategory}</Text>
                  ) : null}
                </View>
              }
              ListFooterComponent={
                <View style={s.footer}>
                  {loadingMore && (
                    <View style={s.loadingMoreContainer}>
                      <ActivityIndicator size="small" color={C.accent} />
                      <Text style={s.loadingMoreText}>Loading more...</Text>
                    </View>
                  )}
                  {!hasMore && products.length > 0 && (
                    <View style={s.endOfListContainer}>
                      <Text style={s.endOfListText}>✨ You've seen all products ✨</Text>
                    </View>
                  )}
                </View>
              }
              onEndReached={loadMoreProducts}
              onEndReachedThreshold={0.3}
              refreshing={loading}
              onRefresh={() => {
                setCurrentPage(1);
                fetchProducts(1, false);
              }}
            />
          )}
        </View>
      </View>

      {/* Debug bar */}
      {__DEV__ && (
        <View style={s.debugBar}>
          <Text style={s.debugTxt}>
            [{numCols}col] Page: {currentPage} | Has More: {hasMore.toString()}
            {error ? ` | ERR: ${error}` : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

/* ─────────────────────────────────────────
   StyleSheet
───────────────────────────────────────── */
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },

  /* ── Loader ── */
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
    minHeight: 300,
  },
  loaderRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2.5,
    borderTopColor: 'transparent',
    borderLeftColor: C.accentDim,
    borderRightColor: C.accent,
    borderBottomColor: C.accent,
  },
  loaderLabel: {
    color: C.accent,
    fontSize: 10,
    letterSpacing: 5,
    fontWeight: '700',
  },

  /* ── Web Nav ── */
  webNav: {
    backgroundColor: C.bgLayer,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    alignItems: 'center',
    zIndex: 100,
    ...(Platform.OS === 'web'
      ? ({ position: 'sticky', top: 0 } as any)
      : {}),
  },
  webNavInner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIDE_PAD * 2,
    paddingVertical: 14,
    gap: 20,
  },
  webNavBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 180,
  },
  webNavEyebrow: {
    color: C.accent,
    fontSize: 22,
  },
  webNavTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 3,
  },
  webSearchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    height: 44,
    gap: 8,
    maxWidth: 540,
  },
  webSearchInput: {
    flex: 1,
    color: C.text,
    fontSize: 14,
    paddingVertical: 0,
  },
  webNavRight: {
    minWidth: 180,
    alignItems: 'flex-end',
  },
  webNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  webNavBtnTxt: {
    color: C.text,
    fontSize: 13,
    fontWeight: '600',
  },
  webNavProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  webAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  webNavName: {
    color: C.text,
    fontSize: 13,
    fontWeight: '700',
  },

  /* ── Mobile Header ── */
  mobileHeader: {
    backgroundColor: C.bgLayer,
    paddingTop: Platform.OS === 'ios' ? 56 : 38,
    paddingHorizontal: SIDE_PAD,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  mobileHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  eyebrow: {
    color: C.accent,
    fontSize: 10,
    letterSpacing: 4,
    fontWeight: '700',
    marginBottom: 2,
  },
  mobileTitle: {
    color: C.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  mobileHeaderRight: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
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
  iconBtnTxt: { fontSize: 18, color: C.text },
  profileBtnMobile: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  mobileAvatar: { width: 36, height: 36, borderRadius: 10 },

  /* ── Badge ── */
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

  /* ── Search ── */
  searchIcon: { color: C.accent, fontSize: 20, lineHeight: 24 },
  mobileSearchRow: { marginBottom: 12 },
  mobileSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  mobileSearchInput: {
    flex: 1,
    color: C.text,
    fontSize: 14,
    paddingVertical: 0,
  },

  /* ── Mobile Filter ── */
  filterPanel: {
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
  },
  filterLabel: {
    color: C.accent,
    fontSize: 9,
    letterSpacing: 3,
    fontWeight: '700',
  },
  filterValue: {
    color: C.text,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
  },

  /* ── Category Chips ── */
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipActive: {
    backgroundColor: 'rgba(0,194,199,0.18)',
    borderColor: C.accent,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  chipIcon: {
    fontSize: 12,
    lineHeight: 16,
  },
  chipActiveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.accent,
    marginLeft: 2,
  },
  chipText: {
    color: C.textSub,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  chipTextActive: {
    color: C.accentText,
    fontWeight: '700',
  },

  /* ── Body Layout ── */
  body: {
    flex: 1,
  },
  bodyWeb: {
    flexDirection: 'row',
    justifyContent: 'center',
  },

  /* ── Web Sidebar ── */
  sidebar: {
    width: 220,
    backgroundColor: C.bgLayer,
    borderRightWidth: 1,
    borderRightColor: C.border,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 40,
    ...(Platform.OS === 'web'
      ? ({ position: 'sticky', top: 73, alignSelf: 'flex-start', height: '100vh' } as any)
      : {}),
  },
  sidebarTitle: {
    color: C.accent,
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: '700',
    marginBottom: 20,
  },
  sidebarSection: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 20,
  },
  sidebarLabel: {
    color: C.textSub,
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 10,
  },
  sidebarValue: {
    color: C.text,
    fontSize: 13,
    fontWeight: '600',
  },
  sidebarCats: { gap: 4, marginTop: 4 },
  sidebarCatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  sidebarCatRowActive: {
    backgroundColor: 'rgba(0,194,199,0.16)',
    borderLeftWidth: 2,
    borderLeftColor: C.accent,
  },
  sidebarCatIcon: {
    fontSize: 14,
    color: C.textSub,
    width: 18,
    textAlign: 'center',
  },
  sidebarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.textDim,
  },
  sidebarDotActive: {
    backgroundColor: C.accent,
  },
  sidebarActiveLine: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: C.accent,
  },
  sidebarCatTxt: {
    color: C.textSub,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  sidebarCatTxtActive: {
    color: C.accentText,
    fontWeight: '700',
  },

  /* ── Main ── */
  main: { flex: 1 },
  mainWeb: {
    maxWidth: 1220,
    width: '100%',
  },

  /* ── Results Bar ── */
  resultsBar: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 14,
    marginTop: 16,
  },
  resultsCount: {
    color: C.accent,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  resultsKw: { color: C.textSub, fontSize: 12 },
  resultsCat: { color: C.accentText, fontSize: 12, fontWeight: '600' },

  /* ── Grid ── */
  grid: {
    paddingHorizontal: SIDE_PAD,
    paddingBottom: 80,
  },
  gridWeb: {
    paddingHorizontal: SIDE_PAD * 2,
    paddingTop: 4,
  },
  gridRow: { justifyContent: 'space-between' },

  /* ── Product Card ── */
  card: {
    backgroundColor: C.surface,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  cardImgWrap: {
    width: '100%',
    backgroundColor: C.bgLayer,
    overflow: 'hidden',
  },
  cardImg: { width: '100%', height: '100%' },
  cardImgPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bgLayer,
  },
  scanLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: C.accent,
    opacity: 0.28,
  },
  catBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderWidth: 1,
    borderColor: C.accentDim,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  catBadgeText: {
    color: C.accent,
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  cardBody: { padding: 10, gap: 4 },
  cardBodyWeb: { padding: 12, gap: 5 },
  cardName: {
    color: C.text,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  cardNameWeb: { fontSize: 13 },
  cardRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardReviews: { color: C.textDim, fontSize: 9 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  priceTag: {
    color: C.textDim,
    fontSize: 8,
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  cardPrice: {
    color: C.mint,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  cardPriceWeb: { fontSize: 16 },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: C.accentGlow,
    borderWidth: 1,
    borderColor: C.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: C.accent,
    fontSize: 20,
    fontWeight: '300',
    lineHeight: 24,
    marginTop: -1,
  },
  corner: {
    position: 'absolute',
    backgroundColor: C.accent,
    opacity: 0.4,
  },
  cornerTL: { top: 0, left: 0, width: 16, height: 1.5 },
  cornerBR: { bottom: 0, right: 0, width: 16, height: 1.5 },

  /* ── Error / Empty ── */
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIDE_PAD,
    gap: 10,
    minHeight: 300,
  },
  errorBox: {
    backgroundColor: C.dangerBg,
    borderWidth: 1,
    borderColor: C.danger,
    borderRadius: 16,
    padding: 26,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    gap: 8,
  },
  errorTitle: { color: C.danger, fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  errorMsg: { color: C.textSub, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: C.danger,
  },
  retryTxt: { color: C.white, fontWeight: '700', fontSize: 12, letterSpacing: 2 },
  emptyTitle: { color: C.textSub, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  emptyMsg: { color: C.textDim, fontSize: 13 },

  /* ── Footer and Loading More ── */
  footer: {
    paddingVertical: 20,
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  loadingMoreText: {
    color: C.accent,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  endOfListContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  endOfListText: {
    color: C.textDim,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 1,
  },

  /* ── Pagination ── */
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginTop: 8,
  },
  pageBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  pageBtnOff: { opacity: 0.35 },
  pageBtnTxt: {
    color: C.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  pageBtnTxtOff: { color: C.textDim },
  pageCenter: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  pageNum: { color: C.text, fontSize: 22, fontWeight: '800' },
  pageSep: { color: C.textDim, fontSize: 14 },
  pageTotal: { color: C.textSub, fontSize: 14, fontWeight: '500' },

  /* ── Debug ── */
  debugBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  debugTxt: {
    color: C.accent,
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});