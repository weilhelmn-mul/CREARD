// ============================================================
// CREARD - API: Image Upload
// POST /api/upload — Upload image to Firebase Storage
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { getAdminApp } from '@/lib/firebase-admin';
import { isFirebaseAvailable } from '@/lib/firebase-check';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    if (!isFirebaseAvailable()) {
      return NextResponse.json(
        { error: 'Firebase no configurado para subir imágenes' },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'uploads';

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Usa JPG, PNG, WebP, GIF o SVG.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'El archivo es demasiado grande. Máximo 5MB.' },
        { status: 400 }
      );
    }

    const adminApp = getAdminApp();
    if (!adminApp) {
      return NextResponse.json({ error: 'Firebase no inicializado' }, { status: 503 });
    }

    // Dynamically import firebase-admin/storage
    const { getStorage } = await import('firebase-admin/storage');
    const bucket = getStorage(adminApp);

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${folder}/${timestamp}_${randomStr}.${ext}`;

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Firebase Storage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bucketAny = bucket as any
    const fileRef = bucketAny.file(fileName);
    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
      },
      resumable: false,
    });

    // Make the file publicly readable
    try { await fileRef.makePublic(); } catch { /* may already be public or rules differ */ }

    // Get the public URL
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '';
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
      size: file.size,
      type: file.type,
    });
  } catch (error: any) {
    console.error('[API /upload] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al subir la imagen' },
      { status: 500 }
    );
  }
}
