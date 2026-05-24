import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

function getTodayStr(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getWeekStartStr(): string {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Monday start
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff)
  const y = monday.getFullYear()
  const m = String(monday.getMonth() + 1).padStart(2, '0')
  const d = String(monday.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getMonthStartStr(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

export async function GET() {
  try {
    const todayStr = getTodayStr()
    const weekStartStr = getWeekStartStr()
    const monthStartStr = getMonthStartStr()

    // Basic counts
    const [totalCourts, totalUsers, totalBookings] = await Promise.all([
      db.court.count(),
      db.user.count(),
      db.booking.count(),
    ])

    // Today's bookings and revenue
    const todayBookings = await db.booking.count({
      where: { date: todayStr },
    })

    const todayPayments = await db.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: 'completed',
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    })
    const todayRevenue = todayPayments._sum.amount || 0

    // Pending payments (sum of remainingAmount where status is partially_paid)
    const pendingPaymentsResult = await db.booking.aggregate({
      _sum: { remainingAmount: true },
      where: { status: 'partially_paid' },
    })
    const pendingPayments = pendingPaymentsResult._sum.remainingAmount || 0

    // Weekly revenue (payments created this week)
    const weeklyRevenueResult = await db.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: 'completed',
        createdAt: { gte: new Date(weekStartStr) },
      },
    })
    const weeklyRevenue = weeklyRevenueResult._sum.amount || 0

    // Monthly revenue
    const monthlyRevenueResult = await db.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: 'completed',
        createdAt: { gte: new Date(monthStartStr) },
      },
    })
    const monthlyRevenue = monthlyRevenueResult._sum.amount || 0

    // Bookings by sport
    const courtSportMap: Record<string, string> = {}
    const courts = await db.court.findMany({ select: { id: true, sport: true } })
    courts.forEach((c) => {
      courtSportMap[c.id] = c.sport
    })

    const bookingsGrouped = await db.booking.groupBy({
      by: ['courtId'],
      _count: true,
    })

    const bookingsBySport: Record<string, number> = { futbol: 0, voley: 0 }
    bookingsGrouped.forEach((b) => {
      const sport = courtSportMap[b.courtId]
      if (sport && bookingsBySport[sport] !== undefined) {
        bookingsBySport[sport] += b._count
      }
    })

    // Bookings by status
    const bookingsByStatusResult = await db.booking.groupBy({
      by: ['status'],
      _count: true,
    })
    const bookingsByStatus: Record<string, number> = {}
    bookingsByStatusResult.forEach((b) => {
      bookingsByStatus[b.status] = b._count
    })

    // Top courts by booking count
    const courtBookingCounts = await db.booking.groupBy({
      by: ['courtId'],
      _count: true,
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    })

    const topCourts = await Promise.all(
      courtBookingCounts.map(async (cbc) => {
        const court = await db.court.findUnique({
          where: { id: cbc.courtId },
          include: { branch: true },
        })
        return {
          ...court,
          images: court ? JSON.parse(court.images || '[]') : [],
          amenities: court ? JSON.parse(court.amenities || '[]') : [],
          bookingCount: cbc._count,
        }
      })
    )

    // Revenue by month (last 7 months)
    const now = new Date()
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

    // Daily bookings last 7 days
    const dailyBookings: { day: string; date: string; bookings: number; revenue: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const dayDate = new Date(now)
      dayDate.setDate(now.getDate() - i)
      dayDate.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayDate)
      dayEnd.setHours(23, 59, 59, 999)
      const dayName = dayDate.toLocaleDateString('es', { weekday: 'short' })
      const dateStr = dayDate.toISOString().split('T')[0]

      const [dayBookings, dayRevenueResult] = await Promise.all([
        db.booking.count({
          where: { date: dateStr },
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
        date: dateStr,
        bookings: dayBookings,
        revenue: dayRevenueResult._sum.amount || 0,
      })
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
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
