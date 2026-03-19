export const AUTH_SESSION_COOKIE_NAME = 'stork_session'
export const AUTH_STATE_COOKIE_NAME = 'stork_oauth_state'

// Shared secure defaults for auth cookies
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie
const baseCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: !import.meta.dev
}

// Options for the main user session cookie
export function getSessionCookieOptions(maxAgeSeconds: number) {
  return {
    ...baseCookieOptions,
    path: '/',
    maxAge: maxAgeSeconds
  }
}

// Options for temporary OAuth state cookie (CSRF check)
export function getOAuthStateCookieOptions(maxAgeSeconds: number) {
  return {
    ...baseCookieOptions,
    path: '/api/auth/callback',
    maxAge: maxAgeSeconds
  }
}
