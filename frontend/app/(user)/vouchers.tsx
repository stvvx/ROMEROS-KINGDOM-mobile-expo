import React, { useCallback, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Pressable,
	Platform,
	RefreshControl,
	SafeAreaView,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import axios from 'axios';
import Constants from 'expo-constants';
import { useFocusEffect } from 'expo-router';

import { getItem } from '@/utils/storage';

type VoucherCategory = 'free-shipping' | 'minimum-spend' | 'monthly-voucher';

interface VoucherItem {
	_id: string;
	code: string;
	category: VoucherCategory;
	badge: string;
	label: string;
	description: string;
	validText: string;
	leftValue: string;
	rightTag?: string;
}

const CATEGORY_LABEL: Record<VoucherCategory, string> = {
	'free-shipping': 'Free Shipping',
	'minimum-spend': 'Minimum Spend',
	'monthly-voucher': 'Monthly Voucher',
};

const colors = {
	bg: '#F5F7FB',
	card: '#FFFFFF',
	border: '#D9E2F2',
	text: '#172033',
	sub: '#5E6B84',
	accent: '#0A6DFF',
};

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

API_URL = API_URL.trim().replace(/\/+$/, '');
if (!API_URL.endsWith('/api/v1')) {
	API_URL = `${API_URL}/api/v1`;
}

export default function UserVouchersScreen() {
	const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
	const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());
	const [redeemedIds, setRedeemedIds] = useState<Set<string>>(new Set());
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [claimingId, setClaimingId] = useState<string | null>(null);

	const loadClaimedVouchers = async (isPullToRefresh = false) => {
		try {
			if (isPullToRefresh) {
				setRefreshing(true);
			} else {
				setLoading(true);
			}

			const [allVouchersRes, token] = await Promise.all([
				axios.get(`${API_URL}/vouchers`),
				getItem('authToken'),
			]);

			setVouchers(allVouchersRes.data?.vouchers || []);

			if (token) {
				const headers = { Authorization: `Bearer ${token}` };
				const claimedRes = await axios.get(`${API_URL}/my/vouchers/claimed`, { headers });
				const ids = new Set<string>((claimedRes.data?.voucherIds || []).map((id: string) => String(id)));
				const redeemed = new Set<string>((claimedRes.data?.redeemedVoucherIds || []).map((id: string) => String(id)));
				setClaimedIds(ids);
				setRedeemedIds(redeemed);
			} else {
				setClaimedIds(new Set());
				setRedeemedIds(new Set());
			}
		} catch (error: any) {
			Alert.alert('Could not fetch your vouchers', error?.response?.data?.message || 'Please try again.');
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			loadClaimedVouchers();
		}, [])
	);

	const voucherList = useMemo(() => vouchers, [vouchers]);

	const claimVoucher = async (voucherId: string) => {
		const token = await getItem('authToken');

		if (!token) {
			Alert.alert('Login required', 'Please sign in before claiming vouchers.');
			return;
		}

		try {
			setClaimingId(voucherId);
			const res = await axios.post(
				`${API_URL}/voucher/${voucherId}/claim`,
				{},
				{ headers: { Authorization: `Bearer ${token}` } }
			);

			setClaimedIds((prev) => {
				const next = new Set(prev);
				next.add(voucherId);
				return next;
			});

			setRedeemedIds((prev) => {
				const next = new Set(prev);
				next.delete(voucherId);
				return next;
			});

			Alert.alert('Voucher claimed', res.data?.message || 'Voucher claimed successfully.');
		} catch (error: any) {
			Alert.alert('Claim failed', error?.response?.data?.message || 'Could not claim voucher right now.');
		} finally {
			setClaimingId(null);
		}
	};

	return (
		<SafeAreaView style={styles.safe}>
			<StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

			<View style={styles.header}>
				<Text style={styles.title}>My Vouchers</Text>
				<Text style={styles.subtitle}>All active vouchers are shown here with their codes.</Text>
			</View>

			{loading ? (
				<View style={styles.loaderWrap}>
					<ActivityIndicator size="large" color={colors.accent} />
					<Text style={styles.loaderText}>Loading your vouchers...</Text>
				</View>
			) : (
				<ScrollView
					contentContainerStyle={styles.listContent}
					refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadClaimedVouchers(true)} />}
				>
					{voucherList.map((voucher) => {
						const claimed = claimedIds.has(voucher._id);
						const redeemed = redeemedIds.has(voucher._id);
						const isClaiming = claimingId === voucher._id;

						return (
						<View key={voucher._id} style={styles.card}>
							<View style={styles.topRow}>
								<Text style={styles.leftValue}>{voucher.leftValue}</Text>
								{!!voucher.rightTag && <Text style={styles.rightTag}>{voucher.rightTag}</Text>}
							</View>

							<Text style={styles.badge}>{voucher.badge}</Text>
							<Text style={styles.label}>{voucher.label}</Text>
							<Text style={styles.description}>{voucher.description}</Text>
							<Text style={styles.validity}>{voucher.validText}</Text>

							<View style={styles.codeBox}>
								<Text style={styles.codeLabel}>VOUCHER CODE</Text>
								<Text style={styles.codeValue}>{voucher.code}</Text>
							</View>

							<Text
								style={[
									styles.statusText,
									redeemed ? styles.redeemedText : claimed ? styles.claimedText : styles.notClaimedText,
								]}
							>
								{redeemed ? 'Status: Fully Redeemed' : claimed ? 'Status: Claimed' : 'Status: Not claimed yet'}
							</Text>

							<Pressable
								disabled={claimed || redeemed || isClaiming}
								onPress={() => claimVoucher(voucher._id)}
								style={[styles.claimBtn, (claimed || redeemed || isClaiming) && styles.claimBtnDisabled]}
							>
								<Text style={[styles.claimBtnText, (claimed || redeemed || isClaiming) && styles.claimBtnTextDisabled]}>
									{isClaiming ? 'Claiming...' : redeemed ? 'Fully Redeemed' : claimed ? 'Claimed' : 'Claim Voucher'}
								</Text>
							</Pressable>

							<Text style={styles.categoryText}>Category: {CATEGORY_LABEL[voucher.category]}</Text>
						</View>
					)})}

					{!voucherList.length && (
						<View style={styles.emptyWrap}>
							<Text style={styles.emptyTitle}>No vouchers available yet</Text>
							<Text style={styles.emptySub}>Ask admin to create vouchers, then pull down to refresh.</Text>
						</View>
					)}
				</ScrollView>
			)}
		</SafeAreaView>
	);
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
		paddingVertical: 14,
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
	topRow: {
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
		backgroundColor: '#E8F1FF',
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 999,
		overflow: 'hidden',
	},
	badge: {
		fontSize: 12,
		fontWeight: '700',
		color: colors.accent,
		marginBottom: 6,
	},
	label: {
		fontSize: 17,
		fontWeight: '800',
		color: colors.text,
	},
	description: {
		fontSize: 14,
		color: colors.sub,
		marginTop: 6,
		lineHeight: 20,
	},
	validity: {
		fontSize: 12,
		color: colors.sub,
		marginTop: 8,
	},
	codeBox: {
		marginTop: 12,
		borderWidth: 1,
		borderColor: '#CFE0FF',
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 10,
		backgroundColor: '#F2F7FF',
	},
	codeLabel: {
		fontSize: 11,
		fontWeight: '700',
		color: '#4B5C7D',
		letterSpacing: 0.7,
	},
	codeValue: {
		fontSize: 18,
		fontWeight: '900',
		color: colors.accent,
		marginTop: 4,
	},
	categoryText: {
		marginTop: 10,
		fontSize: 12,
		color: '#6F7C93',
	},
	statusText: {
		marginTop: 10,
		fontSize: 12,
		fontWeight: '700',
	},
	claimBtn: {
		marginTop: 12,
		backgroundColor: colors.accent,
		paddingVertical: 11,
		borderRadius: 10,
		alignItems: 'center',
	},
	claimBtnDisabled: {
		backgroundColor: '#D5DCE9',
	},
	claimBtnText: {
		fontSize: 13,
		fontWeight: '800',
		color: '#FFFFFF',
	},
	claimBtnTextDisabled: {
		color: '#596A84',
	},
	claimedText: {
		color: '#0E9F6E',
	},
	redeemedText: {
		color: '#7C3AED',
	},
	notClaimedText: {
		color: '#DA8B00',
	},
	emptyWrap: {
		marginTop: 28,
		alignItems: 'center',
		paddingHorizontal: 18,
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: '800',
		color: colors.text,
	},
	emptySub: {
		marginTop: 6,
		fontSize: 13,
		color: colors.sub,
		textAlign: 'center',
		lineHeight: 18,
	},
});
