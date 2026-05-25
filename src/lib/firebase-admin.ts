// ============================================================
// CREARD - Configuracion del lado del servidor (API Routes)
// Firebase Admin SDK
// ============================================================

import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Validacion de credenciales
const REQUIRED_ENV_VARS = [
  'FIREBASE_SERVICE_ACCOUNT_PROJECT_ID',
  'FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY',
  'FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL',
];

const missingVars = REQUIRED_ENV_VARS.filter(
  (v) => !process.env[v] || process.env[v]?.includes('AQUI') || process.env[v]?.includes('tu_')
);

if (missingVars.length > 0 && process.env.NODE_ENV !== 'production') {
  console.warn('\n[CREARD] ADVERTENCIA: Faltan credenciales de Firebase Admin:');
  missingVars.forEach((v) => console.warn(`  - ${v}`));
  console.warn('\nPara configurar Firebase:');
  console.warn('  1. Ve a Firebase Console > Proyecto > Configuracion > Cuentas de servicio');
  console.warn('  2. Haz clic en "Generar nueva clave privada"');
  console.warn('  3. Descarga el JSON y copia los valores en .env.local');
  console.warn('  Guia completa: /download/Guia_Configuracion_Firebase_CREARD.pdf\n');
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

let appAdmin: ReturnType<typeof initializeApp>;

try {
  if (getApps().length === 0) {
    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error(
        'FIREBASE_NOT_CONFIGURED: Faltan credenciales en .env.local. ' +
        'Ve a Firebase Console > Configuracion > Cuentas de servicio > Generar nueva clave privada'
      );
    }
    appAdmin = initializeApp({
      credential: cert(serviceAccount as Parameters<typeof cert>[0]),
    });
  } else {
    appAdmin = getApp();
  }
} catch (error: any) {
  if (error.message?.includes('FIREBASE_NOT_CONFIGURED')) {
    console.error('\n[CREARD] ERROR CRITICO: Firebase no esta configurado.');
    console.error('El servidor se iniciara pero las operaciones de base de datos fallaran.');
    console.error('Configura tu .env.local con las credenciales de Firebase.\n');
  } else {
    console.error('[CREARD] Error inicializando Firebase Admin:', error.message);
  }
  throw error;
}

const adminDb = getFirestore(appAdmin);
const adminAuth = getAuth(appAdmin);

export { appAdmin, adminDb, adminAuth };
