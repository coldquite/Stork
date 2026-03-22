import 'dotenv/config'
import { AUTH_SESSION_COOKIE_NAME } from '#server/utils/auth-cookies'
import { createSessionToken } from '#server/utils/auth-session'

// Shared helpers for API integration tests that run against a real app + database instance.
const API_BASE_URL = 'http://localhost:3000'

export function createAuthCookie(username = 'integration-tester'): string {
  const now = Date.now()
  const secret = process.env.NUXT_AUTH_SESSION_SECRET ?? ''
  const token = createSessionToken(
    {
      username,
      issuedAt: now,
      expiresAt: now + 60_000
    },
    secret
  )

  return `${AUTH_SESSION_COOKIE_NAME}=${token}`
}

export function createUniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function apiUrl(path: string): string {
  return new URL(path, API_BASE_URL).toString()
}
