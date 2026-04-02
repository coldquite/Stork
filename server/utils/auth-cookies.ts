export const AUTH_SESSION_COOKIE_NAME = 'stork_session'
export const AUTH_STATE_COOKIE_NAME = 'stork_oauth_state'
const isProduction = process.env.NODE_ENV === 'production'

// Shared secure defaults for auth cookies
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie
function createBaseCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProduction
  }
}

// Options for the main user session cookie
export function getSessionCookieOptions(maxAgeSeconds: number) {
  return {
    ...createBaseCookieOptions(),
    path: '/',
    maxAge: maxAgeSeconds
  }
}

// Options for temporary OAuth state cookie (CSRF check)
export function getOAuthStateCookieOptions(maxAgeSeconds: number) {
  return {
    ...createBaseCookieOptions(),
    path: '/api/auth/callback',
    maxAge: maxAgeSeconds
  }
}
