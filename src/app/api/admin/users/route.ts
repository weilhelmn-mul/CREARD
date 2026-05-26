import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, getUserById, updateUser } from '@/lib/db';
import { adminAuth } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/auth-middleware';

// ── GET /api/admin/users ──
// Lista todos los usuarios con sus datos
export async function GET(request: NextRequest) {
  // Verificar que el solicitante es admin
  const authResult = await requireAuth(request, 'admin');
  if (authResult instanceof NextResponse) return authResult;

  try {
    const allUsers = await getAllUsers();

    // Enriquecer con datos de Firebase Auth (creation time, last sign in)
    const enrichedUsers = await Promise.all(
      allUsers.map(async (u) => {
        const userData: Record<string, unknown> = { ...u };
        try {
          const firebaseUser = await adminAuth.getUser(u.id as string);
          userData.metadata = {
            creationTime: firebaseUser.metadata.creationTime,
            lastSignInTime: firebaseUser.metadata.lastSignInTime,
          };
          // Verify if user exists in Firebase Auth
          userData.firebaseExists = true;
        } catch {
          userData.firebaseExists = false;
        }
        return userData;
      })
    );

    // Ordenar: pendientes primero, luego por fecha de creación
    const sorted = enrichedUsers.sort((a, b) => {
      // Priority: pending first
      const statusOrder = { pending: 0, approved: 1, rejected: 2, disabled: 3 };
      const aStatus = (statusOrder as Record<string, number>)[(a.status as string) || 'approved'] ?? 1;
      const bStatus = (statusOrder as Record<string, number>)[(b.status as string) || 'approved'] ?? 1;
      if (aStatus !== bStatus) return aStatus - bStatus;
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

    // Verificar que el usuario objetivo existe
    const targetUser = await getUserById(userId);
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
        // Also set Firebase custom claims
        await adminAuth.setCustomUserClaims(userId, {
          role: targetUser.role || 'user',
          status: 'approved',
        });
        actionMessage = 'Usuario aprobado exitosamente';
        break;

      case 'reject':
        updates.status = 'rejected';
        updates.is_active = false;
        // Disable the user in Firebase Auth to prevent login
        await adminAuth.updateUser(userId, { disabled: true });
        await adminAuth.setCustomUserClaims(userId, { status: 'rejected' });
        actionMessage = 'Usuario rechazado';
        break;

      case 'disable':
        updates.status = 'disabled';
        updates.is_active = false;
        await adminAuth.updateUser(userId, { disabled: true });
        await adminAuth.setCustomUserClaims(userId, { status: 'disabled' });
        actionMessage = 'Usuario deshabilitado';
        break;

      case 'enable':
        updates.status = 'approved';
        updates.is_active = true;
        await adminAuth.updateUser(userId, { disabled: false });
        await adminAuth.setCustomUserClaims(userId, {
          role: targetUser.role || 'user',
          status: 'approved',
        });
        actionMessage = 'Usuario habilitado';
        break;

      case 'set_role':
        const newRole = data.role;
        if (!['user', 'admin', 'super_admin'].includes(newRole)) {
          return NextResponse.json(
            { error: 'Rol invalido. Valores permitidos: user, admin, super_admin' },
            { status: 400 }
          );
        }

        // Super admin can only be set by another super admin
        if (newRole === 'super_admin' && authResult.user.role !== 'super_admin') {
          return NextResponse.json(
            { error: 'Solo un Super Administrador puede asignar este rol' },
            { status: 403 }
          );
        }

        updates.role = newRole;
        // If setting to admin/super_admin, auto-approve
        if (newRole === 'admin' || newRole === 'super_admin') {
          updates.status = 'approved';
          updates.is_active = true;
          await adminAuth.updateUser(userId, { disabled: false });
        }
        // Update Firebase custom claims
        await adminAuth.setCustomUserClaims(userId, {
          role: newRole,
          status: updates.status || targetUser.status || 'approved',
        });
        actionMessage = `Rol cambiado a ${newRole}`;
        break;

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

    // Delete from Firebase Auth
    try {
      await adminAuth.deleteUser(userId);
    } catch (err) {
      console.warn(`Could not delete Firebase Auth user ${userId}:`, err);
    }

    // Delete from Firestore
    const { deleteDocById } = await import('@/lib/db');
    await deleteDocById('users', userId);

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
