// ============================================================
// CREARD - Auth Helpers (Client-Side)
// Funciones auxiliares para la autenticacion del lado del cliente
// Usa solo @/lib/firebase (fully lazy) para evitar el error
// "_canInitEmulator" de Firebase Auth en Next.js
// ============================================================

import { useAppStore } from '@/store/useAppStore';

/**
 * Checks if Firebase Client SDK is properly configured
 */
export function isFirebaseClientAvailable(): boolean {
  try {
    const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
    return key.length > 5 && !key.includes('TU_') && !key.includes('AQUI');
  } catch {
    return false;
  }
}

/**
 * Signs out from Firebase Auth and clears local state
 */
export async function signOutFirebase(): Promise<void> {
  const store = useAppStore.getState();

  // Try to sign out from Firebase Auth
  if (isFirebaseClientAvailable()) {
    try {
      const { firebaseSignOut } = await import('@/lib/firebase');
      await firebaseSignOut();
    } catch (err) {
      console.warn('[CREARD] Error al cerrar sesion en Firebase:', err);
    }
  }

  // Clear local state (also clears localStorage)
  store.logout();
}

/**
 * Attempts to restore the user session on app init
 * Verifies the stored Firebase ID token with the server
 */
export async function restoreSession(): Promise<boolean> {
  const store = useAppStore.getState();
  const token = store.firebaseToken;

  if (!token) {
    store.setAuthChecked(true);
    return false;
  }

  try {
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        store.setUser(data.user);
        store.setFirebaseToken(token); // Keep the token
        store.setAuthChecked(true);
        console.log('[CREARD] Sesion restaurada para:', data.user.email);
        return true;
      }
    }
  } catch (err) {
    console.warn('[CREARD] No se pudo restaurar la sesion:', err);
  }

  // Token invalid - clear everything
  store.logout();
  store.setAuthChecked(true);
  return false;
}

/**
 * Creates auth headers for API requests
 * Includes Firebase ID token if available
 */
export function getAuthHeaders(): Record<string, string> {
  const store = useAppStore.getState();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (store.user && store.firebaseToken) {
    headers['Authorization'] = `Bearer ${store.firebaseToken}`;
  }

  return headers;
}
