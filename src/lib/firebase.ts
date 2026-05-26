// ============================================================
// CREARD - Configuracion del lado del cliente (Browser)
// Firebase Client SDK (Lazy Init - Solo se inicializa si hay credenciales)
// ============================================================

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _initAttempted = false;

function isClientConfigured(): boolean {
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
  return (
    key.length > 5 &&
    !key.includes('TU_') &&
    !key.includes('AQUI') &&
    !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
}

function initClientFirebase() {
  if (_initAttempted) return;
  _initAttempted = true;

  if (!isClientConfigured()) {
    console.warn('[CREARD] Firebase Client no configurado. La autenticacion no estara disponible.');
    return;
  }

  try {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    _auth = getAuth(_app);
    console.log('[CREARD] Firebase Client inicializado correctamente.');
  } catch (error: any) {
    console.error('[CREARD] Error inicializando Firebase Client:', error.message);
  }
}

// Lazy initialization
export function getAppInstance(): FirebaseApp | null {
  if (!_app && !_initAttempted) initClientFirebase();
  return _app;
}

export function getAuthInstance(): Auth | null {
  if (!_auth && !_initAttempted) initClientFirebase();
  return _auth;
}

// Legacy named exports for backward compatibility (Proxy pattern)
export const app = new Proxy({} as FirebaseApp, {
  get(_, prop) {
    const instance = getAppInstance();
    return instance ? (instance as any)[prop] : undefined;
  },
  getOwnPropertyDescriptor() {
    return { configurable: true, enumerable: true, value: undefined };
  },
  ownKeys() { return []; },
  has() { return false; },
});

export const auth = new Proxy({} as Auth, {
  get(_, prop) {
    const instance = getAuthInstance();
    return instance ? (instance as any)[prop] : undefined;
  },
  getOwnPropertyDescriptor() {
    return { configurable: true, enumerable: true, value: undefined };
  },
  ownKeys() { return []; },
  has() { return false; },
});
