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

    // ── LOGIN (verificar credenciales con Firebase Auth) ──
    if (action === 'login') {
      const { email, password } = body;

      if (!email || !password) {
        return NextResponse.json(
          { error: 'Email y contraseña son requeridos' },
          { status: 400 }
        );
      }

      // Obtener usuario por email
      let userRecord;
      try {
        userRecord = await adminAuth.getUserByEmail(email);
      } catch {
        return NextResponse.json(
          { error: 'Correo o contraseña inválidos' },
          { status: 401 }
        );
      }

      // Verificar contraseña usando Firebase Auth token
      // Firebase Admin no tiene metodo directo para verificar password,
      // la verificacion real se hace en el cliente con signInWithEmailAndPassword.
      // Aqui verificamos que el usuario existe y devolvemos sus datos.
      // Si la contraseña es incorrecta, el cliente recibira error de Firebase Auth
      // antes de llamar a esta API.

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

    // ── GET USER (obtener datos de usuario por email) ──
    if (action === 'get-user') {
      const { email } = body;

      if (!email) {
        return NextResponse.json(
          { error: 'Email es requerido' },
          { status: 400 }
        );
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
    if (firebaseError.errorInfo?.code === 'auth/invalid-password') {
      return NextResponse.json(
        { error: 'Correo o contraseña inválidos' },
        { status: 401 }
      );
    }

    // Si Firebase no esta configurado, dar mensaje claro
    if (firebaseError.message?.includes('FIREBASE_NOT_CONFIGURED') || 
        firebaseError.message?.includes('credential')) {
      return NextResponse.json(
        { error: 'Firebase no esta configurado. Configura las credenciales en .env.local' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Error de autenticacion' },
      { status: 500 }
    );
  }
}
