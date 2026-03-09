/**
 * cartDb.ts
 * SQLite-backed cart storage using expo-sqlite (SDK 54 sync API).
 * Data persists on-device regardless of login state.
 */

import * as SQLite from 'expo-sqlite';

export interface CartItem {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  images?: { url: string }[];
}

const db = SQLite.openDatabaseSync('romeros_cart.db');

// Create table immediately at module load so it is always ready before any
// component function is called — avoids race with useFocusEffect vs useEffect.
db.execSync(
  `CREATE TABLE IF NOT EXISTS cart_items (
    id        TEXT    PRIMARY KEY NOT NULL,
    name      TEXT    NOT NULL,
    price     REAL    NOT NULL,
    quantity  INTEGER NOT NULL,
    image_url TEXT
  );`
);

/** No-op — table is created at module load. Kept for API compatibility. */
export function initCartDb(): void {}

/** Return all cart items from SQLite. */
export function getCartItemsSync(): CartItem[] {
  const rows = db.getAllSync<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    image_url: string | null;
  }>('SELECT * FROM cart_items;');

  return rows.map(row => ({
    _id: row.id,
    name: row.name,
    price: row.price,
    quantity: row.quantity,
    images: row.image_url ? [{ url: row.image_url }] : undefined,
  }));
}

/**
 * Replace the entire cart in a single transaction.
 * Used after any mutation (add, remove, update qty, clear).
 */
export function saveCartItemsSync(items: CartItem[]): void {
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM cart_items;');
    for (const item of items) {
      const imageUrl = item.images?.[0]?.url ?? null;
      db.runSync(
        `INSERT INTO cart_items (id, name, price, quantity, image_url)
         VALUES (?, ?, ?, ?, ?);`,
        item._id,
        item.name,
        item.price,
        item.quantity,
        imageUrl
      );
    }
  });
}

/** Async wrapper around getCartItemsSync — provides a unified API with the web fallback. */
export async function loadCartAsync(): Promise<CartItem[]> {
  return getCartItemsSync();
}
