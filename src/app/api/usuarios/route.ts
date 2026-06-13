import { NextRequest, NextResponse } from 'next/server';
import { createUser, getAllUsers } from '@/lib/db';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/auth-middleware';
import { isFirebaseAvailable } from '@/lib/firebase-check';
import { jsonGetAllUsers, jsonCreateUser, generateId } from '@/lib/json-storage';

// ── POST /api/usuarios ──
// Creacion rapida de cliente desde el flujo de reserva.
// - NO requiere password (no crea credenciales de Firebase Auth).
// - Crea el perfil directamente en Firestore con registeredByAdmin: true.
// - Si el correo ya existe, retorna 409.
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request, 'admin');
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { name, email, phone, role } = body;

    // ── RBAC: Bloquear escalación de privilegios ──
    const requestedRole = role?.toString().toLowerCase().trim();
    const ALLOWED_FOR_ADMIN = ['user', 'admin'];
    const isSuperAdmin = authResult.user.role === 'super_admin';

    if (requestedRole && !isSuperAdmin && !ALLOWED_FOR_ADMIN.includes(requestedRole)) {
      return NextResponse.json(
        { error: 'No tienes permiso para crear usuarios con este rol' },
        { status: 403 }
      );
    }
    if (requestedRole === 'super_admin' && !isSuperAdmin) {
      return NextResponse.json(
        { error: 'Solo un Super Administrador puede crear cuentas de Super Admin' },
        { status: 403 }
      );
    }

    // Forzar rol 'user' para creación rápida de clientes (este endpoint es solo para clientes)
    const effectiveRole = 'user';

    // Validaciones minimas
    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'El nombre es requerido (minimo 2 caracteres)' },
        { status: 400 }
      );
    }

    if (!phone || phone.trim().length < 6) {
      return NextResponse.json(
        { error: 'El telefono es requerido (minimo 6 digitos)' },
        { status: 400 }
      );
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'El formato del correo no es valido' },
        { status: 400 }
      );
    }

    const emailLower = email ? email.trim().toLowerCase() : null;

    // ── DEMO MODE ──
    if (!isFirebaseAvailable()) {
      const allDemoUsers = await jsonGetAllUsers();
      // Check uniqueness by phone first, then email
      const existing = allDemoUsers.find((u: any) => {
        if (u.phone && u.phone === phone.trim()) return true;
        if (emailLower && u.email && u.email.toLowerCase() === emailLower) return true;
        return false;
      });
      if (existing) {
        return NextResponse.json(
          { error: 'Ya existe un cliente con este telefono o correo' },
          { status: 409 }
        );
      }

      const demoId = generateId();
      await jsonCreateUser({
        id: demoId,
        name: name.trim(),
        email: emailLower,
        phone: phone.trim(),
        role: effectiveRole,
        status: 'approved',
        is_active: true,
        registeredByAdmin: true,
      });

      return NextResponse.json(
        {
          success: true,
          uid: demoId,
          user: {
            id: demoId,
            name: name.trim(),
            email: emailLower,
            phone: phone.trim(),
            role: effectiveRole,
            status: 'approved',
          },
          message: `Cliente "${name.trim()}" creado exitosamente`,
        },
        { status: 201 }
      );
    }

    // ── FIREBASE MODE (Firestore-only, NO Firebase Auth) ──
    const db = await getAdminDb();
    const usersRef = db.collection('users');

    // Check uniqueness: phone first, then email
    let existingId: string | null = null;
    let existingData: Record<string, unknown> | null = null;

    const phoneDocs = await usersRef.where('phone', '==', phone.trim()).limit(1).get();
    if (!phoneDocs.empty) {
      existingId = phoneDocs.docs[0].id;
      existingData = phoneDocs.docs[0].data();
    } else if (emailLower) {
      const emailDocs = await usersRef.where('email', '==', emailLower).limit(1).get();
      if (!emailDocs.empty) {
        existingId = emailDocs.docs[0].id;
        existingData = emailDocs.docs[0].data();
      }
    }

    if (existingId && existingData) {
      return NextResponse.json(
        {
          success: true,
          uid: existingId,
          alreadyExists: true,
          user: {
            id: existingId,
            name: (existingData.name as string) || phone.trim(),
            email: (existingData.email as string) || emailLower,
            phone: (existingData.phone as string) || phone.trim(),
            role: (existingData.role as string) || 'user',
            status: (existingData.status as string) || 'approved',
          },
          message: 'Ya existe un cliente con este telefono o correo. Se selecciono automaticamente.',
        },
        { status: 200 }
      );
    }

    // Generate a Firestore document ID (use a random prefix since no Auth UID)
    // We'll use a combination of timestamp + random to ensure uniqueness
    const docId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const clientData = {
      id: docId,
      name: name.trim(),
      email: emailLower,
      phone: phone.trim(),
      role: effectiveRole,
      status: 'approved',
      is_active: true,
      registeredByAdmin: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await usersRef.doc(docId).set(clientData);

    console.log(`[USUARIOS POST] Quick client created: ${emailLower} (id: ${docId}) by ${authResult.user.email}`);

    return NextResponse.json(
      {
        success: true,
        uid: docId,
        user: {
          id: docId,
          name: clientData.name,
          email: clientData.email,
          phone: clientData.phone,
          role: effectiveRole,
          status: clientData.status,
        },
        message: `Cliente "${clientData.name}" creado exitosamente`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[USUARIOS POST] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear cliente' },
      { status: 500 }
    );
  }
}