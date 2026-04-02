import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { navigateToMock, authStoreMock } = vi.hoisted(() => ({
  navigateToMock: vi.fn(),
  authStoreMock: {
    isSessionInitialized: false,
    isAuthenticated: false,
    fetchSession: vi.fn()
  }
}))

mockNuxtImport('navigateTo', () => navigateToMock)

vi.mock('~/stores/auth', () => {
  return {
    useAuthStore: () => authStoreMock
  }
})

async function runMiddleware(path: string) {
  const authMiddleware = (await import('~/middleware/auth.global')).default
  return authMiddleware({ path } as never, {} as never)
}

describe('auth.global middleware', () => {
  beforeEach(() => {
    authStoreMock.isSessionInitialized = false
    authStoreMock.isAuthenticated = false
    authStoreMock.fetchSession.mockReset()
    authStoreMock.fetchSession.mockImplementation(async () => {
      authStoreMock.isSessionInitialized = true
    })
    navigateToMock.mockReset()
    navigateToMock.mockReturnValue('redirect')
  })

  it('initializes session before evaluating redirect rules', async () => {
    const result = await runMiddleware('/editor')

    expect(authStoreMock.fetchSession).toHaveBeenCalledTimes(1)
    expect(navigateToMock).toHaveBeenCalledWith('/login', { replace: true })
    expect(result).toBe('redirect')
  })

  it('redirects authenticated users away from login page', async () => {
    authStoreMock.fetchSession.mockImplementation(async () => {
      authStoreMock.isSessionInitialized = true
      authStoreMock.isAuthenticated = true
    })

    const result = await runMiddleware('/login')

    expect(authStoreMock.fetchSession).toHaveBeenCalledTimes(1)
    expect(navigateToMock).toHaveBeenCalledWith('/', { replace: true })
    expect(result).toBe('redirect')
  })

  it('redirects unauthenticated users to login page for protected routes', async () => {
    authStoreMock.isSessionInitialized = true
    authStoreMock.isAuthenticated = false

    const result = await runMiddleware('/editor')

    expect(authStoreMock.fetchSession).not.toHaveBeenCalled()
    expect(navigateToMock).toHaveBeenCalledWith('/login', { replace: true })
    expect(result).toBe('redirect')
  })

  it('allows navigation when authenticated on non-login route', async () => {
    authStoreMock.isSessionInitialized = true
    authStoreMock.isAuthenticated = true

    const result = await runMiddleware('/')

    expect(authStoreMock.fetchSession).not.toHaveBeenCalled()
    expect(result).toBeUndefined()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('allows unauthenticated users to stay on login route after session init', async () => {
    authStoreMock.isSessionInitialized = true
    authStoreMock.isAuthenticated = false

    const result = await runMiddleware('/login')

    expect(authStoreMock.fetchSession).not.toHaveBeenCalled()
    expect(result).toBeUndefined()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('allows unauthenticated users to stay on login route after session fetch', async () => {
    authStoreMock.isSessionInitialized = false
    authStoreMock.isAuthenticated = false

    const result = await runMiddleware('/login')

    expect(authStoreMock.fetchSession).toHaveBeenCalledTimes(1)
    expect(result).toBeUndefined()
    expect(navigateToMock).not.toHaveBeenCalled()
  })
})
