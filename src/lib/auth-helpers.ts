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
 * If there's a Firebase token, verifies it with the server.
 * If no token but a persisted user exists, keeps the session alive.
 */
export async function restoreSession(): Promise<boolean> {
  const store = useAppStore.getState();
  const token = store.firebaseToken;
  const persistedUser = store.user;

  // No token and no user - nothing to restore
  if (!token && !persistedUser) {
    store.setAuthChecked(true);
    return false;
  }

  // No token but user exists (logged in via server-only auth) - keep session
  if (!token && persistedUser) {
    console.log('[CREARD] Sesion restaurada (sin Firebase token):', persistedUser.email);
    store.setAuthChecked(true);
    return true;
  }

  // Has token - verify with server
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
    console.warn('[CREARD] No se pudo verificar token Firebase:', err);
  }

  // Token verification failed - but user exists in localStorage, keep them
  if (persistedUser) {
    console.warn('[CREARD] Token invalido, manteniendo sesion local para:', persistedUser.email);
    store.setFirebaseToken(null);
    store.setAuthChecked(true);
    return true;
  }

  // No user at all - clear everything
  store.logout();
  store.setAuthChecked(true);
  return false;
}

/**
 * Creates auth headers for API requests
 * Includes Firebase ID token if available, otherwise sends user info as fallback
 */
export function getAuthHeaders(): Record<string, string> {
  const store = useAppStore.getState();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (store.firebaseToken) {
    headers['Authorization'] = `Bearer ${store.firebaseToken}`;
  } else if (store.user) {
    // Fallback: send user identity as headers for server-side verification
    // This works in demo mode and when Firebase Client SDK failed
    headers['x-user-id'] = store.user.id;
    headers['x-user-email'] = store.user.email;
    headers['x-user-role'] = store.user.role;
  }

  return headers;
}
