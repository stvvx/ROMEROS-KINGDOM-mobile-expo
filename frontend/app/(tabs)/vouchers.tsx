import React, { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import axios from 'axios'
import Constants from 'expo-constants'
import { useFocusEffect } from 'expo-router'

import { getItem } from '@/utils/storage'

type VoucherCategory = 'free-shipping' | 'minimum-spend' | 'monthly-voucher'

interface VoucherItem {
  _id: string
  code: string
  category: VoucherCategory
  badge: string
  label: string
  description: string
  validText: string
  leftValue: string
  rightTag?: string
}

const CATEGORY_OPTIONS: Array<{ key: VoucherCategory | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'free-shipping', label: 'Free Shipping' },
  { key: 'minimum-spend', label: 'Minimum Spend' },
  { key: 'monthly-voucher', label: 'Monthly' },
]

const colors = {
  bg: '#F5F7FB',
  card: '#FFFFFF',
  border: '#D9E2F2',
  text: '#172033',
  sub: '#5E6B84',
  accent: '#0A6DFF',
  accentSoft: '#E8F1FF',
  success: '#0E9F6E',
  claimed: '#7B879C',
}

let API_URL =
  process.env.NGROK_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:4000/api/v1'

const manifest: any = (Constants as any).manifest || (Constants as any).expoConfig
const debuggerHost = manifest?.debuggerHost?.split(':')[0]

if (debuggerHost && debuggerHost !== 'localhost') {
  API_URL = API_URL.replace('localhost', debuggerHost)
} else if (Platform.OS === 'android' && API_URL.includes('localhost')) {
  API_URL = API_URL.replace('localhost', '10.0.2.2')
}

API_URL = API_URL.trim().replace(/\/+$/, '')
if (!API_URL.endsWith('/api/v1')) {
  API_URL = `${API_URL}/api/v1`
}

export default function UserVouchersTab() {
  const [vouchers, setVouchers] = useState<VoucherItem[]>([])
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set())
  const [activeCategory, setActiveCategory] = useState<VoucherCategory | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [claimingId, setClaimingId] = useState<string | null>(null)

  const loadVouchers = async (isPullToRefresh = false) => {
    try {
      if (isPullToRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const [voucherRes, token] = await Promise.all([
        axios.get(`${API_URL}/vouchers`),
        getItem('authToken'),
      ])

      setVouchers(voucherRes.data?.vouchers || [])

      if (token) {
        const claimedRes = await axios.get(`${API_URL}/my/vouchers/claimed`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        const ids = new Set<string>((claimedRes.data?.voucherIds || []).map((id: string) => String(id)))
        setClaimedIds(ids)
      } else {
        setClaimedIds(new Set())
      }
    } catch (error: any) {
      Alert.alert('Could not fetch vouchers', error?.response?.data?.message || 'Please check your connection and server.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadVouchers()
    }, [])
  )

  const filtered = useMemo(() => {
    if (activeCategory === 'all') {
      return vouchers
    }

    return vouchers.filter((item) => item.category === activeCategory)
  }, [vouchers, activeCategory])

  const claimVoucher = async (voucherId: string) => {
    const token = await getItem('authToken')

    if (!token) {
      Alert.alert('Login required', 'Please sign in before claiming vouchers.')
      return
    }

    try {
      setClaimingId(voucherId)
      const res = await axios.post(
        `${API_URL}/voucher/${voucherId}/claim`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setClaimedIds((prev) => {
        const next = new Set(prev)
        next.add(voucherId)
        return next
      })

      Alert.alert('Voucher claimed', res.data?.message || 'Voucher claimed successfully.')
    } catch (error: any) {
      Alert.alert('Claim failed', error?.response?.data?.message || 'Could not claim voucher right now.')
    } finally {
      setClaimingId(null)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      <View style={styles.header}>
        <Text style={styles.title}>Vouchers</Text>
        <Text style={styles.subtitle}>View and claim all available promos.</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        {CATEGORY_OPTIONS.map((tab) => {
          const active = tab.key === activeCategory
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveCategory(tab.key)}
              style={[styles.tabChip, active && styles.tabChipActive]}
            >
              <Text style={[styles.tabChipText, active && styles.tabChipTextActive]}>{tab.label}</Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loaderText}>Loading vouchers...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadVouchers(true)} />}
        >
          {filtered.map((voucher) => {
            const claimed = claimedIds.has(voucher._id)
            const isClaiming = claimingId === voucher._id

            return (
              <View key={voucher._id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.leftValue}>{voucher.leftValue}</Text>
                  {!!voucher.rightTag && <Text style={styles.rightTag}>{voucher.rightTag}</Text>}
                </View>

                <Text style={styles.badge}>{voucher.badge}</Text>
                <Text style={styles.label}>{voucher.label}</Text>
                <Text style={styles.description}>{voucher.description}</Text>
                <Text style={styles.validity}>{voucher.validText}</Text>
                <Text style={styles.code}>Code: {voucher.code}</Text>

                <Pressable
                  disabled={claimed || isClaiming}
                  onPress={() => claimVoucher(voucher._id)}
                  style={[styles.claimBtn, (claimed || isClaiming) && styles.claimBtnDisabled]}
                >
                  <Text style={[styles.claimBtnText, (claimed || isClaiming) && styles.claimBtnTextDisabled]}>
                    {isClaiming ? 'Claiming...' : claimed ? 'Claimed' : 'Claim Voucher'}
                  </Text>
                </Pressable>
              </View>
            )
          })}

          {!filtered.length && (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No vouchers here yet</Text>
              <Text style={styles.emptySub}>Try another category or check back later.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: colors.sub,
  },
  tabsRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  tabChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.card,
  },
  tabChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.sub,
  },
  tabChipTextActive: {
    color: colors.accent,
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loaderText: {
    color: colors.sub,
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leftValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  rightTag: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badge: {
    color: colors.success,
    fontWeight: '700',
    fontSize: 12,
    marginBottom: 6,
  },
  label: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  description: {
    marginTop: 4,
    color: colors.sub,
    fontSize: 13,
    lineHeight: 19,
  },
  validity: {
    marginTop: 8,
    color: colors.sub,
    fontSize: 12,
  },
  code: {
    marginTop: 10,
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  claimBtn: {
    marginTop: 12,
    backgroundColor: colors.accent,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  claimBtnDisabled: {
    backgroundColor: '#EEF1F6',
  },
  claimBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  claimBtnTextDisabled: {
    color: colors.claimed,
  },
  emptyWrap: {
    marginTop: 28,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  emptySub: {
    marginTop: 6,
    fontSize: 13,
    color: colors.sub,
    textAlign: 'center',
  },
})
