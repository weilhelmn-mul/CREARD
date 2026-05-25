import { NextResponse } from 'next/server';
import { getCount, getAllFromCollection, getBookings, getCourtById } from '@/lib/db';

function getTodayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function GET() {
  try {
    const todayStr = getTodayStr();

    // Conteos básicos
    const [totalCourts, totalUsers, totalBookings] = await Promise.all([
      getCount('courts'),
      getCount('users'),
      getCount('bookings'),
    ]);

    // Todas las reservas para cálculos
    const allBookings = await getAllFromCollection('bookings');

    // Reservas de hoy
    const todayBookings = allBookings.filter((b) => b.date === todayStr).length;

    // Ingresos (simplificado - sumar advance_amount de reservas completadas)
    const completedBookings = allBookings.filter((b) => b.status === 'completed' || b.status === 'fully_paid');
    const todayRevenue = completedBookings.reduce((sum, b) => sum + ((b.total_price as number) || 0), 0);
    const weeklyRevenue = todayRevenue;
    const monthlyRevenue = todayRevenue;

    // Pagos pendientes
    const pendingPayments = allBookings
      .filter((b) => b.status === 'partially_paid')
      .reduce((sum, b) => sum + ((b.remaining_amount as number) || 0), 0);

    // Bookings by sport
    const bookingsBySport: Record<string, number> = { futbol: 0, voley: 0 };
    for (const b of allBookings) {
      if (b.court_id) {
        const court = await getCourtById(b.court_id as string);
        if (court?.sport && bookingsBySport[court.sport as string] !== undefined) {
          bookingsBySport[court.sport as string]++;
        }
      }
    }

    // Bookings by status
    const bookingsByStatus: Record<string, number> = {};
    for (const b of allBookings) {
      const s = b.status as string;
      bookingsByStatus[s] = (bookingsByStatus[s] || 0) + 1;
    }

    // Top courts
    const courts = await getAllFromCollection('courts');
    const courtBookingCounts: Record<string, number> = {};
    for (const b of allBookings) {
      const cid = b.court_id as string;
      courtBookingCounts[cid] = (courtBookingCounts[cid] || 0) + 1;
    }

    const topCourts = courts
      .map((c) => ({
        ...c,
        images: Array.isArray(c.images) ? c.images : [],
        amenities: Array.isArray(c.amenities) ? c.amenities : [],
        bookingCount: courtBookingCounts[c.id as string] || 0,
      }))
      .sort((a, b) => (b.bookingCount as number) - (a.bookingCount as number))
      .slice(0, 5);

    // Revenue by month (placeholder)
    const revenueByMonth: { month: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const monthDate = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
      const monthName = monthDate.toLocaleDateString('es', { month: 'short' });
      revenueByMonth.push({
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        revenue: Math.floor(Math.random() * 2000) + 500,
      });
    }

    // Daily bookings last 7 days
    const dailyBookings: { day: string; date: string; bookings: number; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayDate = new Date();
      dayDate.setDate(dayDate.getDate() - i);
      const dayName = dayDate.toLocaleDateString('es', { weekday: 'short' });
      const dateStr = dayDate.toISOString().split('T')[0];
      const count = allBookings.filter((b) => b.date === dateStr).length;

      dailyBookings.push({
        day: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        date: dateStr,
        bookings: count,
        revenue: count * 40,
      });
    }

    return NextResponse.json({
      totalCourts,
      totalUsers,
      totalBookings,
      todayBookings,
      todayRevenue,
      pendingPayments,
      weeklyRevenue,
      monthlyRevenue,
      bookingsBySport,
      bookingsByStatus,
      topCourts,
      revenueByMonth,
      dailyBookings,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
