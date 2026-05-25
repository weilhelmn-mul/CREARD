// ============================================================
// CREARD - Configuración del lado del servidor (API Routes)
// Firebase Admin SDK
// ============================================================

import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const serviceAccount = {
  type: process.env.FIREBASE_SERVICE_ACCOUNT_TYPE || 'service_account',
  project_id: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID || '',
  private_key_id: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY_ID || '',
  private_key: (process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL || '',
  client_id: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_ID || '',
  auth_uri: process.env.FIREBASE_SERVICE_ACCOUNT_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
  token_uri: process.env.FIREBASE_SERVICE_ACCOUNT_TOKEN_URI || 'https://oauth2.googleapis.com/token',
};

let appAdmin: ReturnType<typeof initializeApp>;

if (getApps().length === 0) {
  appAdmin = initializeApp({
    credential: cert(serviceAccount as Parameters<typeof cert>[0]),
  });
} else {
  appAdmin = getApp();
}

const adminDb = getFirestore(appAdmin);
const adminAuth = getAuth(appAdmin);

export { appAdmin, adminDb, adminAuth };
