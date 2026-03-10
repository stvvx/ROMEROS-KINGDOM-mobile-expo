import AsyncStorage from '@react-native-async-storage/async-storage'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { Auth, getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAWJ9Bq4Lo3h1scJXs4gOUxMonyLet2AwU',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'romeros-kingdom.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'romeros-kingdom',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'romeros-kingdom.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '724001311783',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:724001311783:android:f9b4bb36a3cc700c89d202',
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

let auth: Auth
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  })
} catch {
  auth = getAuth(app)
}

export { app, auth }
