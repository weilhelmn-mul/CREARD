import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    const body = await request.json()

    if (action === 'register') {
      const { name, email, phone, password } = body

      if (!name || !email || !password) {
        return NextResponse.json(
          { error: 'Name, email, and password are required' },
          { status: 400 }
        )
      }

      // Check if email already exists
      const existingUser = await db.user.findUnique({ where: { email } })
      if (existingUser) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 409 }
        )
      }

      const user = await db.user.create({
        data: {
          name,
          email,
          phone: phone || null,
          password,
          role: 'user',
          isActive: true,
        },
      })

      return NextResponse.json(
        {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
          },
        },
        { status: 201 }
      )
    }

    if (action === 'login') {
      const { email, password } = body

      if (!email || !password) {
        return NextResponse.json(
          { error: 'Email and password are required' },
          { status: 400 }
        )
      }

      const user = await db.user.findFirst({
        where: { email, password, isActive: true },
      })

      if (!user) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }

      return NextResponse.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      })
    }

    return NextResponse.json(
      { error: 'Invalid action. Use ?action=register or ?action=login' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}
