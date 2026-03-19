import { deleteCookie, getCookie, getQuery, setCookie } from 'h3'
import {
  AUTH_SESSION_COOKIE_NAME,
  AUTH_STATE_COOKIE_NAME,
  getOAuthStateCookieOptions,
  getSessionCookieOptions
} from '#server/utils/auth-cookies'
import { redirectToAuthFailure, redirectToHome } from '#server/utils/auth-redirect'
import { resolveSessionMaxAgeSeconds } from '#server/utils/auth-runtime'
import { createSessionToken } from '#server/utils/auth-session'
import { exchangeCodeForToken, getAllowedUsers, verifyAccessToken } from '#server/utils/fit-auth'
import type { AuthCallbackQuery } from '#shared/types/auth'

function isAuthCallbackQuery(query: unknown): query is AuthCallbackQuery {
  if (!query || typeof query !== 'object') {
    return false
  }

  const candidate = query as Record<string, unknown>
  return typeof candidate.code === 'string' && typeof candidate.state === 'string'
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const query = getQuery(event)

  if (!isAuthCallbackQuery(query)) {
    return redirectToAuthFailure(event, 'state')
  }

  const { code, state: returnedState } = query
  const storedState = getCookie(event, AUTH_STATE_COOKIE_NAME)
  const allowedUsers = getAllowedUsers(config.fitAuthAllowedUsers)

  deleteCookie(event, AUTH_STATE_COOKIE_NAME, getOAuthStateCookieOptions(0))

  if (!storedState || returnedState !== storedState) {
    return redirectToAuthFailure(event, 'state')
  }

  if (
    !config.fitAuthClientId ||
    !config.fitAuthClientSecret ||
    !config.authSessionSecret ||
    allowedUsers.length === 0
  ) {
    return redirectToAuthFailure(event, 'config')
  }

  try {
    const tokenResponse = await exchangeCodeForToken({
      clientId: config.fitAuthClientId,
      clientSecret: config.fitAuthClientSecret,
      redirectUri: config.public.fitAuthRedirectUri,
      scope: config.public.fitAuthScope,
      code,
      tokenUrl: config.fitAuthTokenUrl
    })

    const username = await verifyAccessToken({
      accessToken: tokenResponse.access_token,
      checkTokenUrl: config.fitAuthCheckTokenUrl
    })

    if (!username || !allowedUsers.includes(username.toLowerCase())) {
      return redirectToAuthFailure(event, 'forbidden')
    }

    const now = Date.now()
    const sessionMaxAgeSeconds = resolveSessionMaxAgeSeconds(config.authSessionMaxAgeSeconds)

    const signedSession = createSessionToken(
      {
        username,
        issuedAt: now,
        expiresAt: now + sessionMaxAgeSeconds * 1000
      },
      config.authSessionSecret
    )

    setCookie(event, AUTH_SESSION_COOKIE_NAME, signedSession, getSessionCookieOptions(sessionMaxAgeSeconds))

    return redirectToHome(event)
  } catch {
    return redirectToAuthFailure(event, 'forbidden')
  }
})
