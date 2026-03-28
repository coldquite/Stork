// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getCookieMock,
  setCookieMock,
  deleteCookieMock,
  getQueryMock,
  sendRedirectMock,
  createSessionTokenMock,
  parseSessionTokenMock,
  resolveSessionMaxAgeSecondsMock,
  resolveSessionAbsoluteMaxAgeSecondsMock,
  resolveOAuthStateMaxAgeSecondsMock,
  exchangeCodeForTokenMock,
  verifyAccessTokenMock,
  getAllowedUsersMock,
  redirectToAuthFailureMock,
  redirectToHomeMock,
  useRuntimeConfigMock,
  getSessionCookieOptionsMock,
  getOAuthStateCookieOptionsMock
} = vi.hoisted(() => ({
  getCookieMock: vi.fn(),
  setCookieMock: vi.fn(),
  deleteCookieMock: vi.fn(),
  getQueryMock: vi.fn(),
  sendRedirectMock: vi.fn(),
  createSessionTokenMock: vi.fn(),
  parseSessionTokenMock: vi.fn(),
  resolveSessionMaxAgeSecondsMock: vi.fn(),
  resolveSessionAbsoluteMaxAgeSecondsMock: vi.fn(),
  resolveOAuthStateMaxAgeSecondsMock: vi.fn(),
  exchangeCodeForTokenMock: vi.fn(),
  verifyAccessTokenMock: vi.fn(),
  getAllowedUsersMock: vi.fn(),
  redirectToAuthFailureMock: vi.fn(),
  redirectToHomeMock: vi.fn(),
  useRuntimeConfigMock: vi.fn(),
  getSessionCookieOptionsMock: vi.fn((maxAgeSeconds: number) => ({ maxAge: maxAgeSeconds })),
  getOAuthStateCookieOptionsMock: vi.fn((maxAgeSeconds: number) => ({ maxAge: maxAgeSeconds }))
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()

  return {
    ...actual,
    getCookie: getCookieMock,
    setCookie: setCookieMock,
    deleteCookie: deleteCookieMock,
    getQuery: getQueryMock,
    sendRedirect: sendRedirectMock
  }
})

vi.mock('#server/utils/auth-cookies', () => ({
  AUTH_SESSION_COOKIE_NAME: 'stork_session',
  AUTH_STATE_COOKIE_NAME: 'stork_oauth_state',
  getSessionCookieOptions: getSessionCookieOptionsMock,
  getOAuthStateCookieOptions: getOAuthStateCookieOptionsMock
}))

vi.mock('#server/utils/auth-session', () => ({
  createSessionToken: createSessionTokenMock,
  parseSessionToken: parseSessionTokenMock
}))

vi.mock('#server/utils/auth-runtime', () => ({
  resolveSessionMaxAgeSeconds: resolveSessionMaxAgeSecondsMock,
  resolveSessionAbsoluteMaxAgeSeconds: resolveSessionAbsoluteMaxAgeSecondsMock,
  resolveOAuthStateMaxAgeSeconds: resolveOAuthStateMaxAgeSecondsMock
}))

vi.mock('#server/utils/fit-auth', () => ({
  exchangeCodeForToken: exchangeCodeForTokenMock,
  verifyAccessToken: verifyAccessTokenMock,
  getAllowedUsers: getAllowedUsersMock
}))

vi.mock('#server/utils/auth-redirect', () => ({
  REDIRECT_FOUND_STATUS: 302,
  redirectToAuthFailure: redirectToAuthFailureMock,
  redirectToHome: redirectToHomeMock
}))

vi.mock('#imports', () => ({
  useRuntimeConfig: useRuntimeConfigMock
}))

vi.mock('nuxt/app', async (importOriginal) => {
  const actual = await importOriginal<typeof import('nuxt/app')>()

  return {
    ...actual,
    useRuntimeConfig: useRuntimeConfigMock
  }
})

vi.mock('#app/nuxt', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#app/nuxt')>()

  return {
    ...actual,
    useRuntimeConfig: useRuntimeConfigMock
  }
})

function createRuntimeConfig(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    fitAuthClientId: 'fit-client',
    fitAuthClientSecret: 'fit-secret',
    fitAuthTokenUrl: 'https://auth.fit.cvut.cz/oauth/token',
    fitAuthCheckTokenUrl: 'https://auth.fit.cvut.cz/oauth/check_token',
    fitAuthAllowedUsers: 'alice',
    authSessionSecret: 'session-secret',
    authSessionMaxAgeSeconds: 3600,
    authSessionAbsoluteMaxAgeSeconds: 86400,
    authOAuthStateMaxAgeSeconds: 600,
    public: {
      fitAuthRedirectUri: 'http://localhost:3000/api/auth/callback',
      fitAuthAuthorizeUrl: 'https://auth.fit.cvut.cz/oauth/authorize',
      fitAuthScope: 'cvut:umapi:read'
    },
    ...overrides
  }
}

async function importSessionHandler() {
  const module = await import('#server/api/auth/session.get')
  return module.default
}

async function importLoginHandler() {
  const module = await import('#server/api/auth/login.get')
  return module.default
}

async function importCallbackHandler() {
  const module = await import('#server/api/auth/callback.get')
  return module.default
}

async function importLogoutHandler() {
  const module = await import('#server/api/auth/logout.post')
  return module.default
}

describe('auth API endpoints', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('useRuntimeConfig', useRuntimeConfigMock)

    resolveSessionMaxAgeSecondsMock.mockReturnValue(3600)
    resolveSessionAbsoluteMaxAgeSecondsMock.mockReturnValue(86400)
    resolveOAuthStateMaxAgeSecondsMock.mockReturnValue(600)
    getAllowedUsersMock.mockReturnValue(['alice'])
    redirectToAuthFailureMock.mockReturnValue({ redirected: 'failure' })
    redirectToHomeMock.mockReturnValue({ redirected: 'home' })
    sendRedirectMock.mockReturnValue({ redirected: 'external' })
    useRuntimeConfigMock.mockReturnValue(createRuntimeConfig())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  describe('GET /api/auth/session', () => {
    it('returns unauthenticated response when cookie is missing', async () => {
      getCookieMock.mockReturnValue(undefined)

      const handler = await importSessionHandler()
      const response = await handler({} as never)

      expect(response).toEqual({
        authenticated: false,
        username: null
      })
      expect(parseSessionTokenMock).not.toHaveBeenCalled()
      expect(setCookieMock).not.toHaveBeenCalled()
    })

    it('clears invalid token cookie and returns unauthenticated response', async () => {
      getCookieMock.mockReturnValue('broken-token')
      parseSessionTokenMock.mockReturnValue(null)

      const event = {} as never
      const handler = await importSessionHandler()
      const response = await handler(event)

      expect(deleteCookieMock).toHaveBeenCalledWith(event, 'stork_session', { maxAge: 0 })
      expect(response).toEqual({
        authenticated: false,
        username: null
      })
    })

    it('refreshes valid session and returns authenticated response', async () => {
      const now = new Date('2026-03-29T12:00:00.000Z')
      vi.useFakeTimers()
      vi.setSystemTime(now)

      getCookieMock.mockReturnValue('valid-token')
      parseSessionTokenMock.mockReturnValue({
        username: 'alice',
        issuedAt: now.getTime() - 10_000,
        expiresAt: now.getTime() + 10_000
      })
      createSessionTokenMock.mockReturnValue('refreshed-token')

      const event = {} as never
      const handler = await importSessionHandler()
      const response = await handler(event)

      expect(createSessionTokenMock).toHaveBeenCalledWith(
        {
          username: 'alice',
          issuedAt: now.getTime() - 10_000,
          expiresAt: now.getTime() + 3_600_000
        },
        'session-secret'
      )
      expect(setCookieMock).toHaveBeenCalledWith(event, 'stork_session', 'refreshed-token', { maxAge: 3600 })
      expect(response).toEqual({
        authenticated: true,
        username: 'alice'
      })

      vi.useRealTimers()
    })
  })

  describe('GET /api/auth/login', () => {
    it('redirects to auth failure when required config is missing', async () => {
      useRuntimeConfigMock.mockReturnValue(createRuntimeConfig({ fitAuthClientId: '' }))

      const event = {} as never
      const handler = await importLoginHandler()
      const response = await handler(event)

      expect(redirectToAuthFailureMock).toHaveBeenCalledWith(event, 'config')
      expect(response).toEqual({ redirected: 'failure' })
      expect(setCookieMock).not.toHaveBeenCalled()
      expect(sendRedirectMock).not.toHaveBeenCalled()
    })

    it('sets oauth state cookie and redirects to FIT auth authorize URL', async () => {
      const event = {} as never
      const handler = await importLoginHandler()
      const response = await handler(event)

      expect(setCookieMock).toHaveBeenCalledTimes(1)
      const [, , stateValue, cookieOptions] = setCookieMock.mock.calls[0]!
      expect(typeof stateValue).toBe('string')
      expect(cookieOptions).toEqual({ maxAge: 600 })

      expect(sendRedirectMock).toHaveBeenCalledTimes(1)
      const [, redirectUrl, statusCode] = sendRedirectMock.mock.calls[0]!
      expect(statusCode).toBe(302)

      const authorizeUrl = new URL(redirectUrl as string)
      expect(authorizeUrl.origin + authorizeUrl.pathname).toBe('https://auth.fit.cvut.cz/oauth/authorize')
      expect(authorizeUrl.searchParams.get('client_id')).toBe('fit-client')
      expect(authorizeUrl.searchParams.get('redirect_uri')).toBe('http://localhost:3000/api/auth/callback')
      expect(authorizeUrl.searchParams.get('response_type')).toBe('code')
      expect(authorizeUrl.searchParams.get('scope')).toBe('cvut:umapi:read')
      expect(authorizeUrl.searchParams.get('state')).toBe(stateValue)

      expect(response).toEqual({ redirected: 'external' })
    })
  })

  describe('GET /api/auth/callback', () => {
    it('redirects to state failure when callback query is invalid', async () => {
      getQueryMock.mockReturnValue({})

      const event = {} as never
      const handler = await importCallbackHandler()
      const response = await handler(event)

      expect(redirectToAuthFailureMock).toHaveBeenCalledWith(event, 'state')
      expect(response).toEqual({ redirected: 'failure' })
      expect(deleteCookieMock).not.toHaveBeenCalled()
    })

    it('redirects to state failure when state cookie does not match', async () => {
      getQueryMock.mockReturnValue({
        code: 'auth-code',
        state: 'returned-state'
      })
      getCookieMock.mockReturnValue('stored-state-other')

      const event = {} as never
      const handler = await importCallbackHandler()
      const response = await handler(event)

      expect(deleteCookieMock).toHaveBeenCalledWith(event, 'stork_oauth_state', { maxAge: 0 })
      expect(redirectToAuthFailureMock).toHaveBeenCalledWith(event, 'state')
      expect(response).toEqual({ redirected: 'failure' })
    })

    it('redirects to config failure when required runtime values are invalid', async () => {
      getQueryMock.mockReturnValue({
        code: 'auth-code',
        state: 'returned-state'
      })
      getCookieMock.mockReturnValue('returned-state')
      getAllowedUsersMock.mockReturnValue([])

      const event = {} as never
      const handler = await importCallbackHandler()
      const response = await handler(event)

      expect(redirectToAuthFailureMock).toHaveBeenCalledWith(event, 'config')
      expect(response).toEqual({ redirected: 'failure' })
      expect(exchangeCodeForTokenMock).not.toHaveBeenCalled()
    })

    it('redirects to forbidden when verified username is not allowed', async () => {
      getQueryMock.mockReturnValue({
        code: 'auth-code',
        state: 'returned-state'
      })
      getCookieMock.mockReturnValue('returned-state')
      getAllowedUsersMock.mockReturnValue(['alice'])
      exchangeCodeForTokenMock.mockResolvedValue({
        access_token: 'access-token'
      })
      verifyAccessTokenMock.mockResolvedValue('bob')

      const event = {} as never
      const handler = await importCallbackHandler()
      const response = await handler(event)

      expect(exchangeCodeForTokenMock).toHaveBeenCalledTimes(1)
      expect(verifyAccessTokenMock).toHaveBeenCalledWith({
        accessToken: 'access-token',
        checkTokenUrl: 'https://auth.fit.cvut.cz/oauth/check_token'
      })
      expect(redirectToAuthFailureMock).toHaveBeenCalledWith(event, 'forbidden')
      expect(response).toEqual({ redirected: 'failure' })
      expect(setCookieMock).not.toHaveBeenCalled()
    })

    it('creates session cookie and redirects home for allowed user', async () => {
      const now = new Date('2026-03-29T12:00:00.000Z')
      vi.useFakeTimers()
      vi.setSystemTime(now)

      getQueryMock.mockReturnValue({
        code: 'auth-code',
        state: 'returned-state'
      })
      getCookieMock.mockReturnValue('returned-state')
      getAllowedUsersMock.mockReturnValue(['alice'])
      exchangeCodeForTokenMock.mockResolvedValue({
        access_token: 'access-token'
      })
      verifyAccessTokenMock.mockResolvedValue('Alice')
      createSessionTokenMock.mockReturnValue('signed-session')

      const event = {} as never
      const handler = await importCallbackHandler()
      const response = await handler(event)

      expect(createSessionTokenMock).toHaveBeenCalledWith(
        {
          username: 'Alice',
          issuedAt: now.getTime(),
          expiresAt: now.getTime() + 3_600_000
        },
        'session-secret'
      )
      expect(setCookieMock).toHaveBeenCalledWith(event, 'stork_session', 'signed-session', { maxAge: 3600 })
      expect(redirectToHomeMock).toHaveBeenCalledWith(event)
      expect(response).toEqual({ redirected: 'home' })

      vi.useRealTimers()
    })
  })

  describe('POST /api/auth/logout', () => {
    it('clears session cookie and returns success payload', async () => {
      const event = {} as never
      const handler = await importLogoutHandler()
      const response = await handler(event)

      expect(deleteCookieMock).toHaveBeenCalledWith(event, 'stork_session', { maxAge: 0 })
      expect(response).toEqual({
        ok: true
      })
    })
  })
})
