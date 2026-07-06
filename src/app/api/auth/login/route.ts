import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { verifyPassword, generateToken } from '@/lib/auth'
import { existsSync } from 'fs'
import { join } from 'path'
import { awardXP } from '@/lib/xp-engine'
import { updateStreak } from '@/lib/streak-engine'
import { isRateLimited } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1'
    const rateLimitKey = `rate-limit:login:${ip}:${email || ''}`
    if (isRateLimited(rateLimitKey, 5, 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again in a minute.' },
        { status: 429 }
      )
    }

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user
    console.log('🔍 Looking for user:', email)
    const user = await db.users.findUnique({
      where: { email },
      include: {
        mentors: true,
        user_profiles: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check if mentor is approved
    if (user.role === 'MENTOR' && user.mentors && !user.mentors.approved) {
      return NextResponse.json(
        { error: 'Your mentor account is pending approval' },
        { status: 403 }
      )
    }

    // Check if role matches if provided in body (optional validation)
    const { role: requestedRole } = body;
    if (requestedRole && user.role !== requestedRole) {
      return NextResponse.json(
        { error: `This account is not registered as a ${requestedRole.toLowerCase()}` },
        { status: 401 }
      )
    }

    // Format user name
    const name = user.user_profiles
      ? `${user.user_profiles.first_name} ${user.user_profiles.last_name}`.trim()
      : 'User';

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

    // Return user data without sensitive info
    const responseUser = {
      id: user.id,
      email: user.email,
      name: name,
      role: user.role,
      usn: user.usn,
      branch: user.user_profiles?.branch,
      semester: user.user_profiles?.semester,
      university: user.user_profiles?.university,
      college: user.user_profiles?.college,
      avatarUrl: avatarUrl
    }

    // Gamification hooks
    if (user.role === 'STUDENT') {
      try {
        await updateStreak(user.id);
        await awardXP(user.id, 'LOGIN');
      } catch (gamifyError) {
        logger.error('Gamification login hook error:', gamifyError);
      }
    }

    return NextResponse.json({
      message: 'Login successful',
      user: responseUser,
      token
    })

  } catch (error) {
    logger.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
