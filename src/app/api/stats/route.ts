import { NextResponse } from 'next/server';
import { getCount, getAllFromCollection, getBookings, getCourtById } from '@/lib/db';

function getTodayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function GET() {
  try {
    const todayStr = getTodayStr();
    const now = new Date();

    // Conteos básicos
    const [totalCourts, totalUsers, totalBookings] = await Promise.all([
      getCount('courts'),
      getCount('users'),
      getCount('bookings'),
    ]);

    // Todas las reservas para cálculos
    const allBookings = await getAllFromCollection('bookings');

    // Reservas de hoy
    const todayBookingsList = allBookings.filter((b) => b.date === todayStr);
    const todayBookings = todayBookingsList.length;

    // Ingresos de hoy (reservas completadas/pagadas de hoy)
    const todayCompleted = todayBookingsList.filter(
      (b) => b.status === 'completed' || b.status === 'fully_paid'
    );
    const todayRevenue = todayCompleted.reduce((sum, b) => sum + ((b.total_price as number) || 0), 0);

    // Ingresos semanales (últimos 7 días)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = getDateStr(weekAgo);
    const weeklyBookings = allBookings.filter(
      (b) => b.date >= weekAgoStr && b.date <= todayStr && (b.status === 'completed' || b.status === 'fully_paid')
    );
    const weeklyRevenue = weeklyBookings.reduce((sum, b) => sum + ((b.total_price as number) || 0), 0);

    // Ingresos mensuales (mes actual)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartStr = getDateStr(monthStart);
    const monthlyBookings = allBookings.filter(
      (b) => b.date >= monthStartStr && b.date <= todayStr && (b.status === 'completed' || b.status === 'fully_paid')
    );
    const monthlyRevenue = monthlyBookings.reduce((sum, b) => sum + ((b.total_price as number) || 0), 0);

    // Total ingresos (todos los completados/pagados)
    const totalRevenue = allBookings
      .filter((b) => b.status === 'completed' || b.status === 'fully_paid')
      .reduce((sum, b) => sum + ((b.total_price as number) || 0), 0);

    // Pagos pendientes
    const pendingPayments = allBookings
      .filter((b) => b.status === 'partially_paid' || b.status === 'confirmed')
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
    const courtRevenue: Record<string, number> = {};
    for (const b of allBookings) {
      const cid = b.court_id as string;
      if (cid) {
        courtBookingCounts[cid] = (courtBookingCounts[cid] || 0) + 1;
        if (b.status === 'completed' || b.status === 'fully_paid') {
          courtRevenue[cid] = (courtRevenue[cid] || 0) + ((b.total_price as number) || 0);
        }
      }
    }

    const topCourts = courts
      .map((c) => ({
        ...c,
        images: Array.isArray(c.images) ? c.images : [],
        amenities: Array.isArray(c.amenities) ? c.amenities : [],
        bookingCount: courtBookingCounts[c.id as string] || 0,
        totalRevenue: courtRevenue[c.id as string] || 0,
      }))
      .sort((a, b) => (b.bookingCount as number) - (a.bookingCount as number))
      .slice(0, 5);

    // Revenue by month (real data - últimos 6 meses)
    const revenueByMonth: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = monthDate.toLocaleDateString('es', { month: 'short' });
      const monthEndDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthStartStr = getDateStr(monthDate);
      const monthEndStr = getDateStr(monthEndDate);

      const monthRevenue = allBookings
        .filter(
          (b) => b.date >= monthStartStr && b.date <= monthEndStr &&
                 (b.status === 'completed' || b.status === 'fully_paid')
        )
        .reduce((sum, b) => sum + ((b.total_price as number) || 0), 0);

      revenueByMonth.push({
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        revenue: monthRevenue,
      });
    }

    // Daily bookings last 7 days (real data)
    const dailyBookings: { day: string; date: string; bookings: number; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayDate = new Date();
      dayDate.setDate(dayDate.getDate() - i);
      const dayName = dayDate.toLocaleDateString('es', { weekday: 'short' });
      const dateStr = getDateStr(dayDate);
      const dayBookings = allBookings.filter((b) => b.date === dateStr);

      const dayRevenue = dayBookings
        .filter((b) => b.status === 'completed' || b.status === 'fully_paid')
        .reduce((sum, b) => sum + ((b.total_price as number) || 0), 0);

      dailyBookings.push({
        day: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        date: dateStr,
        bookings: dayBookings.length,
        revenue: dayRevenue,
      });
    }

    return NextResponse.json({
      totalCourts,
      totalUsers,
      totalBookings,
      todayBookings,
      todayRevenue,
      weeklyRevenue,
      monthlyRevenue,
      totalRevenue,
      pendingPayments,
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
