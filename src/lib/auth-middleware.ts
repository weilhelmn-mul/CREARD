// ============================================================
// CREARD - Middleware de Autenticación para Admin API Routes
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

type UserRole = 'admin' | 'super_admin';

interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

/**
 * Verifica que la request tiene un header Authorization con un token válido
 * y que el usuario tiene el rol requerido.
 * 
 * Headers esperados:
 *   x-user-id: string (Firebase Auth UID)
 *   x-user-email: string
 *   x-user-role: 'admin' | 'super_admin'
 * 
 * En producción, esto debería validar un JWT/Firebase ID Token.
 */
export async function requireAuth(
  request: NextRequest,
  requiredRole?: UserRole
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  const userId = request.headers.get('x-user-id');
  const userEmail = request.headers.get('x-user-email');
  const userRole = request.headers.get('x-user-role') as UserRole | null;

  if (!userId || !userEmail || !userRole) {
    return NextResponse.json(
      { error: 'Autenticación requerida. Incluye headers: x-user-id, x-user-email, x-user-role' },
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
      { error: 'Esta acción requiere permisos de Super Administrador.' },
      { status: 403 }
    );
  }

  return {
    user: { id: userId, email: userEmail, name: userEmail.split('@')[0], role: userRole },
  };
}

/**
 * Shorthand: require super_admin
 */
export async function requireSuperAdmin(request: NextRequest) {
  return requireAuth(request, 'super_admin');
}
