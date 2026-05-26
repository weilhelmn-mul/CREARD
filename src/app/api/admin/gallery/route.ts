// ============================================================
// CREARD - API: Gallery (Administración de Fotografías)
// GET    /api/admin/gallery  - Listar imágenes
// POST   /api/admin/gallery  - Subir imagen
// PUT    /api/admin/gallery  - Actualizar imagen
// DELETE /api/admin/gallery  - Eliminar imagen
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getGalleryImages, getGalleryImageById, createGalleryImage, updateGalleryImage, deleteGalleryImage } from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';

// GET /api/admin/gallery — público (Home lo usa) o con filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const category = searchParams.get('category');

    const images = await getGalleryImages({
      active: active !== null ? active === 'true' : undefined,
      category: category || undefined,
    });

    return NextResponse.json(images);
  } catch (error: any) {
    console.error('[API /admin/gallery GET]', error);
    return NextResponse.json({ error: error.message || 'Error al obtener imágenes' }, { status: 500 });
  }
}

// POST /api/admin/gallery — Crear imagen (solo admin/super_admin)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { title, description, url, thumbnail_url, category, is_active, display_order } = body;

    if (!title || !url) {
      return NextResponse.json({ error: 'Título y URL de imagen son obligatorios' }, { status: 400 });
    }

    const id = await createGalleryImage({
      title, description, url, thumbnail_url, category, is_active, display_order,
    });

    const image = await getGalleryImageById(id);
    return NextResponse.json({ success: true, image }, { status: 201 });
  } catch (error: any) {
    console.error('[API /admin/gallery POST]', error);
    return NextResponse.json({ error: error.message || 'Error al crear imagen' }, { status: 500 });
  }
}

// PUT /api/admin/gallery — Actualizar imagen (solo admin/super_admin)
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de imagen requerido' }, { status: 400 });
    }

    await updateGalleryImage(id, data);
    const updated = await getGalleryImageById(id);
    return NextResponse.json({ success: true, image: updated });
  } catch (error: any) {
    console.error('[API /admin/gallery PUT]', error);
    return NextResponse.json({ error: error.message || 'Error al actualizar imagen' }, { status: 500 });
  }
}

// DELETE /api/admin/gallery — Eliminar imagen (solo admin/super_admin)
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de imagen requerido' }, { status: 400 });
    }

    await deleteGalleryImage(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API /admin/gallery DELETE]', error);
    return NextResponse.json({ error: error.message || 'Error al eliminar imagen' }, { status: 500 });
  }
}
