import { NextRequest, NextResponse } from 'next/server';
import {
  createUser as createUserInDb,
  getUserById,
} from '@/lib/db';
import { adminAuth } from '@/lib/firebase-admin';
import { isFirebaseAvailable } from '@/lib/firebase-check';
import { jsonCreateUser, jsonGetUserByEmail, jsonUpdateUser } from '@/lib/json-storage';

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
          { error: 'Nombre, email y contrasena son requeridos' },
          { status: 400 }
        );
      }

      if (password.length < 6) {
        return NextResponse.json(
          { error: 'La contrasena debe tener al menos 6 caracteres' },
          { status: 400 }
        );
      }

      // Demo mode: create a mock user (auto-approved) and save to JSON storage
      if (!isFirebaseAvailable()) {
        const stableUserId = `demo-${Buffer.from(email).toString('base64url')}`;

        // Save user to JSON storage for persistence
        await jsonCreateUser({
          id: stableUserId,
          name,
          email,
          phone: phone || null,
          role: 'user',
          status: 'approved',
          is_active: true,
        });

        return NextResponse.json(
          {
            user: {
              id: stableUserId,
              name,
              email,
              phone: phone || null,
              role: 'user',
              status: 'approved',
            },
          },
          { status: 201 }
        );
      }

      // El frontend ya creo el usuario en Firebase Auth (firebaseCreateUser).
      // Solo necesitamos crear/actualizar el documento en Firestore.
      let userRecord;
      try {
        userRecord = await adminAuth.getUserByEmail(email);
      } catch {
        // Si no existe en Firebase Auth, crearlo aca como fallback
        userRecord = await adminAuth.createUser({
          email,
          password,
          displayName: name,
        });
      }

      // Crear documento en Firestore con status 'pending' (requiere validacion del admin)
      await createUserInDb({
        id: userRecord.uid,
        name,
        email,
        phone: phone || undefined,
        status: 'pending', // Nuevo: pendiente de aprobacion
      });

      return NextResponse.json(
        {
          user: {
            id: userRecord.uid,
            name,
            email: userRecord.email,
            phone: phone || null,
            role: 'user',
            status: 'pending', // El frontend mostrara mensaje de espera
          },
          message: 'Tu cuenta ha sido creada. Un administrador debe aprobarla antes de que puedas acceder.',
        },
        { status: 201 }
      );
    }

    // ── LOGIN ──
    if (action === 'login') {
      const { email, password } = body;

      if (!email || !password) {
        return NextResponse.json(
          { error: 'Email y contrasena son requeridos' },
          { status: 400 }
        );
      }

      // Demo mode: accept any login
      if (!isFirebaseAvailable()) {
        // Use a STABLE ID based on email hash (not random) so bookings persist across sessions
        const stableUserId = `demo-${Buffer.from(email).toString('base64url')}`;

        // Super admin hardcoded credentials for demo mode
        const DEMO_ADMIN_EMAIL = 'weilhelmn@gmail.com';
        const DEMO_ADMIN_PASSWORD = 'Creard2025!';
        if (email === DEMO_ADMIN_EMAIL && password === DEMO_ADMIN_PASSWORD) {
          // Ensure super admin exists in JSON storage
          await jsonCreateUser({
            id: 'demo-super-admin',
            name: 'Weilhelm',
            email: DEMO_ADMIN_EMAIL,
            phone: null,
            role: 'super_admin',
            status: 'approved',
            is_active: true,
          });

          return NextResponse.json({
            user: {
              id: 'demo-super-admin',
              name: 'Weilhelm',
              email: DEMO_ADMIN_EMAIL,
              phone: null,
              role: 'super_admin',
              status: 'approved',
            },
          });
        }

        // Check if user exists in JSON storage
        let existingUser = await jsonGetUserByEmail(email);
        const userName = existingUser?.name || email.split('@')[0];

        // Save/update user in JSON storage
        await jsonCreateUser({
          id: stableUserId,
          name: userName,
          email,
          phone: existingUser?.phone || null,
          role: existingUser?.role || 'user',
          status: 'approved',
          is_active: true,
        });

        return NextResponse.json({
          user: {
            id: stableUserId,
            name: userName,
            email,
            phone: existingUser?.phone || null,
            role: existingUser?.role || 'user',
            status: 'approved',
          },
        });
      }

      let userRecord;
      try {
        userRecord = await adminAuth.getUserByEmail(email);
      } catch {
        return NextResponse.json(
          { error: 'Correo o contrasena invalidos' },
          { status: 401 }
        );
      }

      let userData = await getUserById(userRecord.uid);

      // Verificar si el usuario esta aprobado
      let userStatus = userData?.status || 'pending';
      const userRole = userData?.role || 'user';

      // Auto-fix: si es admin/super_admin con status 'pending', aprobar automáticamente
      if (userStatus === 'pending' && (userRole === 'admin' || userRole === 'super_admin')) {
        console.log(`[AUTH] Auto-fixing admin user ${email}: status pending -> approved`);
        try {
          const { updateUser } = await import('@/lib/db');
          await updateUser(userRecord.uid, { status: 'approved', is_active: true });
          await adminAuth.setCustomUserClaims(userRecord.uid, { role: userRole, status: 'approved' });
          userStatus = 'approved';
        } catch (fixErr) {
          console.error('[AUTH] Auto-fix failed:', fixErr);
        }
      }

      // Auto-fix: si el rol en Firestore es solo 'admin' pero es el super admin configurado, promover
      const ADMIN_EMAIL = 'weilhelmn@gmail.com';
      if (email === ADMIN_EMAIL && userRole !== 'super_admin') {
        console.log(`[AUTH] Auto-upgrading super admin ${email}: role ${userRole} -> super_admin`);
        try {
          const { updateUser } = await import('@/lib/db');
          await updateUser(userRecord.uid, { role: 'super_admin', status: 'approved', is_active: true });
          await adminAuth.setCustomUserClaims(userRecord.uid, { role: 'super_admin', status: 'approved' });
          userData = await getUserById(userRecord.uid);
          userStatus = 'approved';
        } catch (fixErr) {
          console.error('[AUTH] Auto-upgrade failed:', fixErr);
        }
      }

      if (userStatus === 'pending') {
        return NextResponse.json(
          {
            error: 'Tu cuenta esta pendiente de aprobacion por un administrador.',
            code: 'AUTH_PENDING',
          },
          { status: 403 }
        );
      }

      if (userStatus === 'rejected') {
        return NextResponse.json(
          {
            error: 'Tu cuenta ha sido rechazada. Contacta al administrador para mas informacion.',
            code: 'AUTH_REJECTED',
          },
          { status: 403 }
        );
      }

      if (userStatus === 'disabled') {
        return NextResponse.json(
          {
            error: 'Tu cuenta ha sido deshabilitada. Contacta al administrador.',
            code: 'AUTH_DISABLED',
          },
          { status: 403 }
        );
      }

      return NextResponse.json({
        user: {
          id: userRecord.uid,
          name: userData?.name || userRecord.displayName || '',
          email: userRecord.email || '',
          phone: userData?.phone || null,
          role: userData?.role || 'user',
          status: 'approved',
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
        const stableUserId = `demo-${Buffer.from(email).toString('base64url')}`;
        const existingUser = await jsonGetUserByEmail(email);
        return NextResponse.json({
          user: {
            id: stableUserId,
            name: existingUser?.name || email.split('@')[0],
            email,
            phone: existingUser?.phone || null,
            role: existingUser?.role || 'user',
            status: existingUser?.status || 'approved',
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
          status: userData?.status || 'approved',
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
        { error: 'Correo o contrasena invalidos' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Error de autenticacion' },
      { status: 500 }
    );
  }
}
