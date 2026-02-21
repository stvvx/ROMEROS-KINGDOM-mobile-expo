import AsyncStorage from '@react-native-async-storage/async-storage';

// Small storage wrapper: prefer browser localStorage when available (web),
// otherwise use AsyncStorage for React Native (mobile).
export async function getItem(key: string): Promise<string | null> {
  try {
    if (typeof window !== 'undefined' && (global as any).localStorage) {
      return (global as any).localStorage.getItem(key);
    }
    return await AsyncStorage.getItem(key);
  } catch (err) {
    console.warn('[storage] getItem error', err);
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    if (typeof window !== 'undefined' && (global as any).localStorage) {
      (global as any).localStorage.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  } catch (err) {
    console.warn('[storage] setItem error', err);
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    if (typeof window !== 'undefined' && (global as any).localStorage) {
      (global as any).localStorage.removeItem(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  } catch (err) {
    console.warn('[storage] removeItem error', err);
  }
}
