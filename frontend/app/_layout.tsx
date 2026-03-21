import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { Provider } from 'react-redux';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { store } from '@/store';
import { setupNotificationResponseHandler } from '../utils/notifications';
import { getItem } from '@/utils/storage';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

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

    return cleanup;
  }, [router]);

  return (
    <Provider store={store}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </Provider>
  );
}
