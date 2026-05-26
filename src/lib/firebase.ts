// ============================================================
// CREARD - Configuracion del lado del cliente (Browser)
// Firebase Client SDK (FULLY LAZY - no static imports of firebase/*)
// Esto evita el error "_canInitEmulator" causado por doble
// inicializacion del modulo en Next.js (SSR + CSR bundles)
// ============================================================

type FirebaseApp = any;
type Auth = any;

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _initAttempted = false;

function isClientConfigured(): boolean {
  try {
    const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
    return (
      key.length > 5 &&
      !key.includes('TU_') &&
      !key.includes('AQUI') &&
      !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    );
  } catch {
    return false;
  }
}

async function initClientFirebase() {
  if (_initAttempted) return;
  _initAttempted = true;

  if (!isClientConfigured()) {
    console.warn('[CREARD] Firebase Client no configurado.');
    return;
  }

  // Only initialize in the browser
  if (typeof window === 'undefined') return;

  try {
    // Dynamic imports - loaded ONLY in the browser, never server-side
    const firebaseApp = await import('firebase/app');
    const firebaseAuth = await import('firebase/auth');

    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    if (firebaseApp.getApps().length === 0) {
      _app = firebaseApp.initializeApp(firebaseConfig);
    } else {
      _app = firebaseApp.getApp();
    }
    _auth = firebaseAuth.getAuth(_app);
    console.log('[CREARD] Firebase Client inicializado correctamente.');
  } catch (error: any) {
    console.error('[CREARD] Error inicializando Firebase Client:', error.message);
  }
}

/**
 * Returns the Firebase Auth instance (initialized lazily).
 * All auth operations should go through this.
 */
export async function getFirebaseAuth(): Promise<Auth | null> {
  if (!_auth && !_initAttempted) {
    await initClientFirebase();
  }
  return _auth;
}

/**
 * Returns the Firebase App instance (initialized lazily).
 */
export async function getFirebaseApp(): Promise<FirebaseApp | null> {
  if (!_app && !_initAttempted) {
    await initClientFirebase();
  }
  return _app;
}

/**
 * Sign in with email/password using Firebase Auth.
 * Wraps the operation ensuring Firebase is initialized first.
 */
export async function firebaseSignIn(email: string, password: string) {
  const authInstance = await getFirebaseAuth();
  if (!authInstance) throw new Error('Firebase no esta inicializado.');

  const { signInWithEmailAndPassword } = await import('firebase/auth');
  return signInWithEmailAndPassword(authInstance, email, password);
}

/**
 * Create user with email/password using Firebase Auth.
 */
export async function firebaseCreateUser(email: string, password: string) {
  const authInstance = await getFirebaseAuth();
  if (!authInstance) throw new Error('Firebase no esta inicializado.');

  const { createUserWithEmailAndPassword } = await import('firebase/auth');
  return createUserWithEmailAndPassword(authInstance, email, password);
}

/**
 * Update a user's profile (displayName, photoURL).
 */
export async function firebaseUpdateProfile(user: any, profile: { displayName?: string | null; photoURL?: string | null }) {
  const { updateProfile } = await import('firebase/auth');
  return updateProfile(user, profile);
}

/**
 * Sign out the current user from Firebase Auth.
 */
export async function firebaseSignOut() {
  const authInstance = await getFirebaseAuth();
  if (!authInstance) return;

  const { signOut } = await import('firebase/auth');
  return signOut(authInstance);
}

/**
 * Get the Firebase ID token for a user.
 */
export async function firebaseGetIdToken(user: any, forceRefresh?: boolean) {
  const { getIdToken } = await import('firebase/auth');
  return getIdToken(user, forceRefresh);
}

// Legacy Proxy exports for backward compatibility
export const app = new Proxy({} as FirebaseApp, {
  get(_, prop) {
    if (_app) return (_app as any)[prop];
    return undefined;
  },
  getOwnPropertyDescriptor() {
    return { configurable: true, enumerable: true, value: undefined };
  },
  ownKeys() { return []; },
  has() { return false; },
});

export const auth = new Proxy({} as Auth, {
  get(_, prop) {
    if (_auth) return (_auth as any)[prop];
    return undefined;
  },
  getOwnPropertyDescriptor() {
    return { configurable: true, enumerable: true, value: undefined };
  },
  ownKeys() { return []; },
  has() { return false; },
});

// Keep old named exports for compatibility
export const getAppInstance = getFirebaseApp;
export const getAuthInstance = getFirebaseAuth;
