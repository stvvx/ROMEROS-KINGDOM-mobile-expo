const admin = require('firebase-admin')

let initialized = false

function getPrivateKey() {
  const raw = process.env.FIREBASE_PRIVATE_KEY
  if (!raw) return null
  return raw.replace(/\\n/g, '\n')
}

function initFirebaseAdmin() {
  if (initialized) return admin

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = getPrivateKey()

  if (!projectId || !clientEmail || !privateKey) {
    return null
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    })
  }

  initialized = true
  return admin
}

function getAuth() {
  const app = initFirebaseAdmin()
  if (!app) return null
  return app.auth()
}

function getMessaging() {
  const app = initFirebaseAdmin()
  if (!app) return null
  return app.messaging()
}

function getFirestore() {
  const app = initFirebaseAdmin()
  if (!app) return null
  return app.firestore()
}

module.exports = { initFirebaseAdmin, getAuth, getMessaging, getFirestore }
