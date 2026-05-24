import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const courtId = searchParams.get('courtId')
    const clientId = searchParams.get('clientId')
    const date = searchParams.get('date')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}

    if (courtId) where.courtId = courtId
    if (clientId) where.clientId = clientId
    if (status) where.status = status
    if (date) {
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)
      where.date = { gte: startDate, lte: endDate }
    }

    const bookings = await db.booking.findMany({
      where,
      include: {
        court: { include: { branch: true } },
        client: true,
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(bookings)
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { courtId, clientId, date, startTime, endTime, totalPrice, paymentMethod, notes } = body

    // Check for overlapping bookings
    const bookingDate = new Date(date)
    const existingBookings = await db.booking.findMany({
      where: {
        courtId,
        date: {
          gte: new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate()),
          lt: new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate() + 1),
        },
        status: { in: ['confirmed'] },
        OR: [
          { startTime: { lt: endTime }, endTime: { gt: startTime } },
        ],
      },
    })

    if (existingBookings.length > 0) {
      return NextResponse.json(
        { error: 'Este horario ya está reservado. Por favor selecciona otro.' },
        { status: 409 }
      )
    }

    // Get court price if not provided
    if (!totalPrice) {
      const court = await db.court.findUnique({ where: { id: courtId } })
      body.totalPrice = court?.pricePerHour || 0
    }

    const booking = await db.booking.create({
      data: {
        courtId,
        clientId,
        date: bookingDate,
        startTime,
        endTime,
        totalPrice: parseFloat(totalPrice) || 0,
        status: 'confirmed',
        paymentMethod: paymentMethod || null,
        paymentStatus: paymentMethod ? 'paid' : 'pending',
        notes: notes || null,
      },
      include: {
        court: { include: { branch: true } },
        client: true,
      },
    })

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    console.error('Error creating booking:', error)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status } = body

    const booking = await db.booking.update({
      where: { id },
      data: { status },
      include: {
        court: { include: { branch: true } },
        client: true,
      },
    })

    return NextResponse.json(booking)
  } catch (error) {
    console.error('Error updating booking:', error)
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
  }
}
