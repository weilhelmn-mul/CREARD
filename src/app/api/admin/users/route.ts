import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, getUserById, updateUser, createUser } from '@/lib/db';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/auth-middleware';
import { isFirebaseAvailable } from '@/lib/firebase-check';
import {
  jsonGetAllUsers,
  jsonGetUserById,
  jsonUpdateUser,
  jsonCreateUser,
} from '@/lib/json-storage';
import { generateId } from '@/lib/json-storage';

// ── POST /api/admin/users ──
// Crear un nuevo usuario desde el panel de administración.
// Usa Firebase Admin SDK (no afecta la sesión del admin).
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request, 'admin');
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { email, password, name, phone, role } = body;

    // Validaciones
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, contraseña y nombre son requeridos' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    const validRoles = ['user', 'admin', 'super_admin'];
    const userRole = validRoles.includes(role) ? role : 'user';

    // Solo super_admin puede crear otros super_admin
    if (userRole === 'super_admin' && authResult.user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Solo un Super Administrador puede crear cuentas de Super Admin' },
        { status: 403 }
      );
    }

    // ── DEMO MODE ──
    if (!isFirebaseAvailable()) {
      // Check if email already exists in demo
      const allDemoUsers = await jsonGetAllUsers();
      const existing = allDemoUsers.find((u: any) => u.email === email);
      if (existing) {
        return NextResponse.json(
          { error: 'Este correo ya esta registrado' },
          { status: 409 }
        );
      }

      const demoId = generateId();
      await jsonCreateUser({
        id: demoId,
        name,
        email,
        phone: phone || null,
        role: userRole,
        status: 'approved',
        is_active: true,
      });

      // Demo user created
      return NextResponse.json({
        success: true,
        uid: demoId,
        message: `Usuario "${name}" creado exitosamente`,
      }, { status: 201 });
    }

    // ── FIREBASE MODE ──
    const adminAuth = getAdminAuth();

    // 1. Crear en Firebase Auth (sin afectar sesión del admin)
    let userRecord;
    try {
      userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: name,
        ...(phone ? { phoneNumber: phone } : {}),
      });
    } catch (err: any) {
      const code = err?.errorInfo?.code || err?.code || '';
      if (code === 'auth/email-already-exists') {
        return NextResponse.json(
          { error: 'Este correo ya esta registrado en Firebase Auth' },
          { status: 409 }
        );
      }
      if (code === 'auth/invalid-email') {
        return NextResponse.json(
          { error: 'El formato del correo no es valido' },
          { status: 400 }
        );
      }
      if (code === 'auth/weak-password') {
        return NextResponse.json(
          { error: 'La contraseña es demasiado debil (minimo 6 caracteres)' },
          { status: 400 }
        );
      }
      console.error('[USERS POST] Firebase Auth createUser error:', code, err?.message);
      return NextResponse.json(
        { error: 'Error al crear usuario en Firebase Auth' },
        { status: 500 }
      );
    }

    // 2. Crear documento en Firestore (uid como ID)
    await createUser({
      id: userRecord.uid,
      name,
      email,
      phone: phone || null,
      role: userRole,
      status: 'approved',
      is_active: true,
    });

    // 3. Establecer custom claims para el rol
    try {
      await adminAuth.setCustomUserClaims(userRecord.uid, {
        role: userRole,
        status: 'approved',
      });
    } catch (err) {
      console.warn(`[USERS POST] Could not set custom claims for ${userRecord.uid}:`, err);
    }

    // User created successfully
    return NextResponse.json({
      success: true,
      uid: userRecord.uid,
      message: `Usuario "${name}" creado exitosamente`,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[USERS POST] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear usuario' },
      { status: 500 }
    );
  }
}

// ── GET /api/admin/users ──
// Lista todos los usuarios con sus datos
// Strategy: try Auth listUsers() → fallback to Firestore users collection → fallback to JSON demo
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, 'admin');
  if (authResult instanceof NextResponse) return authResult;

  // ── DEMO MODE: no Firebase env vars at all ──
  if (!isFirebaseAvailable()) {
    try {
      const jsonUsers = await jsonGetAllUsers();
      const sorted = jsonUsers.sort((a: any, b: any) => {
        const statusOrder: Record<string, number> = { pending: 0, approved: 1, rejected: 2, disabled: 3 };
        const aS = statusOrder[a.status || 'approved'] ?? 1;
        const bS = statusOrder[b.status || 'approved'] ?? 1;
        if (aS !== bS) return aS - bS;
        return 0;
      });
      return NextResponse.json(sorted);
    } catch (err) {
      console.error('[USERS GET] Demo mode error:', err);
      return NextResponse.json([]);
    }
  }

  // ── FIREBASE MODE: try multiple strategies ──

  // STRATEGY 1: Firebase Auth listUsers() + Firestore merge
  try {
    const adminAuth = getAdminAuth(); // Direct call, not proxy — throws if init fails
    const authUsers: Record<string, any> = {};
    let pageToken: string | undefined;
    do {
      const result = await adminAuth.listUsers({ maxResults: 1000, pageToken });
      for (const user of result.users) {
        authUsers[user.uid] = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          phone: user.phoneNumber || null,
          disabled: user.disabled,
          metadata: {
            creationTime: user.metadata.creationTime,
            lastSignInTime: user.metadata.lastSignInTime,
          },
        };
      }
      pageToken = result.pageToken;
    } while (pageToken);

    // Enrich with Firestore data
    let firestoreUsers: Record<string, any> = {};
    try {
      const fsUsers = await getAllUsers();
      for (const u of fsUsers) {
        firestoreUsers[u.id] = u;
      }
    } catch (err) {
      console.warn('[USERS GET] Firestore enrichment failed (non-critical):', err);
    }

    const allMerged: any[] = [];
    for (const [uid, authData] of Object.entries(authUsers)) {
      const fs = firestoreUsers[uid] || {};
      allMerged.push({
        id: uid,
        name: fs.name || authData.displayName || authData.email?.split('@')[0] || 'Sin nombre',
        email: authData.email,
        phone: fs.phone || authData.phone || null,
        role: fs.role || 'user',
        status: authData.disabled ? 'disabled' : (fs.status || 'approved'),
        is_active: fs.is_active ?? !authData.disabled,
        metadata: authData.metadata,
        created_at: fs.created_at || authData.metadata?.creationTime || null,
        updated_at: fs.updated_at || null,
      });
    }
    for (const [uid, fs] of Object.entries(firestoreUsers)) {
      if (!authUsers[uid]) {
        allMerged.push({
          id: uid,
          name: fs.name || 'Sin nombre',
          email: fs.email || '',
          phone: fs.phone || null,
          role: fs.role || 'user',
          status: fs.status || 'approved',
          is_active: fs.is_active ?? true,
          created_at: fs.created_at || null,
          updated_at: fs.updated_at || null,
        });
      }
    }

    const sorted = allMerged.sort((a, b) => {
      const o: Record<string, number> = { pending: 0, approved: 1, rejected: 2, disabled: 3 };
      const aS = o[a.status] ?? 1;
      const bS = o[b.status] ?? 1;
      return aS !== bS ? aS - bS : 0;
    });
    console.log(`[USERS GET] Strategy 1 (Auth+Firestore): ${sorted.length} users`);
    return NextResponse.json(sorted);
  } catch (authErr: any) {
    console.warn('[USERS GET] Auth listUsers() failed, falling back to Firestore-only:', authErr?.message || authErr);
  }

  // STRATEGY 2: Firestore users collection only (no Auth)
  try {
    const fsUsers = await getAllUsers();
    const users = fsUsers.map((u: any) => ({
      id: u.id,
      name: u.name || 'Sin nombre',
      email: u.email || '',
      phone: u.phone || null,
      role: u.role || 'user',
      status: u.status || 'approved',
      is_active: u.is_active ?? true,
      created_at: u.created_at || null,
      updated_at: u.updated_at || null,
    }));
    console.log(`[USERS GET] Strategy 2 (Firestore only): ${users.length} users`);
    return NextResponse.json(users);
  } catch (fsErr: any) {
    console.error('[USERS GET] Firestore also failed:', fsErr?.message || fsErr);
  }

  // STRATEGY 3: Last resort — empty array (shouldn't happen)
  return NextResponse.json([]);
}

// ── PUT /api/admin/users ──
// Actualizar usuario: cambiar rol, status, nombre, etc.
export async function PUT(request: NextRequest) {
  const authResult = await requireAuth(request, 'admin');
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { userId, action, ...data } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      );
    }

    // ── DEMO MODE ──
    if (!isFirebaseAvailable()) {
      const targetUser = await jsonGetUserById(userId);
      if (!targetUser) {
        return NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 404 }
        );
      }

      const updates: Record<string, unknown> = {};
      let actionMessage = '';

      switch (action) {
        case 'approve':
          updates.status = 'approved';
          updates.is_active = true;
          actionMessage = 'Usuario aprobado exitosamente';
          break;
        case 'reject':
          updates.status = 'rejected';
          updates.is_active = false;
          actionMessage = 'Usuario rechazado';
          break;
        case 'disable':
          updates.status = 'disabled';
          updates.is_active = false;
          actionMessage = 'Usuario deshabilitado';
          break;
        case 'enable':
          updates.status = 'approved';
          updates.is_active = true;
          actionMessage = 'Usuario habilitado';
          break;
        case 'set_role': {
          const newRole = data.role;
          if (!['user', 'admin', 'super_admin'].includes(newRole)) {
            return NextResponse.json(
              { error: 'Rol invalido. Valores permitidos: user, admin, super_admin' },
              { status: 400 }
            );
          }
          if (newRole === 'super_admin' && authResult.user.role !== 'super_admin') {
            return NextResponse.json(
              { error: 'Solo un Super Administrador puede asignar este rol' },
              { status: 403 }
            );
          }
          updates.role = newRole;
          if (newRole === 'admin' || newRole === 'super_admin') {
            updates.status = 'approved';
            updates.is_active = true;
          }
          actionMessage = `Rol cambiado a ${newRole}`;
          break;
        }
        case 'update_profile':
          if (data.name) updates.name = data.name;
          if (data.phone !== undefined) updates.phone = data.phone;
          actionMessage = 'Perfil actualizado';
          break;
        default:
          return NextResponse.json(
            { error: `Accion "${action}" no reconocida. Usa: approve, reject, disable, enable, set_role, update_profile` },
            { status: 400 }
          );
      }

      await jsonUpdateUser(userId, updates);

      return NextResponse.json({
        success: true,
        message: actionMessage,
        updatedFields: Object.keys(updates),
      });
    }

    // ── FIREBASE MODE ──
    const adminAuth = getAdminAuth(); // Direct call, not proxy

    // Check if user exists in Firestore (create doc if missing)
    let targetUser = await getUserById(userId);

    // If no Firestore doc but user exists in Auth, create one
    if (!targetUser) {
      try {
        const authUser = await adminAuth.getUser(userId);
        // Auto-create Firestore profile
        const { createUser: createUserInDb } = await import('@/lib/db');
        await createUserInDb({
          id: userId,
          name: authUser.displayName || authUser.email?.split('@')[0] || '',
          email: authUser.email || '',
          phone: authUser.phoneNumber || undefined,
          role: 'user',
          status: 'approved',
        });
        targetUser = await getUserById(userId);
      } catch {
        return NextResponse.json(
          { error: 'Usuario no encontrado en Firebase' },
          { status: 404 }
        );
      }
    }

    const updates: Record<string, unknown> = {};
    let actionMessage = '';

    switch (action) {
      case 'approve':
        updates.status = 'approved';
        updates.is_active = true;
        try {
          await adminAuth.setCustomUserClaims(userId, {
            role: targetUser.role || 'user',
            status: 'approved',
          });
          await adminAuth.updateUser(userId, { disabled: false });
        } catch (err) {
          console.warn(`[USERS PUT] Could not update Auth claims for ${userId}:`, err);
        }
        actionMessage = 'Usuario aprobado exitosamente';
        break;

      case 'reject':
        updates.status = 'rejected';
        updates.is_active = false;
        try {
          await adminAuth.updateUser(userId, { disabled: true });
          await adminAuth.setCustomUserClaims(userId, { status: 'rejected' });
        } catch (err) {
          console.warn(`[USERS PUT] Could not disable Auth user ${userId}:`, err);
        }
        actionMessage = 'Usuario rechazado';
        break;

      case 'disable':
        updates.status = 'disabled';
        updates.is_active = false;
        try {
          await adminAuth.updateUser(userId, { disabled: true });
          await adminAuth.setCustomUserClaims(userId, { status: 'disabled' });
        } catch (err) {
          console.warn(`[USERS PUT] Could not disable Auth user ${userId}:`, err);
        }
        actionMessage = 'Usuario deshabilitado';
        break;

      case 'enable':
        updates.status = 'approved';
        updates.is_active = true;
        try {
          await adminAuth.updateUser(userId, { disabled: false });
          await adminAuth.setCustomUserClaims(userId, {
            role: targetUser.role || 'user',
            status: 'approved',
          });
        } catch (err) {
          console.warn(`[USERS PUT] Could not enable Auth user ${userId}:`, err);
        }
        actionMessage = 'Usuario habilitado';
        break;

      case 'set_role': {
        const newRole = data.role;
        if (!['user', 'admin', 'super_admin'].includes(newRole)) {
          return NextResponse.json(
            { error: 'Rol invalido. Valores permitidos: user, admin, super_admin' },
            { status: 400 }
          );
        }

        if (newRole === 'super_admin' && authResult.user.role !== 'super_admin') {
          return NextResponse.json(
            { error: 'Solo un Super Administrador puede asignar este rol' },
            { status: 403 }
          );
        }

        updates.role = newRole;
        if (newRole === 'admin' || newRole === 'super_admin') {
          updates.status = 'approved';
          updates.is_active = true;
        }
        try {
          await adminAuth.updateUser(userId, { disabled: false });
          await adminAuth.setCustomUserClaims(userId, {
            role: newRole,
            status: updates.status || targetUser.status || 'approved',
          });
        } catch (err) {
          console.warn(`[USERS PUT] Could not update Auth claims for ${userId}:`, err);
        }
        actionMessage = `Rol cambiado a ${newRole}`;
        break;
      }

      case 'update_profile':
        if (data.name) updates.name = data.name;
        if (data.phone !== undefined) updates.phone = data.phone;
        actionMessage = 'Perfil actualizado';
        break;

      default:
        return NextResponse.json(
          { error: `Accion "${action}" no reconocida. Usa: approve, reject, disable, enable, set_role, update_profile` },
          { status: 400 }
        );
    }

    // Apply updates to Firestore
    await updateUser(userId, updates);

    return NextResponse.json({
      success: true,
      message: actionMessage,
      updatedFields: Object.keys(updates),
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Error al actualizar usuario' },
      { status: 500 }
    );
  }
}

// ── DELETE /api/admin/users ──
// Eliminar un usuario
export async function DELETE(request: NextRequest) {
  // Solo super_admin puede eliminar usuarios
  const authResult = await requireAuth(request, 'super_admin');
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      );
    }

    // Prevent self-deletion
    if (userId === authResult.user.id) {
      return NextResponse.json(
        { error: 'No puedes eliminar tu propia cuenta' },
        { status: 400 }
      );
    }

    // ── DEMO MODE ──
    if (!isFirebaseAvailable()) {
      // In demo mode, just remove from JSON storage
      // json-storage doesn't have a delete function, so we read, remove, and rewrite
      const { jsonGetAllUsers } = await import('@/lib/json-storage');
      const { default: fs } = await import('fs');
      const { default: path } = await import('path');
      const usersFile = path.join(process.cwd(), 'data', 'users.json');
      try {
        const content = await fs.promises.readFile(usersFile, 'utf-8');
        const data = JSON.parse(content || '{}');
        delete data[userId];
        await fs.promises.writeFile(usersFile, JSON.stringify(data, null, 2));
      } catch (err) {
        console.warn(`[USERS DELETE] Could not delete from JSON storage:`, err);
      }

      return NextResponse.json({
        success: true,
        message: 'Usuario eliminado exitosamente',
      });
    }

    // ── FIREBASE MODE ──
    const adminAuth = getAdminAuth(); // Direct call, not proxy

    // Delete from Firebase Auth (best-effort)
    try {
      await adminAuth.deleteUser(userId);
    } catch (err) {
      console.warn(`Could not delete Firebase Auth user ${userId}:`, err);
    }

    // Delete from Firestore
    const { deleteDocById } = await import('@/lib/db');
    try {
      await deleteDocById('users', userId);
    } catch (err) {
      console.warn(`Could not delete Firestore user ${userId}:`, err);
    }

    return NextResponse.json({
      success: true,
      message: 'Usuario eliminado exitosamente',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Error al eliminar usuario' },
      { status: 500 }
    );
  }
}