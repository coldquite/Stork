export interface AuthSessionResponse {
  authenticated: boolean
  username: string | null
}

export type AuthFailureReason = 'state' | 'config' | 'forbidden'

export interface AuthCallbackQuery {
  code: string
  state: string
}
