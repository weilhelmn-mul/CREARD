import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// Site Settings API — GET / PUT
// Uses Firestore directly (Admin SDK) to read/write a single
// document in the `site_settings` collection:  doc id = "home"
// ============================================================

// Lazy-import Firestore to avoid SSR crash in dev
async function getDb() {
  const { adminDb } = await import('@/lib/firebase-admin')
  return adminDb
}

/* ---------- Default settings (fallback when Firestore has none) ---------- */
function getDefaults() {
  return {
    hero: {
      location: 'San Sebastián, Cusco',
      badge: 'La #1 en reservas deportivas del Cusco',
      headline: 'Reserva tu cancha',
      headlineHighlight: 'en segundos',
      subtitle:
        '4 canchas de fútbol 7 y 2 canchas de vóley profesional. Reserva fácil, paga con Yape y disfruta sin complicaciones.',
      promoHighlight: '50% de adelanto',
      promoText: ', paga el resto al llegar',
      stats: [
        { label: 'Espacios', value: 6 },
        { label: 'Fútbol 7', value: 4 },
        { label: 'Vóley', value: 2 },
      ],
    },
    sportsSection: {
      badge: 'Nuestras Instalaciones',
      title: 'Deporte de primer nivel',
      subtitle: '6 espacios disponibles con la mejor infraestructura deportiva del Cusco',
      sports: [
        {
          id: 'futbol',
          label: 'Fútbol 7',
          icon: 'sports_soccer',
          image: '/cancha-futbol-1.png',
          count: 4,
          priceRange: 'S/. 35',
          badge: '3ra cancha techada',
          amenities: ['Cesped sintetico', 'Iluminacion LED', 'Vestuarios', 'Duchas', 'Estacionamiento'],
          pricingDetails: [
            { label: 'Mañana', timeRange: '7:00 AM - 5:00 PM', price: 35 },
            { label: 'Noche', timeRange: '6:00 PM - 10:00 PM', price: 50 },
          ],
        },
        {
          id: 'voley',
          label: 'Vóley',
          icon: 'sports_volleyball',
          image: '/cancha-voley.png',
          count: 2,
          priceRange: 'S/. 30',
          badge: '',
          amenities: ['Piso PVC profesional', 'Red reglamentaria', 'Iluminacion LED', 'Techado'],
          pricingDetails: [
            { label: 'Mañana', timeRange: '7:00 AM - 5:00 PM', price: 30 },
            { label: 'Noche', timeRange: '6:00 PM - 10:00 PM', price: 45 },
          ],
        },
      ],
    },
    promoBanner: {
      badge: 'Por qué elegir CREARD',
      title: 'La experiencia completa',
      subtitle: 'Reserva fácil, paga seguro, juega sin preocupaciones',
      ctaText: 'Reservar mi cancha ahora',
      sellingPoints: [
        {
          icon: 'percent',
          title: '50% de adelanto',
          description: 'Solo necesitas pagar la mitad para confirmar tu reserva. El resto lo pagas al llegar.',
          highlight: true,
        },
        {
          icon: 'forum',
          title: 'Confirmación instantánea',
          description: 'Recibe tu confirmación por WhatsApp en segundos con todos los detalles de tu reserva.',
          highlight: false,
        },
        {
          icon: 'schedule',
          title: 'Atención 7 días',
          description: 'Abierto de lunes a domingo de 7:00 AM a 11:00 PM. Siempre disponible para ti.',
          highlight: false,
        },
        {
          icon: 'verified',
          title: 'Sin comisiones',
          description: 'El precio que ves es el que pagas. Sin cargos ocultos ni sorpresas en tu reserva.',
          highlight: false,
        },
      ],
      paymentMethods: [
        { name: 'Yape', icon: 'account_balance_wallet', color: 'text-purple-400' },
        { name: 'Plin', icon: 'phone_iphone', color: 'text-blue-400' },
        { name: 'Efectivo', icon: 'payments', color: 'text-green-400' },
        { name: 'Tarjeta', icon: 'credit_card', color: 'text-yellow-400' },
      ],
    },
    howItWorks: {
      badge: 'Facil y rapido',
      title: '¿Cómo funciona?',
      subtitle: 'Reserva tu cancha en 4 simples pasos y disfruta del deporte',
      whatsappText: '¿Tienes dudas? Escríbenos por WhatsApp',
      supportText: 'Soporte disponible',
      steps: [
        {
          number: '01',
          title: 'Elige tu cancha',
          description: 'Explora nuestras 6 canchas por deporte y disponibilidad. Revisa fotos, amenidades y precios en tiempo real.',
          icon: 'search',
          detail: 'Fútbol 7, Vóley o Eventos',
        },
        {
          number: '02',
          title: 'Selecciona fecha y hora',
          description: 'Consulta la disponibilidad en tiempo real y elige el horario perfecto. Horario de atención: 7:00 AM a 11:00 PM.',
          icon: 'calendar_month',
          detail: 'Reserva hasta 7 días adelante',
        },
        {
          number: '03',
          title: 'Paga 50% de adelanto',
          description: 'Realiza el pago con Yape, Plin, efectivo o tarjeta. Solo necesitas el 50% para confirmar tu reserva.',
          icon: 'payments',
          detail: 'Yape / Plin / Efectivo / Tarjeta',
        },
        {
          number: '04',
          title: 'Confirmación por WhatsApp',
          description: 'Recibe tu confirmación al instante por WhatsApp con todos los detalles. ¡Llega y juega!',
          icon: 'forum',
          detail: 'Confirmación en segundos',
        },
      ],
    },
  }
}

// ============================================================
// GET — Retrieve home page settings
// ============================================================
export async function GET() {
  try {
    const db = await getDb()
    const docRef = db.collection('site_settings').doc('home')
    const docSnap = await docRef.get()

    if (docSnap.exists) {
      const data = docSnap.data()
      // Always patch sportsSection with latest pricing to keep prices in sync
      const defaults = getDefaults()
      if (data.sportsSection?.sports?.length) {
        data.sportsSection = {
          ...data.sportsSection,
          sports: data.sportsSection.sports.map((sport: Record<string, unknown>, idx: number) => {
            const defaultSport = defaults.sportsSection.sports[idx]
            return defaultSport
              ? { ...sport, pricingDetails: defaultSport.pricingDetails, priceRange: defaultSport.priceRange }
              : sport
          }),
        }
      }
      return NextResponse.json(data)
    }

    // No document yet — return defaults
    return NextResponse.json(getDefaults())
  } catch (error: unknown) {
    console.error('[GET /api/settings]', error)
    // On any error return defaults so the app never breaks
    return NextResponse.json(getDefaults())
  }
}

// ============================================================
// PUT — Update home page settings
// ============================================================
export async function PUT(request: NextRequest) {
  try {
    const db = await getDb()
    const body = await request.json()
    const { Timestamp } = await import('firebase-admin/firestore')

    // Merge with existing or create new
    await db.collection('site_settings').doc('home').set(
      {
        ...body,
        updated_at: Timestamp.now(),
      },
      { merge: true }
    )

    return NextResponse.json({ success: true, data: body })
  } catch (error: unknown) {
    console.error('[PUT /api/settings]', error)
    return NextResponse.json(
      { error: 'No se pudieron guardar los ajustes' },
      { status: 500 }
    )
  }
}
