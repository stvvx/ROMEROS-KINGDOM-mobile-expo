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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import { getItem, setItem } from '../../utils/storage';

// Use NGROK if available, fallback to LAN IP
const API_URL = 
  process.env.NGROK_URL || 
  process.env.EXPO_PUBLIC_API_URL || 
  'http://localhost:4000/api/v1';

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
  const [quantity, setQuantity] = useState(1);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [hasPurchased, setHasPurchased] = useState(false);

  // Example user, replace with your AuthContext
  const user: IUser | null = {
    _id: 'user123',
    name: 'John Doe',
    email: 'john@example.com',
  };

  useEffect(() => {
    if (!id) {
      setError('Product ID not found');
      setLoading(false);
      return;
    }
    fetchProductDetails();
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = `${API_URL}/product/${id}`;
      const res = await axios.get(url, { timeout: 10000 });
      if (res.data.product) {
        setProduct(res.data.product);
        if (user) checkPurchaseStatus(user._id, res.data.product._id);
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

  const checkPurchaseStatus = async (userId: string, productId: string) => {
    try {
      const res = await axios.get(`${API_URL}/orders/user/${userId}`);
      const orders = res.data.orders || [];
      const purchased = orders.some((order: any) =>
        order.items.some((item: any) => item.product === productId)
      );
      setHasPurchased(purchased);
    } catch (err) {
      console.error('Failed to check purchase status:', err);
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

      const existingItemIndex = cartItems.findIndex((item: any) => item._id === product._id);
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

  const handleSubmitReview = async () => {
    if (!comment.trim()) return Alert.alert('Error', 'Please write a comment');
    if (rating === 0) return Alert.alert('Error', 'Please select a rating');
    try {
      setSubmittingReview(true);
      const reviewData = { rating, comment, productId: id };
      const config = { headers: { 'Content-Type': 'application/json' } };
      await axios.put(`${API_URL}/review`, reviewData, config);
      Alert.alert('Success', 'Review submitted successfully');
      setComment('');
      setRating(0);
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
  const currentImage = hasImages ? product.images![currentImageIndex] : null;
  const stockStatus = product.stock && product.stock > 0 ? 'In Stock' : 'Out of Stock';
  const stockColor = product.stock && product.stock > 0 ? '#27ae60' : '#e74c3c';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Image Carousel */}
      {hasImages && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: currentImage!.url }} style={styles.mainImage} resizeMode="cover" />

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
              disabled={product.stock && quantity >= product.stock}
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
          {hasPurchased && (
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
          )}

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
  existingReviews: { marginTop: 16 },
  existingReviewsTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 12, color: '#000' },
  reviewItem: { backgroundColor: '#f9f9f9', padding: 12, borderRadius: 6, marginBottom: 12 },
  reviewerName: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 4 },
  reviewRating: { flexDirection: 'row', marginBottom: 6 },
  reviewStar: { fontSize: 14, color: '#ddd', marginRight: 2 },
  reviewComment: { fontSize: 13, color: '#666', lineHeight: 18 },
});
