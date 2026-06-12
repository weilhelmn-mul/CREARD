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
    const { name, email, phone } = body;

    // Validaciones minimas
    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'El nombre es requerido (minimo 2 caracteres)' },
        { status: 400 }
      );
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Un correo valido es requerido' },
        { status: 400 }
      );
    }

    // ── DEMO MODE ──
    if (!isFirebaseAvailable()) {
      const allDemoUsers = await jsonGetAllUsers();
      const existing = allDemoUsers.find(
        (u: any) => u.email && u.email.toLowerCase() === email.toLowerCase()
      );
      if (existing) {
        return NextResponse.json(
          { error: 'Este correo ya esta registrado' },
          { status: 409 }
        );
      }

      const demoId = generateId();
      await jsonCreateUser({
        id: demoId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        role: 'user',
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
            email: email.trim().toLowerCase(),
            phone: phone?.trim() || null,
            role: 'user',
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

    // Check email uniqueness in Firestore
    const emailLower = email.trim().toLowerCase();
    const existingDocs = await usersRef.where('email', '==', emailLower).limit(1).get();
    if (!existingDocs.empty) {
      const existingId = existingDocs.docs[0].id;
      // Return the existing user so the frontend can auto-select it
      const existingData = existingDocs.docs[0].data();
      return NextResponse.json(
        {
          success: true,
          uid: existingId,
          alreadyExists: true,
          user: {
            id: existingId,
            name: existingData.name || emailLower,
            email: existingData.email || emailLower,
            phone: existingData.phone || null,
            role: existingData.role || 'user',
            status: existingData.status || 'approved',
          },
          message: `Ya existe un cliente con este correo. Se selecciono automaticamente.`,
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
      phone: phone?.trim() || null,
      role: 'user',
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
          role: clientData.role,
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