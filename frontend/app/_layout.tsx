import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { Provider } from 'react-redux';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { store } from '@/store';
import { registerFirebasePushToken, setupNotificationResponseHandler } from '../utils/notifications';
import { getItem } from '@/utils/storage';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const API_URL =
    process.env.NGROK_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    'http://localhost:4000/api/v1';

  useEffect(() => {
    // Ensure foreground notifications are presented to the user
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const cleanup = setupNotificationResponseHandler((refModel, refId) => {
      if (!refModel || !refId) return;

      if (refModel === 'Order') {
        // Decide destination based on current stored user role.
        // NOTE: storage access is async; use an async IIFE.
        (async () => {
          try {
            const raw = await getItem('user');
            const u = raw ? JSON.parse(raw) : null;
            const role = String(u?.role || '').toLowerCase();

            if (role === 'admin') {
              router.push({
                pathname: '/(admin)/orders',
                params: { openOrderId: refId },
              });
            } else {
              router.push({
                pathname: '/(user)/orders',
                params: { orderId: refId },
              });
            }
          } catch {
            // Fallback to user orders
            router.push({
              pathname: '/(user)/orders',
              params: { orderId: refId },
            });
          }
        })();
        return;
      }

      if (refModel === 'Product') {
        router.push({
          pathname: '/(user)/ProductDetails',
          params: { id: refId },
        });
        return;
      }

      // Fallback: open notifications list
      router.push('/(user)/notifications');
    });

    // Ensure token is registered even for returning sessions (without re-login).
    (async () => {
      try {
        const authToken = await getItem('authToken');
        if (authToken) {
          await registerFirebasePushToken(API_URL, authToken).catch(() => null);
        }
      } catch {
        // no-op; notification setup should not block app startup
      }
    })();

    return cleanup;
  }, [router, API_URL]);

  return (
    <Provider store={store}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(user)" options={{ headerShown: false }} />
          <Stack.Screen name="(admin)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </Provider>
  );
}
