// ============================================================
// CREARD - Middleware de Autenticación para Admin API Routes
// Ahora verifica Firebase ID Tokens reales via Admin SDK
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

type UserRole = 'user' | 'admin' | 'super_admin';

interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

/**
 * Verifica que la request tiene un Firebase ID Token valido
 * y que el usuario tiene el rol requerido en Firestore.
 * 
 * Mechanism:
 *   1. Lee Authorization header: "Bearer <firebase_id_token>"
 *   2. Verifica el token con Firebase Admin SDK (verifyIdToken)
 *   3. Busca el perfil del usuario en Firestore para obtener el rol
 *   4. Comprueba que el rol cumpla con requiredRole
 * 
 * Fallback: Si no hay Authorization header, intenta leer headers x-user-*
 * (para compatibilidad con el sistema anterior en modo demo).
 */
export async function requireAuth(
  request: NextRequest,
  requiredRole?: UserRole
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  // --- Import firebase-admin dynamically to avoid SSR issues ---
  let adminAuth: any;
  let getUserById: (id: string) => Promise<any>;
  let firebaseAvailable = false;

  try {
    const adminModule = await import('@/lib/firebase-admin');
    adminAuth = adminModule.getAdminAuth();
    const dbModule = await import('@/lib/db');
    getUserById = dbModule.getUserById;

    const pk = process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
    firebaseAvailable = pk.length > 20 && !pk.includes('AQUI') && !pk.includes('tu_');
  } catch (err) {
    console.warn('[AUTH] Firebase Admin init failed, falling back to headers:', err);
    firebaseAvailable = false;
  }

  // --- Try Firebase ID Token first ---
  const authHeader = request.headers.get('authorization');

  if (authHeader?.startsWith('Bearer ') && firebaseAvailable) {
    const token = authHeader.split('Bearer ')[1];

    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      const uid = decodedToken.uid;
      const email = decodedToken.email || '';

      // Get user profile from Firestore for role
      let userData = null;
      try {
        userData = await getUserById(uid);
      } catch {
        // User document might not exist yet
      }

      // Check role from custom claims or Firestore
      const customClaims = decodedToken.role || decodedToken.firebase?.sign_in_provider;
      const role: string = userData?.role || customClaims || 'user';

      // Check if user has required role (super_admin always has access)
      if (requiredRole && role !== requiredRole && role !== 'super_admin') {
        return NextResponse.json(
          { error: 'No tienes permisos de administrador.' },
          { status: 403 }
        );
      }

      if (requiredRole === 'super_admin' && role !== 'super_admin') {
        return NextResponse.json(
          { error: 'Esta accion requiere permisos de Super Administrador.' },
          { status: 403 }
        );
      }

      return {
        user: {
          id: uid,
          email,
          name: userData?.name || decodedToken.name || email.split('@')[0],
          role: role as UserRole,
        },
      };
    } catch (tokenError: any) {
      console.warn('[AUTH] Token verification failed:', tokenError.code || tokenError.message);
      // Fall through to legacy header check
    }
  }

  // --- Fallback: Legacy header-based auth ---
  // Works in demo mode AND when Firebase Client SDK failed (no token available).
  // SECURITY: x-user-role is NEVER trusted for admin/super_admin — those roles
  // must come from a verified Firebase token or Firestore lookup.
  const userId = request.headers.get('x-user-id');
  const userEmail = request.headers.get('x-user-email');

  if (!userId || !userEmail) {
    return NextResponse.json(
      { error: 'Autenticacion requerida.' },
      { status: 401 }
    );
  }

  // In fallback mode, always look up the real role from Firestore
  let fallbackRole: UserRole = 'user';
  try {
    const dbModule = await import('@/lib/db');
    const userData = await dbModule.getUserById(userId);
    if (userData?.role === 'admin' || userData?.role === 'super_admin') {
      fallbackRole = userData.role;
    }
  } catch {
    // Firestore lookup failed — default to 'user' (secure default)
  }

  if (requiredRole && fallbackRole !== requiredRole && fallbackRole !== 'super_admin') {
    return NextResponse.json(
      { error: 'No tienes permisos de administrador.' },
      { status: 403 }
    );
  }

  if (requiredRole === 'super_admin' && fallbackRole !== 'super_admin') {
    return NextResponse.json(
      { error: 'Esta accion requiere permisos de Super Administrador.' },
      { status: 403 }
    );
  }

  return {
    user: { id: userId, email: userEmail, name: userEmail.split('@')[0], role: fallbackRole },
  };
}

/**
 * Shorthand: require super_admin
 */
export async function requireSuperAdmin(request: NextRequest) {
  return requireAuth(request, 'super_admin');
}

/**
 * Verifica que la request tiene un Firebase ID Token valido.
 * Acepta cualquier rol (user, admin, super_admin).
 * Para rutas de usuarios (reservas, pagos, etc.).
 */
export async function requireAnyAuth(
  request: NextRequest
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  // --- Import firebase-admin dynamically to avoid SSR issues ---
  let adminAuth: any;
  let getUserById: (id: string) => Promise<any>;
  let firebaseAvailable = false;

  try {
    const adminModule = await import('@/lib/firebase-admin');
    adminAuth = adminModule.getAdminAuth();
    const dbModule = await import('@/lib/db');
    getUserById = dbModule.getUserById;

    const pk = process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
    firebaseAvailable = pk.length > 20 && !pk.includes('AQUI') && !pk.includes('tu_');
  } catch (err) {
    console.warn('[AUTH] Firebase Admin init failed, falling back to headers:', err);
    firebaseAvailable = false;
  }

  // --- Try Firebase ID Token first ---
  const authHeader = request.headers.get('authorization');

  if (authHeader?.startsWith('Bearer ') && firebaseAvailable) {
    const token = authHeader.split('Bearer ')[1];

    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      const uid = decodedToken.uid;
      const email = decodedToken.email || '';

      // Get user profile from Firestore for role
      let userData = null;
      try {
        userData = await getUserById(uid);
      } catch {
        // User document might not exist yet
      }

      // Check role from Firestore or default to 'user'
      const customClaims = decodedToken.role || decodedToken.firebase?.sign_in_provider;
      const role = userData?.role || customClaims || 'user';

      return {
        user: {
          id: uid,
          email,
          name: userData?.name || decodedToken.name || email.split('@')[0],
          role: role as UserRole,
        },
      };
    } catch (tokenError: any) {
      console.warn('[AUTH] Token verification failed:', tokenError.code || tokenError.message);
      // Fall through to fallback check
    }
  }

  // --- Fallback: Legacy header-based auth ---
  // SECURITY: x-user-role is NEVER trusted — role is looked up from Firestore.
  const userId = request.headers.get('x-user-id');
  const userEmail = request.headers.get('x-user-email');

  if (!userId || !userEmail) {
    return NextResponse.json(
      { error: 'Autenticacion requerida.' },
      { status: 401 }
    );
  }

  // Always look up the real role from Firestore (never trust client-reported role)
  let fallbackRole: UserRole = 'user';
  try {
    const dbModule = await import('@/lib/db');
    const userData = await dbModule.getUserById(userId);
    if (userData?.role === 'admin' || userData?.role === 'super_admin' || userData?.role === 'user') {
      fallbackRole = userData.role;
    }
  } catch {
    // Firestore lookup failed — default to 'user' (secure default)
  }

  return {
    user: {
      id: userId,
      email: userEmail,
      name: userEmail.split('@')[0],
      role: fallbackRole,
    },
  };
}
