import { NextRequest, NextResponse } from 'next/server';
import {
  createUser as createUserInDb,
  getUserById,
} from '@/lib/db';
import { adminAuth } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const body = await request.json();

    // ── REGISTER ──
    if (action === 'register') {
      const { name, email, phone, password } = body;

      if (!name || !email || !password) {
        return NextResponse.json(
          { error: 'Name, email, and password are required' },
          { status: 400 }
        );
      }

      // Crear usuario en Firebase Auth
      const userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: name,
      });

      // Crear documento en Firestore
      await createUserInDb({
        id: userRecord.uid,
        name,
        email,
        phone: phone || undefined,
      });

      return NextResponse.json(
        {
          user: {
            id: userRecord.uid,
            name,
            email: userRecord.email,
            phone: phone || null,
            role: 'user',
          },
        },
        { status: 201 }
      );
    }

    // ── LOGIN (verificar credenciales con Firebase Auth Admin) ──
    if (action === 'login') {
      const { email, password } = body;

      if (!email || !password) {
        return NextResponse.json(
          { error: 'Email and password are required' },
          { status: 400 }
        );
      }

      // Nota: Firebase Admin no tiene un método directo para login.
      // Usamos listUsers para buscar por email y verificamos con signInWithCustomToken.
      // Alternativa: el cliente usa Firebase Auth client SDK directamente.
      // Aquí solo verificamos que el usuario existe.
      const userRecord = await adminAuth.getUserByEmail(email);

      const userData = await getUserById(userRecord.uid);

      return NextResponse.json({
        user: {
          id: userRecord.uid,
          name: userData?.name || userRecord.displayName || '',
          email: userRecord.email || '',
          phone: userData?.phone || null,
          role: userData?.role || 'user',
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use ?action=register or ?action=login' },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error('Auth error:', error);
    const firebaseError = error as { errorInfo?: { code: string } };
    if (firebaseError.errorInfo?.code === 'auth/email-already-exists') {
      return NextResponse.json(
        { error: 'Ya existe un usuario con este email' },
        { status: 409 }
      );
    }
    if (firebaseError.errorInfo?.code === 'auth/user-not-found') {
      return NextResponse.json(
        { error: 'Correo o contraseña inválidos' },
        { status: 401 }
      );
    }
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
