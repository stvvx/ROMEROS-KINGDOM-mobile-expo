import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { getItem, removeItem, setItem } from '@/utils/storage';

type AvatarShape = string | { url?: string };

type UserShape = {
  name?: string;
  email?: string;
  avatar?: AvatarShape;
  address?: string;
  addressObj?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    phone?: string;
  };
};

export default function UserProfile() {
  const router = useRouter();

  const [user, setUser] = useState<UserShape | null>(null);
  const [loading, setLoading] = useState(true);

  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | undefined>();

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const raw = await getItem('user');
        if (!mounted) return;

        if (!raw) {
          setUser(null);
          return;
        }

        const parsed: UserShape = JSON.parse(raw);
        setUser(parsed);

        if (parsed.addressObj) {
          setAddress(parsed.addressObj.street || '');
          setCity(parsed.addressObj.city || '');
          setPostalCode(parsed.addressObj.postalCode || '');
          setCountry(parsed.addressObj.country || '');
          setPhoneNo(parsed.addressObj.phone || '');
        } else {
          setAddress(parsed.address || '');
        }

        if (typeof parsed.avatar === 'string') {
          setAvatarUri(parsed.avatar);
        } else if (parsed.avatar?.url) {
          setAvatarUri(parsed.avatar.url);
        }
      } catch (e) {
        console.warn('[UserProfile] load error', e);
        setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSignOut = async () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await removeItem('authToken');
          await removeItem('user');
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Photo access is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled) return;

    const uri = result.assets?.[0]?.uri;
    if (!uri) return;

    setAvatarUri(uri);

    const updated = { ...(user || {}), avatar: uri };
    setUser(updated);
    await setItem('user', JSON.stringify(updated));
  };

  const saveProfile = async () => {
    const addressObj = {
      street: address,
      city,
      postalCode,
      country,
      phone: phoneNo,
    };

    const addressString = [address, city, postalCode, country]
      .filter(Boolean)
      .join(', ');

    const updated = {
      ...(user || {}),
      address: addressString,
      addressObj,
    };

    setUser(updated);
    await setItem('user', JSON.stringify(updated));

    Alert.alert('Saved', 'Profile updated successfully');
  };

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  const initials =
    user?.name
      ?.split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={pickImage}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <ThemedText style={styles.avatarInitials}>{initials}</ThemedText>
              </View>
            )}
          </TouchableOpacity>

          <ThemedText type="title">{user?.name || 'No name'}</ThemedText>
          <ThemedText style={styles.email}>{user?.email}</ThemedText>

          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => router.push('/(user)/notifications')}
          >
            <ThemedText style={styles.notificationText}>View notifications →</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.formRow}>
          <ThemedText style={styles.label}>Address</ThemedText>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Street address"
            style={[styles.input, styles.textArea]}
            multiline
          />

          <ThemedText style={styles.label}>City</ThemedText>
          <TextInput value={city} onChangeText={setCity} style={styles.input} />

          <ThemedText style={styles.label}>Postal Code</ThemedText>
          <TextInput
            value={postalCode}
            onChangeText={setPostalCode}
            keyboardType="numeric"
            style={styles.input}
          />

          <ThemedText style={styles.label}>Country</ThemedText>
          <TextInput value={country} onChangeText={setCountry} style={styles.input} />

          <ThemedText style={styles.label}>Phone</ThemedText>
          <TextInput
            value={phoneNo}
            onChangeText={setPhoneNo}
            keyboardType="phone-pad"
            style={styles.input}
          />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={saveProfile}>
            <ThemedText>Save Profile</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.danger]}
            onPress={handleSignOut}
          >
            <ThemedText>Sign Out</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { alignItems: 'center', marginBottom: 24 },

  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 12 },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarInitials: { fontSize: 36 },

  email: { color: '#666', marginTop: 4 },
  notificationBtn: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#00C2C7',
    alignItems: 'center',
  },
  notificationText: {
    color: '#00C2C7',
    fontWeight: '700',
  },
  formRow: { gap: 12 },

  label: { fontSize: 14, fontWeight: '600' },

  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },

  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  actions: { marginTop: 32, gap: 12 },

  actionBtn: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },

  danger: {
    borderColor: '#ff6b6b',
    backgroundColor: '#fff5f5',
  },
});