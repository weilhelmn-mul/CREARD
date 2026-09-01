// ============================================================
// CREARD - API Route: /api/setup/create-admin
// Crea el usuario administrador en Firebase Auth + Firestore
// DEBE ejecutarse UNA SOLA VEZ y luego eliminarse del deploy.
// Protegido por un secret para evitar uso no autorizado.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { createUser as createUserInDb, getUserById, updateUser } from '@/lib/db';
import { isFirebaseAvailable } from '@/lib/firebase-check';

const SETUP_SECRET = process.env.SETUP_SECRET;

export async function POST(request: NextRequest) {
  // P0-14 FIX: No default secret - must be explicitly set
  if (!SETUP_SECRET) {
    return NextResponse.json({ error: 'SETUP_SECRET no configurado.' }, { status: 500 });
  }

  try {
    // P0-14 FIX: Block in production entirely
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Endpoint deshabilitado en produccion.' }, { status: 403 });
    }

    // Verify setup secret
    const authHeader = request.headers.get('authorization');
    const body = await request.json().catch(() => ({}));
    const bodySecret = body?.secret;

    const providedSecret = authHeader?.replace('Bearer ', '') || bodySecret;
    if (providedSecret !== SETUP_SECRET) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    if (!isFirebaseAvailable()) {
      return NextResponse.json(
        { error: 'Firebase Admin SDK no configurado. Configura las variables de entorno.' },
        { status: 503 }
      );
    }

    // P0-14 FIX: Credentials from environment
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@creard.com';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    if (!ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'ADMIN_PASSWORD no configurado.' }, { status: 500 });
    }
    const ADMIN_NAME = 'Weilhelm';

    // Check if user already exists
    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(ADMIN_EMAIL);
      console.log('[SETUP] Usuario ya existe, actualizando rol a super_admin...');

      // Reset password to ensure it matches the expected one
      try {
        await adminAuth.updateUser(userRecord.uid, {
          password: ADMIN_PASSWORD,
          disabled: false,
          displayName: ADMIN_NAME,
        });
        console.log('[SETUP] Password and profile reset for existing admin user');
      } catch (updateErr) {
        console.warn('[SETUP] Could not reset password:', updateErr);
        // Try at least enabling the user
        try {
          await adminAuth.updateUser(userRecord.uid, { disabled: false });
        } catch { /* ignore */ }
      }

      // Update Firestore document with super_admin role and approved status
      await updateUser(userRecord.uid, { role: 'super_admin', status: 'approved', is_active: true });

      // Also set Firebase custom claims
      await adminAuth.setCustomUserClaims(userRecord.uid, { role: 'super_admin', status: 'approved' });

      return NextResponse.json({
        success: true,
        message: `Usuario existente actualizado a super_admin: ${ADMIN_EMAIL}`,
        uid: userRecord.uid,
      });
    } catch {
      // User does not exist - create new
      console.log('[SETUP] Creando nuevo usuario admin...');
    }

    // Create user in Firebase Auth
    userRecord = await adminAuth.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      displayName: ADMIN_NAME,
    });

    // Create Firestore document with super_admin role and approved status
    await createUserInDb({
      id: userRecord.uid,
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      phone: null,
      role: 'super_admin',
      status: 'approved',
    });

    // Set Firebase custom claims
    await adminAuth.setCustomUserClaims(userRecord.uid, { role: 'super_admin', status: 'approved' });

    // Admin created successfully

    return NextResponse.json({
      success: true,
      message: 'Super Administrador creado exitosamente',
      uid: userRecord.uid,
      email: ADMIN_EMAIL,
      // P0-14 FIX: Password removed from response
      warning: 'Endpoint ejecutado. Elimina antes de produccion.',
    });
  } catch (error: unknown) {
    console.error('[SETUP] Error creating admin:', error);
    const firebaseError = error as { errorInfo?: { code: string; message: string } };

    if (firebaseError.errorInfo?.code === 'auth/email-already-exists') {
      return NextResponse.json(
        { error: 'El email ya esta registrado' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Error al crear administrador' },
      { status: 500 }
    );
  }
}
