import { Platform } from 'react-native'
import axios from 'axios'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'

export async function registerFirebasePushToken(apiUrl: string, authToken: string) {
  if (!authToken) return null

  if (Platform.OS === 'web') return null

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2280B0',
    })
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const permission = await Notifications.requestPermissionsAsync()
    finalStatus = permission.status
  }

  if (finalStatus !== 'granted') {
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

  if (!expoPushToken) return null

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

  return expoPushToken
}
