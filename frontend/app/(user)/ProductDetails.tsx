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
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import { getItem, setItem } from '@/utils/storage';
import Constants from 'expo-constants';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// Resolve API URL for device/emulator/web
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
}

interface IUser {
  _id: string;
  name: string;
  email: string;
}

// ─── THEMED ALERT MODAL ──────────────────────────────────────
interface ThemedAlertProps {
  visible: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  onClose: () => void;
}

const ThemedAlert: React.FC<ThemedAlertProps> = ({ visible, type, title, message, onClose }) => {
  const config = {
    success: { icon: 'checkmark-circle' as const, color: '#4caf50', bg: 'rgba(76,175,80,0.12)',    border: 'rgba(76,175,80,0.3)',    btn: '#4caf50', label: 'Great!'  },
    error:   { icon: 'alert-circle'     as const, color: '#ff6b6b', bg: 'rgba(255,107,107,0.12)',  border: 'rgba(255,107,107,0.3)',  btn: '#ff6b6b', label: 'Got it' },
    warning: { icon: 'warning'          as const, color: '#ffca28', bg: 'rgba(255,202,40,0.12)',   border: 'rgba(255,202,40,0.3)',   btn: '#e6b800', label: 'Okay'   },
    info:    { icon: 'information-circle' as const, color: '#2280b0', bg: 'rgba(34,128,176,0.12)', border: 'rgba(34,128,176,0.3)',  btn: '#2280b0', label: 'Got it' },
  }[type];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={al.overlay} onPress={onClose}>
        <Pressable style={al.card} onPress={() => {}}>
          <View style={[al.iconWrap, { backgroundColor: config.bg, borderColor: config.border, borderWidth: 1 }]}>
            <Ionicons name={config.icon} size={32} color={config.color} />
          </View>
          <Text style={al.title}>{title}</Text>
          <Text style={al.message}>{message}</Text>
          <View style={al.divider} />
          <TouchableOpacity style={[al.btn, { backgroundColor: config.btn }]} onPress={onClose} activeOpacity={0.85}>
            <Text style={al.btnText}>{config.label}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const al = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  card:     { width: '100%', backgroundColor: '#16213e', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 24 }, shadowOpacity: 0.6, shadowRadius: 40, elevation: 20 },
  iconWrap: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title:    { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8, textAlign: 'center' },
  message:  { fontSize: 13, color: 'rgba(160,174,192,0.75)', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  divider:  { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 20 },
  btn:      { width: '100%', borderRadius: 13, paddingVertical: 14, alignItems: 'center' },
  btnText:  { fontSize: 14, fontWeight: '700', color: '#fff' },
});

// ─── MAIN SCREEN ─────────────────────────────────────────────
export default function ProductDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<IProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<IUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [hasOrdered, setHasOrdered] = useState(false);
  const [reviewImages, setReviewImages] = useState<Array<{ uri: string; name: string; type: string }>>([]);

  // ── Themed Alert state ──
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setAlertType(type);
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  useEffect(() => {
    (async () => {
      try {
        const storedUser = await getItem('user');
        const token = await getItem('authToken');
        if (storedUser) setUser(JSON.parse(storedUser));
        setAuthToken(token);
      } catch (err) {
        console.warn('Failed to load auth state', err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!id) {
      setError('Product ID not found');
      setLoading(false);
      return;
    }
    fetchProductDetails();
  }, [id, authToken, user]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_URL}/product/${id}`, { timeout: 10000 });
      if (res.data.product) {
        setProduct(res.data.product);
        if (res.data.product.reviews && user) {
          const mine = res.data.product.reviews.find((r: any) => String(r.user) === String(user._id));
          if (mine) { setRating(mine.rating); setComment(mine.comment); }
        }
        await checkPurchaseStatus(res.data.product._id);
      } else {
        setError('Product not found');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch product details');
    } finally {
      setLoading(false);
    }
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
    } catch (err) {
      console.error('Failed to check purchase status:', err);
      setHasPurchased(false); setHasOrdered(false);
    }
  };

  // Auto-slide images every 3 seconds
  useEffect(() => {
    if (!product?.images || product.images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex(prev => prev === product.images!.length - 1 ? 0 : prev + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, [product?.images]);

  const handleIncreaseQty = () => { if (product && quantity < product.stock!) setQuantity(quantity + 1); };
  const handleDecreaseQty = () => { if (quantity > 1) setQuantity(quantity - 1); };

  const handleAddToCart = async () => {
    if (!product) return;
    try {
      const cartData = await getItem('cartItems');
      let cartItems = cartData ? JSON.parse(cartData) : [];
      const existingItemIndex = cartItems.findIndex((item: any) => item._id === product._id || item.product === product._id);
      if (existingItemIndex > -1) {
        cartItems[existingItemIndex].quantity += quantity;
      } else {
        cartItems.push({ _id: product._id, name: product.name, price: product.price, quantity, images: product.images || [] });
      }
      await setItem('cartItems', JSON.stringify(cartItems));
      showAlert('success', 'Added to Cart', `${quantity} item(s) added to your cart.`);
      setQuantity(1);
    } catch (err) {
      console.error('Error adding to cart:', err);
      showAlert('error', 'Cart Error', 'Failed to add item to cart.');
    }
  };

  const handleRatingPress = (value: number) => setRating(value);

  const pickOrCapture = async (mode: 'camera' | 'gallery') => {
    if (reviewImages.length >= 4) {
      showAlert('warning', 'Max Images', 'You can attach up to 4 images per review.');
      return;
    }
    try {
      let result: ImagePicker.ImagePickerResult;
      if (mode === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { showAlert('error', 'Permission Needed', 'Camera access is required.'); return; }
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.75 });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { showAlert('error', 'Permission Needed', 'Photo library access is required.'); return; }
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
    } catch (err) {
      console.warn('Image picker error', err);
    }
  };

  const openImagePicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', '📷 Take Photo', '🖼  Choose from Library'], cancelButtonIndex: 0 },
        (idx) => { if (idx === 1) pickOrCapture('camera'); else if (idx === 2) pickOrCapture('gallery'); }
      );
    } else {
      // Android: show themed inline choices via two buttons
      pickOrCapture('gallery');
    }
  };

  const removeReviewImage = (idx: number) => setReviewImages((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmitReview = async () => {
    if (!comment.trim()) { showAlert('warning', 'Missing Comment', 'Please write a comment.'); return; }
    if (rating === 0) { showAlert('warning', 'Missing Rating', 'Please select a star rating.'); return; }
    if (!authToken) {
      showAlert('error', 'Sign In Required', 'Please sign in to leave a review.');
      router.push('/(auth)/login');
      return;
    }
    if (!hasPurchased) { showAlert('error', 'Purchase Required', 'You can only review products you have bought.'); return; }
    try {
      setSubmittingReview(true);
      if (reviewImages.length > 0) {
        const formData = new FormData();
        formData.append('rating', String(rating));
        formData.append('comment', comment.trim());
        formData.append('productId', id as string);
        reviewImages.forEach((img) => {
          formData.append('reviewImages', { uri: img.uri, name: img.name, type: img.type } as any);
        });
        await axios.put(`${API_URL}/review`, formData, {
          headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${authToken}` },
          timeout: 20000,
        });
      } else {
        await axios.put(`${API_URL}/review`, { rating, comment: comment.trim(), productId: id }, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        });
      }
      showAlert('success', 'Review Submitted', 'Your review has been posted successfully.');
      setComment(''); setRating(0); setReviewImages([]);
      await fetchProductDetails();
    } catch (err: any) {
      showAlert('error', 'Submission Failed', err?.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // ─── Loading & Error States ────────────────────────────────
  if (loading) {
    return (
      <View style={s.centerContainer}>
        <View style={s.loaderCard}>
          <ActivityIndicator size="large" color="#2280b0" />
          <Text style={s.loadingText}>Loading product...</Text>
        </View>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={s.centerContainer}>
        <View style={s.errorCard}>
          <View style={s.errorIconWrap}>
            <Ionicons name="alert-circle" size={36} color="#ff6b6b" />
          </View>
          <Text style={s.errorText}>{error || 'Product not found'}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={14} color="#fff" />
            <Text style={s.retryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const hasImages = product.images && product.images.length > 0;
  const currentImage = hasImages ? product.images![currentImageIndex % product.images!.length] : null;
  const inStock = product.stock && product.stock > 0;

  return (
    <View style={s.root}>
      {/* Themed Alert */}
      <ThemedAlert
        visible={alertVisible}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Image Carousel ── */}
        {hasImages && (
          <View style={s.imageWrapper}>
            {/* Square image area */}
            <View style={s.imageContainer}>
              {currentImage && typeof currentImage.url === 'string' ? (
                <Image source={{ uri: currentImage.url }} style={s.mainImage} resizeMode="contain" />
              ) : (
                <View style={s.imageFallback}>
                  <MaterialCommunityIcons name="image-off" size={40} color="rgba(160,174,192,0.2)" />
                  <Text style={s.imageFallbackText}>Image unavailable</Text>
                </View>
              )}

              {/* Counter badge */}
              {product.images!.length > 1 && (
                <View style={s.imageBadge}>
                  <Text style={s.imageBadgeText}>{currentImageIndex + 1} / {product.images!.length}</Text>
                </View>
              )}

              {/* Arrow buttons */}
              {product.images!.length > 1 && (
                <>
                  <TouchableOpacity
                    style={[s.arrowBtn, s.arrowLeft]}
                    onPress={() => setCurrentImageIndex(currentImageIndex === 0 ? product.images!.length - 1 : currentImageIndex - 1)}
                    activeOpacity={0.85}
                  >
                    <Feather name="chevron-left" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.arrowBtn, s.arrowRight]}
                    onPress={() => setCurrentImageIndex(currentImageIndex === product.images!.length - 1 ? 0 : currentImageIndex + 1)}
                    activeOpacity={0.85}
                  >
                    <Feather name="chevron-right" size={20} color="#fff" />
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Thumbnail strip */}
            {product.images!.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.thumbStrip}
              >
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

        {/* ── Product Info ── */}
        <View style={s.infoContainer}>

          {/* Category + Product ID row */}
          <View style={s.metaRow}>
            {product.category ? (
              <View style={s.categoryBadge}>
                <MaterialCommunityIcons name="tag-outline" size={11} color="#2280b0" />
                <Text style={s.categoryText}>{product.category}</Text>
              </View>
            ) : null}
            <Text style={s.productId}>#{product._id.slice(-8).toUpperCase()}</Text>
          </View>

          {/* Product Name */}
          <Text style={s.productName}>{product.name}</Text>

          {/* Rating + Stock inline */}
          <View style={s.ratingStockRow}>
            <View style={s.starsRow}>
              {[1,2,3,4,5].map(star => (
                <Ionicons
                  key={star}
                  name={star <= Math.round(product.ratings || 0) ? 'star' : 'star-outline'}
                  size={13}
                  color="#ffca28"
                  style={{ marginRight: 1 }}
                />
              ))}
            </View>
            <Text style={s.ratingText}>{product.ratings || 0}</Text>
            <Text style={s.reviewCountText}>({product.numOfReviews || 0})</Text>
            <View style={s.metaDot} />
            <View style={[s.stockBadge, inStock ? s.stockBadgeIn : s.stockBadgeOut]}>
              <View style={[s.stockDot, inStock ? s.stockDotIn : s.stockDotOut]} />
              <Text style={[s.stockText, inStock ? s.stockTextIn : s.stockTextOut]}>
                {inStock ? 'In Stock' : 'Out of Stock'}
              </Text>
            </View>
          </View>

          {/* Price */}
          <Text style={s.price}>₱{product.price}</Text>

          <View style={s.divider} />

          {/* Quantity + Add to Cart combined row */}
          <View style={s.cartRow}>
            <View style={s.quantityRow}>
              <TouchableOpacity style={s.qtyBtn} onPress={handleDecreaseQty} disabled={quantity <= 1}>
                <Feather name="minus" size={15} color={quantity <= 1 ? 'rgba(160,174,192,0.3)' : '#fff'} />
              </TouchableOpacity>
              <View style={s.qtyDisplay}>
                <Text style={s.qtyText}>{quantity}</Text>
              </View>
              <TouchableOpacity style={s.qtyBtn} onPress={handleIncreaseQty} disabled={!!product.stock && quantity >= product.stock}>
                <Feather name="plus" size={15} color={!!product.stock && quantity >= product.stock ? 'rgba(160,174,192,0.3)' : '#fff'} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[s.addToCartBtn, !inStock && s.addToCartBtnDisabled]}
              onPress={handleAddToCart}
              disabled={!inStock}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="cart-plus" size={17} color={!inStock ? 'rgba(160,174,192,0.4)' : '#fff'} />
              <Text style={[s.addToCartText, !inStock && s.addToCartTextDisabled]}>
                {inStock ? 'Add to Cart' : 'Out of Stock'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Seller */}
          {product.seller && (
            <View style={s.sellerRow}>
              <Feather name="package" size={12} color="rgba(160,174,192,0.4)" />
              <Text style={s.sellerText}>Sold by: {product.seller}</Text>
            </View>
          )}

          <View style={s.divider} />

          {/* Description */}
          <Text style={s.sectionLabel}>Description</Text>
          <View style={s.descriptionBox}>
            <Text style={s.description}>{product.description}</Text>
          </View>

          {/* ── Reviews Section ── */}
          <View style={s.divider} />
          <Text style={s.sectionLabel}>Reviews</Text>

          {/* Write a Review */}
          {hasPurchased ? (
            <View style={s.reviewCard}>
              <View style={s.reviewCardHeader}>
                <View style={s.reviewCardIconWrap}>
                  <Ionicons name="create-outline" size={18} color="#2280b0" />
                </View>
                <Text style={s.reviewCardTitle}>Your Review</Text>
              </View>

              {/* Star Rating Input */}
              <View style={s.starInputRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => handleRatingPress(star)} style={s.starBtn}>
                    <Ionicons
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={30}
                      color={star <= rating ? '#ffca28' : 'rgba(160,174,192,0.25)'}
                    />
                  </TouchableOpacity>
                ))}
                {rating > 0 && (
                  <Text style={s.ratingSelectedText}>
                    {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}
                  </Text>
                )}
              </View>

              {/* Comment Input */}
              <TextInput
                style={s.commentInput}
                placeholder="Share your experience with this product..."
                placeholderTextColor="rgba(160,174,192,0.35)"
                multiline
                numberOfLines={4}
                value={comment}
                onChangeText={setComment}
              />

              {/* Image Thumbnails */}
              {reviewImages.length > 0 && (
                <View style={s.imgPreviewRow}>
                  {reviewImages.map((img, idx) => (
                    <View key={idx} style={s.imgThumbWrap}>
                      <Image source={{ uri: img.uri }} style={s.imgThumb} resizeMode="cover" />
                      <TouchableOpacity style={s.imgRemoveBtn} onPress={() => removeReviewImage(idx)}>
                        <Feather name="x" size={10} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Add Photo Button */}
              <TouchableOpacity
                style={[s.addPhotoBtn, reviewImages.length >= 4 && s.addPhotoBtnDisabled]}
                onPress={openImagePicker}
                disabled={reviewImages.length >= 4}
              >
                <Feather name="camera" size={14} color={reviewImages.length >= 4 ? 'rgba(160,174,192,0.3)' : '#2280b0'} />
                <Text style={[s.addPhotoBtnText, reviewImages.length >= 4 && s.addPhotoBtnTextDisabled]}>
                  {reviewImages.length >= 4 ? 'Max 4 photos reached' : `Add Photo (${reviewImages.length}/4)`}
                </Text>
              </TouchableOpacity>

              {/* Submit */}
              <TouchableOpacity style={s.submitBtn} onPress={handleSubmitReview} disabled={submittingReview} activeOpacity={0.85}>
                {submittingReview ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                    <Text style={s.submitBtnText}>Submit Review</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : hasOrdered ? (
            <View style={s.pendingBox}>
              <View style={s.pendingIconWrap}>
                <MaterialCommunityIcons name="truck-outline" size={28} color="#ffca28" />
              </View>
              <Text style={s.pendingTitle}>Order in Progress</Text>
              <Text style={s.pendingText}>
                You'll be able to leave a review once your order is delivered.
              </Text>
            </View>
          ) : null}

          {/* Existing Reviews */}
          {product.reviews && product.reviews.length > 0 && (
            <View style={s.existingReviews}>
              <View style={s.existingReviewsHeader}>
                <Ionicons name="chatbubbles-outline" size={16} color="rgba(160,174,192,0.6)" />
                <Text style={s.existingReviewsTitle}>Customer Reviews ({product.reviews.length})</Text>
              </View>
              <FlatList
                data={product.reviews}
                keyExtractor={(item) => item._id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View style={s.reviewItem}>
                    <View style={s.reviewItemHeader}>
                      <View style={s.reviewAvatar}>
                        <Text style={s.reviewAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.reviewerName}>{item.name}</Text>
                        <View style={s.reviewStarsRow}>
                          {[1,2,3,4,5].map(star => (
                            <Ionicons
                              key={star}
                              name={star <= item.rating ? 'star' : 'star-outline'}
                              size={12}
                              color={star <= item.rating ? '#ffca28' : 'rgba(160,174,192,0.25)'}
                              style={{ marginRight: 1 }}
                            />
                          ))}
                        </View>
                      </View>
                    </View>
                    <Text style={s.reviewComment}>{item.comment}</Text>
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

// ─── STYLES ──────────────────────────────────────────────────
const s = StyleSheet.create({
  root:            { flex: 1, backgroundColor: '#1a1a2e' },
  scroll:          { flex: 1 },

  // ── Center states ──
  centerContainer: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  loaderCard:      { alignItems: 'center', gap: 14 },
  loadingText:     { color: 'rgba(160,174,192,0.6)', fontSize: 14 },
  errorCard:       { width: '100%', backgroundColor: '#16213e', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 28, alignItems: 'center', gap: 12 },
  errorIconWrap:   { width: 64, height: 64, borderRadius: 18, backgroundColor: 'rgba(255,107,107,0.12)', borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)', alignItems: 'center', justifyContent: 'center' },
  errorText:       { fontSize: 14, color: 'rgba(160,174,192,0.7)', textAlign: 'center', lineHeight: 20 },
  retryBtn:        { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#2280b0', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  retryBtnText:    { color: '#fff', fontWeight: '700', fontSize: 14 },

  // ── Image Carousel ──
  imageWrapper:      { backgroundColor: '#16213e', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  imageContainer:    { aspectRatio: 1, width: '100%', backgroundColor: '#16213e', position: 'relative', overflow: 'hidden' },
  mainImage:         { width: '100%', height: '100%' },
  imageFallback:     { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, backgroundColor: '#16213e' },
  imageFallbackText: { color: 'rgba(160,174,192,0.35)', fontSize: 13 },
  arrowBtn:          { position: 'absolute', top: '50%', transform: [{ translateY: -22 }], width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  arrowLeft:         { left: 14 },
  arrowRight:        { right: 14 },
  imageBadge:        { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  imageBadgeText:    { color: '#fff', fontSize: 11, fontWeight: '600' },

  // Thumbnail strip
  thumbStrip:     { paddingHorizontal: 14, paddingVertical: 12, gap: 8, flexDirection: 'row' },
  thumbWrap:      { width: 56, height: 56, borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.08)', position: 'relative' },
  thumbWrapActive:{ borderColor: '#2280b0' },
  thumb:          { width: '100%', height: '100%' },
  thumbActiveLine:{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: '#2280b0' },

  // ── Info Container ──
  infoContainer: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 4 },

  // Meta row (category + ID)
  metaRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(34,128,176,0.12)', borderWidth: 1, borderColor: 'rgba(34,128,176,0.28)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  categoryText:  { fontSize: 11, fontWeight: '700', color: '#2280b0', textTransform: 'uppercase', letterSpacing: 0.5 },
  productId:     { fontSize: 10, color: 'rgba(160,174,192,0.35)', fontWeight: '500' },
  productName:   { fontSize: 21, fontWeight: '800', color: '#fff', marginBottom: 10, letterSpacing: 0.2, lineHeight: 28 },

  // Rating + stock inline
  ratingStockRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 14, flexWrap: 'wrap' },
  starsRow:       { flexDirection: 'row' },
  ratingText:     { fontSize: 12, fontWeight: '700', color: '#ffca28' },
  reviewCountText:{ fontSize: 12, color: 'rgba(160,174,192,0.45)' },
  metaDot:        { width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(160,174,192,0.25)', marginHorizontal: 2 },

  // Price
  price: { fontSize: 28, fontWeight: '800', color: '#00C2C7', marginBottom: 2 },
  stockBadge:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  stockBadgeIn:  { backgroundColor: 'rgba(76,175,80,0.12)', borderColor: 'rgba(76,175,80,0.3)' },
  stockBadgeOut: { backgroundColor: 'rgba(255,107,107,0.12)', borderColor: 'rgba(255,107,107,0.3)' },
  stockDot:      { width: 6, height: 6, borderRadius: 3 },
  stockDotIn:    { backgroundColor: '#4caf50' },
  stockDotOut:   { backgroundColor: '#ff6b6b' },
  stockText:     { fontSize: 11, fontWeight: '700' },
  stockTextIn:   { color: '#4caf50' },
  stockTextOut:  { color: '#ff6b6b' },

  // ── Divider ──
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginVertical: 16 },

  // ── Section Label ──
  sectionLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(160,174,192,0.5)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.9 },

  // ── Qty + Cart row ──
  cartRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  quantityRow:{ flexDirection: 'row', alignItems: 'center' },
  qtyBtn:     { width: 40, height: 40, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', alignItems: 'center', justifyContent: 'center' },
  qtyDisplay: { width: 48, height: 40, marginHorizontal: 6, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', alignItems: 'center', justifyContent: 'center' },
  qtyText:    { fontSize: 15, fontWeight: '800', color: '#fff' },

  // ── Add to Cart ──
  addToCartBtn:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2280b0', paddingVertical: 14, borderRadius: 13 },
  addToCartBtnDisabled:  { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  addToCartText:         { color: '#fff', fontSize: 14, fontWeight: '800' },
  addToCartTextDisabled: { color: 'rgba(160,174,192,0.4)' },

  // ── Seller ──
  sellerRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sellerText: { fontSize: 12, color: 'rgba(160,174,192,0.5)' },

  // ── Description ──
  descriptionBox: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 14 },
  description:    { fontSize: 14, color: 'rgba(160,174,192,0.7)', lineHeight: 22 },

  // ── Review Write Card ──
  reviewCard:        { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: 16, marginBottom: 20 },
  reviewCardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  reviewCardIconWrap:{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(34,128,176,0.15)', borderWidth: 1, borderColor: 'rgba(34,128,176,0.3)', alignItems: 'center', justifyContent: 'center' },
  reviewCardTitle:   { fontSize: 15, fontWeight: '700', color: '#fff' },

  // ── Star Input ──
  starInputRow:       { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
  starBtn:            { padding: 2 },
  ratingSelectedText: { marginLeft: 8, fontSize: 12, color: '#ffca28', fontWeight: '600' },

  // ── Comment Input ──
  commentInput: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', borderRadius: 12, padding: 14, height: 110, marginBottom: 12, fontSize: 13, color: '#fff', textAlignVertical: 'top', lineHeight: 20 },

  // ── Image Picker ──
  imgPreviewRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  imgThumbWrap:         { position: 'relative' },
  imgThumb:             { width: 72, height: 72, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)' },
  imgRemoveBtn:         { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: '#ff6b6b', alignItems: 'center', justifyContent: 'center' },
  addPhotoBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(34,128,176,0.1)', borderWidth: 1, borderColor: 'rgba(34,128,176,0.25)', borderRadius: 12, paddingVertical: 12, marginBottom: 12 },
  addPhotoBtnDisabled:  { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' },
  addPhotoBtnText:      { color: '#2280b0', fontSize: 13, fontWeight: '600' },
  addPhotoBtnTextDisabled: { color: 'rgba(160,174,192,0.3)' },

  // ── Submit Button ──
  submitBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#4caf50', paddingVertical: 14, borderRadius: 13 },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // ── Pending Box ──
  pendingBox:     { backgroundColor: 'rgba(255,202,40,0.07)', borderWidth: 1, borderColor: 'rgba(255,202,40,0.2)', borderRadius: 16, padding: 20, marginBottom: 20, alignItems: 'center', gap: 8 },
  pendingIconWrap:{ width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,202,40,0.12)', borderWidth: 1, borderColor: 'rgba(255,202,40,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  pendingTitle:   { color: '#ffca28', fontSize: 14, fontWeight: '800' },
  pendingText:    { color: 'rgba(255,202,40,0.65)', fontSize: 13, textAlign: 'center', lineHeight: 18 },

  // ── Existing Reviews ──
  existingReviews:       { marginTop: 4 },
  existingReviewsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  existingReviewsTitle:  { fontSize: 11, fontWeight: '700', color: 'rgba(160,174,192,0.6)', textTransform: 'uppercase', letterSpacing: 0.8 },
  reviewItem:            { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 14, marginBottom: 10 },
  reviewItemHeader:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  reviewAvatar:          { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(34,128,176,0.2)', borderWidth: 1, borderColor: 'rgba(34,128,176,0.3)', alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText:      { fontSize: 14, fontWeight: '800', color: '#2280b0' },
  reviewerName:          { fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 3 },
  reviewStarsRow:        { flexDirection: 'row' },
  reviewComment:         { fontSize: 13, color: 'rgba(160,174,192,0.65)', lineHeight: 19 },
});