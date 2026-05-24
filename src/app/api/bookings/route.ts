import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const courtId = searchParams.get('courtId')
    const userId = searchParams.get('userId')
    const date = searchParams.get('date')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}

    if (courtId) where.courtId = courtId
    if (userId) where.userId = userId
    if (status) where.status = status
    if (date) {
      where.date = date
    }

    const bookings = await db.booking.findMany({
      where,
      include: {
        court: { include: { branch: true } },
        user: true,
      },
      orderBy: { startTime: 'asc' },
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
    const {
      courtId,
      userId,
      date,
      startTime,
      endTime,
      totalPrice,
      advanceAmount,
      remainingAmount,
      status,
      paymentMethod,
      notes,
    } = body

    if (!courtId || !userId || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: courtId, userId, date, startTime, endTime' },
        { status: 400 }
      )
    }

    // Check for overlapping active bookings
    const existingBookings = await db.booking.findMany({
      where: {
        courtId,
        date,
        status: { in: ['confirmed', 'partially_paid', 'fully_paid', 'pending'] },
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
    let price = parseFloat(totalPrice) || 0
    if (!totalPrice) {
      const court = await db.court.findUnique({ where: { id: courtId } })
      price = court?.pricePerHour || 0
    }

    const adv = parseFloat(advanceAmount) || price * 0.5
    const rem = parseFloat(remainingAmount) || price - adv

    const booking = await db.booking.create({
      data: {
        courtId,
        userId,
        date,
        startTime,
        endTime,
        totalPrice: price,
        advanceAmount: adv,
        remainingAmount: rem,
        status: status || 'pending',
        paymentMethod: paymentMethod || null,
        notes: notes || null,
      },
      include: {
        court: { include: { branch: true } },
        user: true,
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

    if (!id) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }

    const booking = await db.booking.update({
      where: { id },
      data: { status },
      include: {
        court: { include: { branch: true } },
        user: true,
      },
    })

    return NextResponse.json(booking)
  } catch (error) {
    console.error('Error updating booking:', error)
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
  }
}
