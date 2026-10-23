import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      )
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired authentication token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Check if session exists
    const session = await db.bookings.findUnique({
      where: {
        id: sessionId
      },
      include: {
        mentors: true
      }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Verify ownership: must be the student, the mentor, or an admin
    const isOwner = session.student_id === decoded.userId
    const isMentor = session.mentors?.user_id === decoded.userId
    const isAdmin = decoded.role === 'ADMIN'

    if (!isOwner && !isMentor && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to cancel this session' },
        { status: 403 }
      )
    }

    // Check if session can be cancelled (only PENDING or CONFIRMED sessions)
    if (session.status !== 'PENDING' && session.status !== 'CONFIRMED') {
      return NextResponse.json(
        { error: 'Cannot cancel completed or already cancelled sessions' },
        { status: 400 }
      )
    }

    // Update session status to CANCELLED
    const updatedSession = await db.bookings.update({
      where: { id: sessionId },
      data: { status: 'CANCELLED' },
      include: {
        mentors: {
          include: {
            users: {
              select: {
                id: true,
                email: true
              }
            }
          }
        }
      }
    })

    // TODO: Send cancellation notification to mentor
    // TODO: Process refund if payment was made

    return NextResponse.json({
      success: true,
      session: updatedSession
    })

  } catch (error) {
    console.error('Cancel session error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel session' },
      { status: 500 }
    )
  }
}
