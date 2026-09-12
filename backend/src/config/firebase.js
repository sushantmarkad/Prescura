const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getStorage } = require('firebase-admin/storage');
const path = require('path');
const fs = require('fs');

let app;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Render/production: JSON string in environment variable
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    app = initializeApp({ credential: cert(serviceAccount) });
    console.log('Firebase Admin initialized via FIREBASE_SERVICE_ACCOUNT (Render)');
  } else {
    // Local development: try serviceAccountKey.json next to this file's directory
    const keyPath = path.join(__dirname, '..', '..', 'serviceAccountKey.json');
    if (fs.existsSync(keyPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      app = initializeApp({ credential: cert(serviceAccount) });
      console.log('Firebase Admin initialized via serviceAccountKey.json (Local)');
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Fallback: gcloud ADC
      app = initializeApp();
      console.log('Firebase Admin initialized via GOOGLE_APPLICATION_CREDENTIALS (ADC)');
    } else {
      console.warn('No Firebase credentials found. Running in mock mode.');
    }
  }
} catch (error) {
  console.log('Firebase Admin initialization failed:', error.message);
}

const db = app ? getFirestore(app) : null;
const auth = app ? getAuth(app) : null;
const storage = app ? getStorage(app) : null;

module.exports = { app, db, auth, storage };
