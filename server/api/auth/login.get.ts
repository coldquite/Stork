import { randomBytes } from 'node:crypto'
import { setCookie, sendRedirect } from 'h3'
import { AUTH_STATE_COOKIE_NAME, getOAuthStateCookieOptions } from '#server/utils/auth-cookies'
import { redirectToAuthFailure, REDIRECT_FOUND_STATUS } from '#server/utils/auth-redirect'
import { resolveOAuthStateMaxAgeSeconds } from '#server/utils/auth-runtime'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)

  if (!config.fitAuthClientId || !config.public.fitAuthRedirectUri || !config.authSessionSecret) {
    return redirectToAuthFailure(event, 'config')
  }

  const state = randomBytes(24).toString('base64url')
  const oauthStateMaxAgeSeconds = resolveOAuthStateMaxAgeSeconds(config.authOAuthStateMaxAgeSeconds)

  setCookie(event, AUTH_STATE_COOKIE_NAME, state, getOAuthStateCookieOptions(oauthStateMaxAgeSeconds))

  const authorizeUrl = new URL(config.public.fitAuthAuthorizeUrl)
  authorizeUrl.searchParams.set('client_id', config.fitAuthClientId)
  authorizeUrl.searchParams.set('redirect_uri', config.public.fitAuthRedirectUri)
  authorizeUrl.searchParams.set('response_type', 'code')
  authorizeUrl.searchParams.set('scope', config.public.fitAuthScope)
  authorizeUrl.searchParams.set('state', state)

  return sendRedirect(event, authorizeUrl.toString(), REDIRECT_FOUND_STATUS)
})
