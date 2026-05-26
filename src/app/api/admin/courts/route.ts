// ============================================================
// CREARD - API: Admin Courts (Precios y fotos de canchas)
// PUT    /api/admin/courts  - Actualizar cancha (precio, fotos, etc.)
// DELETE /api/admin/courts  - Eliminar cancha (solo super_admin)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getCourtById, updateCourt, deleteCourt } from '@/lib/db';
import { requireAuth, requireSuperAdmin } from '@/lib/auth-middleware';

// PUT /api/admin/courts — Actualizar cancha
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { id, name, description, images, price_per_hour, is_active, amenities } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de cancha requerido' }, { status: 400 });
    }

    // Verificar que la cancha existe
    const existing = await getCourtById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Cancha no encontrada' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (images !== undefined) updateData.images = images;
    if (price_per_hour !== undefined) updateData.price_per_hour = Number(price_per_hour);
    if (is_active !== undefined) updateData.is_active = is_active;
    if (amenities !== undefined) updateData.amenities = amenities;

    await updateCourt(id, updateData);
    const updated = await getCourtById(id);
    return NextResponse.json({ success: true, court: updated });
  } catch (error: any) {
    console.error('[API /admin/courts PUT]', error);
    return NextResponse.json({ error: error.message || 'Error al actualizar cancha' }, { status: 500 });
  }
}

// DELETE /api/admin/courts — Eliminar cancha (solo super_admin)
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireSuperAdmin(request);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de cancha requerido' }, { status: 400 });
    }

    const existing = await getCourtById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Cancha no encontrada' }, { status: 404 });
    }

    await deleteCourt(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API /admin/courts DELETE]', error);
    return NextResponse.json({ error: error.message || 'Error al eliminar cancha' }, { status: 500 });
  }
}
