import { NextRequest, NextResponse } from 'next/server';
import { getCourts, getCourtById, createCourt } from '@/lib/db';
import { adminDb } from '@/lib/firebase-admin';
import { isFirebaseAvailable } from '@/lib/firebase-check';

// Fallback courts for when Firebase is not configured
const futbolPricingSchedule = [
  { label: 'Mañana', startHour: 7, endHour: 17, pricePerHour: 35 },
  { label: 'Noche', startHour: 18, endHour: 22, pricePerHour: 50 },
];

const voleyPricingSchedule = [
  { label: 'Mañana', startHour: 7, endHour: 17, pricePerHour: 30 },
  { label: 'Noche', startHour: 18, endHour: 22, pricePerHour: 45 },
];

const fallbackCourts = [
  {
    id: 'cancha-1',
    name: 'Cancha Fútbol 1',
    sport: 'futbol',
    description: 'Cancha premium con césped sintético de última generación, ideal para partidos competitivos y torneos.',
    branchId: 'branch-1',
    branch: { id: 'branch-1', name: 'CREARD', city: 'San Sebastián', address: 'Cusco, Perú' },
    images: ['/cancha-futbol-1.png'],
    pricePerHour: 40,
    pricingSchedule: futbolPricingSchedule,
    amenities: ['Cesped sintetico', 'Iluminacion LED', 'Vestuarios'],
    isActive: true,
  },
  {
    id: 'cancha-2',
    name: 'Cancha Fútbol 2',
    sport: 'futbol',
    description: 'Cancha estándar con césped sintético, perfecta para partidos amistosos y entrenamientos.',
    branchId: 'branch-1',
    branch: { id: 'branch-1', name: 'CREARD', city: 'San Sebastián', address: 'Cusco, Perú' },
    images: ['/cancha-futbol-2.png'],
    pricePerHour: 40,
    pricingSchedule: futbolPricingSchedule,
    amenities: ['Cesped sintetico', 'Iluminacion'],
    isActive: true,
  },
  {
    id: 'cancha-3',
    name: 'Cancha Fútbol 3',
    sport: 'futbol',
    description: 'Cancha con techado parcial, permite jugar incluso cuando hay llovizna ligera.',
    branchId: 'branch-1',
    branch: { id: 'branch-1', name: 'CREARD', city: 'San Sebastián', address: 'Cusco, Perú' },
    images: ['/cancha-futbol-3.png'],
    pricePerHour: 40,
    pricingSchedule: futbolPricingSchedule,
    amenities: ['Cesped sintetico', 'Techado parcial', 'Vestuarios'],
    isActive: true,
  },
  {
    id: 'cancha-4',
    name: 'Cancha Fútbol 4',
    sport: 'futbol',
    description: 'Nuestra cancha más nueva con las mejores instalaciones del complejo.',
    branchId: 'branch-1',
    branch: { id: 'branch-1', name: 'CREARD', city: 'San Sebastián', address: 'Cusco, Perú' },
    images: ['/cancha-futbol-4.png'],
    pricePerHour: 40,
    pricingSchedule: futbolPricingSchedule,
    amenities: ['Cesped premium', 'Iluminacion LED', 'Duchas', 'Estacionamiento'],
    isActive: true,
  },
  {
    id: 'cancha-5',
    name: 'Cancha Vóley 1',
    sport: 'voley',
    description: 'Piso PVC profesional con red reglamentaria, usada para torneos de vóley.',
    branchId: 'branch-1',
    branch: { id: 'branch-1', name: 'CREARD', city: 'San Sebastián', address: 'Cusco, Perú' },
    images: ['/cancha-voley.png'],
    pricePerHour: 35,
    pricingSchedule: voleyPricingSchedule,
    amenities: ['Piso PVC', 'Red reglamentaria', 'Iluminacion LED'],
    isActive: true,
  },
  {
    id: 'cancha-6',
    name: 'Salón Eventos',
    sport: 'eventos',
    description: 'Espacio multiusos techado con sistema de sonido e iluminación profesional.',
    branchId: 'branch-1',
    branch: { id: 'branch-1', name: 'CREARD', city: 'San Sebastián', address: 'Cusco, Perú' },
    images: ['/salon-eventos.png'],
    pricePerHour: 80,
    pricingSchedule: [],
    amenities: ['Techado', 'Sonido', 'Iluminacion'],
    isActive: true,
  },
];

// Transformar snake_case (Firestore) a camelCase (frontend) + enriquecer con branch
async function toCamelCourt(c: Record<string, unknown>): Promise<Record<string, unknown>> {
  // Obtener datos de la sede (branch)
  let branch: Record<string, unknown> | null = null;
  const branchId = c.branch_id as string | null;
  if (branchId) {
    try {
      const branchSnap = await adminDb.collection('branches').doc(branchId).get();
      if (branchSnap.exists) {
        const bData = branchSnap.data();
        branch = {
          id: branchId,
          name: bData?.name || 'Sede',
          city: bData?.city || 'San Sebastián',
          address: bData?.address || '',
        };
      }
    } catch {
      // Si no se puede obtener la branch, usar datos por defecto
      branch = { id: branchId, name: 'CREARD', city: 'San Sebastián', address: 'Cusco' };
    }
  }

  return {
    id: c.id,
    name: c.name,
    sport: c.sport,
    description: c.description || '',
    branchId: c.branch_id,
    branch: branch || { id: c.branch_id || 'branch-1', name: 'CREARD', city: 'San Sebastián', address: 'Cusco' },
    images: Array.isArray(c.images) && c.images.length > 0 ? c.images : ['/cancha-futbol-1.png'],
    pricePerHour: Number(c.price_per_hour) || 0,
    pricingSchedule: Array.isArray(c.pricing_schedule) ? c.pricing_schedule : [],
    amenities: Array.isArray(c.amenities) ? c.amenities : [],
    isActive: c.is_active !== false,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

export async function GET(request: NextRequest) {
  try {
    // If Firebase is not configured, return fallback courts
    if (!isFirebaseAvailable()) {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      const sport = searchParams.get('sport');

      if (id) {
        const court = fallbackCourts.find(c => c.id === id);
        if (court) return NextResponse.json(court);
        return NextResponse.json({ error: 'Court not found' }, { status: 404 });
      }

      let filtered = fallbackCourts;
      if (sport && sport !== 'todos') {
        filtered = fallbackCourts.filter(c => c.sport === sport);
      }
      return NextResponse.json(filtered);
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const sport = searchParams.get('sport');
    const branchId = searchParams.get('branchId');
    const active = searchParams.get('active');

    if (id) {
      const court = await getCourtById(id);
      if (!court) {
        return NextResponse.json({ error: 'Court not found' }, { status: 404 });
      }
      const transformed = await toCamelCourt(court as Record<string, unknown>);
      return NextResponse.json(transformed);
    }

    const courts = await getCourts({
      sport: sport || undefined,
      branchId: branchId || undefined,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
    });

    if (!courts || courts.length === 0) {
      // Return fallback if no courts in Firestore yet
      return NextResponse.json(fallbackCourts);
    }

    const transformed = await Promise.all(
      courts.map((c) => toCamelCourt(c as Record<string, unknown>))
    );

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Error fetching courts:', error);
    // Return fallback courts on any error
    return NextResponse.json(fallbackCourts);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAvailable()) {
      return NextResponse.json(
        { error: 'Firebase no configurado. Configura las variables de entorno para crear canchas.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { name, sport, description, branchId, images, pricePerHour, amenities } = body;

    if (!name || !sport || !branchId) {
      return NextResponse.json(
        { error: 'Name, sport, and branchId are required' },
        { status: 400 }
      );
    }

    const id = await createCourt({
      name,
      sport,
      description,
      branch_id: branchId,
      images: images || [],
      price_per_hour: parseFloat(pricePerHour) || 0,
      amenities: amenities || [],
    });

    return NextResponse.json({ id, success: true }, { status: 201 });
  } catch (error) {
    console.error('Error creating court:', error);
    return NextResponse.json({ error: 'Failed to create court' }, { status: 500 });
  }
}
