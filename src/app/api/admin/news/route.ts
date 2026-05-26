// ============================================================
// CREARD - API: News (Administración de Noticias)
// GET    /api/admin/news  - Listar noticias
// POST   /api/admin/news  - Crear noticia
// PUT    /api/admin/news  - Actualizar noticia
// DELETE /api/admin/news  - Eliminar noticia
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getNews, getNewsById, createNewsItem, updateNewsItem, deleteNewsItem } from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';

// GET /api/admin/news — público (Home lo usa) o con filtros admin
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const featured = searchParams.get('featured');
    const category = searchParams.get('category');

    const news = await getNews({
      active: active !== null ? active === 'true' : undefined,
      featured: featured !== null ? featured === 'true' : undefined,
      category: category || undefined,
    });

    return NextResponse.json(news);
  } catch (error: any) {
    console.error('[API /admin/news GET]', error);
    return NextResponse.json({ error: error.message || 'Error al obtener noticias' }, { status: 500 });
  }
}

// POST /api/admin/news — Crear noticia (solo admin/super_admin)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { title, content, image_url, category, is_active, is_featured, priority, published_at, expires_at } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Título y contenido son obligatorios' }, { status: 400 });
    }

    const id = await createNewsItem({
      title, content, image_url, category, is_active, is_featured, priority, published_at, expires_at,
    });

    const newsItem = await getNewsById(id);
    return NextResponse.json({ success: true, news: newsItem }, { status: 201 });
  } catch (error: any) {
    console.error('[API /admin/news POST]', error);
    return NextResponse.json({ error: error.message || 'Error al crear noticia' }, { status: 500 });
  }
}

// PUT /api/admin/news — Actualizar noticia (solo admin/super_admin)
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de noticia requerido' }, { status: 400 });
    }

    await updateNewsItem(id, data);
    const updated = await getNewsById(id);
    return NextResponse.json({ success: true, news: updated });
  } catch (error: any) {
    console.error('[API /admin/news PUT]', error);
    return NextResponse.json({ error: error.message || 'Error al actualizar noticia' }, { status: 500 });
  }
}

// DELETE /api/admin/news — Eliminar noticia (solo admin/super_admin)
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de noticia requerido' }, { status: 400 });
    }

    await deleteNewsItem(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API /admin/news DELETE]', error);
    return NextResponse.json({ error: error.message || 'Error al eliminar noticia' }, { status: 500 });
  }
}
