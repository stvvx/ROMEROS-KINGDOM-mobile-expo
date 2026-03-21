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
import { useRouter, Stack } from 'expo-router';
import { fetchMyReviews } from '@/store/slices/reviewSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

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
      <Text key={s} style={{ color: s <= Math.round(rating) ? '#996250' : '#4a2020' }}>
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
  const dispatch = useAppDispatch();
  const { reviews, loading, refreshing, error, needsAuth } = useAppSelector((state) => state.review);

  useEffect(() => {
    dispatch(fetchMyReviews());
  }, []);

  const stats = useMemo(() => {
    if (!reviews.length) return { avg: 0, count: 0 };
    const total = reviews.reduce((s, r) => s + r.rating, 0);
    return { avg: total / reviews.length, count: reviews.length };
  }, [reviews]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#800007" />
        <Text style={styles.loadingText}>Loading your reviews...</Text>
      </View>
    );
  }

  if (needsAuth) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.title}>Sign in to see your reviews</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.primaryBtnText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Text style={styles.eyebrow}>◈ DRIFT N' DASH</Text>
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
            onRefresh={() => dispatch(fetchMyReviews({ silent: true }))}
            tintColor="#800007"
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
  container:      { flex: 1, backgroundColor: '#1a0204' },
  header:         { padding: 16, paddingTop: Platform.OS === 'ios' ? 60 : 44, paddingBottom: 14, gap: 10, backgroundColor: '#200305', borderBottomWidth: 1, borderBottomColor: '#3d0a0d' },
  eyebrow:        { color: '#800007', fontSize: 10, letterSpacing: 3, fontWeight: '700', marginBottom: 2 },
  title:          { color: '#F9F9F9', fontSize: 22, fontWeight: '800' },
  pillRow:        { flexDirection: 'row', gap: 10 },
  pill:           { backgroundColor: '#2a0508', borderColor: '#3d0a0d', borderWidth: 1, borderRadius: 12, padding: 12, flex: 1 },
  pillValue:      { color: '#996250', fontSize: 18, fontWeight: '800' },
  pillLabel:      { color: '#996250', fontSize: 12, marginTop: 4, opacity: 0.7 },
  card:           { backgroundColor: '#2a0508', borderColor: '#3d0a0d', borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  cardHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productName:    { color: '#F9F9F9', fontSize: 16, fontWeight: '700' },
  timestamp:      { color: '#996250', fontSize: 12, marginTop: 2, opacity: 0.8 },
  ratingBadge:    { backgroundColor: 'rgba(128,0,7,0.12)', borderColor: '#800007', borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  ratingText:     { color: '#c0000a', fontWeight: '700' },
  comment:        { color: '#c8a090', fontSize: 14, marginTop: 6 },
  cta:            { color: '#800007', fontSize: 13, marginTop: 8, fontWeight: '700' },
  center:         { flex: 1, backgroundColor: '#1a0204', justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText:    { color: '#996250', marginTop: 10 },
  primaryBtn:     { marginTop: 14, backgroundColor: '#800007', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, shadowColor: '#800007', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  primaryBtnText: { color: '#F9F9F9', fontWeight: '800' },
  secondaryBtn:   { marginTop: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderColor: '#800007', borderWidth: 1 },
  secondaryBtnText: { color: '#800007', fontWeight: '700' },
  emptyBox:       { marginTop: 30, alignItems: 'center', gap: 8 },
  emptyTitle:     { color: '#F9F9F9', fontSize: 18, fontWeight: '700' },
  emptyText:      { color: '#996250', textAlign: 'center', paddingHorizontal: 24 },
  error:          { color: '#FF5A6E', fontSize: 13 },
  reviewImg:      { width: 90, height: 90, borderRadius: 10, backgroundColor: '#3d0a0d', borderWidth: 1, borderColor: '#4a2020' },
});