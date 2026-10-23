import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'

const bookingSchema = z.object({
  mentorId: z.string(),
  studentId: z.string().optional(),
  date: z.string(),
  time: z.string(),
  duration: z.number(),
  notes: z.string().optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).default('PENDING'),
  amount: z.number()
})

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
    
    // Validate request body
    const validatedData = bookingSchema.parse(body)

    // Determine target student ID - caller can only book for themselves unless ADMIN
    const studentId = validatedData.studentId || decoded.userId
    if (decoded.role !== 'ADMIN' && studentId !== decoded.userId) {
      return NextResponse.json(
        { error: 'Forbidden: You can only book sessions for yourself' },
        { status: 403 }
      )
    }
    
    // Check if student exists
    const student = await db.users.findUnique({
      where: { id: studentId }
    })
    
    if (!student || student.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }
    
    // Check if mentor exists and is approved
    const mentor = await db.mentors.findUnique({
      where: { 
        user_id: validatedData.mentorId
      },
      include: {
        users: true
      }
    })
    
    if (!mentor || !mentor.approved) {
      return NextResponse.json(
        { error: 'Mentor not found or not approved' },
        { status: 404 }
      )
    }
    
    // Parse scheduled date and time
    const scheduledAt = new Date(`${validatedData.date}T${validatedData.time}:00`)
    
    // Find or create a default mentor_session for this mentor
    let session = await db.mentor_sessions.findFirst({
      where: { mentor_id: mentor.id, is_active: true }
    })
    
    if (!session) {
      session = await db.mentor_sessions.create({
        data: {
          id: uuidv4(),
          mentor_id: mentor.id,
          title: 'General Mentorship Session',
          description: 'One-on-one mentoring session',
          duration_minutes: validatedData.duration,
          price: mentor.hourly_rate,
          session_type: 'ONE_ON_ONE',
          updated_at: new Date()
        }
      })
    }
    
    // Create the booking
    const booking = await db.bookings.create({
      data: {
        id: uuidv4(),
        student_id: studentId,
        mentor_id: mentor.id,
        mentor_session_id: session.id,
        scheduled_at: scheduledAt,
        duration_minutes: validatedData.duration,
        price: validatedData.amount,
        status: validatedData.status as any,
        meeting_link: generateMeetingLink(),
        updated_at: new Date()
      },
      include: {
        mentors: {
          include: {
            users: {
              include: {
                user_profiles: true
              }
            }
          }
        },
        users: {
          include: {
            user_profiles: true
          }
        }
      }
    })
    
    // Create or get existing chat room between student and mentor
    const mentorUserId = mentor.user_id
    
    const existingRoom = await db.chat_rooms.findFirst({
      where: {
        participant_ids: {
          hasEvery: [studentId, mentorUserId]
        },
        type: 'SESSION'
      }
    })
    
    if (!existingRoom) {
      await db.chat_rooms.create({
        data: {
          id: uuidv4(),
          name: `Chat with Mentor`,
          type: 'SESSION',
          participant_ids: [studentId, mentorUserId],
          created_by: studentId,
          created_at: new Date()
        }
      })
    }
    
    const studentProfile = booking.users.user_profiles
    const studentName = studentProfile ? `${studentProfile.first_name} ${studentProfile.last_name}` : booking.users.email
    const mentorProfile = booking.mentors.users.user_profiles
    const mentorName = mentorProfile ? `${mentorProfile.first_name} ${mentorProfile.last_name}` : booking.mentors.users.email
    
    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        mentor: {
          name: mentorName,
          email: booking.mentors.users.email
        },
        student: {
          id: booking.student_id,
          name: studentName
        },
        date: validatedData.date,
        time: validatedData.time,
        duration: booking.duration_minutes,
        status: booking.status,
        amount: Number(booking.price),
        meetingLink: booking.meeting_link
      }
    })
    
  } catch (err) {
    console.error('Booking creation error:', err)
    
    // Narrow error for Zod
    if (err && typeof err === 'object' && 'issues' in err) {
      const details = (err as any).issues || (err as any).errors || []
      return NextResponse.json(
        { error: 'Invalid request data', details },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const studentIdParam = searchParams.get('studentId')
    const mentorIdParam = searchParams.get('mentorId')
    const status = searchParams.get('status')
    
    // Build where clause
    const where: any = {}
    
    if (decoded.role === 'STUDENT') {
      where.student_id = decoded.userId
    } else if (decoded.role === 'MENTOR') {
      const callerMentor = await db.mentors.findFirst({
        where: { user_id: decoded.userId }
      })
      if (callerMentor) {
        where.mentor_id = callerMentor.id
      }
    } else if (decoded.role === 'ADMIN') {
      if (studentIdParam) where.student_id = studentIdParam
      if (mentorIdParam) {
        const mentor = await db.mentors.findFirst({
          where: {
            OR: [
              { id: mentorIdParam },
              { user_id: mentorIdParam }
            ]
          }
        })
        if (mentor) {
          where.mentor_id = mentor.id
        } else {
          where.mentor_id = mentorIdParam
        }
      }
    }
    if (status) where.status = status as any
    
    const bookings = await db.bookings.findMany({
      where,
      include: {
        mentors: {
          include: {
            users: {
              select: {
                id: true,
                email: true,
                user_profiles: true
              }
            }
          }
        },
        users: {
          select: {
            id: true,
            email: true,
            user_profiles: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })
    
    const transformedBookings = bookings.map(b => {
      const mentorProfile = b.mentors.users.user_profiles
      const mentorName = mentorProfile ? `${mentorProfile.first_name} ${mentorProfile.last_name}` : b.mentors.users.email
      
      const studentProfile = b.users.user_profiles
      const studentName = studentProfile ? `${studentProfile.first_name} ${studentProfile.last_name}` : b.users.email
      
      return {
        id: b.id,
        mentor: {
          name: mentorName,
          email: b.mentors.users.email
        },
        student: {
          id: b.student_id,
          name: studentName
        },
        date: b.scheduled_at.toISOString().split('T')[0],
        time: b.scheduled_at.toISOString().split('T')[1].substring(0, 5),
        duration: b.duration_minutes,
        status: b.status,
        amount: Number(b.price),
        meetingLink: b.meeting_link
      }
    })
    
    return NextResponse.json({
      success: true,
      bookings: transformedBookings
    })
    
  } catch (error) {
    console.error('Fetch bookings error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    )
  }
}

function generateMeetingLink(): string {
  const meetingId = Math.random().toString(36).substring(2, 15)
  return `https://meet.learnwave.com/session/${meetingId}`
}
