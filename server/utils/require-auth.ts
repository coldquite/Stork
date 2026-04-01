import type { H3Event } from 'h3'
import { createError, getCookie } from 'h3'
import { AUTH_SESSION_COOKIE_NAME } from '#server/utils/auth-cookies'
import { resolveSessionAbsoluteMaxAgeSeconds } from '#server/utils/auth-runtime'
import { parseSessionToken } from '#server/utils/auth-session'

export function requireAuthenticatedUser(event: H3Event): string {
  const sessionToken = getCookie(event, AUTH_SESSION_COOKIE_NAME)

  if (!sessionToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const config = useRuntimeConfig(event)
  const sessionAbsoluteMaxAgeSeconds = resolveSessionAbsoluteMaxAgeSeconds(config.authSessionAbsoluteMaxAgeSeconds)
  const sessionPayload = parseSessionToken(sessionToken, config.authSessionSecret, sessionAbsoluteMaxAgeSeconds * 1000)

  if (!sessionPayload) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  return sessionPayload.username
}
