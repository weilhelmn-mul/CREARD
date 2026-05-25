import { NextRequest, NextResponse } from 'next/server';
import { getAllFromCollection, getBookings } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Buscar usuario específico
      const snapshot = await (await import('@/lib/firebase-admin')).adminDb
        .collection('users')
        .doc(id)
        .get();

      if (!snapshot.exists) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      }

      const userData = snapshot.data();

      // Contar reservas del usuario
      const userBookings = await getBookings({ userId: id });

      return NextResponse.json({
        ...userData,
        id: snapshot.id,
        _count: { bookings: userBookings.length },
      });
    }

    // Listar todos los usuarios (solo con role 'user')
    const allUsers = await getAllFromCollection('users');
    const clients = allUsers
      .filter((u) => u.role === 'user')
      .map(async (u) => {
        const userBookings = await getBookings({ userId: u.id as string });
        return {
          ...u,
          _count: { bookings: userBookings.length },
        };
      });

    const resolved = await Promise.all(clients);
    return NextResponse.json(resolved);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}
