import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  FlatList,
  Platform,
  ActionSheetIOS,
  Modal,
  Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import axios from 'axios';
import { getItem } from '@/utils/storage';
import { initCartDb, getCartItemsSync, saveCartItemsSync, CartItem as DbCartItem } from '@/utils/cartDb';
import Constants from 'expo-constants';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

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
  textBody:    'rgba(160,200,240,0.75)',
  textDim:     'rgba(60,110,170,0.45)',
  danger:      '#FF4060',
  dangerBg:    'rgba(255,64,96,0.08)',
  dangerBorder:'rgba(255,64,96,0.22)',
  success:     '#00D4AA',
  warn:        '#F59E0B',
  warnBg:      'rgba(245,158,11,0.1)',
  warnBorder:  'rgba(245,158,11,0.28)',
  star:        '#FBBF24',
};

const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

/* ─────────────────────────────────────────
   Interfaces
───────────────────────────────────────── */
interface IProduct {
  _id: string;
  name: string;
  price: number;
  description?: string;
  stock?: number;
  category?: string;
  images?: { url: string; public_id: string }[];
  seller?: string;
  ratings?: number;
  numOfReviews?: number;
  reviews?: IReview[];
}

interface IReview {
  user: string;
  name: string;
  rating: number;
  comment: string;
  _id: string;
  images?: { public_id?: string; url: string }[];
}

interface IUser {
  _id: string;
  name: string;
  email: string;
}

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

const ThemedAlert: React.FC<ThemedAlertProps> = ({ visible, type, title, message, onClose }) => {
  const config = {
    success: { icon: 'checkmark-circle' as const, color: C.success, bg: 'rgba(0,212,170,0.1)',  border: 'rgba(0,212,170,0.3)',  btn: C.success, tag: 'SYSTEM OK',      label: '[ CONFIRM ]'  },
    error:   { icon: 'alert-circle'     as const, color: C.danger,  bg: C.dangerBg,             border: C.dangerBorder,          btn: C.danger,  tag: 'SYSTEM ERROR',  label: '[ DISMISS ]'  },
    warning: { icon: 'warning'          as const, color: C.warn,    bg: C.warnBg,               border: C.warnBorder,            btn: C.warn,    tag: 'SYSTEM WARNING',label: '[ OKAY ]'     },
    info:    { icon: 'information-circle' as const, color: C.accent,bg: C.accentGlow,            border: C.borderBright,          btn: C.accent,  tag: 'SYSTEM INFO',   label: '[ GOT IT ]'   },
  }[type];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={al.overlay} onPress={onClose}>
        <Pressable style={al.card} onPress={() => {}}>
          <View style={[al.cornerTL, { borderColor: config.color }]} />
          <View style={[al.cornerTR, { borderColor: config.color }]} />
          <View style={[al.cornerBL, { borderColor: config.color }]} />
          <View style={[al.cornerBR, { borderColor: config.color }]} />
          <View style={[al.iconWrap, { backgroundColor: config.bg, borderColor: config.border }]}>
            <Ionicons name={config.icon} size={30} color={config.color} />
            <View style={[al.iconDot, { backgroundColor: config.color }]} />
          </View>
          <View style={al.sysRow}>
            <View style={[al.sysDash, { backgroundColor: config.color }]} />
            <Text style={[al.sysTag, { color: config.color }]}>{config.tag}</Text>
            <View style={[al.sysDash, { backgroundColor: config.color }]} />
          </View>
          <Text style={al.title}>{title}</Text>
          <Text style={al.message}>{message}</Text>
          <View style={al.divider} />
          <TouchableOpacity style={[al.btn, { backgroundColor: config.btn, overflow: 'hidden' }]} onPress={onClose} activeOpacity={0.85}>
            <View style={al.btnScan} />
            <Text style={al.btnText}>{config.label}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const al = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  card: { width: '100%', backgroundColor: C.bgLayer, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 28, alignItems: 'center', shadowColor: C.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 28, elevation: 18 },
  cornerTL: { position: 'absolute', top: -1, left: -1,   width: 14, height: 14, borderTopWidth: 2, borderLeftWidth: 2,  borderTopLeftRadius: 18 },
  cornerTR: { position: 'absolute', top: -1, right: -1,  width: 14, height: 14, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 18 },
  cornerBL: { position: 'absolute', bottom: -1, left: -1,  width: 14, height: 14, borderBottomWidth: 2, borderLeftWidth: 2,  borderBottomLeftRadius: 18 },
  cornerBR: { position: 'absolute', bottom: -1, right: -1, width: 14, height: 14, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 18 },
  iconWrap: { width: 64, height: 64, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  iconDot:  { position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: 3.5, opacity: 0.8 },
  sysRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sysDash:  { width: 14, height: 1, opacity: 0.45, marginHorizontal: 6 },
  sysTag:   { fontSize: 8, letterSpacing: 1.8, opacity: 0.85, fontFamily: MONO },
  title:    { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 8, textAlign: 'center', letterSpacing: 1.5, fontFamily: MONO },
  message:  { fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  divider:  { width: '100%', height: 1, backgroundColor: C.border, marginBottom: 18 },
  btn:      { width: '100%', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnScan:  { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  btnText:  { fontSize: 12, fontWeight: '800', color: C.bg, letterSpacing: 2, fontFamily: MONO },
});

/* ─────────────────────────────────────────
   Main Screen
───────────────────────────────────────── */
export default function ProductDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [product,          setProduct]          = useState<IProduct | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState<string | null>(null);
  const [user,             setUser]             = useState<IUser | null>(null);
  const [authToken,        setAuthToken]        = useState<string | null>(null);
  const [quantity,         setQuantity]         = useState(1);
  const [rating,           setRating]           = useState(0);
  const [comment,          setComment]          = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [currentImageIndex,setCurrentImageIndex]= useState(0);
  const [hasPurchased,     setHasPurchased]     = useState(false);
  const [hasOrdered,       setHasOrdered]       = useState(false);
  const [reviewImages,     setReviewImages]     = useState<Array<{ uri: string; name: string; type: string }>>([]);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType,    setAlertType]    = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle,   setAlertTitle]   = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setAlertType(type); setAlertTitle(title); setAlertMessage(message); setAlertVisible(true);
  };

  useEffect(() => {
    (async () => {
      try {
        const storedUser = await getItem('user');
        const token = await getItem('authToken');
        if (storedUser) setUser(JSON.parse(storedUser));
        setAuthToken(token);
      } catch (err) { console.warn('Failed to load auth state', err); }
    })();
  }, []);

  useEffect(() => {
    if (!id) { setError('Product ID not found'); setLoading(false); return; }
    fetchProductDetails();
  }, [id, authToken, user]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true); setError(null);
      const res = await axios.get(`${API_URL}/product/${id}`, { timeout: 10000 });
      if (res.data.product) {
        setProduct(res.data.product);
        if (res.data.product.reviews && user) {
          const mine = res.data.product.reviews.find((r: any) => String(r.user) === String(user._id));
          if (mine) { setRating(mine.rating); setComment(mine.comment); }
        }
        await checkPurchaseStatus(res.data.product._id);
      } else { setError('Product not found'); }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch product details');
    } finally { setLoading(false); }
  };

  const checkPurchaseStatus = async (productId: string) => {
    try {
      if (!authToken) { setHasPurchased(false); setHasOrdered(false); return; }
      const res = await axios.get(`${API_URL}/orders/me`, { headers: { Authorization: `Bearer ${authToken}` } });
      const orders: any[] = res.data.orders || [];
      const orderedMatch = orders.find((order) =>
        order.orderItems?.some((item: any) => String(item.product) === String(productId))
      );
      if (!orderedMatch) { setHasOrdered(false); setHasPurchased(false); return; }
      setHasOrdered(true);
      setHasPurchased(orderedMatch.orderStatus?.toLowerCase() === 'delivered');
    } catch { setHasPurchased(false); setHasOrdered(false); }
  };

  useEffect(() => {
    if (!product?.images || product.images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex(prev => prev === product.images!.length - 1 ? 0 : prev + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, [product?.images]);

  const handleIncreaseQty = () => { if (product && quantity < product.stock!) setQuantity(quantity + 1); };
  const handleDecreaseQty = () => { if (quantity > 1) setQuantity(quantity - 1); };

  const handleAddToCart = () => {
    if (!product) return;
    try {
      initCartDb();
      const cartItems: DbCartItem[] = getCartItemsSync();
      const existingIndex = cartItems.findIndex(item => item._id === product._id);
      if (existingIndex > -1) { cartItems[existingIndex].quantity += quantity; }
      else { cartItems.push({ _id: product._id, name: product.name, price: product.price, quantity, images: product.images || [] }); }
      saveCartItemsSync(cartItems);
      showAlert('success', 'UNIT QUEUED', `${quantity} item(s) added to your cart.`);
      setQuantity(1);
    } catch { showAlert('error', 'CART ERROR', 'Failed to add item to cart.'); }
  };

  const pickOrCapture = async (mode: 'camera' | 'gallery') => {
    if (reviewImages.length >= 4) { showAlert('warning', 'MAX IMAGES', 'You can attach up to 4 images per review.'); return; }
    try {
      let result: ImagePicker.ImagePickerResult;
      if (mode === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { showAlert('error', 'PERMISSION DENIED', 'Camera access is required.'); return; }
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.75 });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { showAlert('error', 'PERMISSION DENIED', 'Photo library access is required.'); return; }
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.75, allowsMultipleSelection: true, selectionLimit: 4 - reviewImages.length });
      }
      if (!result.canceled && result.assets?.length) {
        const newImgs = result.assets.map((a) => {
          const filename = a.uri.split('/').pop() || 'review.jpg';
          const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
          return { uri: a.uri, name: filename, type: `image/${ext === 'jpg' ? 'jpeg' : ext}` };
        });
        setReviewImages((prev) => [...prev, ...newImgs].slice(0, 4));
      }
    } catch (err) { console.warn('Image picker error', err); }
  };

  const openImagePicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Take Photo', 'Choose from Library'], cancelButtonIndex: 0 },
        (idx) => { if (idx === 1) pickOrCapture('camera'); else if (idx === 2) pickOrCapture('gallery'); }
      );
    } else { pickOrCapture('gallery'); }
  };

  const removeReviewImage = (idx: number) => setReviewImages((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmitReview = async () => {
    if (!comment.trim()) { showAlert('warning', 'MISSING DATA', 'Please write a comment.'); return; }
    if (rating === 0) { showAlert('warning', 'MISSING DATA', 'Please select a star rating.'); return; }
    if (!authToken) { showAlert('error', 'NOT AUTHENTICATED', 'Please sign in to leave a review.'); router.push('/(auth)/login'); return; }
    if (!hasPurchased) { showAlert('error', 'PURCHASE REQUIRED', 'You can only review products you have bought.'); return; }
    try {
      setSubmittingReview(true);
      if (reviewImages.length > 0) {
        const formData = new FormData();
        formData.append('rating', String(rating));
        formData.append('comment', comment.trim());
        formData.append('productId', id as string);
        reviewImages.forEach((img) => { formData.append('reviewImages', { uri: img.uri, name: img.name, type: img.type } as any); });
        await axios.put(`${API_URL}/review`, formData, {
          headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${authToken}` },
          timeout: 20000,
        });
      } else {
        await axios.put(`${API_URL}/review`, { rating, comment: comment.trim(), productId: id }, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        });
      }
      showAlert('success', 'REVIEW LOGGED', 'Your review has been posted successfully.');
      setComment(''); setRating(0); setReviewImages([]);
      await fetchProductDetails();
    } catch (err: any) {
      showAlert('error', 'SUBMISSION FAILED', err?.response?.data?.message || 'Failed to submit review.');
    } finally { setSubmittingReview(false); }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <View style={s.centerContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.loaderCard}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={s.loadingText}>SCANNING UNIT...</Text>
        </View>
      </View>
    );
  }

  /* ── Error ── */
  if (error || !product) {
    return (
      <View style={s.centerContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.errorCard}>
          {/* Corner accents */}
          <View style={[s.eCardCornerTL, { borderColor: C.danger }]} />
          <View style={[s.eCardCornerTR, { borderColor: C.danger }]} />
          <View style={s.errorIconWrap}>
            <Ionicons name="alert-circle" size={32} color={C.danger} />
            <View style={s.errorIconDot} />
          </View>
          <Text style={s.errorText}>{error || 'Product not found'}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => router.back()}>
            <View style={s.retryBtnScan} />
            <Feather name="arrow-left" size={13} color={C.bg} style={{ marginRight: 7 }} />
            <Text style={s.retryBtnText}>GO BACK</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const hasImages    = product.images && product.images.length > 0;
  const currentImage = hasImages ? product.images![currentImageIndex % product.images!.length] : null;
  const inStock      = product.stock && product.stock > 0;

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <ThemedAlert visible={alertVisible} type={alertType} title={alertTitle} message={alertMessage} onClose={() => setAlertVisible(false)} />

      {/* Back button */}
      <TouchableOpacity 
        style={s.floatingBackBtn}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <Feather name="chevron-left" size={20} color={C.accent} />
      </TouchableOpacity>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ══════════════════════════════════
            IMAGE CAROUSEL
        ══════════════════════════════════ */}
        {hasImages && (
          <View style={s.imageWrapper}>
            <View style={s.imageContainer}>
              {currentImage && typeof currentImage.url === 'string' ? (
                <Image source={{ uri: currentImage.url }} style={s.mainImage} resizeMode="contain" />
              ) : (
                <View style={s.imageFallback}>
                  <MaterialCommunityIcons name="image-off" size={40} color={C.textDim} />
                  <Text style={s.imageFallbackText}>IMAGE UNAVAILABLE</Text>
                </View>
              )}
              {/* Scan-line shimmer */}
              <View style={s.imgScanLine} />

              {product.images!.length > 1 && (
                <View style={s.imageBadge}>
                  <Text style={s.imageBadgeText}>{currentImageIndex + 1} / {product.images!.length}</Text>
                </View>
              )}
              {product.images!.length > 1 && (
                <>
                  <TouchableOpacity style={[s.arrowBtn, s.arrowLeft]} onPress={() => setCurrentImageIndex(currentImageIndex === 0 ? product.images!.length - 1 : currentImageIndex - 1)} activeOpacity={0.85}>
                    <Feather name="chevron-left" size={18} color={C.text} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.arrowBtn, s.arrowRight]} onPress={() => setCurrentImageIndex(currentImageIndex === product.images!.length - 1 ? 0 : currentImageIndex + 1)} activeOpacity={0.85}>
                    <Feather name="chevron-right" size={18} color={C.text} />
                  </TouchableOpacity>
                </>
              )}
            </View>
            {/* Thumbnail strip */}
            {product.images!.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.thumbStrip}>
                {product.images!.map((img, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[s.thumbWrap, index === currentImageIndex && s.thumbWrapActive]}
                    onPress={() => setCurrentImageIndex(index)}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: img.url }} style={s.thumb} resizeMode="cover" />
                    {index === currentImageIndex && <View style={s.thumbActiveLine} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* ══════════════════════════════════
            PRODUCT INFO
        ══════════════════════════════════ */}
        <View style={s.infoContainer}>

          {/* Meta row */}
          <View style={s.metaRow}>
            {product.category ? (
              <View style={s.categoryBadge}>
                <MaterialCommunityIcons name="tag-outline" size={11} color={C.accent} />
                <Text style={s.categoryText}>{product.category.toUpperCase()}</Text>
              </View>
            ) : null}
            <Text style={s.productId}>#{product._id.slice(-8).toUpperCase()}</Text>
          </View>

          <Text style={s.productName}>{product.name}</Text>

          {/* Rating + stock row */}
          <View style={s.ratingStockRow}>
            <View style={s.starsRow}>
              {[1,2,3,4,5].map(star => (
                <Ionicons key={star} name={star <= Math.round(product.ratings || 0) ? 'star' : 'star-outline'} size={13} color={star <= Math.round(product.ratings || 0) ? C.star : C.textDim} style={{ marginRight: 1 }} />
              ))}
            </View>
            <Text style={s.ratingText}>{product.ratings || 0}</Text>
            <Text style={s.reviewCountText}>({product.numOfReviews || 0})</Text>
            <View style={s.metaDot} />
            <View style={[s.stockBadge, inStock ? s.stockBadgeIn : s.stockBadgeOut]}>
              <View style={[s.stockDot, inStock ? s.stockDotIn : s.stockDotOut]} />
              <Text style={[s.stockText, inStock ? s.stockTextIn : s.stockTextOut]}>
                {inStock ? 'IN STOCK' : 'OUT OF STOCK'}
              </Text>
            </View>
          </View>

          {/* Price */}
          <Text style={s.price}>₱{product.price}</Text>
          <View style={s.divider} />

          {/* Cart controls */}
          <View style={s.cartRow}>
            <View style={s.quantityRow}>
              <TouchableOpacity style={s.qtyBtn} onPress={handleDecreaseQty} disabled={quantity <= 1}>
                <Feather name="minus" size={14} color={quantity <= 1 ? C.textDim : C.accentText} />
              </TouchableOpacity>
              <View style={s.qtyDisplay}>
                <Text style={s.qtyText}>{quantity}</Text>
              </View>
              <TouchableOpacity style={s.qtyBtn} onPress={handleIncreaseQty} disabled={!!product.stock && quantity >= product.stock}>
                <Feather name="plus" size={14} color={!!product.stock && quantity >= product.stock ? C.textDim : C.accentText} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[s.addToCartBtn, !inStock && s.addToCartBtnDisabled]}
              onPress={handleAddToCart}
              disabled={!inStock}
              activeOpacity={0.85}
            >
              {inStock && <View style={s.addToCartBtnScan} />}
              <MaterialCommunityIcons name="cart-plus" size={16} color={!inStock ? C.textDim : C.bg} />
              <Text style={[s.addToCartText, !inStock && s.addToCartTextDisabled]}>
                {inStock ? 'ADD TO CART' : 'OUT OF STOCK'}
              </Text>
            </TouchableOpacity>
          </View>

          {product.seller && (
            <View style={s.sellerRow}>
              <Feather name="package" size={12} color={C.textDim} />
              <Text style={s.sellerText}>SOLD BY: {product.seller}</Text>
            </View>
          )}

          <View style={s.divider} />

          {/* Description */}
          <View style={s.sectionLabelRow}>
            <View style={s.sectionTick} />
            <Text style={s.sectionLabel}>DESCRIPTION</Text>
          </View>
          <View style={s.descriptionBox}>
            <View style={s.descRail} />
            <Text style={s.description}>{product.description}</Text>
          </View>

          {/* ══════════════════════════════════
              REVIEWS SECTION
          ══════════════════════════════════ */}
          <View style={s.divider} />
          <View style={s.sectionLabelRow}>
            <View style={s.sectionTick} />
            <Text style={s.sectionLabel}>REVIEWS</Text>
          </View>

          {/* Write review (purchased) */}
          {hasPurchased ? (
            <View style={s.reviewCard}>
              {/* Corner accents */}
              <View style={s.rCardTL} /><View style={s.rCardTR} />

              <View style={s.reviewCardHeader}>
                <View style={s.reviewCardIconWrap}>
                  <Ionicons name="create-outline" size={16} color={C.accent} />
                </View>
                <View style={s.panelTitleBlock}>
                  <View style={s.panelTick} />
                  <Text style={s.reviewCardTitle}>YOUR REVIEW</Text>
                </View>
              </View>

              <View style={s.reviewCardDivider} />

              {/* Star input */}
              <View style={s.starInputRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)} style={s.starBtn}>
                    <Ionicons
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={28}
                      color={star <= rating ? C.star : C.textDim}
                    />
                  </TouchableOpacity>
                ))}
                {rating > 0 && (
                  <Text style={s.ratingSelectedText}>
                    {['', 'POOR', 'FAIR', 'GOOD', 'GREAT', 'EXCELLENT'][rating]}
                  </Text>
                )}
              </View>

              {/* Comment input */}
              <TextInput
                style={s.commentInput}
                placeholder="Share your experience with this unit..."
                placeholderTextColor={C.textDim}
                multiline
                numberOfLines={4}
                value={comment}
                onChangeText={setComment}
              />

              {/* Image previews */}
              {reviewImages.length > 0 && (
                <View style={s.imgPreviewRow}>
                  {reviewImages.map((img, idx) => (
                    <View key={idx} style={s.imgThumbWrap}>
                      <Image source={{ uri: img.uri }} style={s.imgThumb} resizeMode="cover" />
                      <View style={s.imgScanLineThumb} />
                      <TouchableOpacity style={s.imgRemoveBtn} onPress={() => removeReviewImage(idx)}>
                        <Feather name="x" size={9} color={C.bg} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Add photo button */}
              <TouchableOpacity
                style={[s.addPhotoBtn, reviewImages.length >= 4 && s.addPhotoBtnDisabled]}
                onPress={openImagePicker}
                disabled={reviewImages.length >= 4}
              >
                <Feather name="camera" size={13} color={reviewImages.length >= 4 ? C.textDim : C.accent} />
                <Text style={[s.addPhotoBtnText, reviewImages.length >= 4 && s.addPhotoBtnTextDisabled]}>
                  {reviewImages.length >= 4 ? 'MAX 4 IMAGES REACHED' : `ADD IMAGE (${reviewImages.length}/4)`}
                </Text>
              </TouchableOpacity>

              {/* Submit */}
              <TouchableOpacity style={s.submitBtn} onPress={handleSubmitReview} disabled={submittingReview} activeOpacity={0.85}>
                <View style={s.submitBtnScan} />
                {submittingReview ? (
                  <ActivityIndicator size="small" color={C.bg} />
                ) : (
                  <>
                    <Feather name="zap" size={14} color={C.bg} style={{ marginRight: 7 }} />
                    <Text style={s.submitBtnText}>SUBMIT REVIEW</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : hasOrdered ? (
            <View style={s.pendingBox}>
              <View style={s.pendingIconWrap}>
                <MaterialCommunityIcons name="truck-outline" size={26} color={C.warn} />
              </View>
              <Text style={s.pendingTitle}>ORDER IN TRANSIT</Text>
              <Text style={s.pendingText}>You can leave a review once your order is delivered.</Text>
            </View>
          ) : null}

          {/* Existing reviews list */}
          {product.reviews && product.reviews.length > 0 && (
            <View style={s.existingReviews}>
              <View style={s.sectionLabelRow}>
                <MaterialCommunityIcons name="chat-outline" size={13} color={C.textDim} style={{ marginRight: 6 }} />
                <Text style={s.existingReviewsTitle}>
                  OPERATOR REVIEWS ({product.reviews.length})
                </Text>
              </View>
              <FlatList
                data={product.reviews}
                keyExtractor={(item) => item._id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View style={s.reviewItem}>
                    <View style={s.reviewItemRail} />
                    <View style={s.reviewItemInner}>
                      <View style={s.reviewItemHeader}>
                        <View style={s.reviewAvatar}>
                          <Text style={s.reviewAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.reviewerName}>{item.name}</Text>
                          <View style={s.reviewStarsRow}>
                            {[1,2,3,4,5].map(star => (
                              <Ionicons key={star} name={star <= item.rating ? 'star' : 'star-outline'} size={11} color={star <= item.rating ? C.star : C.textDim} style={{ marginRight: 1 }} />
                            ))}
                          </View>
                        </View>
                      </View>
                      <Text style={s.reviewComment}>{item.comment}</Text>
                      {item.images && item.images.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 8 }}>
                          {item.images.map((img, i) => (
                            <Image key={img.public_id || `${item._id}-img-${i}`} source={{ uri: img.url }} style={s.reviewImg} resizeMode="cover" />
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  </View>
                )}
              />
            </View>
          )}

          <View style={{ height: 32 }} />
        </View>
      </ScrollView>
    </View>
  );
}

/* ─────────────────────────────────────────
   Styles
───────────────────────────────────────── */
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  floatingBackBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 52 : 34, left: 16, width: 36, height: 36, borderRadius: 8, backgroundColor: C.accentGlow, borderWidth: 1, borderColor: C.borderBright, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  scroll: { flex: 1 },

  /* Loading / Error states */
  centerContainer: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  loaderCard:      { alignItems: 'center', gap: 14 },
  loadingText:     { color: C.textDim, fontSize: 11, letterSpacing: 2.5, fontFamily: MONO },
  errorCard:       { width: '100%', backgroundColor: C.bgLayer, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 28, alignItems: 'center', gap: 12 },
  eCardCornerTL:   { position: 'absolute', top: -1, left: -1,  width: 14, height: 14, borderTopWidth: 2, borderLeftWidth: 2,  borderTopLeftRadius: 18 },
  eCardCornerTR:   { position: 'absolute', top: -1, right: -1, width: 14, height: 14, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 18 },
  errorIconWrap:   { width: 64, height: 64, borderRadius: 16, backgroundColor: C.dangerBg, borderWidth: 1, borderColor: C.dangerBorder, alignItems: 'center', justifyContent: 'center' },
  errorIconDot:    { position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.danger, opacity: 0.8 },
  errorText:       { fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 20 },
  retryBtn:        { flexDirection: 'row', alignItems: 'center', backgroundColor: C.danger, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, marginTop: 4, overflow: 'hidden' },
  retryBtnScan:    { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  retryBtnText:    { color: C.bg, fontWeight: '800', fontSize: 12, letterSpacing: 2, fontFamily: MONO },

  /* Image carousel */
  imageWrapper:      { backgroundColor: C.bgLayer, borderBottomWidth: 1, borderBottomColor: C.border },
  imageContainer:    { aspectRatio: 1, width: '100%', backgroundColor: C.bgLayer, position: 'relative', overflow: 'hidden' },
  mainImage:         { width: '100%', height: '100%' },
  imgScanLine:       { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: C.accent, opacity: 0.25 },
  imageFallback:     { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  imageFallbackText: { color: C.textDim, fontSize: 11, letterSpacing: 2, fontFamily: MONO },
  arrowBtn:          { position: 'absolute', top: '50%', transform: [{ translateY: -22 }], width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1, borderColor: C.borderBright, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  arrowLeft:         { left: 14 },
  arrowRight:        { right: 14 },
  imageBadge:        { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: C.borderBright },
  imageBadgeText:    { color: C.accentText, fontSize: 10, fontWeight: '700', fontFamily: MONO },
  thumbStrip:        { paddingHorizontal: 14, paddingVertical: 12, gap: 8, flexDirection: 'row' },
  thumbWrap:         { width: 56, height: 56, borderRadius: 9, overflow: 'hidden', borderWidth: 1.5, borderColor: C.border, position: 'relative' },
  thumbWrapActive:   { borderColor: C.accent },
  thumb:             { width: '100%', height: '100%' },
  thumbActiveLine:   { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2.5, backgroundColor: C.accent },

  /* Product info */
  infoContainer: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 4 },
  metaRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.accentGlow, borderWidth: 1, borderColor: C.borderBright, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4 },
  categoryText:  { fontSize: 10, fontWeight: '700', color: C.accent, letterSpacing: 1.5, fontFamily: MONO },
  productId:     { fontSize: 9, color: C.textDim, fontWeight: '500', fontFamily: MONO },
  productName:   { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 10, letterSpacing: 0.3, lineHeight: 28 },

  ratingStockRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 14, flexWrap: 'wrap' },
  starsRow:       { flexDirection: 'row' },
  ratingText:     { fontSize: 12, fontWeight: '700', color: C.star },
  reviewCountText:{ fontSize: 12, color: C.textDim },
  metaDot:        { width: 3, height: 3, borderRadius: 2, backgroundColor: C.textDim, marginHorizontal: 2 },
  stockBadge:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1 },
  stockBadgeIn:   { backgroundColor: C.accentGlow, borderColor: C.borderBright },
  stockBadgeOut:  { backgroundColor: C.dangerBg,   borderColor: C.dangerBorder },
  stockDot:       { width: 6, height: 6, borderRadius: 3 },
  stockDotIn:     { backgroundColor: C.accent },
  stockDotOut:    { backgroundColor: C.danger },
  stockText:      { fontSize: 10, fontWeight: '700', letterSpacing: 1, fontFamily: MONO },
  stockTextIn:    { color: C.accentText },
  stockTextOut:   { color: C.danger },

  price:   { fontSize: 28, fontWeight: '800', color: C.accent, marginBottom: 2, fontFamily: MONO, shadowColor: C.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 16 },

  /* Section label */
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTick:     { width: 2.5, height: 12, borderRadius: 1.5, backgroundColor: C.accent },
  sectionLabel:    { fontSize: 9, fontWeight: '700', color: C.accent, letterSpacing: 2.5, fontFamily: MONO },

  /* Cart controls */
  cartRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  quantityRow: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn:      { width: 40, height: 40, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  qtyDisplay:  { width: 48, height: 40, marginHorizontal: 6, borderRadius: 10, backgroundColor: C.accentGlow, borderWidth: 1, borderColor: C.borderBright, alignItems: 'center', justifyContent: 'center' },
  qtyText:     { fontSize: 15, fontWeight: '800', color: C.accent, fontFamily: MONO },
  addToCartBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.accent, paddingVertical: 14, borderRadius: 12, overflow: 'hidden',
    shadowColor: C.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.65, shadowRadius: 14, elevation: 8,
  },
  addToCartBtnScan:      { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  addToCartBtnDisabled:  { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, shadowOpacity: 0, elevation: 0 },
  addToCartText:         { color: C.bg, fontSize: 12, fontWeight: '800', letterSpacing: 2, fontFamily: MONO },
  addToCartTextDisabled: { color: C.textDim },

  sellerRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sellerText: { fontSize: 10, color: C.textDim, letterSpacing: 1, fontFamily: MONO },

  /* Description */
  descriptionBox: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, flexDirection: 'row', gap: 12, overflow: 'hidden' },
  descRail:       { width: 3, alignSelf: 'stretch', backgroundColor: C.accentDim, borderRadius: 2 },
  description:    { flex: 1, fontSize: 13, color: C.textBody, lineHeight: 22 },

  /* Review card */
  reviewCard:         { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 16, marginBottom: 20 },
  rCardTL:            { position: 'absolute', top: -1, left: -1,  width: 12, height: 12, borderTopWidth: 1.5, borderLeftWidth: 1.5,  borderColor: C.accent, borderTopLeftRadius: 14 },
  rCardTR:            { position: 'absolute', top: -1, right: -1, width: 12, height: 12, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: C.accent, borderTopRightRadius: 14 },
  reviewCardHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  reviewCardIconWrap: { width: 34, height: 34, borderRadius: 9, backgroundColor: C.accentGlow, borderWidth: 1, borderColor: C.borderBright, alignItems: 'center', justifyContent: 'center' },
  panelTitleBlock:    { flexDirection: 'row', alignItems: 'center', gap: 7 },
  panelTick:          { width: 2.5, height: 11, borderRadius: 1.5, backgroundColor: C.accent },
  reviewCardTitle:    { fontSize: 11, fontWeight: '800', color: C.text, letterSpacing: 2.5, fontFamily: MONO },
  reviewCardDivider:  { height: 1, backgroundColor: C.border, marginBottom: 14 },
  starInputRow:       { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
  starBtn:            { padding: 3 },
  ratingSelectedText: { marginLeft: 6, fontSize: 10, color: C.star, fontWeight: '800', letterSpacing: 1.5, fontFamily: MONO },
  commentInput: {
    backgroundColor: C.bgLayer, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, padding: 14, height: 110, marginBottom: 12,
    fontSize: 13, color: C.text, textAlignVertical: 'top', lineHeight: 20,
    fontFamily: MONO,
  },
  imgPreviewRow:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  imgThumbWrap:            { position: 'relative' },
  imgThumb:                { width: 72, height: 72, borderRadius: 9, backgroundColor: C.bgLayer, borderWidth: 1, borderColor: C.border },
  imgScanLineThumb:        { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: C.accent, opacity: 0.3, borderBottomLeftRadius: 9, borderBottomRightRadius: 9 },
  imgRemoveBtn:            { position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: 9, backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center' },
  addPhotoBtn:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.accentGlow, borderWidth: 1, borderColor: C.borderBright, borderRadius: 10, paddingVertical: 12, marginBottom: 12 },
  addPhotoBtnDisabled:     { backgroundColor: C.surface, borderColor: C.border },
  addPhotoBtnText:         { color: C.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, fontFamily: MONO },
  addPhotoBtnTextDisabled: { color: C.textDim },
  submitBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.accent, paddingVertical: 14, borderRadius: 10, overflow: 'hidden', shadowColor: C.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.65, shadowRadius: 14, elevation: 8 },
  submitBtnScan: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  submitBtnText: { color: C.bg, fontSize: 12, fontWeight: '800', letterSpacing: 2, fontFamily: MONO },

  /* Pending order box */
  pendingBox:      { backgroundColor: C.warnBg, borderWidth: 1, borderColor: C.warnBorder, borderRadius: 14, padding: 20, marginBottom: 20, alignItems: 'center', gap: 8 },
  pendingIconWrap: { width: 52, height: 52, borderRadius: 13, backgroundColor: C.warnBg, borderWidth: 1, borderColor: C.warnBorder, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  pendingTitle:    { color: C.warn, fontSize: 12, fontWeight: '800', letterSpacing: 2, fontFamily: MONO },
  pendingText:     { color: C.textSub, fontSize: 12, textAlign: 'center', lineHeight: 18 },

  /* Existing reviews */
  existingReviews:      { marginTop: 4 },
  existingReviewsTitle: { fontSize: 9, fontWeight: '700', color: C.textDim, letterSpacing: 2, fontFamily: MONO },
  reviewItem:           { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, marginBottom: 10, flexDirection: 'row', overflow: 'hidden' },
  reviewItemRail:       { width: 3, backgroundColor: C.accentDim },
  reviewItemInner:      { flex: 1, padding: 14 },
  reviewItemHeader:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  reviewAvatar:         { width: 34, height: 34, borderRadius: 17, backgroundColor: C.accentGlow, borderWidth: 1, borderColor: C.borderBright, alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText:     { fontSize: 13, fontWeight: '800', color: C.accent, fontFamily: MONO },
  reviewerName:         { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 3 },
  reviewStarsRow:       { flexDirection: 'row' },
  reviewComment:        { fontSize: 12, color: C.textBody, lineHeight: 18 },
  reviewImg:            { width: 88, height: 88, borderRadius: 10, backgroundColor: C.bgLayer, borderWidth: 1, borderColor: C.border },
});