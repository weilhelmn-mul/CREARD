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

const SETUP_SECRET = process.env.SETUP_SECRET || 'creard-setup-2025';

export async function POST(request: NextRequest) {
  try {
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

    const ADMIN_EMAIL = 'weilhelmn@gmail.com';
    const ADMIN_PASSWORD = 'Creard2025!';
    const ADMIN_NAME = 'Weilhelm';

    // Check if user already exists
    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(ADMIN_EMAIL);
      console.log('[SETUP] Usuario ya existe, actualizando rol a super_admin...');

      // Update Firestore document with super_admin role and approved status
      await updateUser(userRecord.uid, { role: 'super_admin', status: 'approved', is_active: true });

      // Also set Firebase custom claims
      await adminAuth.setCustomUserClaims(userRecord.uid, { role: 'super_admin', status: 'approved' });

      // Enable the user in Firebase Auth in case they were disabled
      try {
        await adminAuth.updateUser(userRecord.uid, { disabled: false });
      } catch { /* ignore if already enabled */ }

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

    console.log(`[SETUP] Admin creado: ${ADMIN_EMAIL} (UID: ${userRecord.uid})`);

    return NextResponse.json({
      success: true,
      message: 'Super Administrador creado exitosamente',
      uid: userRecord.uid,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      warning: 'GUARDA ESTAS CREDENCIALES. Este endpoint debe eliminarse antes de produccion.',
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
