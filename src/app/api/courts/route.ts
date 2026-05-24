import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const sport = searchParams.get('sport')
    const branchId = searchParams.get('branchId')

    if (id) {
      const court = await db.court.findUnique({
        where: { id },
        include: {
          branch: true,
          reviews: {
            include: { client: true },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      })
      if (!court) {
        return NextResponse.json({ error: 'Court not found' }, { status: 404 })
      }
      return NextResponse.json({
        ...court,
        images: JSON.parse(court.images),
        amenities: JSON.parse(court.amenities),
      })
    }

    const where: Record<string, unknown> = { isActive: true }
    if (sport && sport !== 'todos') {
      where.sport = sport
    }
    if (branchId) {
      where.branchId = branchId
    }

    const courts = await db.court.findMany({
      where,
      include: { branch: true },
      orderBy: { rating: 'desc' },
    })

    const parsedCourts = courts.map((court) => ({
      ...court,
      images: JSON.parse(court.images),
      amenities: JSON.parse(court.amenities),
    }))

    return NextResponse.json(parsedCourts)
  } catch (error) {
    console.error('Error fetching courts:', error)
    return NextResponse.json({ error: 'Failed to fetch courts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, sport, description, branchId, images, pricePerHour, amenities } = body

    const court = await db.court.create({
      data: {
        name,
        sport,
        description,
        branchId,
        images: JSON.stringify(images || []),
        pricePerHour: parseFloat(pricePerHour) || 0,
        amenities: JSON.stringify(amenities || []),
      },
    })

    return NextResponse.json({
      ...court,
      images: JSON.parse(court.images),
      amenities: JSON.parse(court.amenities),
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating court:', error)
    return NextResponse.json({ error: 'Failed to create court' }, { status: 500 })
  }
}
