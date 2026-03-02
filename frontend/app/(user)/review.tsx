import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { getItem } from '@/utils/storage';

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

interface Review {
  _id: string;
  productId: string;
  productName: string;
  productImage?: string | null;
  rating: number;
  comment: string;
  images?: { public_id?: string; url: string }[];
  createdAt: string;
}

const StarRow = ({ rating }: { rating: number }) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    {[1, 2, 3, 4, 5].map((s) => (
      <Text key={s} style={{ color: s <= Math.round(rating) ? '#3DFFC0' : '#2B3247' }}>
        ★
      </Text>
    ))}
  </View>
);

const ReviewCard = ({ review, onPress }: { review: Review; onPress: () => void }) => (
  <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
    <View style={styles.cardHeader}>
      <View>
        <Text style={styles.productName}>{review.productName}</Text>
        <Text style={styles.timestamp}>
          {new Date(review.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.ratingBadge}>
        <Text style={styles.ratingText}>{review.rating.toFixed(1)}</Text>
      </View>
    </View>

    <StarRow rating={review.rating} />
    <Text style={styles.comment}>{review.comment}</Text>

    {/* Review images */}
    {review.images && review.images.length > 0 && (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: 8 }}
        contentContainerStyle={{ gap: 8 }}
      >
        {review.images.map((img, i) => (
          <Image
            key={i}
            source={{ uri: img.url }}
            style={styles.reviewImg}
            resizeMode="cover"
          />
        ))}
      </ScrollView>
    )}

    <Text style={styles.cta}>View product →</Text>
  </TouchableOpacity>
);

export default function UserReview() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  useEffect(() => {
    fetchMyReviews();
  }, []);

  const fetchMyReviews = async (opts?: { silent?: boolean }) => {
    try {
      opts?.silent ? setRefreshing(true) : setLoading(true);
      setError(null);
      const token = await getItem('authToken');
      if (!token) {
        setNeedsAuth(true);
        setReviews([]);
        return;
      }
      setNeedsAuth(false);
      const res = await axios.get(`${API_URL}/reviews/my`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      setReviews(res.data.reviews || []);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to load reviews';
      setError(message);
    } finally {
      opts?.silent ? setRefreshing(false) : setLoading(false);
    }
  };

  const stats = useMemo(() => {
    if (!reviews.length) return { avg: 0, count: 0 };
    const total = reviews.reduce((s, r) => s + r.rating, 0);
    return { avg: total / reviews.length, count: reviews.length };
  }, [reviews]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00C2C7" />
        <Text style={styles.loadingText}>Loading your reviews...</Text>
      </View>
    );
  }

  if (needsAuth) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Sign in to see your reviews</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.primaryBtnText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}> 
        <Text style={styles.title}>My Reviews</Text>
        <View style={styles.pillRow}>
          <View style={styles.pill}>
            <Text style={styles.pillValue}>{stats.count}</Text>
            <Text style={styles.pillLabel}>Total Reviews</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillValue}>{stats.avg.toFixed(1)}</Text>
            <Text style={styles.pillLabel}>Avg Rating</Text>
          </View>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchMyReviews({ silent: true })}
            tintColor="#00C2C7"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No reviews yet</Text>
            <Text style={styles.emptyText}>Buy something awesome and tell us what you think.</Text>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/(tabs)')}>
              <Text style={styles.secondaryBtnText}>Browse products</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <ReviewCard
            review={item}
            onPress={() => router.push({ pathname: '/(user)/ProductDetails', params: { id: item.productId } })}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E1117' },
  header: { padding: 16, paddingBottom: 6, gap: 10 },
  title: { color: '#E8EDF5', fontSize: 22, fontWeight: '800' },
  pillRow: { flexDirection: 'row', gap: 10 },
  pill: { backgroundColor: '#121727', borderColor: '#1F2540', borderWidth: 1, borderRadius: 12, padding: 12, flex: 1 },
  pillValue: { color: '#3DFFC0', fontSize: 18, fontWeight: '800' },
  pillLabel: { color: '#7A859E', fontSize: 12, marginTop: 4 },
  card: { backgroundColor: '#121727', borderColor: '#1F2540', borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productName: { color: '#E8EDF5', fontSize: 16, fontWeight: '700' },
  timestamp: { color: '#7A859E', fontSize: 12, marginTop: 2 },
  ratingBadge: { backgroundColor: '#00C2C71A', borderColor: '#00C2C7', borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  ratingText: { color: '#00E5EB', fontWeight: '700' },
  comment: { color: '#C6CCDC', fontSize: 14, marginTop: 6 },
  cta: { color: '#00C2C7', fontSize: 13, marginTop: 8, fontWeight: '700' },
  center: { flex: 1, backgroundColor: '#0E1117', justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { color: '#E8EDF5', marginTop: 10 },
  primaryBtn: { marginTop: 14, backgroundColor: '#00C2C7', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  primaryBtnText: { color: '#0E1117', fontWeight: '800' },
  secondaryBtn: { marginTop: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderColor: '#00C2C7', borderWidth: 1 },
  secondaryBtnText: { color: '#00C2C7', fontWeight: '700' },
  emptyBox: { marginTop: 30, alignItems: 'center', gap: 8 },
  emptyTitle: { color: '#E8EDF5', fontSize: 18, fontWeight: '700' },
  emptyText: { color: '#7A859E', textAlign: 'center', paddingHorizontal: 24 },
  error: { color: '#FF5A6E', fontSize: 13 },
  reviewImg: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: '#1F2540',
    borderWidth: 1,
    borderColor: '#2B3247',
  },
});
