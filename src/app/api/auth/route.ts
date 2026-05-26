import { NextRequest, NextResponse } from 'next/server';
import {
  createUser as createUserInDb,
  getUserById,
} from '@/lib/db';
import { adminAuth } from '@/lib/firebase-admin';

function isFirebaseAvailable(): boolean {
  try {
    const pk = process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
    return pk.length > 20 && !pk.includes('AQUI') && !pk.includes('tu_');
  } catch {
    return false;
  }
}

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
          { error: 'Nombre, email y contraseña son requeridos' },
          { status: 400 }
        );
      }

      if (password.length < 6) {
        return NextResponse.json(
          { error: 'La contraseña debe tener al menos 6 caracteres' },
          { status: 400 }
        );
      }

      // Demo mode: create a mock user
      if (!isFirebaseAvailable()) {
        const mockUserId = `demo-user-${Date.now()}`;
        return NextResponse.json(
          {
            user: {
              id: mockUserId,
              name,
              email,
              phone: phone || null,
              role: 'user',
            },
          },
          { status: 201 }
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

    // ── LOGIN ──
    if (action === 'login') {
      const { email, password } = body;

      if (!email || !password) {
        return NextResponse.json(
          { error: 'Email y contraseña son requeridos' },
          { status: 400 }
        );
      }

      // Demo mode: accept any login
      if (!isFirebaseAvailable()) {
        const mockUserId = `demo-user-${Date.now()}`;
        return NextResponse.json({
          user: {
            id: mockUserId,
            name: email.split('@')[0],
            email,
            phone: null,
            role: 'user',
          },
        });
      }

      let userRecord;
      try {
        userRecord = await adminAuth.getUserByEmail(email);
      } catch {
        return NextResponse.json(
          { error: 'Correo o contraseña inválidos' },
          { status: 401 }
        );
      }

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

    // ── GET USER ──
    if (action === 'get-user') {
      const { email } = body;

      if (!email) {
        return NextResponse.json(
          { error: 'Email es requerido' },
          { status: 400 }
        );
      }

      // Demo mode
      if (!isFirebaseAvailable()) {
        return NextResponse.json({
          user: {
            id: `demo-user-${Date.now()}`,
            name: email.split('@')[0],
            email,
            phone: null,
            role: 'user',
          },
        });
      }

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
      { error: 'Accion invalida. Usa ?action=register, ?action=login o ?action=get-user' },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error('Auth error:', error);
    const firebaseError = error as { errorInfo?: { code: string }; message?: string };

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

    return NextResponse.json(
      { error: 'Error de autenticacion' },
      { status: 500 }
    );
  }
}
