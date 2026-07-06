import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { hashPassword, generateToken } from '@/lib/auth'
import { existsSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { isRateLimited } from '@/lib/rate-limit'

// User registration endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, role = 'STUDENT', usn, branch, semester, bio, expertise, university, college } = body

    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1'
    const rateLimitKey = `rate-limit:register:${ip}:${email || ''}`
    if (isRateLimited(rateLimitKey, 5, 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again in a minute.' },
        { status: 429 }
      )
    }

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await db.users.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Check if USN is provided and already exists (optional field)
    if (usn) {
      const existingUSN = await db.users.findUnique({
        where: { usn }
      })
      if (existingUSN) {
        return NextResponse.json(
          { error: 'User with this USN already exists' },
          { status: 409 }
        )
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Split name into first and last name
    const [firstName = '', ...lastNameParts] = name.split(' ')
    const lastName = lastNameParts.join(' ')

    // Generate random IDs for nested objects if needed
    const mentorId = uuidv4()

    // Create user with profile in a transaction or nested create
    const user = await db.users.create({
      data: {
        email,
        password_hash: hashedPassword,
        role,
        usn,
        user_profiles: {
          create: {
            first_name: firstName,
            last_name: lastName,
            branch,
            semester: semester ? parseInt(semester) : undefined,
            university: role === 'STUDENT' ? university : undefined,
            college: role === 'STUDENT' ? college : undefined,
            bio: role === 'MENTOR' ? bio : undefined,
            updated_at: new Date()
          }
        },
        // If role is MENTOR, also create a mentor record for approval
        ...(role === 'MENTOR' ? {
          mentors: {
            create: {
              id: mentorId,
              approved: false,
              hourly_rate: 0,
              expertise_areas: expertise || [],
              updated_at: new Date(),
              total_earnings: 0,
              total_sessions: 0,
              rating: 0
            }
          }
        } : {})
      },
      select: {
        id: true,
        email: true,
        role: true,
        usn: true,
        user_profiles: true
      }
    })

    // Generate token
    const token = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: name
    })

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    let avatarUrl = user.user_profiles?.avatar_url || null
    if (avatarUrl && avatarUrl.startsWith('/uploads/')) {
      const filePath = join(process.cwd(), 'public', avatarUrl)
      if (!existsSync(filePath)) {
        avatarUrl = null
      }
    }

    return NextResponse.json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        usn: user.usn,
        name: name,
        branch: user.user_profiles?.branch,
        semester: user.user_profiles?.semester,
        avatarUrl: avatarUrl
      },
      token
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
