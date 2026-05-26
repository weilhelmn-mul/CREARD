import { NextRequest, NextResponse } from 'next/server';
import { getCourts, getCourtById, createCourt } from '@/lib/db';
import { adminDb } from '@/lib/firebase-admin';

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
    images: Array.isArray(c.images) ? c.images : [],
    pricePerHour: Number(c.price_per_hour) || 0,
    amenities: Array.isArray(c.amenities) ? c.amenities : [],
    isActive: c.is_active !== false,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

export async function GET(request: NextRequest) {
  try {
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
      // Solo filtrar por activo si se pasa explícitamente el parámetro
      active: active === 'true' ? true : active === 'false' ? false : undefined,
    });

    const transformed = await Promise.all(
      courts.map((c) => toCamelCourt(c as Record<string, unknown>))
    );

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Error fetching courts:', error);
    return NextResponse.json({ error: 'Failed to fetch courts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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
