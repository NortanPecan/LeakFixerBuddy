import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

export const AUTH_COOKIE_NAME = 'lf_session'
const AUTH_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30

type SessionMode = 'telegram' | 'email' | 'demo'

interface SessionPayload {
  sub: string
  mode: SessionMode
  iat: number
  exp: number
}

function getSessionSecret() {
  return (
    process.env.AUTH_SESSION_SECRET ||
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.CRON_SECRET ||
    null
  )
}

function encodePayload(payload: SessionPayload) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

function signPayload(encodedPayload: string, secret: string) {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url')
}

function decodePayload(encodedPayload: string): SessionPayload | null {
  try {
    return JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as SessionPayload
  } catch {
    return null
  }
}

function buildSessionToken(payload: SessionPayload, secret: string) {
  const encodedPayload = encodePayload(payload)
  const signature = signPayload(encodedPayload, secret)
  return `${encodedPayload}.${signature}`
}

function verifySessionToken(token: string, secret: string): SessionPayload | null {
  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) return null

  const expectedSignature = signPayload(encodedPayload, secret)
  const providedBuffer = Buffer.from(signature, 'utf8')
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8')

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null
  }

  const payload = decodePayload(encodedPayload)
  if (!payload?.sub || !payload.exp || payload.exp * 1000 <= Date.now()) {
    return null
  }

  return payload
}

export function setAuthSession(
  response: NextResponse,
  userId: string,
  mode: SessionMode,
) {
  const secret = getSessionSecret()
  if (!secret) return response

  const now = Math.floor(Date.now() / 1000)
  const token = buildSessionToken(
    {
      sub: userId,
      mode,
      iat: now,
      exp: now + AUTH_SESSION_TTL_SECONDS,
    },
    secret,
  )

  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: AUTH_SESSION_TTL_SECONDS,
  })

  return response
}

export function clearAuthSession(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })

  return response
}

export function getAuthSession(request: NextRequest): { userId: string; mode: SessionMode } | null {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value
  const secret = getSessionSecret()

  if (!token || !secret) return null

  const payload = verifySessionToken(token, secret)
  if (!payload) return null

  return {
    userId: payload.sub,
    mode: payload.mode,
  }
}

export function requireAuthenticatedUser(request: NextRequest) {
  const session = getAuthSession(request)
  if (!session) {
    return {
      error: NextResponse.json(
        {
          error: 'Authentication required',
          hint: 'Sign in again to restore your session',
        },
        { status: 401 },
      ),
    }
  }

  return { session }
}

export function requireSelf(request: NextRequest, targetUserId: string | null | undefined) {
  const auth = requireAuthenticatedUser(request)
  if ('error' in auth) return auth

  if (!targetUserId) {
    return {
      error: NextResponse.json({ error: 'userId is required' }, { status: 400 }),
    }
  }

  if (auth.session.userId !== targetUserId) {
    return {
      error: NextResponse.json(
        {
          error: 'Forbidden',
          hint: 'You can only access your own data',
        },
        { status: 403 },
      ),
    }
  }

  return auth
}
