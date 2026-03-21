import { Platform } from 'react-native'
import axios from 'axios'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'

let _handlerConfigured = false;
let _lastExpoPushToken: string | null = null;

export function ensureNotificationHandlerConfigured() {
  if (_handlerConfigured) return;
  _handlerConfigured = true;

  // Foreground behavior: without this, notifications may not show as a system alert while app is open.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      // iOS 14+/Android 13+ style presentation flags (required by current typings)
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export function getLastExpoPushToken() {
  return _lastExpoPushToken;
}

export async function registerExpoPushToken(apiUrl: string, authToken: string) {
  if (!authToken) return null

  ensureNotificationHandlerConfigured();

  // Expo Go (SDK 53+) no longer supports remote push notifications on Android.
  // Skip registration in Expo Go to prevent runtime errors.
  if ((Constants as any)?.appOwnership === 'expo') return null

  if (Platform.OS === 'web') return null

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2280B0',
      sound: 'default',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    })
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const permission = await Notifications.requestPermissionsAsync()
    finalStatus = permission.status
  }

  if (finalStatus !== 'granted') {
    console.log('[Push] Permission not granted')
    return null
  }

  const projectId =
    (Constants as any)?.expoConfig?.extra?.eas?.projectId ||
    (Constants as any)?.easConfig?.projectId

  const expoTokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  )

  const expoPushToken = typeof expoTokenResponse?.data === 'string'
    ? expoTokenResponse.data
    : ''

  if (!expoPushToken) {
    console.log('[Push] Failed to get Expo push token', expoTokenResponse)
    return null
  }

  _lastExpoPushToken = expoPushToken;
  console.log('[Push] ExpoPushToken =', expoPushToken)

  try {
    await axios.post(
      `${apiUrl}/push/token`,
      {
        expoPushToken,
        platform: Platform.OS,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 10000,
      }
    )
  } catch (err: any) {
    console.log('[Push] Failed to register token with backend', {
      message: err?.message,
      status: err?.response?.status,
      data: err?.response?.data,
    })
    // Still return the token; server registration can be retried later.
  }

  return expoPushToken
}

// Backwards compatible alias (old name in codebase)
export async function registerFirebasePushToken(apiUrl: string, authToken: string) {
  return registerExpoPushToken(apiUrl, authToken)
}

export function setupNotificationResponseHandler(onNavigate: (refModel?: string, refId?: string) => void) {
  ensureNotificationHandlerConfigured();

  // Handle notifications tapped by the user
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data: any = response?.notification?.request?.content?.data
    const refModel = data?.refModel
    const refId = data?.refId
    onNavigate(refModel, refId)
  })

  return () => sub.remove()
}
