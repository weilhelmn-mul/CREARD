import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingId, userId, amount, type, method, status, externalRef } = body

    if (!bookingId || !userId || !amount || !type || !method) {
      return NextResponse.json(
        { error: 'bookingId, userId, amount, type, and method are required' },
        { status: 400 }
      )
    }

    // Create payment and update booking in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create the payment record
      const payment = await tx.payment.create({
        data: {
          bookingId,
          userId,
          amount: parseFloat(amount) || 0,
          type: type || 'remaining',
          method,
          status: status || 'completed',
          externalRef: externalRef || null,
        },
        include: {
          booking: true,
        },
      })

      // If this is a remaining payment, update the booking
      if (type === 'remaining') {
        const booking = payment.booking
        const newAdvanceAmount = booking.advanceAmount + payment.amount
        let newRemainingAmount = booking.remainingAmount - payment.amount
        let newStatus = booking.status

        // Clamp remaining to 0
        if (newRemainingAmount < 0) newRemainingAmount = 0

        // If fully paid, update status
        if (newRemainingAmount <= 0) {
          newStatus = 'fully_paid'
        } else if (booking.status === 'pending') {
          newStatus = 'partially_paid'
        }

        await tx.booking.update({
          where: { id: bookingId },
          data: {
            advanceAmount: newAdvanceAmount,
            remainingAmount: newRemainingAmount,
            status: newStatus,
          },
        })
      }

      return payment
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
  }
}
