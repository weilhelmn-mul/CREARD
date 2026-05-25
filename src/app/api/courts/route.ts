import { NextRequest, NextResponse } from 'next/server';
import { getCourts, getCourtById, createCourt } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const sport = searchParams.get('sport');
    const branchId = searchParams.get('branchId');

    if (id) {
      const court = await getCourtById(id);
      if (!court) {
        return NextResponse.json({ error: 'Court not found' }, { status: 404 });
      }
      return NextResponse.json(court);
    }

    const courts = await getCourts({
      sport: sport || undefined,
      branchId: branchId || undefined,
      active: true,
    });

    return NextResponse.json(courts);
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
