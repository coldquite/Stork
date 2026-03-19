import { deleteCookie, getCookie, setCookie } from 'h3'
import { AUTH_SESSION_COOKIE_NAME, getSessionCookieOptions } from '#server/utils/auth-cookies'
import { createSessionToken, parseSessionToken } from '#server/utils/auth-session'
import { resolveSessionAbsoluteMaxAgeSeconds, resolveSessionMaxAgeSeconds } from '#server/utils/auth-runtime'
import type { AuthSessionResponse } from '#shared/types/auth'

function unauthenticatedSession(): AuthSessionResponse {
  return {
    authenticated: false,
    username: null
  }
}

export default defineEventHandler<AuthSessionResponse>((event) => {
  const config = useRuntimeConfig(event)
  const token = getCookie(event, AUTH_SESSION_COOKIE_NAME)

  if (!token || !config.authSessionSecret) {
    return unauthenticatedSession()
  }

  const sessionMaxAgeSeconds = resolveSessionMaxAgeSeconds(config.authSessionMaxAgeSeconds)
  const sessionAbsoluteMaxAgeSeconds = resolveSessionAbsoluteMaxAgeSeconds(config.authSessionAbsoluteMaxAgeSeconds)

  const payload = parseSessionToken(token, config.authSessionSecret, sessionAbsoluteMaxAgeSeconds * 1000)

  if (payload === null) {
    deleteCookie(event, AUTH_SESSION_COOKIE_NAME, getSessionCookieOptions(0))

    return unauthenticatedSession()
  }

  const now = Date.now()

  const refreshedSession = createSessionToken(
    {
      username: payload.username,
      issuedAt: payload.issuedAt,
      expiresAt: now + sessionMaxAgeSeconds * 1000
    },
    config.authSessionSecret
  )

  // Sliding session: extend TTL when a user returns to the app
  setCookie(event, AUTH_SESSION_COOKIE_NAME, refreshedSession, getSessionCookieOptions(sessionMaxAgeSeconds))

  return {
    authenticated: true,
    username: payload.username
  }
})
