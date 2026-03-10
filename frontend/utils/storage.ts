import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';

const TOKEN_KEYS = new Set(['authToken', 'refreshToken']);

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('app_storage.db');
      await db.execAsync(
        'CREATE TABLE IF NOT EXISTS kv_store (key TEXT PRIMARY KEY NOT NULL, value TEXT);'
      );
      return db;
    })();
  }

  return dbPromise;
}

function shouldUseSqliteForKey(key: string): boolean {
  return TOKEN_KEYS.has(key);
}

async function sqliteGet(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM kv_store WHERE key = ? LIMIT 1;',
    [key]
  );
  return row?.value ?? null;
}

async function sqliteSet(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?);',
    [key, value]
  );
}

async function sqliteRemove(key: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM kv_store WHERE key = ?;', [key]);
}

// Small storage wrapper: prefer browser localStorage when available (web),
// otherwise use AsyncStorage for React Native (mobile).
export async function getItem(key: string): Promise<string | null> {
  try {
    if (typeof window !== 'undefined' && (global as any).localStorage) {
      return (global as any).localStorage.getItem(key);
    }

    if (shouldUseSqliteForKey(key)) {
      try {
        return await sqliteGet(key);
      } catch (sqliteErr) {
        console.warn('[storage] sqlite getItem fallback', sqliteErr);
      }
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

    if (shouldUseSqliteForKey(key)) {
      try {
        await sqliteSet(key, value);
        return;
      } catch (sqliteErr) {
        console.warn('[storage] sqlite setItem fallback', sqliteErr);
      }
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

    if (shouldUseSqliteForKey(key)) {
      try {
        await sqliteRemove(key);
        return;
      } catch (sqliteErr) {
        console.warn('[storage] sqlite removeItem fallback', sqliteErr);
      }
    }

    await AsyncStorage.removeItem(key);
  } catch (err) {
    console.warn('[storage] removeItem error', err);
  }
}
