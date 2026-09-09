import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import {
  createUser as createUserInDb,
  getUserById,
} from '@/lib/db';
import { adminAuth, getAdminDb } from '@/lib/firebase-admin';
import { isFirebaseAvailable } from '@/lib/firebase-check';
import { jsonCreateUser, jsonGetUserByEmail, jsonUpdateUser } from '@/lib/json-storage';

// ============================================================
// Sesiones server-side (cookie httpOnly) — P0 FIX
// El login server-only antes NO verificaba contrasena y las
// sesiones sin Firebase client token no podian llamar APIs
// autenticadas en produccion ("Autenticacion requerida").
// ============================================================

const SESSION_COOKIE = 'creard_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Verifica email+password contra Firebase Auth via Identity Toolkit REST
 * (el Admin SDK no permite verificar contrasenas directamente).
 */
async function verifyPassword(
  email: string,
  password: string
): Promise<{ status: 'ok' | 'bad-credentials' | 'config-error'; uid?: string }> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
  if (!apiKey || apiKey.includes('TU_') || apiKey.includes('AQUI')) {
    return { status: 'config-error' };
  }
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      return { status: 'ok', uid: data.localId };
    }
    const err = await res.json().catch(() => ({}) as { error?: { message?: string } });
    const msg = err?.error?.message || '';
    if (
      msg.includes('API_KEY') ||
      msg.includes('PERMISSION_DENIED') ||
      msg.includes('OPERATION_NOT_ALLOWED') ||
      msg.includes('ADMIN_ONLY_OPERATION')
    ) {
      return { status: 'config-error' };
    }
    return { status: 'bad-credentials' };
  } catch {
    return { status: 'config-error' };
  }
}

/** Crea una sesion server-side: token aleatorio, en Firestore solo el SHA-256. */
async function createSession(uid: string, email: string): Promise<{ token: string } | null> {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await getAdminDb().collection('user_sessions').doc(sha256(token)).set({
      user_id: uid,
      email,
      created_at: new Date(),
      expires_at: expiresAt,
    });
    return { token };
  } catch (err) {
    console.warn('[AUTH] No se pudo crear sesion server-side:', err);
    return null;
  }
}

function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
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

      // Demo mode disabled in production (P0-13)
      if (!isFirebaseAvailable() && process.env.NODE_ENV !== 'production') {
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

      // P0-13 FIX: Demo mode disabled in production
      if (!isFirebaseAvailable() && process.env.NODE_ENV !== 'production') {
        // Use a STABLE ID based on email hash (not random) so bookings persist across sessions
        const stableUserId = `demo-${Buffer.from(email).toString('base64url')}`;

        // Super admin hardcoded credentials for demo mode
        const DEMO_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'weilhelmn@gmail.com';
        const DEMO_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json({ error: 'Modo demo no disponible en produccion.' }, { status: 403 });
        }
        if (DEMO_ADMIN_PASSWORD && email === DEMO_ADMIN_EMAIL && password === DEMO_ADMIN_PASSWORD) {
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

      // P0 FIX: verificar contrasena server-side (antes solo se buscaba el email)
      const pwResult = await verifyPassword(email, password);
      let uid: string;
      if (pwResult.status === 'ok' && pwResult.uid) {
        uid = pwResult.uid;
      } else if (pwResult.status === 'bad-credentials') {
        return NextResponse.json(
          { error: 'Correo o contrasena invalidos' },
          { status: 401 }
        );
      } else {
        // config-error: API key ausente/restringida — fallback legacy SOLO en dev
        console.error('[AUTH] verifyPassword config-error; usando fallback legacy SIN verificacion de contrasena (solo aceptable en desarrollo)');
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json(
            { error: 'Error de configuracion de autenticacion' },
            { status: 500 }
          );
        }
        try {
          uid = (await adminAuth.getUserByEmail(email)).uid;
        } catch {
          return NextResponse.json(
            { error: 'Correo o contrasena invalidos' },
            { status: 401 }
          );
        }
      }
      const userRecord = { uid, email };

      let userData = await getUserById(uid);

      // Verificar si el usuario esta aprobado
      let userStatus = userData?.status || 'pending';
      const userRole = userData?.role || 'user';

      // Auto-fix: si es admin/super_admin con status 'pending', aprobar automáticamente
      if (userStatus === 'pending' && (userRole === 'admin' || userRole === 'super_admin')) {
        // Auto-fixing admin user status
        try {
          const { updateUser } = await import('@/lib/db');
          await updateUser(uid, { status: 'approved', is_active: true });
          await adminAuth.setCustomUserClaims(uid, { role: userRole, status: 'approved' });
          userStatus = 'approved';
        } catch (fixErr) {
          console.error('[AUTH] Auto-fix failed:', fixErr);
        }
      }

      // Auto-fix: si el rol en Firestore es solo 'admin' pero es el super admin configurado, promover
      const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
      if (ADMIN_EMAIL && email === ADMIN_EMAIL && userRole !== 'super_admin') {
        // Auto-upgrading super admin role
        try {
          const { updateUser } = await import('@/lib/db');
          await updateUser(uid, { role: 'super_admin', status: 'approved', is_active: true });
          await adminAuth.setCustomUserClaims(uid, { role: 'super_admin', status: 'approved' });
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

      // Login OK — crear sesion server-side y setear cookie httpOnly
      const response = NextResponse.json({
        user: {
          id: uid,
          name: userData?.name || '',
          email: userRecord.email || '',
          phone: userData?.phone || null,
          role: userData?.role || 'user',
          status: 'approved',
        },
      });
      const session = await createSession(uid, userRecord.email || email);
      if (session) {
        response.cookies.set(SESSION_COOKIE, session.token, sessionCookieOptions(SESSION_TTL_MS / 1000));
      }
      return response;
    }

    // ── LOGOUT ──
    if (action === 'logout') {
      try {
        const cookieToken = request.cookies.get(SESSION_COOKIE)?.value;
        if (cookieToken && isFirebaseAvailable()) {
          await getAdminDb().collection('user_sessions').doc(sha256(cookieToken)).delete();
        }
      } catch (logoutErr) {
        console.warn('[AUTH] Error al eliminar sesion:', logoutErr);
      }
      const res = NextResponse.json({ success: true });
      res.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0));
      return res;
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
      // P0-13 FIX: Demo mode disabled in production
      if (!isFirebaseAvailable() && process.env.NODE_ENV !== 'production') {
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
