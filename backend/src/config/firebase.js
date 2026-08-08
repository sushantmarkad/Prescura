const admin = require('firebase-admin');

// For Render deployment, we pass the raw JSON string in FIREBASE_SERVICE_ACCOUNT
// For local development, it automatically uses GOOGLE_APPLICATION_CREDENTIALS
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized via FIREBASE_SERVICE_ACCOUNT (Render)');
  } else {
    admin.initializeApp();
    console.log('Firebase Admin initialized via GOOGLE_APPLICATION_CREDENTIALS (Local)');
  }
} catch (error) {
  console.log('Firebase Admin initialization skipped or failed:', error.message);
}

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

module.exports = { admin, db, auth, storage };
