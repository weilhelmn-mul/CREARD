// ============================================================
// CREARD - Configuracion del lado del servidor (API Routes)
// Firebase Admin SDK (Lazy Init)
// ============================================================

import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let _appAdmin: ReturnType<typeof initializeApp> | null = null;
let _adminDb: Firestore | null = null;
let _adminAuth: Auth | null = null;
let _initError: string | null = null;

function isConfigured(): boolean {
  const pk = process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
  const pid = process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID || '';
  const ce = process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL || '';
  return (
    pk.length > 20 &&
    !pk.includes('AQUI') &&
    !pk.includes('tu_') &&
    !pid.includes('tu_') &&
    ce.includes('@')
  );
}

function initFirebase() {
  if (_initError) return;

  try {
    if (!isConfigured()) {
      _initError = 'Firebase no configurado. Agrega credenciales reales en .env.local';
      console.warn('\n[CREARD] Firebase Admin no configurado - las operaciones de BD fallaran.');
      console.warn('Consulta la guia: /download/Guia_Configuracion_Firebase_CREARD.pdf\n');
      return;
    }

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

    if (getApps().length === 0) {
      _appAdmin = initializeApp({
        credential: cert(serviceAccount as Parameters<typeof cert>[0]),
      });
    } else {
      _appAdmin = getApp();
    }

    _adminDb = getFirestore(_appAdmin);
    _adminAuth = getAuth(_appAdmin);
    console.log('[CREARD] Firebase Admin inicializado correctamente.');
  } catch (error: any) {
    _initError = error.message || 'Error desconocido inicializando Firebase';
    console.error('[CREARD] Error inicializando Firebase Admin:', _initError);
  }
}

// Lazy initialization - only runs when first accessed
function getAdminApp() {
  if (!_appAdmin && !_initError) initFirebase();
  return _appAdmin;
}

function getAdminDb(): Firestore {
  if (!_adminDb && !_initError) initFirebase();
  if (!_adminDb) throw new Error(_initError || 'Firebase no inicializado');
  return _adminDb;
}

function getAdminAuth(): Auth {
  if (!_adminAuth && !_initError) initFirebase();
  if (!_adminAuth) throw new Error(_initError || 'Firebase no inicializado');
  return _adminAuth;
}

export { getAdminApp, getAdminDb, getAdminAuth };

// Legacy exports for backward compatibility
export const appAdmin = new Proxy({} as ReturnType<typeof initializeApp>, {
  get(_, prop) {
    const app = getAdminApp();
    return app ? (app as any)[prop] : undefined;
  },
});

export const adminDb = new Proxy({} as Firestore, {
  get(_, prop) {
    try {
      const db = getAdminDb();
      return (db as any)[prop];
    } catch {
      return undefined;
    }
  },
});

export const adminAuth = new Proxy({} as Auth, {
  get(_, prop) {
    try {
      const auth = getAdminAuth();
      return (auth as any)[prop];
    } catch {
      return undefined;
    }
  },
});
