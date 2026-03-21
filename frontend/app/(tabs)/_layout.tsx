import { Tabs } from 'expo-router';
import React from 'react';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getItem } from '@/utils/storage';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [checkingRole, setCheckingRole] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const rawUser = await getItem('user');
        if (!mounted) return;

        if (rawUser) {
          try {
            const parsed = JSON.parse(rawUser);
            if (parsed?.role === 'admin') {
              setIsAdmin(true);
              router.replace('/(admin)/dashboard');
              return;
            }
          } catch {
            // Ignore parse errors and allow tabs access for non-admin or unknown shapes.
          }
        }
      } finally {
        if (mounted) setCheckingRole(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (checkingRole || isAdmin) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0E1117' }}>
        <ActivityIndicator size="large" color="#00C2C7" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
