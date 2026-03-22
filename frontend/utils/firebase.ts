import AsyncStorage from '@react-native-async-storage/async-storage'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { Auth, getAuth } from 'firebase/auth'

// Defaults are taken from `google-services.json` (Firebase project: romeros-kingdom).
// You can override any value via EXPO_PUBLIC_FIREBASE_* env vars.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAWJ9Bq4Lo3h1scJXs4gOUxMonyLet2AwU',
  // Auth domain follows the standard Firebase pattern for the project id.
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'romeros-kingdom.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'romeros-kingdom',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'romeros-kingdom.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '724001311783',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:724001311783:android:f9b4bb36a3cc700c89d202',
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

// Configure persistence explicitly for React Native.
// This prevents certain native auth flows from failing with "auth/configuration-not-found".
let auth: Auth
try {
  // Lazy import to avoid bundler/platform issues.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const {
    initializeAuth,
    getReactNativePersistence,
  } = require('firebase/auth')

  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  })
} catch {
  // Fallback to default Auth instance if initializeAuth isn't available.
  auth = getAuth(app)
}

export { app, auth }
