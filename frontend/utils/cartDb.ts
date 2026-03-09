/**
 * cartDb.ts  — Web fallback (AsyncStorage-backed)
 * On iOS/Android Metro resolves cartDb.native.ts instead (SQLite).
 * On web this file is used to avoid the expo-sqlite WASM dependency.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CartItem {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  images?: { url: string }[];
}

const KEY = 'cartItems';

/** No-op on web — no table to create. */
export function initCartDb(): void {}

/** Synchronous read is not possible with AsyncStorage; returns [] and triggers a re-render. */
export function getCartItemsSync(): CartItem[] {
  // AsyncStorage is async-only on web; consumers should use loadCartAsync instead.
  return [];
}

/** Persist all cart items to AsyncStorage (web). */
export function saveCartItemsSync(items: CartItem[]): void {
  AsyncStorage.setItem(KEY, JSON.stringify(items)).catch(err =>
    console.warn('[cartDb web] saveCartItemsSync error', err)
  );
}

/** Async load helper — use this on web instead of getCartItemsSync. */
export async function loadCartAsync(): Promise<CartItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
