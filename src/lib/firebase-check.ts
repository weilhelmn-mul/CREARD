// ============================================================
// CREARD - Firebase Environment Check Utility
// Shared utility to check if Firebase is properly configured
// ============================================================

/**
 * Checks if Firebase Admin SDK is properly configured
 * Verifies that the service account private key is set and valid
 */
export function isFirebaseAvailable(): boolean {
  try {
    const pk = process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
    return pk.length > 20 && !pk.includes('AQUI') && !pk.includes('tu_');
  } catch {
    return false;
  }
}
