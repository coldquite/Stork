import type { H3Event } from 'h3'
import { sendRedirect } from 'h3'
import type { AuthFailureReason } from '#shared/types/auth'

export const REDIRECT_FOUND_STATUS = 302

export function redirectToAuthFailure(event: H3Event, reason: AuthFailureReason) {
  return sendRedirect(event, `/login?login=failed&reason=${reason}`, REDIRECT_FOUND_STATUS)
}

export function redirectToHome(event: H3Event) {
  return sendRedirect(event, '/', REDIRECT_FOUND_STATUS)
}
