const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getStorage } = require('firebase-admin/storage');

let app;
// For Render deployment, we pass the raw JSON string in FIREBASE_SERVICE_ACCOUNT
// For local development, it automatically uses GOOGLE_APPLICATION_CREDENTIALS
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    app = initializeApp({
      credential: cert(serviceAccount)
    });
    console.log('Firebase Admin initialized via FIREBASE_SERVICE_ACCOUNT (Render)');
  } else {
    app = initializeApp();
    console.log('Firebase Admin initialized via GOOGLE_APPLICATION_CREDENTIALS (Local)');
  }
} catch (error) {
  console.log('Firebase Admin initialization skipped or failed:', error.message);
}

const db = app ? getFirestore(app) : null;
const auth = app ? getAuth(app) : null;
const storage = app ? getStorage(app) : null;

module.exports = { app, db, auth, storage };
