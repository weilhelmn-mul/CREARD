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
    featuredCourts: {
      title: 'Canchas Destacadas',
      subtitle: 'Elige tu espacio ideal y reserva al instante',
      ctaText: 'Ver Todas',
    },
    // REQUISITO 1 (AUDITORÍA): Datos de contacto y redes sociales (admin editable)
    contact_phone: '',
    contact_whatsapp: '51984000000',
    contact_email: 'contacto@creard.com',
    contact_address: 'San Sebastian, Cusco, Peru',
    business_hours: 'Lun-Dom 7:00 AM - 11:00 PM',
    social_facebook: 'https://facebook.com/creard.cusco',
    social_instagram: 'https://instagram.com/creard.cusco',
    social_tiktok: 'https://tiktok.com/@creard.cusco',
    // REQUISITO 2 (AUDITORÍA): Contenido legal editable por admin
    legal_terms: [
      { title: '1. Datos del Proveedor', content: 'CREARD es una plataforma de reservas de canchas deportivas con sede en San Sebastián, Cusco, Perú. Los servicios se prestan exclusivamente en las instalaciones físicas del proveedor. Para consultas, puede contactarnos a través de los datos indicados en el pie de página de esta aplicación web.' },
      { title: '2. Objeto del Servicio', content: 'CREARD facilita la reserva en línea de canchas deportivas (fútbol 7 y vóley) disponibles en sus instalaciones. La reserva confirma el uso del espacio deportivo por el tiempo y horario seleccionado, sujeto a disponibilidad y pago del adelanto correspondiente.' },
      { title: '3. Registro del Usuario', content: 'Para realizar reservas, el usuario debe registrarse proporcionando nombre completo, número de documento de identidad (DNI, CE, PTE, RUC o Pasaporte), correo electrónico y número telefónico. El usuario es responsable de la veracidad de los datos proporcionados. CREARD se reserva el derecho de suspender cuentas con datos falsos o incompletos.' },
      { title: '4. Proceso de Reserva y Pago', content: '<p class="mb-2"><strong>4.1 Adelanto:</strong> Para confirmar una reserva, el usuario debe pagar el 50% del monto total mediante los métodos de pago habilitados (Yape, Plin, efectivo, tarjeta). El monto restante se paga directamente en las instalaciones el día de la reserva.</p><p class="mb-2"><strong>4.2 Precios:</strong> Los precios son publicados en la aplicación web y pueden variar según el turno (mañana o noche) y el tipo de cancha. Los precios mostrados incluyen IGV donde corresponda.</p><p><strong>4.3 Confirmación:</strong> La reserva se considera confirmada una vez recibido el pago del adelanto y la confirmación enviada al usuario por la plataforma.</p>' },
      { title: '5. Cancelaciones y Reembolsos', content: 'Las condiciones de cancelación y reembolso se detallan en nuestra Política de Cambios y Devoluciones disponible en esta misma aplicación. En general, las cancelaciones realizadas con al menos 12 horas de anticipación serán elegibles para reembolso del adelanto o reprogramación sin costo adicional.' },
      { title: '6. Uso de las Instalaciones', content: 'El usuario se compromete a utilizar las instalaciones de manera responsable, respetando las normas de convivencia, el equipamiento proporcionado y los horarios asignados. CREARD no se hace responsable por daños personales o a bienes de terceros derivados del uso de las instalaciones.' },
      { title: '7. Libro de Reclamaciones', content: 'De conformidad con el Código de Protección y Defensa del Consumidor (Ley N.° 29571) y la Resolución N.° 007-2016-CCD-INDECOPI, CREARD pone a disposición de sus usuarios el Libro de Reclamaciones Virtual, accesible desde esta aplicación web. Las quejas y reclamos serán atendidos en un plazo máximo de 15 días hábiles.' },
      { title: '8. Protección de Datos Personales', content: 'CREARD recopila y procesa datos personales exclusivamente para la prestación del servicio de reservas, la gestión de pagos y la atención de reclamos. Los datos no serán compartidos con terceros sin consentimiento expreso del usuario, salvo requerimiento legal. El usuario puede solicitar la eliminación de sus datos personales en cualquier momento contactando al proveedor.' },
      { title: '9. Modificaciones', content: 'CREARD se reserva el derecho de modificar estos Términos y Condiciones en cualquier momento. Las modificaciones entrarán en vigencia desde su publicación en esta aplicación. El uso continuado del servicio después de la publicación constituye aceptación de los cambios.' },
      { title: '10. Legislación Aplicable', content: 'Para cualquier controversia derivada del uso de esta plataforma o la prestación del servicio, las partes se someten a la jurisdicción de los Juzgados de Cusco, Perú, y a la aplicación de la legislación peruana vigente, incluyendo el Código de Protección y Defensa del Consumidor (Ley N.° 29571) y su Reglamento (D.S. N.° 011-2011-PCM).' },
    ],
    legal_refund: [
      { title: '1. Alcance', content: 'La presente política regula los cambios, cancelaciones y devoluciones aplicables a las reservas de canchas deportivas realizadas a través de la plataforma CREARD. Esta política es complementaria a los Términos y Condiciones del servicio y se rige por lo dispuesto en el Código de Protección y Defensa del Consumidor (Ley N.° 29571) de la República del Perú.' },
      { title: '2. Cambio de Reserva (Reprogramación)', content: '<p class="mb-2"><strong>2.1 Con al menos 12 horas de anticipación:</strong> El usuario puede solicitar el cambio de fecha u horario de su reserva sin costo adicional, sujeto a disponibilidad. El cambio debe solicitarse a través de la plataforma web o contactando al equipo de soporte.</p><p><strong>2.2 Con menos de 12 horas de anticipación:</strong> No se permite el cambio de reserva. El usuario puede optar por ceder su reserva a un tercero, notificando previamente al proveedor.</p>' },
      { title: '3. Cancelación de Reserva', content: '<p class="mb-2"><strong>3.1 Con al menos 12 horas de anticipación:</strong> El usuario puede cancelar su reserva y solicitar el reembolso del adelanto pagado. El reembolso se procesará en un plazo de 3 a 5 días hábiles al mismo medio de pago utilizado (Yape, Plin, tarjeta). Para pagos en efectivo, el reembolso se coordinará de forma presencial.</p><p class="mb-2"><strong>3.2 Con menos de 12 horas de anticipación:</strong> El adelanto no es reembolsable. Sin embargo, el usuario podrá solicitar un crédito para futuras reservas equivalente al monto del adelanto pagado, válido por 30 días calendario.</p><p><strong>3.3 No asistencia (no show):</strong> Si el usuario no se presenta en la fecha y hora de la reserva sin notificación previa, perderá el 100% del monto pagado (adelanto). No se generará crédito ni reembolso alguno.</p>' },
      { title: '4. Devoluciones por Fuerza Mayor', content: 'En caso de lluvia intensa, desastres naturales, o causas de fuerza mayor que impidan el uso seguro de las instalaciones, CREARD ofrecerá al usuario las siguientes opciones: (a) reprogramación de la reserva sin costo adicional en la primera fecha disponible, o (b) reembolso total del monto pagado. La decisión corresponderá al usuario.' },
      { title: '5. Devoluciones por Responsabilidad del Proveedor', content: 'Si la reserva no puede ser atendida por causas atribuibles a CREARD (fallo de instalaciones, doble reserva, mantenimiento no comunicado con la debida anticipación), el usuario tendrá derecho a: (a) reembolso del 100% del monto pagado, más un crédito adicional del 20% para su próxima reserva, o (b) reprogramación con un bono de cortesía.' },
      { title: '6. Plazos de Procesamiento', content: '<p class="mb-2"><strong>6.1 Reembolsos electrónicos (Yape, Plin, tarjeta):</strong> 3 a 5 días hábiles desde la aprobación de la solicitud.</p><p><strong>6.2 Reembolsos en efectivo:</strong> Se coordinará con el usuario para la entrega en instalaciones dentro de los 5 días hábiles siguientes.</p>' },
      { title: '7. Procedimiento para Solicitar Devolución', content: 'El usuario debe contactar a CREARD a través de: (a) la plataforma web, (b) el correo electrónico indicado en el pie de página, o (c) el Libro de Reclamaciones Virtual disponible en la aplicación. La solicitud debe incluir el número de reserva, nombre del titular y motivo de la devolución. CREARD responderá en un plazo máximo de 2 días hábiles.' },
      { title: '8. Excepciones', content: 'No proceden devoluciones ni cambios en los siguientes casos: (a) reservas realizadas con promociones o descuentos especiales que indiquen condiciones no reembolsables, (b) incumplimiento de las normas de uso de las instalaciones que motive la expulsión del usuario, y (c) solicitudes realizadas después de la fecha y hora de la reserva.' },
      { title: '9. Contacto', content: 'Para cualquier consulta sobre esta política, puede contactarnos a través de los datos de contacto indicados en el pie de página de esta aplicación o mediante el Libro de Reclamaciones Virtual.' },
    ],
    // ── CMS: Section order & visibility ──
    sectionOrder: ['hero', 'sportsSection', 'featuredCourts', 'promoBanner', 'howItWorks'],
    sectionVisibility: {
      hero: true,
      sportsSection: true,
      featuredCourts: true,
      promoBanner: true,
      howItWorks: true,
    },
    // ── CMS: Custom sections ──
    customSections: [],
    // ── CMS: Active promotions ──
    activePromotions: [],
    // ── CMS: Hero banners ──
    heroBanners: [],
    // ── CMS: News / Announcements ──
    news: [],
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
      const defaults = getDefaults()
      // Always patch sportsSection with latest pricing to keep prices in sync
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
      // Backward compat: patch new CMS fields if missing
      if (!data.sectionOrder) data.sectionOrder = defaults.sectionOrder
      if (!data.sectionVisibility) data.sectionVisibility = defaults.sectionVisibility
      if (!data.customSections) data.customSections = defaults.customSections
      if (!data.activePromotions) data.activePromotions = defaults.activePromotions
      if (!data.heroBanners) data.heroBanners = defaults.heroBanners
      if (!data.news) data.news = defaults.news
      if (!data.legal_terms) data.legal_terms = defaults.legal_terms
      if (!data.legal_refund) data.legal_refund = defaults.legal_refund
      if (!data.featuredCourts) data.featuredCourts = defaults.featuredCourts
      // Remove todaysSchedule from persisted order/visibility if present
      if (data.sectionOrder) data.sectionOrder = data.sectionOrder.filter((k: string) => k !== 'todaysSchedule')
      if (data.sectionVisibility) delete (data.sectionVisibility as Record<string, unknown>).todaysSchedule
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
