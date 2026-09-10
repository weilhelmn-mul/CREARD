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

  // Invalidar la sesion server-side y limpiar la cookie httpOnly
  try {
    await fetch('/api/auth?action=logout', { method: 'POST' });
  } catch (err) {
    console.warn('[CREARD] Error al cerrar sesion server-side:', err);
  }

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
 *
 * FIX 401-zombie: si el token persistido está vencido (Firebase ID tokens
 * duran 1 h) y la cookie de sesión tampoco sirve, antes se mantenía al
 * usuario "logueado" en pantalla pero TODAS las APIs devolvían 401
 * ("Autenticacion requerida"). Ahora se intenta recuperar una credencial
 * real y, si es imposible, se fuerza un logout limpio.
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

  // Has token - verify with server
  if (token) {
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
          startTokenRefresher();
          console.log('[CREARD] Sesion restaurada para:', data.user.email);
          return true;
        }
      } else if (res.status === 503) {
        // Cuota de Firestore agotada / servicio temporal: NO matar la sesión
        console.warn('[CREARD] Servicio temporalmente indisponible (503); manteniendo sesion local');
        store.setAuthChecked(true);
        return true;
      }
    } catch (err) {
      console.warn('[CREARD] No se pudo verificar token Firebase:', err);
    }
  }

  // ── Recuperación 1: token fresco desde el SDK de Firebase ──
  // El SDK persiste la sesión en IndexedDB: aunque el token del store esté
  // vencido, puede haber un currentUser vivo que emita uno nuevo.
  if (isFirebaseClientAvailable()) {
    try {
      const firebaseModule = await import('@/lib/firebase');
      const authInstance = await firebaseModule.getFirebaseAuth();
      const currentUser = authInstance?.currentUser;
      if (currentUser) {
        const fresh = await firebaseModule.firebaseGetIdToken(currentUser, true);
        if (fresh) {
          const res2 = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: fresh }),
          });
          if (res2.ok) {
            const data2 = await res2.json();
            if (data2.user) {
              store.setUser(data2.user);
              store.setFirebaseToken(fresh);
              store.setAuthChecked(true);
              startTokenRefresher();
              console.log('[CREARD] Token renovado desde SDK para:', data2.user.email);
              return true;
            }
          }
        }
      }
    } catch (err) {
      console.warn('[CREARD] Recuperacion de token via SDK fallo:', err);
    }
  }

  // ── Recuperación 2: ¿la cookie de sesión server-side sigue viva? ──
  // 200 → sesión válida (el servidor autentica por cookie)
  // 401 → sesión muerta: logout limpio (adiós sesiones zombis)
  // 503 → no se puede saber (cuota agotada): mantener sesión local
  try {
    const probe = await fetch('/api/auth?action=check-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (probe.ok) {
      store.setFirebaseToken(null);
      store.setAuthChecked(true);
      console.log('[CREARD] Sesion server-side valida (cookie); continuando sin Bearer');
      return true;
    }
    if (probe.status === 503) {
      console.warn('[CREARD] check-session 503 (cuota); manteniendo sesion local');
      store.setFirebaseToken(null);
      store.setAuthChecked(true);
      return true;
    }
    // 401 u otro: sesión realmente muerta → logout limpio
    store.logout();
    store.setAuthChecked(true);
    return false;
  } catch {
    // Error de red: mantener sesión local (no castigar por una falla de red)
    console.warn('[CREARD] check-session inalcanzable; manteniendo sesion local');
    store.setFirebaseToken(null);
    store.setAuthChecked(true);
    return true;
  }
}

/* ─── Refresco automático del token Firebase (cada 50 min) ───
   Los ID tokens de Firebase duran 1 h: sin refresco, un panel abierto
   más de 1 hora enviaba un Bearer vencido y — sin cookie válida — todas
   las APIs devolvían 401. Este temporizador mantiene el token vivo. */
let tokenRefresherStarted = false;

export function startTokenRefresher(): void {
  if (tokenRefresherStarted) return;
  if (typeof window === 'undefined') return;
  if (!isFirebaseClientAvailable()) return;
  tokenRefresherStarted = true;

  setInterval(async () => {
    try {
      const store = useAppStore.getState();
      if (!store.user) return;
      const firebaseModule = await import('@/lib/firebase');
      const authInstance = await firebaseModule.getFirebaseAuth();
      const currentUser = authInstance?.currentUser;
      if (!currentUser) return;
      const fresh = await firebaseModule.firebaseGetIdToken(currentUser, true);
      if (fresh) {
        store.setFirebaseToken(fresh);
        console.log('[CREARD] Token Firebase refrescado automaticamente');
      }
    } catch {
      /* silencioso: el retry del próximo ciclo lo cubre */
    }
  }, 50 * 60 * 1000);
}

/**
 * Devuelve headers con un token RECIÉN emitido (force refresh).
 * Úsalo para reintentar tras un 401: si el Bearer estaba vencido,
 * este reintento lo repara sin obligar a re-login.
 */
export async function getFreshAuthHeaders(): Promise<Record<string, string>> {
  const headers = getAuthHeaders();
  if (!isFirebaseClientAvailable()) return headers;
  try {
    const firebaseModule = await import('@/lib/firebase');
    const authInstance = await firebaseModule.getFirebaseAuth();
    const currentUser = authInstance?.currentUser;
    if (currentUser) {
      const fresh = await firebaseModule.firebaseGetIdToken(currentUser, true);
      if (fresh) {
        headers['Authorization'] = `Bearer ${fresh}`;
        useAppStore.getState().setFirebaseToken(fresh);
      }
    }
  } catch {
    /* sin SDK disponible devolvemos los headers actuales */
  }
  return headers;
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

  // Always send Bearer token if available
  if (store.firebaseToken) {
    headers['Authorization'] = `Bearer ${store.firebaseToken}`;
  }

  // ALWAYS include fallback headers when user exists.
  // This ensures the server can still authenticate if the token expired
  // (server tries Bearer first, falls back to x-user-* on failure).
  if (store.user) {
    headers['x-user-id'] = store.user.id;
    headers['x-user-email'] = store.user.email;
    headers['x-user-role'] = store.user.role;
  }

  return headers;
}
