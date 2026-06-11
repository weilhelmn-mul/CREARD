import { NextRequest, NextResponse } from 'next/server';
import { requireAnyAuth } from '@/lib/auth-middleware';
import { getEquipments, createEquipment, updateEquipment, deleteEquipment } from '@/lib/db';
import { isFirebaseAvailable } from '@/lib/firebase-check';

function toCamelEquipment(e: Record<string, unknown>) {
  return {
    id: e.id,
    name: e.name,
    sport: e.sport || 'general',
    pricePerRental: e.price_per_rental || 0,
    stock: e.stock || 0,
    active: e.active !== false,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  };
}

export async function GET() {
  try {
    if (!isFirebaseAvailable()) {
      return NextResponse.json({ error: 'Firebase no configurado' }, { status: 503 });
    }
    const authResult = await requireAnyAuth();
    if (authResult instanceof NextResponse) return authResult;
    if (authResult.user.role !== 'admin' && authResult.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }
    const items = await getEquipments({ active: true });
    return NextResponse.json(items.map(toCamelEquipment));
  } catch (error) {
    console.error('[EQUIPMENT] GET error:', error);
    return NextResponse.json({ error: 'Error al cargar equipamiento' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAvailable()) {
      return NextResponse.json({ error: 'Firebase no configurado' }, { status: 503 });
    }
    const authResult = await requireAnyAuth();
    if (authResult instanceof NextResponse) return authResult;
    if (authResult.user.role !== 'admin' && authResult.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const body = await request.json();
    const { name, sport, pricePerRental, stock, active } = body;

    if (!name) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    const id = await createEquipment({
      name,
      sport: sport || 'general',
      price_per_rental: parseFloat(pricePerRental) || 0,
      stock: parseInt(stock) || 0,
      active: active !== false,
    });

    return NextResponse.json({ id, success: true }, { status: 201 });
  } catch (error) {
    console.error('[EQUIPMENT] POST error:', error);
    return NextResponse.json({ error: 'Error al crear equipamiento' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!isFirebaseAvailable()) {
      return NextResponse.json({ error: 'Firebase no configurado' }, { status: 503 });
    }
    const authResult = await requireAnyAuth();
    if (authResult instanceof NextResponse) return authResult;
    if (authResult.user.role !== 'admin' && authResult.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, sport, pricePerRental, stock, active } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (sport !== undefined) data.sport = sport;
    if (pricePerRental !== undefined) data.price_per_rental = parseFloat(pricePerRental);
    if (stock !== undefined) data.stock = parseInt(stock);
    if (active !== undefined) data.active = active;

    await updateEquipment(id, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[EQUIPMENT] PUT error:', error);
    return NextResponse.json({ error: 'Error al actualizar equipamiento' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isFirebaseAvailable()) {
      return NextResponse.json({ error: 'Firebase no configurado' }, { status: 503 });
    }
    const authResult = await requireAnyAuth();
    if (authResult instanceof NextResponse) return authResult;
    if (authResult.user.role !== 'admin' && authResult.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    await deleteEquipment(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[EQUIPMENT] DELETE error:', error);
    return NextResponse.json({ error: 'Error al eliminar equipamiento' }, { status: 500 });
  }
}