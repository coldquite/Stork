import { deleteCookie } from 'h3'
import { AUTH_SESSION_COOKIE_NAME, getSessionCookieOptions } from '#server/utils/auth-cookies'

export default defineEventHandler((event) => {
  deleteCookie(event, AUTH_SESSION_COOKIE_NAME, getSessionCookieOptions(0))

  return {
    ok: true
  }
})
