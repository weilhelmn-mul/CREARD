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
    adminAuth = adminModule.adminAuth;
    const dbModule = await import('@/lib/db');
    getUserById = dbModule.getUserById;

    const pk = process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
    firebaseAvailable = pk.length > 20 && !pk.includes('AQUI') && !pk.includes('tu_');
  } catch {
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
      // Fall through to legacy check
    }
  }

  // --- Fallback: Legacy header-based auth (for demo mode) ---
  if (!firebaseAvailable) {
    const userId = request.headers.get('x-user-id');
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role') as UserRole | null;

    if (!userId || !userEmail || !userRole) {
      return NextResponse.json(
        { error: 'Autenticacion requerida.' },
        { status: 401 }
      );
    }

    if (!['admin', 'super_admin'].includes(userRole)) {
      return NextResponse.json(
        { error: 'No tienes permisos de administrador.' },
        { status: 403 }
      );
    }

    if (requiredRole === 'super_admin' && userRole !== 'super_admin') {
      return NextResponse.json(
        { error: 'Esta accion requiere permisos de Super Administrador.' },
        { status: 403 }
      );
    }

    return {
      user: { id: userId, email: userEmail, name: userEmail.split('@')[0], role: userRole },
    };
  }

  return NextResponse.json(
    { error: 'Autenticacion requerida. Incluye Authorization: Bearer <token>.' },
    { status: 401 }
  );
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
    adminAuth = adminModule.adminAuth;
    const dbModule = await import('@/lib/db');
    getUserById = dbModule.getUserById;

    const pk = process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
    firebaseAvailable = pk.length > 20 && !pk.includes('AQUI') && !pk.includes('tu_');
  } catch {
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
      // Fall through to rejection
    }
  }

  // --- Fallback: Legacy header-based auth (for demo mode) ---
  if (!firebaseAvailable) {
    const userId = request.headers.get('x-user-id');
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role') as UserRole | null;

    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'Autenticacion requerida.' },
        { status: 401 }
      );
    }

    return {
      user: {
        id: userId,
        email: userEmail,
        name: userEmail.split('@')[0],
        role: (userRole || 'user') as UserRole,
      },
    };
  }

  return NextResponse.json(
    { error: 'Autenticacion requerida. Incluye Authorization: Bearer <token>.' },
    { status: 401 }
  );
}
