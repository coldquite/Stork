import { createHmac, timingSafeEqual } from 'node:crypto'
import type { AuthSessionPayload } from '#server/types/auth-session'

function isAuthSessionPayload(payload: unknown): payload is AuthSessionPayload {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  const candidate = payload as Record<string, unknown>

  return (
    typeof candidate.username === 'string' &&
    candidate.username.length > 0 &&
    typeof candidate.issuedAt === 'number' &&
    Number.isFinite(candidate.issuedAt) &&
    typeof candidate.expiresAt === 'number' &&
    Number.isFinite(candidate.expiresAt) &&
    candidate.issuedAt <= candidate.expiresAt
  )
}

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function signPayload(encodedPayload: string, secret: string): string {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url')
}

export function createSessionToken(payload: AuthSessionPayload, secret: string): string {
  const encodedPayload = toBase64Url(JSON.stringify(payload))
  const signature = signPayload(encodedPayload, secret)
  return `${encodedPayload}.${signature}`
}

export function parseSessionToken(token: string, secret: string, maxAbsoluteAgeMs = 0): AuthSessionPayload | null {
  const [encodedPayload, receivedSignature, extraSegment] = token.split('.')

  if (extraSegment || !encodedPayload || !receivedSignature) {
    return null
  }

  const expectedSignature = signPayload(encodedPayload, secret)

  // https://developers.cloudflare.com/workers/examples/protect-against-timing-attacks/
  if (
    expectedSignature.length !== receivedSignature.length ||
    !timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(receivedSignature))
  ) {
    return null
  }

  try {
    const parsedPayload: unknown = JSON.parse(fromBase64Url(encodedPayload))

    if (!isAuthSessionPayload(parsedPayload)) {
      return null
    }

    const now = Date.now()
    const hasAbsoluteAgeLimit = maxAbsoluteAgeMs > 0
    const isAbsoluteAgeExpired = hasAbsoluteAgeLimit && now - parsedPayload.issuedAt > maxAbsoluteAgeMs

    if (now >= parsedPayload.expiresAt || isAbsoluteAgeExpired) {
      return null
    }

    return parsedPayload
  } catch {
    return null
  }
}
