import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { getItem, removeItem } from '@/utils/storage';

type UserShape = {
	name?: string;
	email?: string;
	avatar?: string;
};

export default function UserProfile() {
	const router = useRouter();
	const [user, setUser] = useState<UserShape | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let mounted = true;

		async function load() {
			setLoading(true);
			try {
				const raw = await getItem('user');
				if (!mounted) return;
				if (raw) {
					try {
						const parsed = JSON.parse(raw);
						setUser(parsed);
					} catch (err) {
						setUser({ email: raw });
					}
				} else {
					setUser(null);
				}
			} catch (err) {
				console.warn('[UserProfile] load user', err);
				setUser(null);
			} finally {
				if (mounted) setLoading(false);
			}
		}

		load();
		return () => {
			mounted = false;
		};
	}, []);

	const handleSignOut = async () => {
		Alert.alert('Sign out', 'Are you sure you want to sign out?', [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Sign Out',
				style: 'destructive',
				onPress: async () => {
					try {
						await removeItem('authToken');
						await removeItem('user');
					} catch (err) {
						console.warn('[UserProfile] signout', err);
					}
					router.replace('/(auth)/login');
				},
			},
		]);
	};

	if (loading) {
		return (
			<ThemedView style={styles.center}>
				<ActivityIndicator size="large" />
			</ThemedView>
		);
	}

	const initials = user?.name
		? user.name
				.split(' ')
				.map((s) => s[0])
				.slice(0, 2)
				.join('')
				.toUpperCase()
		: (user?.email || 'U').charAt(0).toUpperCase();

	return (
		<ThemedView style={styles.container}>
			<View style={styles.header}>
				{user?.avatar ? (
					<Image source={{ uri: user.avatar }} style={styles.avatar} />
				) : (
					<View style={styles.avatarPlaceholder}>
						<ThemedText style={styles.avatarInitials} type="title">
							{initials}
						</ThemedText>
					</View>
				)}

				<ThemedText type="title" style={styles.name}>
					{user?.name || 'No name'}
				</ThemedText>
				<ThemedText type="subtitle" style={styles.email}>
					{user?.email || 'No email'}
				</ThemedText>
			</View>

			<View style={styles.actions}>
				<TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(user)/review')}> 
					<ThemedText type="defaultSemiBold">My Reviews</ThemedText>
				</TouchableOpacity>

				<TouchableOpacity style={[styles.actionBtn, styles.danger]} onPress={handleSignOut}>
					<ThemedText type="defaultSemiBold">Sign Out</ThemedText>
				</TouchableOpacity>
			</View>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
	},
	center: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	header: {
		alignItems: 'center',
		marginTop: 24,
	},
	avatar: {
		width: 120,
		height: 120,
		borderRadius: 60,
		marginBottom: 16,
	},
	avatarPlaceholder: {
		width: 120,
		height: 120,
		borderRadius: 60,
		backgroundColor: '#e6e6e6',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 16,
	},
	avatarInitials: {
		fontSize: 36,
	},
	name: {
		marginTop: 6,
	},
	email: {
		marginTop: 4,
		color: '#666',
		fontSize: 14,
	},
	actions: {
		marginTop: 40,
		gap: 12,
	},
	actionBtn: {
		paddingVertical: 14,
		paddingHorizontal: 16,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#ddd',
		alignItems: 'center',
		backgroundColor: '#fff',
	},
	danger: {
		borderColor: '#ff6b6b',
		backgroundColor: '#fff5f5',
	},
});
