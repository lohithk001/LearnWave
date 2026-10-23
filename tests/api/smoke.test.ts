process.env.JWT_SECRET = 'test-secret-key-at-least-thirty-two-chars-long'

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock next/headers cookies
vi.mock('next/headers', () => {
  return {
    cookies: vi.fn().mockImplementation(async () => {
      return {
        set: vi.fn(),
        get: vi.fn(),
        delete: vi.fn(),
      }
    })
  }
})

// Mock the database client
vi.mock('@/lib/db', () => {
  return {
    db: {
      users: {
        findUnique: vi.fn(),
        count: vi.fn(),
      },
      user_profiles: {
        findUnique: vi.fn(),
      },
      user_activity_log: {
        create: vi.fn(),
      },
      user_progress: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      user_streak: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      user_mission_progress: {
        findMany: vi.fn(),
      },
      community_posts: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      bookings: {
        findUnique: vi.fn(),
        update: vi.fn(),
      }
    }
  }
})

// Mock verifyPassword at top level
vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>()
  return {
    ...actual,
    verifyPassword: vi.fn().mockImplementation(async (pwd, hash) => {
      return pwd === 'student123'
    })
  }
})

// Mock the gamification engine dependencies to isolate API logic
vi.mock('@/lib/xp-engine', () => {
  return {
    awardXP: vi.fn().mockResolvedValue({
      success: true,
      xpGained: 50,
      level: 1,
      leveledUp: false
    })
  }
})

vi.mock('@/lib/streak-engine', () => {
  return {
    updateStreak: vi.fn().mockResolvedValue({
      currentStreak: 1,
      bestStreak: 1
    })
  }
})

import { db } from '@/lib/db'
import { POST as loginHandler } from '@/app/api/auth/login/route'
import { GET as meHandler } from '@/app/api/auth/me/route'
import { POST as quizSubmitHandler } from '@/app/api/student/quiz/submit/route'
import { POST as communityPostHandler } from '@/app/api/student/community/post/route'
import { POST as sessionCancelHandler } from '@/app/api/sessions/cancel/route'
import { generateToken } from '@/lib/auth'

describe('API Smoke Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/auth/login', () => {
    it('should authenticate user and return token', async () => {
      const mockUser = {
        id: 'student-id',
        email: 'student@learnwave.com',
        role: 'STUDENT',
        usn: '1CS21CS001',
        password_hash: 'some-hash',
        user_profiles: {
          first_name: 'Test',
          last_name: 'Student',
          branch: 'CS',
          semester: 5
        }
      }

      vi.mocked(db.users.findUnique).mockResolvedValue(mockUser as any)

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'student@learnwave.com',
          password: 'student123'
        })
      })

      const response = await loginHandler(request)
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.message).toBe('Login successful')
      expect(body.token).toBeDefined()
      expect(body.user.email).toBe('student@learnwave.com')
    })
  })

  describe('GET /api/auth/me', () => {
    it('should retrieve logged in user session', async () => {
      const mockUser = {
        id: 'student-id',
        email: 'student@learnwave.com',
        role: 'STUDENT',
        usn: '1CS21CS001',
        user_profiles: {
          first_name: 'Test',
          last_name: 'Student',
          branch: 'CS',
          semester: 5
        }
      }

      vi.mocked(db.users.findUnique).mockResolvedValue(mockUser as any)

      const token = await generateToken({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        name: 'Test Student'
      })

      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const response = await meHandler(request)
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.user.email).toBe(mockUser.email)
    })
  })

  describe('POST /api/student/quiz/submit', () => {
    it('should award XP for quiz submission', async () => {
      const token = await generateToken({
        userId: 'student-id',
        email: 'student@learnwave.com',
        role: 'STUDENT',
        name: 'Test Student'
      })

      const request = new NextRequest('http://localhost/api/student/quiz/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          score: 95,
          subject: 'Data Structures'
        })
      })

      const response = await quizSubmitHandler(request)
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.xpGained).toBeDefined()
    })
  })

  describe('POST /api/student/community/post', () => {
    it('should award XP for forum post', async () => {
      const token = await generateToken({
        userId: 'student-id',
        email: 'student@learnwave.com',
        role: 'STUDENT',
        name: 'Test Student'
      })

      const request = new NextRequest('http://localhost/api/student/community/post', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: 'How does quicksort work?',
          category: 'Algorithms'
        })
      })

      const response = await communityPostHandler(request)
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.xpGained).toBeDefined()
    })
  })

  describe('POST /api/sessions/cancel (Security & IDOR Check)', () => {
    it('should reject unauthenticated cancellation requests', async () => {
      const request = new NextRequest('http://localhost/api/sessions/cancel', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 'session-123' })
      })

      const response = await sessionCancelHandler(request)
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toContain('Unauthorized')
    })

    it('should reject unauthorized cancellation if user does not own session', async () => {
      const attackerToken = await generateToken({
        userId: 'attacker-id',
        email: 'attacker@learnwave.com',
        role: 'STUDENT'
      })

      vi.mocked(db.bookings.findUnique).mockResolvedValue({
        id: 'session-123',
        student_id: 'victim-student-id',
        status: 'PENDING',
        mentors: { user_id: 'mentor-id' }
      } as any)

      const request = new NextRequest('http://localhost/api/sessions/cancel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${attackerToken}`
        },
        body: JSON.stringify({ sessionId: 'session-123' })
      })

      const response = await sessionCancelHandler(request)
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toContain('Forbidden')
    })

    it('should allow legitimate owner to cancel pending session', async () => {
      const ownerToken = await generateToken({
        userId: 'legit-student-id',
        email: 'student@learnwave.com',
        role: 'STUDENT'
      })

      vi.mocked(db.bookings.findUnique).mockResolvedValue({
        id: 'session-123',
        student_id: 'legit-student-id',
        status: 'PENDING',
        mentors: { user_id: 'mentor-id' }
      } as any)

      vi.mocked(db.bookings.update).mockResolvedValue({
        id: 'session-123',
        student_id: 'legit-student-id',
        status: 'CANCELLED'
      } as any)

      const request = new NextRequest('http://localhost/api/sessions/cancel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ownerToken}`
        },
        body: JSON.stringify({ sessionId: 'session-123' })
      })

      const response = await sessionCancelHandler(request)
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.session.status).toBe('CANCELLED')
    })
  })
})

