import { Platform } from 'react-native';
import Constants from 'expo-constants';

export function getApiUrl(): string {
  let apiUrl =
    process.env.NGROK_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    'http://localhost:4000/api/v1';

  const manifest: any = (Constants as any).manifest || (Constants as any).expoConfig;
  const debuggerHost = manifest?.debuggerHost?.split(':')[0];

  if (debuggerHost && debuggerHost !== 'localhost') {
    apiUrl = apiUrl.replace('localhost', debuggerHost);
  } else if (Platform.OS === 'android' && apiUrl.includes('localhost')) {
    apiUrl = apiUrl.replace('localhost', '10.0.2.2');
  }

  apiUrl = apiUrl.trim().replace(/\/+$/, '');
  if (!apiUrl.endsWith('/api/v1')) {
    apiUrl = `${apiUrl}/api/v1`;
  }

  return apiUrl;
}
