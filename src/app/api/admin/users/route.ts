import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, getUserById, updateUser } from '@/lib/db';
import { adminAuth } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/auth-middleware';
import { isFirebaseAvailable } from '@/lib/firebase-check';
import {
  jsonGetAllUsers,
  jsonGetUserById,
  jsonUpdateUser,
  jsonCreateUser,
} from '@/lib/json-storage';
import { generateId } from '@/lib/json-storage';

// ── GET /api/admin/users ──
// Lista todos los usuarios con sus datos
export async function GET(request: NextRequest) {
  // Verificar que el solicitante es admin
  const authResult = await requireAuth(request, 'admin');
  if (authResult instanceof NextResponse) return authResult;

  try {
    // ── DEMO MODE: no Firebase configured ──
    if (!isFirebaseAvailable()) {
      const jsonUsers = await jsonGetAllUsers();
      const sorted = jsonUsers.sort((a: any, b: any) => {
        const statusOrder: Record<string, number> = { pending: 0, approved: 1, rejected: 2, disabled: 3 };
        const aS = statusOrder[a.status || 'approved'] ?? 1;
        const bS = statusOrder[b.status || 'approved'] ?? 1;
        if (aS !== bS) return aS - bS;
        return 0;
      });
      return NextResponse.json(sorted);
    }

    // ── FIREBASE MODE ──
    // Step 1: Get ALL Firebase Auth users via listUsers()
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
          firebaseExists: true,
          providerData: user.providerData?.map((p: any) => ({
            providerId: p.providerId,
            email: p.email,
          })) || [],
        };
      }
      pageToken = result.pageToken;
    } while (pageToken);

    // Step 2: Get Firestore user documents (enrichment data: role, status, custom fields)
    let firestoreUsers: Record<string, any> = {};
    try {
      const fsUsers = await getAllUsers();
      for (const u of fsUsers) {
        firestoreUsers[u.id] = u;
      }
    } catch (err) {
      console.warn('[USERS GET] Could not fetch Firestore users, using Auth-only data:', err);
    }

    // Step 3: Merge: Auth users as base, Firestore data as enrichment
    const allMerged: Record<string, any>[] = [];

    // 3a: All Auth users
    for (const [uid, authData] of Object.entries(authUsers)) {
      const fsData = firestoreUsers[uid] || {};
      allMerged.push({
        id: uid,
        name: fsData.name || authData.displayName || authData.email?.split('@')[0] || 'Sin nombre',
        email: authData.email,
        phone: fsData.phone || authData.phone || null,
        role: fsData.role || 'user',
        status: authData.disabled ? 'disabled' : (fsData.status || 'approved'),
        is_active: fsData.is_active ?? !authData.disabled,
        metadata: authData.metadata,
        firebaseExists: true,
        created_at: fsData.created_at || authData.metadata?.creationTime || null,
        updated_at: fsData.updated_at || null,
        // Track if user has a Firestore profile
        has_firestore_profile: !!firestoreUsers[uid],
      });
    }

    // 3b: Firestore-only users (might exist in Firestore but not in Auth, e.g. demo remnants)
    for (const [uid, fsData] of Object.entries(firestoreUsers)) {
      if (!authUsers[uid]) {
        allMerged.push({
          id: uid,
          name: fsData.name || 'Sin nombre',
          email: fsData.email || '',
          phone: fsData.phone || null,
          role: fsData.role || 'user',
          status: fsData.status || 'approved',
          is_active: fsData.is_active ?? true,
          firebaseExists: false,
          created_at: fsData.created_at || null,
          updated_at: fsData.updated_at || null,
          has_firestore_profile: true,
        });
      }
    }

    // Sort: pending first, then by creation time
    const sorted = allMerged.sort((a, b) => {
      const statusOrder: Record<string, number> = { pending: 0, approved: 1, rejected: 2, disabled: 3 };
      const aS = statusOrder[a.status] ?? 1;
      const bS = statusOrder[b.status] ?? 1;
      if (aS !== bS) return aS - bS;
      return 0;
    });

    return NextResponse.json(sorted);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
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