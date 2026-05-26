// ============================================================
// CREARD - API Route: /api/auth/session
// Verifica un Firebase ID Token y devuelve datos del usuario
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/lib/db';
import { adminAuth } from '@/lib/firebase-admin';

import { isFirebaseAvailable } from '@/lib/firebase-check';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token es requerido' },
        { status: 400 }
      );
    }

    if (!isFirebaseAvailable()) {
      return NextResponse.json(
        { error: 'Firebase no configurado' },
        { status: 503 }
      );
    }

    // Verify the Firebase ID Token
    const decodedToken = await adminAuth.verifyIdToken(token, true);
    const uid = decodedToken.uid;
    const email = decodedToken.email || '';

    // Get user profile from Firestore
    const userData = await getUserById(uid);

    return NextResponse.json({
      user: {
        id: uid,
        name: userData?.name || decodedToken.name || '',
        email,
        phone: userData?.phone || null,
        role: userData?.role || 'user',
      },
    });
  } catch (error: unknown) {
    console.error('Session verification error:', error);
    const authError = error as { code?: string };

    if (authError.code === 'auth/id-token-expired') {
      return NextResponse.json(
        { error: 'Sesion expirada. Inicia sesion de nuevo.' },
        { status: 401 }
      );
    }
    if (authError.code === 'auth/id-token-revoked' || authError.code === 'auth/user-disabled') {
      return NextResponse.json(
        { error: 'Sesion invalida. Inicia sesion de nuevo.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Error al verificar sesion' },
      { status: 401 }
    );
  }
}
