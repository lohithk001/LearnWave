import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import { existsSync } from 'fs'
import { join } from 'path'

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const user = await db.users.findUnique({
      where: { id: decoded.userId },
      include: {
        user_profiles: true,
        user_progress: true,
        user_cosmetics: {
          where: { equipped: true, cosmetics: { type: 'FRAME' } },
          include: { cosmetics: true }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const name = user.user_profiles
      ? `${user.user_profiles.first_name} ${user.user_profiles.last_name}`.trim()
      : 'User'

    const equippedFrame = user.user_cosmetics?.[0]?.cosmetics?.key || null

    let avatarUrl = user.user_profiles?.avatar_url || null
    if (avatarUrl && avatarUrl.startsWith('/uploads/')) {
      const filePath = join(process.cwd(), 'public', avatarUrl)
      if (!existsSync(filePath)) {
        avatarUrl = null
      }
    }

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
      avatarUrl: avatarUrl,
      xp: user.user_progress?.xp || 0,
      level: user.user_progress?.level || 1,
      equippedTitle: user.user_profiles?.equipped_title || 'Newcomer',
      equippedFrame: equippedFrame
    }

    return NextResponse.json({
      user: responseUser,
      token
    })
  } catch (error) {
    console.error('Auth me error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
