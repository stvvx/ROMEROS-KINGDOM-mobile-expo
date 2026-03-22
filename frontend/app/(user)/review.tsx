import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  Image,
  ScrollView,
  Animated,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { deleteMyReview, fetchMyReviews } from '@/store/slices/reviewSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

/* ─────────────────────────────────────────
   Palette — Blue Robotics
───────────────────────────────────────── */
const C = {
  bg:          '#020B18',
  bgLayer:     '#040F1F',
  surface:     '#071828',
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
  star:        '#FBBF24',
  starDim:     'rgba(251,191,36,0.2)',
} as const;

const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

/* ─────────────────────────────────────────
   Interfaces
───────────────────────────────────────── */
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

/* ─────────────────────────────────────────
   Star Row — vector-rendered stars
───────────────────────────────────────── */
const StarRow = ({ rating, size = 13 }: { rating: number; size?: number }) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    {[1, 2, 3, 4, 5].map((s) => (
      <Ionicons
        key={s}
        name={s <= Math.round(rating) ? 'star' : 'star-outline'}
        size={size}
        color={s <= Math.round(rating) ? C.star : C.starDim}
      />
    ))}
  </View>
);

/* ─────────────────────────────────────────
   Rating label map
───────────────────────────────────────── */
const RATING_LABEL = ['', 'POOR', 'FAIR', 'GOOD', 'GREAT', 'EXCELLENT'];

function ratingColor(r: number) {
  if (r >= 4.5) return C.success;
  if (r >= 3)   return C.accent;
  if (r >= 2)   return C.star;
  return C.danger;
}

/* ─────────────────────────────────────────
   Review Card
───────────────────────────────────────── */
const ReviewCard = ({ review, onPress, onDelete }: { review: Review; onPress: () => void; onDelete: () => void }) => {
  const color = ratingColor(review.rating);
  const label = RATING_LABEL[Math.round(review.rating)] ?? '';

  return (
    <TouchableOpacity style={[s.card, { borderLeftColor: color }]} activeOpacity={0.88} onPress={onPress}>
      {/* Left accent rail tinted to rating */}
      <View style={[s.cardRail, { backgroundColor: color }]} />

      <View style={s.cardContent}>
        {/* Header */}
        <View style={s.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.productName} numberOfLines={1}>{review.productName}</Text>
            <Text style={s.timestamp}>
              {new Date(review.createdAt).toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric',
              })}
            </Text>
          </View>
          {/* Rating badge */}
          <View style={[s.ratingBadge, { backgroundColor: `${color}18`, borderColor: `${color}55` }]}>
            <Text style={[s.ratingValue, { color }]}>{review.rating.toFixed(1)}</Text>
            <Text style={[s.ratingLabel, { color }]}>{label}</Text>
          </View>
        </View>

        {/* Stars */}
        <StarRow rating={review.rating} />

        {/* Comment */}
        <View style={s.commentBox}>
          <View style={[s.commentRail, { backgroundColor: color, opacity: 0.45 }]} />
          <Text style={s.comment}>{review.comment}</Text>
        </View>

        {/* Attached images */}
        {review.images && review.images.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 10 }}
            contentContainerStyle={{ gap: 8 }}
          >
            {review.images.map((img, i) => (
              <View key={i} style={s.reviewImgWrap}>
                <Image source={{ uri: img.url }} style={s.reviewImg} resizeMode="cover" />
                {/* Scan-line shimmer */}
                <View style={s.reviewImgScan} />
              </View>
            ))}
          </ScrollView>
        )}

        {/* CTA */}
        <View style={s.ctaRow}>
          <TouchableOpacity style={s.viewBtn} onPress={onPress} activeOpacity={0.85}>
            <Text style={[s.cta, { color }]}>UPDATE REVIEW</Text>
            <Feather name="arrow-right" size={11} color={color} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
          <TouchableOpacity style={s.deleteBtn} onPress={onDelete} activeOpacity={0.85}>
            <Feather name="trash-2" size={11} color={C.danger} />
            <Text style={s.deleteTxt}>DELETE</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Corner ticks */}
      <View style={[s.cornerTL, { backgroundColor: color }]} />
      <View style={[s.cornerBR, { backgroundColor: color }]} />
    </TouchableOpacity>
  );
};

/* ─────────────────────────────────────────
   Main Screen
───────────────────────────────────────── */
export default function UserReview() {
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const { reviews, loading, refreshing, error, needsAuth } = useAppSelector((state) => state.review);

  const headerFade = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 420, useNativeDriver: true }).start();
    dispatch(fetchMyReviews());
  }, []);

  const stats = useMemo(() => {
    if (!reviews.length) return { avg: 0, count: 0, best: 0 };
    const total = reviews.reduce((sum, r) => sum + r.rating, 0);
    const best  = Math.max(...reviews.map(r => r.rating));
    return { avg: total / reviews.length, count: reviews.length, best };
  }, [reviews]);

  const handleDeleteReview = (item: Review) => {
    Alert.alert('Delete Review', `Delete your review for ${item.productName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await dispatch(deleteMyReview({ productId: item.productId })).unwrap();
          } catch (err: any) {
            Alert.alert('Delete Failed', err || 'Failed to delete review.');
          }
        },
      },
    ]);
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <View style={s.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={s.loadingText}>LOADING SIGNALS...</Text>
      </View>
    );
  }

  /* ── Auth guard ── */
  if (needsAuth) {
    return (
      <View style={s.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.authIconWrap}>
          <Feather name="shield" size={32} color={C.textDim} />
        </View>
        <Text style={s.authTitle}>NOT AUTHENTICATED</Text>
        <Text style={s.authSub}>Sign in to view your reviews</Text>
        <TouchableOpacity style={s.primaryBtn} onPress={() => router.push('/(auth)/login')}>
          <View style={s.primaryBtnScan} />
          <Feather name="shield" size={13} color={C.bg} style={{ marginRight: 7 }} />
          <Text style={s.primaryBtnText}>SIGN IN</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ══════════════════════════════════
          HEADER
      ══════════════════════════════════ */}
      <Animated.View style={[s.header, { opacity: headerFade }]}>
        {/* Status bar */}
        <View style={s.statusBar}>
          <View style={s.statusLeft}>
            <View style={s.statusPulse} />
            <Text style={s.statusText}>SYSTEM ONLINE</Text>
          </View>
          <Text style={s.statusText}>RK-OS v2.4</Text>
        </View>

        {/* Title row */}
        <View style={s.titleRow}>
          <TouchableOpacity 
            style={s.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="chevron-left" size={20} color={C.accent} />
          </TouchableOpacity>
          <View style={s.titleTick} />
          <View>
            <Text style={s.eyebrow}>ROMERO'S KINGDOM</Text>
            <Text style={s.title}>MY REVIEWS</Text>
          </View>
        </View>

        {/* Stats pills */}
        <View style={s.pillRow}>
          {/* Total reviews */}
          <View style={s.pill}>
            <Text style={s.pillValue}>{stats.count}</Text>
            <Text style={s.pillLabel}>REVIEWS</Text>
          </View>
          {/* Avg rating */}
          <View style={s.pill}>
            <View style={s.pillValueRow}>
              <Text style={[s.pillValue, { color: ratingColor(stats.avg) }]}>
                {stats.avg.toFixed(1)}
              </Text>
              <Ionicons name="star" size={12} color={C.star} style={{ marginLeft: 3 }} />
            </View>
            <Text style={s.pillLabel}>AVG RATING</Text>
          </View>
          {/* Best rating */}
          <View style={s.pill}>
            <View style={s.pillValueRow}>
              <Text style={[s.pillValue, { color: ratingColor(stats.best) }]}>
                {stats.best.toFixed(1)}
              </Text>
              <Ionicons name="star" size={12} color={C.star} style={{ marginLeft: 3 }} />
            </View>
            <Text style={s.pillLabel}>BEST SCORE</Text>
          </View>
        </View>

        {error ? (
          <View style={s.errorRow}>
            <Feather name="alert-triangle" size={12} color={C.danger} />
            <Text style={s.error}> {error}</Text>
          </View>
        ) : null}
      </Animated.View>

      {/* ══════════════════════════════════
          LIST
      ══════════════════════════════════ */}
      <FlatList
        data={reviews}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => dispatch(fetchMyReviews({ silent: true }))}
            tintColor={C.accent}
            colors={[C.accent]}
          />
        }
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="star-outline" size={36} color={C.textDim} />
            </View>
            <Text style={s.emptyTitle}>NO REVIEWS LOGGED</Text>
            <Text style={s.emptyText}>
              Purchase a unit and share your feedback to see it here.
            </Text>
            <TouchableOpacity style={s.secondaryBtn} onPress={() => router.push('/(tabs)')}>
              <View style={s.secondaryBtnScan} />
              <Feather name="zap" size={13} color={C.bg} style={{ marginRight: 7 }} />
              <Text style={s.secondaryBtnText}>BROWSE INVENTORY</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <ReviewCard
            review={item}
            onPress={() => router.push({ pathname: '/(user)/ProductDetails', params: { id: item.productId } })}
            onDelete={() => handleDeleteReview(item)}
          />
        )}
      />
    </View>
  );
}

/* ─────────────────────────────────────────
   Styles
───────────────────────────────────────── */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  /* Loading / Auth center */
  center:      { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', padding: 20, gap: 12 },
  loadingText: { color: C.textDim, fontSize: 10, letterSpacing: 2.5, fontFamily: MONO, marginTop: 8 },
  authIconWrap:{ width: 80, height: 80, borderRadius: 20, backgroundColor: C.accentGlow, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  authTitle:   { color: C.text,    fontSize: 14, fontWeight: '800', letterSpacing: 2.5, fontFamily: MONO },
  authSub:     { color: C.textDim, fontSize: 11 },
  primaryBtn:  { flexDirection: 'row', alignItems: 'center', backgroundColor: C.accent, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 10, overflow: 'hidden', shadowColor: C.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 14, elevation: 8 },
  primaryBtnScan:{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  primaryBtnText:{ color: C.bg, fontWeight: '800', fontSize: 12, letterSpacing: 2, fontFamily: MONO },

  /* Header */
  header: {
    backgroundColor: C.bgLayer,
    paddingTop: Platform.OS === 'ios' ? 52 : 34,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 14,
  },
  statusBar:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.bg },
  statusLeft:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusPulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.success, shadowColor: C.success, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 4, elevation: 2 },
  statusText:  { color: C.textDim, fontSize: 9, fontWeight: '700', letterSpacing: 1.8, fontFamily: MONO },

  titleRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 14 },
  backBtn:   { width: 36, height: 36, borderRadius: 8, backgroundColor: C.accentGlow, borderWidth: 1, borderColor: C.borderBright, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  titleTick: { width: 3, height: 30, borderRadius: 2, backgroundColor: C.accent },
  eyebrow:   { color: C.accent, fontSize: 9, letterSpacing: 2.5, fontWeight: '700', fontFamily: MONO },
  title:     { color: C.text, fontSize: 20, fontWeight: '900', letterSpacing: 3, fontFamily: MONO },

  /* Stats pills */
  pillRow:     { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingBottom: 4 },
  pill:        { flex: 1, backgroundColor: C.surface, borderRadius: 11, borderWidth: 1, borderColor: C.border, padding: 11, alignItems: 'center', gap: 4 },
  pillValueRow:{ flexDirection: 'row', alignItems: 'center' },
  pillValue:   { color: C.accent, fontSize: 16, fontWeight: '800', fontFamily: MONO },
  pillLabel:   { color: C.textDim, fontSize: 8, letterSpacing: 1.5, fontFamily: MONO },

  errorRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 },
  error:       { color: C.danger, fontSize: 12 },

  /* Review Card */
  card: {
    backgroundColor: C.surface,
    borderRadius: 13, borderWidth: 1, borderColor: C.border,
    flexDirection: 'row', overflow: 'hidden',
  },
  cardRail:    { width: 3 },
  cardContent: { flex: 1, padding: 14, gap: 8 },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  productName: { color: C.text, fontSize: 14, fontWeight: '700', lineHeight: 19, marginBottom: 2 },
  timestamp:   { color: C.textDim, fontSize: 10, fontFamily: MONO },

  ratingBadge: { borderRadius: 9, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', minWidth: 52 },
  ratingValue: { fontSize: 15, fontWeight: '800', fontFamily: MONO },
  ratingLabel: { fontSize: 7, fontWeight: '700', letterSpacing: 1.2, fontFamily: MONO, marginTop: 2 },

  commentBox: { backgroundColor: C.bgLayer, borderRadius: 8, borderWidth: 1, borderColor: C.border, padding: 10, flexDirection: 'row', gap: 10, overflow: 'hidden' },
  commentRail:{ width: 2.5, alignSelf: 'stretch', borderRadius: 2 },
  comment:    { flex: 1, color: C.textBody, fontSize: 13, lineHeight: 20 },

  reviewImgWrap: { position: 'relative' },
  reviewImg:     { width: 88, height: 88, borderRadius: 10, backgroundColor: C.bgLayer, borderWidth: 1, borderColor: C.border },
  reviewImgScan: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: C.accent, opacity: 0.25, borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },

  ctaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  viewBtn: { flexDirection: 'row', alignItems: 'center' },
  cta:    { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, fontFamily: MONO },
  deleteBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.dangerBg,
    borderWidth: 1,
    borderColor: C.dangerBorder,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 5,
  },
  deleteTxt: { color: C.danger, fontSize: 9, fontWeight: '800', letterSpacing: 1.2, fontFamily: MONO },

  cornerTL: { position: 'absolute', top: 0,    left: 3,  width: 12, height: 1.5, opacity: 0.6 },
  cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 1.5, opacity: 0.6 },

  /* Empty state */
  emptyBox:     { marginTop: 40, alignItems: 'center', gap: 10, paddingHorizontal: 20 },
  emptyIconWrap:{ width: 80, height: 80, borderRadius: 20, backgroundColor: C.accentGlow, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle:   { color: C.textSub, fontSize: 14, fontWeight: '800', letterSpacing: 2.5, fontFamily: MONO },
  emptyText:    { color: C.textDim, textAlign: 'center', lineHeight: 20, fontSize: 12 },
  secondaryBtn: { marginTop: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: C.accent, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, overflow: 'hidden', shadowColor: C.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12, elevation: 7 },
  secondaryBtnScan:{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  secondaryBtnText:{ color: C.bg, fontWeight: '800', fontSize: 11, letterSpacing: 2, fontFamily: MONO },
});