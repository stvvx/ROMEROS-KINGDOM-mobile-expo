import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import axios from 'axios';
import Constants from 'expo-constants';
import { usePathname, useRouter } from 'expo-router';
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

// Shared admin nav
const NAV_ITEMS = [
  { label: 'Dashboard', path: '/(admin)/dashboard' },
  { label: 'Orders', path: '/(admin)/orders' },
  { label: 'Products', path: '/(admin)/products' },
  { label: 'Categories', path: '/(admin)/categories' },
  { label: 'Users', path: '/(admin)/users' },
  { label: 'Reviews', path: '/(admin)/review' },
];

const AdminHeader = () => {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.headerWrapper}>
      <Text style={styles.brand}>⚙️ Admin</Text>
      <FlatList
        data={NAV_ITEMS}
        horizontal
        keyExtractor={(i) => i.path}
        renderItem={({ item }) => {
          const active = pathname === item.path;
          return (
            <TouchableOpacity
              style={[styles.navBtn, active && styles.navBtnActive]}
              onPress={() => router.push(item.path)}
            >
              <Text style={styles.navText}>{item.label}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

interface AdminReviewItem {
  reviewId: string;
  productId: string;
  productName: string;
  productImage?: string;
  rating: number;
  comment: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
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

export default function AdminReview() {
  const router = useRouter();
  const [reviews, setReviews] = useState<AdminReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async (opts?: { silent?: boolean }) => {
    try {
      opts?.silent ? setRefreshing(true) : setLoading(true);
      setError(null);
      const token = await getItem('authToken');
      if (!token) {
        setError('You must be signed in as admin to manage reviews.');
        return;
      }
      const res = await axios.get(`${API_URL}/admin/reviews`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 12000,
      });
      setReviews(res.data.reviews || []);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to load reviews';
      setError(message);
    } finally {
      opts?.silent ? setRefreshing(false) : setLoading(false);
    }
  };

  const handleDelete = async (item: AdminReviewItem) => {
    Alert.alert('Delete review', 'Remove this review permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleteId(item.reviewId);
            const token = await getItem('authToken');
            await axios.delete(`${API_URL}/reviews`, {
              params: { id: item.reviewId, productId: item.productId },
              headers: { Authorization: `Bearer ${token}` },
              timeout: 10000,
            });
            setReviews((prev) => prev.filter((r) => r.reviewId !== item.reviewId));
          } catch (err: any) {
            const msg = err?.response?.data?.message || 'Failed to delete review';
            Alert.alert('Error', msg);
          } finally {
            setDeleteId(null);
          }
        },
      },
    ]);
  };

  const filtered = useMemo(() => {
    if (!ratingFilter) return reviews;
    return reviews.filter((r) => Math.round(r.rating) === ratingFilter);
  }, [reviews, ratingFilter]);

  const stats = useMemo(() => {
    if (!reviews.length) return { avg: 0, count: 0 };
    const total = reviews.reduce((s, r) => s + r.rating, 0);
    return { avg: total / reviews.length, count: reviews.length };
  }, [reviews]);

  if (loading) {
    return (
      <View style={styles.loader}> 
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AdminHeader />

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Reviews</Text>
          <Text style={styles.summaryValue}>{stats.count}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Average Rating</Text>
          <Text style={styles.summaryValue}>{stats.avg.toFixed(1)}</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Filter by rating</Text>
        <View style={styles.chipRow}>
          {[null, 5, 4, 3, 2, 1].map((r) => {
            const active = ratingFilter === r;
            const label = r ? `${r}★` : 'All';
            return (
              <TouchableOpacity
                key={label}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setRatingFilter(r)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.reviewId}
        contentContainerStyle={{ padding: 16, paddingBottom: 28, gap: 12 }}
        onRefresh={() => fetchReviews({ silent: true })}
        refreshing={refreshing}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No reviews</Text>
            <Text style={styles.emptyText}>Once customers start rating products, they will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.productName}>{item.productName}</Text>
                <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
                <Text style={styles.meta}>
                  {item.userName || 'Unknown user'} {item.userEmail ? `• ${item.userEmail}` : ''}
                </Text>
              </View>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
              </View>
            </View>

            <StarRow rating={item.rating} />
            <Text style={styles.comment}>{item.comment}</Text>

            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/(user)/ProductDetails', params: { id: item.productId } })}
              >
                <Text style={styles.link}>Open product</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteBtn, deleteId === item.reviewId && styles.deleteBtnBusy]}
                onPress={() => handleDelete(item)}
                disabled={deleteId === item.reviewId}
              >
                {deleteId === item.reviewId ? (
                  <ActivityIndicator size="small" color="#FF5A6E" />
                ) : (
                  <Text style={styles.deleteText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E1117' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0E1117' },
  headerWrapper: { paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#0E1117' },
  brand: { color: '#E8EDF5', fontWeight: '800', fontSize: 18 },
  navBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderColor: '#1F2540', borderWidth: 1, marginRight: 8, backgroundColor: '#121727' },
  navBtnActive: { borderColor: '#00C2C7' },
  navText: { color: '#E8EDF5', fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10 },
  summaryCard: { flex: 1, backgroundColor: '#121727', borderColor: '#1F2540', borderWidth: 1, borderRadius: 12, padding: 14 },
  summaryLabel: { color: '#7A859E', fontSize: 12 },
  summaryValue: { color: '#3DFFC0', fontSize: 22, fontWeight: '800', marginTop: 4 },
  filterRow: { paddingHorizontal: 16, paddingVertical: 12 },
  filterLabel: { color: '#E8EDF5', fontWeight: '700', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderColor: '#1F2540', borderWidth: 1, backgroundColor: '#121727' },
  chipActive: { borderColor: '#00C2C7', backgroundColor: '#00C2C71A' },
  chipText: { color: '#E8EDF5', fontWeight: '700' },
  chipTextActive: { color: '#00E5EB' },
  error: { color: '#FF5A6E', paddingHorizontal: 16, marginBottom: 8 },
  emptyBox: { padding: 20, alignItems: 'center' },
  emptyTitle: { color: '#E8EDF5', fontSize: 18, fontWeight: '700' },
  emptyText: { color: '#7A859E', textAlign: 'center', marginTop: 6 },
  card: { backgroundColor: '#121727', borderColor: '#1F2540', borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  productName: { color: '#E8EDF5', fontSize: 16, fontWeight: '700' },
  meta: { color: '#7A859E', fontSize: 12 },
  ratingBadge: { backgroundColor: '#00C2C71A', borderColor: '#00C2C7', borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  ratingText: { color: '#00E5EB', fontWeight: '700' },
  comment: { color: '#C6CCDC', fontSize: 14 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  link: { color: '#00C2C7', fontWeight: '700' },
  deleteBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#FF5A6E' },
  deleteBtnBusy: { opacity: 0.7 },
  deleteText: { color: '#FF5A6E', fontWeight: '700' },
});
