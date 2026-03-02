import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Image,
  ActivityIndicator,
  FlatList,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import { getItem, setItem } from '@/utils/storage';
import Constants from 'expo-constants';

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
  const [hasPurchased, setHasPurchased] = useState(false); // ordered AND delivered
  const [hasOrdered, setHasOrdered] = useState(false);    // ordered but not yet delivered
  const [reviewImages, setReviewImages] = useState<Array<{ uri: string; name: string; type: string }>>([]);

  useEffect(() => {
    (async () => {
      try {
        const storedUser = await getItem('user');
        const token = await getItem('authToken');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
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
      const url = `${API_URL}/product/${id}`;
      const res = await axios.get(url, { timeout: 10000 });
      if (res.data.product) {
        setProduct(res.data.product);
        if (res.data.product.reviews && user) {
          const mine = res.data.product.reviews.find(
            (r: any) => String(r.user) === String(user._id)
          );
          if (mine) {
            setRating(mine.rating);
            setComment(mine.comment);
          }
        }
        await checkPurchaseStatus(res.data.product._id);
      } else {
        setError('Product not found');
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to fetch product details';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const checkPurchaseStatus = async (productId: string) => {
    try {
      if (!authToken) {
        setHasPurchased(false);
        setHasOrdered(false);
        return;
      }

      const res = await axios.get(`${API_URL}/orders/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const orders: any[] = res.data.orders || [];

      // Check if any order contains this product
      const orderedMatch = orders.find((order) =>
        order.orderItems?.some((item: any) => String(item.product) === String(productId))
      );

      if (!orderedMatch) {
        setHasOrdered(false);
        setHasPurchased(false);
        return;
      }

      setHasOrdered(true);

      // Only allow review when the ORDER that contains this product is Delivered
      const isDelivered =
        orderedMatch.orderStatus?.toLowerCase() === 'delivered';

      setHasPurchased(isDelivered);
    } catch (err) {
      console.error('Failed to check purchase status:', err);
      setHasPurchased(false);
      setHasOrdered(false);
    }
  };

  // Auto-slide images every 3 seconds
  useEffect(() => {
    if (!product?.images || product.images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex(prev =>
        prev === product.images!.length - 1 ? 0 : prev + 1
      );
    }, 3000);
    return () => clearInterval(interval);
  }, [product?.images]);

  const handleIncreaseQty = () => {
    if (product && quantity < product.stock!) setQuantity(quantity + 1);
  };
  const handleDecreaseQty = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };
  
  const handleAddToCart = async () => {
    if (!product) return;

    try {
      const cartData = await getItem('cartItems');
      let cartItems = cartData ? JSON.parse(cartData) : [];

      const existingItemIndex = cartItems.findIndex((item: any) => item._id === product._id || item.product === product._id);
      if (existingItemIndex > -1) {
        cartItems[existingItemIndex].quantity += quantity;
      } else {
        const newItem = {
          _id: product._id,
          name: product.name,
          price: product.price,
          quantity: quantity,
          images: product.images || [],
        };
        cartItems.push(newItem);
      }

      await setItem('cartItems', JSON.stringify(cartItems));

      Alert.alert('Success', `Added ${quantity} item(s) to cart`);
      setQuantity(1);
    } catch (err) {
      console.error('Error adding to cart:', err);
      Alert.alert('Error', 'Failed to add item to cart');
    }
  };

  const handleRatingPress = (value: number) => setRating(value);

  /* ── Image picker helpers ── */
  const pickOrCapture = async (mode: 'camera' | 'gallery') => {
    if (reviewImages.length >= 4) {
      Alert.alert('Max images', 'You can attach up to 4 images per review.');
      return;
    }
    try {
      let result: ImagePicker.ImagePickerResult;
      if (mode === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Camera access is required.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.75,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Photo library access is required.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.75,
          allowsMultipleSelection: true,
          selectionLimit: 4 - reviewImages.length,
        });
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
      Alert.alert('Add Photo', 'Choose a source', [
        { text: 'Camera',  onPress: () => pickOrCapture('camera')  },
        { text: 'Gallery', onPress: () => pickOrCapture('gallery') },
        { text: 'Cancel',  style: 'cancel' },
      ]);
    }
  };

  const removeReviewImage = (idx: number) =>
    setReviewImages((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmitReview = async () => {
    if (!comment.trim()) return Alert.alert('Error', 'Please write a comment');
    if (rating === 0) return Alert.alert('Error', 'Please select a rating');
    if (!authToken) {
      Alert.alert('Sign in required', 'Please sign in to leave a review');
      router.push('/(auth)/login');
      return;
    }
    if (!hasPurchased) {
      Alert.alert('Purchase required', 'You can only review products you bought.');
      return;
    }
    try {
      setSubmittingReview(true);
      let response;
      if (reviewImages.length > 0) {
        // Send as multipart/form-data when images are attached
        const formData = new FormData();
        formData.append('rating', String(rating));
        formData.append('comment', comment.trim());
        formData.append('productId', id as string);
        reviewImages.forEach((img) => {
          formData.append('reviewImages', { uri: img.uri, name: img.name, type: img.type } as any);
        });
        response = await axios.put(`${API_URL}/review`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${authToken}`,
          },
          timeout: 20000,
        });
      } else {
        // No images — send JSON as before
        response = await axios.put(
          `${API_URL}/review`,
          { rating, comment: comment.trim(), productId: id },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
          }
        );
      }
      Alert.alert('Success', 'Review submitted successfully');
      setComment('');
      setRating(0);
      setReviewImages([]);
      await fetchProductDetails();
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to submit review';
      Alert.alert('Error', message);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={styles.loadingText}>Loading product...</Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'Product not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasImages = product.images && product.images.length > 0;
  const currentImage = hasImages ? product.images![currentImageIndex % product.images!.length] : null;
  const stockStatus = product.stock && product.stock > 0 ? 'In Stock' : 'Out of Stock';
  const stockColor = product.stock && product.stock > 0 ? '#27ae60' : '#e74c3c';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Image Carousel */}
      {hasImages && (
        <View style={styles.imageContainer}>
          {currentImage && typeof currentImage.url === 'string' ? (
            <Image source={{ uri: currentImage.url }} style={styles.mainImage} resizeMode="cover" />
          ) : (
            <View style={[styles.mainImage, { justifyContent: 'center', alignItems: 'center' }]}>
              <Text>Image unavailable</Text>
            </View>
          )}

          {/* Left/Right Arrows */}
          {product.images!.length > 1 && (
            <>
              <TouchableOpacity
                style={[styles.arrowBtn, { left: 10 }]}
                onPress={() =>
                  setCurrentImageIndex(
                    currentImageIndex === 0
                      ? product.images!.length - 1
                      : currentImageIndex - 1
                  )
                }
              >
                <Text style={styles.arrowText}>‹</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.arrowBtn, { right: 10 }]}
                onPress={() =>
                  setCurrentImageIndex(
                    currentImageIndex === product.images!.length - 1
                      ? 0
                      : currentImageIndex + 1
                  )
                }
              >
                <Text style={styles.arrowText}>›</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Image Indicators */}
          {product.images!.length > 1 && (
            <View style={styles.imageIndicators}>
              {product.images!.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.indicator,
                    index === currentImageIndex && styles.activeIndicator,
                  ]}
                  onPress={() => setCurrentImageIndex(index)}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Product Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productId}>Product # {product._id}</Text>

        <View style={styles.ratingContainer}>
          <View style={styles.ratingBar}>
            <View
              style={[
                styles.ratingFill,
                { width: `${product.ratings ? (product.ratings / 5) * 100 : 0}%` },
              ]}
            />
          </View>
          <Text style={styles.reviewCount}>
            {product.ratings || 0}/5 ({product.numOfReviews || 0} reviews)
          </Text>
        </View>

        <Text style={styles.price}>₱{product.price}</Text>
        <Text style={[styles.stockStatus, { color: stockColor }]}>Status: {stockStatus}</Text>

        <View style={styles.quantityContainer}>
          <Text style={styles.quantityLabel}>Quantity:</Text>
          <View style={styles.quantitySelector}>
            <TouchableOpacity
              style={styles.quantityBtn}
              onPress={handleDecreaseQty}
              disabled={quantity <= 1}
            >
              <Text style={styles.quantityBtnText}>−</Text>
            </TouchableOpacity>
            <TextInput style={styles.quantityInput} value={String(quantity)} editable={false} />
            <TouchableOpacity
              style={styles.quantityBtn}
              onPress={handleIncreaseQty}
              disabled={!!product.stock && quantity >= product.stock}
            >
              <Text style={styles.quantityBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.addToCartBtn, !product.stock && styles.disabledBtn]}
          onPress={handleAddToCart}
          disabled={!product.stock}
        >
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </TouchableOpacity>

        {product.seller && <Text style={styles.seller}>Sold by: {product.seller}</Text>}

        <Text style={styles.descriptionTitle}>Description</Text>
        <Text style={styles.description}>{product.description}</Text>

        {/* Reviews Section */}
        <View style={styles.reviewsSection}>
          <Text style={styles.reviewsTitle}>Reviews</Text>

          {/* Write Review */}
          {hasPurchased ? (
            <View style={styles.writeReviewContainer}>
              <Text style={styles.writeReviewLabel}>Your Review</Text>
              <View style={styles.ratingInput}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => handleRatingPress(star)}>
                    <Text style={[styles.star, star <= rating && styles.activestar]}>★</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.commentInput}
                placeholder="Write your comment..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                value={comment}
                onChangeText={setComment}
              />

              {/* ── Image picker / thumbnails ── */}
              {reviewImages.length > 0 && (
                <View style={styles.imgPreviewRow}>
                  {reviewImages.map((img, idx) => (
                    <View key={idx} style={styles.imgThumbWrap}>
                      <Image source={{ uri: img.uri }} style={styles.imgThumb} resizeMode="cover" />
                      <TouchableOpacity
                        style={styles.imgRemoveBtn}
                        onPress={() => removeReviewImage(idx)}
                      >
                        <Text style={styles.imgRemoveTxt}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={styles.addPhotoBtn}
                onPress={openImagePicker}
                disabled={reviewImages.length >= 4}
              >
                <Text style={styles.addPhotoBtnTxt}>
                  {reviewImages.length >= 4 ? '📷  Max 4 photos' : `📷  Add Photo (${reviewImages.length}/4)`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitReviewBtn}
                onPress={handleSubmitReview}
                disabled={submittingReview}
              >
                {submittingReview ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitReviewText}>Submit Review</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : hasOrdered ? (
            <View style={styles.pendingReviewBox}>
              <Text style={styles.pendingReviewIcon}>🚚</Text>
              <Text style={styles.pendingReviewTitle}>Order in progress</Text>
              <Text style={styles.pendingReviewText}>
                You'll be able to leave a review once your order is delivered.
              </Text>
            </View>
          ) : null}

          {/* Existing Reviews */}
          {product.reviews && product.reviews.length > 0 && (
            <View style={styles.existingReviews}>
              <Text style={styles.existingReviewsTitle}>
                Customer Reviews ({product.reviews.length})
              </Text>
              <FlatList
                data={product.reviews}
                keyExtractor={(item) => item._id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View style={styles.reviewItem}>
                    <Text style={styles.reviewerName}>{item.name}</Text>
                    <View style={styles.reviewRating}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Text
                          key={star}
                          style={[styles.reviewStar, star <= item.rating && styles.activestar]}
                        >
                          ★
                        </Text>
                      ))}
                    </View>
                    <Text style={styles.reviewComment}>{item.comment}</Text>
                  </View>
                )}
              />
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

// ==============================
// Styles
// ==============================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  errorText: { fontSize: 16, color: '#e74c3c', marginBottom: 16, textAlign: 'center' },
  retryBtn: { backgroundColor: '#1976d2', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 6 },
  retryBtnText: { color: '#fff', fontWeight: '600' },

  imageContainer: { width: '100%', height: 300, backgroundColor: '#f5f5f5', position: 'relative' },
  mainImage: { width: '100%', height: '100%' },
  imageIndicators: { flexDirection: 'row', justifyContent: 'center', position: 'absolute', bottom: 12, width: '100%' },
  indicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ccc', marginHorizontal: 4 },
  activeIndicator: { backgroundColor: '#1976d2' },
  arrowBtn: { position: 'absolute', top: '50%', transform: [{ translateY: -20 }], backgroundColor: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 20, zIndex: 10 },
  arrowText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },

  infoContainer: { padding: 16 },
  productName: { fontSize: 22, fontWeight: 'bold', marginBottom: 4, color: '#000' },
  productId: { fontSize: 12, color: '#999', marginBottom: 12 },
  ratingContainer: { marginBottom: 12 },
  ratingBar: { height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
  ratingFill: { height: '100%', backgroundColor: '#ffc107' },
  reviewCount: { fontSize: 12, color: '#666' },
  price: { fontSize: 24, fontWeight: 'bold', color: '#1976d2', marginBottom: 12 },
  stockStatus: { fontSize: 14, fontWeight: '600', marginBottom: 16 },
  quantityContainer: { marginBottom: 16 },
  quantityLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#000' },
  quantitySelector: { flexDirection: 'row', alignItems: 'center' },
  quantityBtn: { width: 40, height: 40, borderRadius: 6, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  quantityBtnText: { fontSize: 20, color: '#333', fontWeight: 'bold' },
  quantityInput: { flex: 1, height: 40, marginHorizontal: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 6, textAlign: 'center', fontSize: 16, fontWeight: '600' },
  addToCartBtn: { backgroundColor: '#1976d2', paddingVertical: 14, borderRadius: 8, marginBottom: 16 },
  disabledBtn: { backgroundColor: '#ccc' },
  addToCartText: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  seller: { fontSize: 14, color: '#666', marginBottom: 16 },
  descriptionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#000' },
  description: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 24 },
  reviewsSection: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 16, marginBottom: 32 },
  reviewsTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#000' },
  writeReviewContainer: { backgroundColor: '#f9f9f9', padding: 12, borderRadius: 8, marginBottom: 16 },
  writeReviewLabel: { fontSize: 14, fontWeight: '600', marginBottom: 10, color: '#000' },
  ratingInput: { flexDirection: 'row', marginBottom: 12 },
  star: { fontSize: 28, color: '#ddd', marginRight: 8 },
  activestar: { color: '#ffc107' },
  commentInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, height: 100, marginBottom: 12, fontSize: 14, color: '#000', textAlignVertical: 'top' },
  submitReviewBtn: { backgroundColor: '#27ae60', paddingVertical: 12, borderRadius: 6 },
  submitReviewText: { color: '#fff', fontSize: 14, fontWeight: 'bold', textAlign: 'center' },

  /* ── Review image picker ── */
  addPhotoBtn: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  addPhotoBtnTxt: { color: '#555', fontSize: 13, fontWeight: '600' },
  imgPreviewRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  imgThumbWrap: { position: 'relative' },
  imgThumb: { width: 70, height: 70, borderRadius: 8, backgroundColor: '#eee' },
  imgRemoveBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imgRemoveTxt: { color: '#fff', fontSize: 10, fontWeight: '800', lineHeight: 12 },
  pendingReviewBox: { backgroundColor: '#fffbea', borderWidth: 1, borderColor: '#f0c040', borderRadius: 10, padding: 16, marginBottom: 16, alignItems: 'center', gap: 6 },
  pendingReviewIcon: { fontSize: 28 },
  pendingReviewTitle: { color: '#7a5c00', fontSize: 14, fontWeight: '700' },
  pendingReviewText: { color: '#9a7a1a', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  existingReviews: { marginTop: 16 },
  existingReviewsTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 12, color: '#000' },
  reviewItem: { backgroundColor: '#f9f9f9', padding: 12, borderRadius: 6, marginBottom: 12 },
  reviewerName: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 4 },
  reviewRating: { flexDirection: 'row', marginBottom: 6 },
  reviewStar: { fontSize: 14, color: '#ddd', marginRight: 2 },
  reviewComment: { fontSize: 13, color: '#666', lineHeight: 18 },
});
