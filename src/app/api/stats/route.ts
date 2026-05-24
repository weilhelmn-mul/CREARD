import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    // Total bookings
    const totalBookings = await db.booking.count()

    // Active bookings (confirmed)
    const activeBookings = await db.booking.count({
      where: { status: 'confirmed' },
    })

    // Total revenue (paid bookings)
    const revenueResult = await db.payment.aggregate({
      _sum: { amount: true },
      where: { status: 'completed' },
    })
    const totalRevenue = revenueResult._sum.amount || 0

    // This month revenue
    const monthRevenueResult = await db.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: 'completed',
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
    })
    const monthRevenue = monthRevenueResult._sum.amount || 0

    // Active clients
    const activeClients = await db.client.count({
      where: {
        bookings: {
          some: {
            date: { gte: new Date(now.getFullYear(), now.getMonth() - 3) },
          },
        },
      },
    })

    const totalClients = await db.client.count()

    // Occupancy rate (bookings this week / possible slots)
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)

    const weekBookings = await db.booking.count({
      where: {
        date: { gte: weekStart, lt: weekEnd },
        status: { in: ['confirmed', 'completed'] },
      },
    })
    const totalCourts = await db.court.count()
    const possibleSlots = totalCourts * 17 * 7 // 17 hours (6-23) * 7 days
    const occupancyRate = possibleSlots > 0 ? Math.round((weekBookings / possibleSlots) * 100) : 0

    // Bookings by sport
    const bookingsBySport = await db.booking.groupBy({
      by: ['courtId'],
      where: { status: { in: ['confirmed', 'completed'] } },
      _count: true,
    })

    const courtSportMap: Record<string, string> = {}
    const courts = await db.court.findMany({ select: { id: true, sport: true } })
    courts.forEach((c) => { courtSportMap[c.id] = c.sport })

    const sportCounts: Record<string, number> = {}
    bookingsBySport.forEach((b) => {
      const sport = courtSportMap[b.courtId] || 'other'
      sportCounts[sport] = (sportCounts[sport] || 0) + b._count
    })

    // Revenue by month (last 7 months)
    const revenueByMonth: { month: string; revenue: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEndDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
      const monthName = monthDate.toLocaleDateString('es', { month: 'short' })

      const result = await db.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'completed',
          createdAt: { gte: monthDate, lte: monthEndDate },
        },
      })

      revenueByMonth.push({
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        revenue: result._sum.amount || 0,
      })
    }

    // Recent bookings
    const recentBookings = await db.booking.findMany({
      take: 10,
      include: {
        court: { include: { branch: true } },
        client: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Top courts by revenue
    const courtRevenue = await db.booking.groupBy({
      by: ['courtId'],
      where: { status: { in: ['confirmed', 'completed'] } },
      _sum: { totalPrice: true },
      _count: true,
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: 5,
    })

    const topCourts = await Promise.all(
      courtRevenue.map(async (cr) => {
        const court = await db.court.findUnique({
          where: { id: cr.courtId },
          include: { branch: true },
        })
        return {
          ...court,
          totalRevenue: cr._sum.totalPrice || 0,
          bookingCount: cr._count,
        }
      })
    )

    // Daily bookings last 7 days
    const dailyBookings: { day: string; bookings: number; revenue: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const dayDate = new Date(now)
      dayDate.setDate(now.getDate() - i)
      dayDate.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayDate)
      dayEnd.setHours(23, 59, 59, 999)
      const dayName = dayDate.toLocaleDateString('es', { weekday: 'short' })

      const [dayBookings, dayRevenueResult] = await Promise.all([
        db.booking.count({
          where: {
            date: { gte: dayDate, lte: dayEnd },
            status: { in: ['confirmed', 'completed'] },
          },
        }),
        db.payment.aggregate({
          _sum: { amount: true },
          where: {
            status: 'completed',
            createdAt: { gte: dayDate, lte: dayEnd },
          },
        }),
      ])

      dailyBookings.push({
        day: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        bookings: dayBookings,
        revenue: dayRevenueResult._sum.amount || 0,
      })
    }

    return NextResponse.json({
      totalBookings,
      activeBookings,
      totalRevenue,
      monthRevenue,
      activeClients,
      totalClients,
      occupancyRate,
      bookingsBySport: sportCounts,
      revenueByMonth,
      recentBookings,
      topCourts,
      dailyBookings,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
