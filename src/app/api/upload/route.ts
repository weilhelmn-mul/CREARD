import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// Image Upload API — POST /api/upload
// Converts uploaded images to base64 data URLs and returns
// the URL string. Works on Vercel without persistent storage.
// Images are stored as data URLs in Firestore documents.
// ============================================================

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB max
const MAX_WIDTH = 1920
const MAX_HEIGHT = 1080
const JPEG_QUALITY = 80

async function processImage(buffer: Buffer, mimeType: string): Promise<{ dataUrl: string; width: number; height: number }> {
  const sharp = (await import('sharp')).default
  let pipeline = sharp(buffer)

  // Get metadata
  const metadata = await pipeline.metadata()
  const width = metadata.width || 0
  const height = metadata.height || 0

  // Resize if larger than max dimensions, maintaining aspect ratio
  if (width > MAX_WIDTH || height > MAX_HEIGHT) {
    pipeline = pipeline.resize(MAX_WIDTH, MAX_HEIGHT, { fit: 'inside', withoutEnlargement: true })
  }

  // Convert to JPEG for better compression (unless it's a GIF with animation)
  const outputBuffer = mimeType === 'image/gif'
    ? await pipeline.webp({ quality: JPEG_QUALITY }).toBuffer()
    : await pipeline.jpeg({ quality: JPEG_QUALITY }).toBuffer()

  const outputMime = mimeType === 'image/gif' ? 'image/webp' : 'image/jpeg'
  const base64 = outputBuffer.toString('base64')
  const dataUrl = `data:${outputMime};base64,${base64}`

  return { dataUrl, width, height }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folder = formData.get('folder') as string || 'uploads'

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Tipo de archivo no permitido. Use: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `El archivo es demasiado grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Convert to buffer and process
    const buffer = Buffer.from(await file.arrayBuffer())
    const { dataUrl, width, height } = await processImage(buffer, file.type)

    console.log(`[Upload] ${file.name} (${file.size}B) → ${Math.round(dataUrl.length / 1024)}KB base64, ${width}x${height}, folder: ${folder}`)

    return NextResponse.json({
      url: dataUrl,
      width,
      height,
      originalName: file.name,
      folder,
    })
  } catch (error: unknown) {
    console.error('[POST /api/upload]', error)
    return NextResponse.json(
      { error: 'No se pudo procesar la imagen' },
      { status: 500 }
    )
  }
}
