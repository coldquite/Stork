import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { navigateToMock, authStoreMock } = vi.hoisted(() => ({
  navigateToMock: vi.fn(),
  authStoreMock: {
    isSessionInitialized: false,
    isAuthenticated: false
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
    navigateToMock.mockReset()
    navigateToMock.mockReturnValue('redirect')
  })

  it('skips redirects while session is not initialized yet', async () => {
    const result = await runMiddleware('/editor')

    expect(result).toBeUndefined()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('redirects authenticated users away from login page', async () => {
    authStoreMock.isSessionInitialized = true
    authStoreMock.isAuthenticated = true

    const result = await runMiddleware('/login')

    expect(navigateToMock).toHaveBeenCalledWith('/', { replace: true })
    expect(result).toBe('redirect')
  })

  it('redirects unauthenticated users to login page for protected routes', async () => {
    authStoreMock.isSessionInitialized = true
    authStoreMock.isAuthenticated = false

    const result = await runMiddleware('/editor')

    expect(navigateToMock).toHaveBeenCalledWith('/login', { replace: true })
    expect(result).toBe('redirect')
  })

  it('allows navigation when authenticated on non-login route', async () => {
    authStoreMock.isSessionInitialized = true
    authStoreMock.isAuthenticated = true

    const result = await runMiddleware('/')

    expect(result).toBeUndefined()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('allows unauthenticated users to stay on login route after session init', async () => {
    authStoreMock.isSessionInitialized = true
    authStoreMock.isAuthenticated = false

    const result = await runMiddleware('/login')

    expect(result).toBeUndefined()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('does not redirect from login route while session is still uninitialized', async () => {
    authStoreMock.isSessionInitialized = false
    authStoreMock.isAuthenticated = true

    const result = await runMiddleware('/login')

    expect(result).toBeUndefined()
    expect(navigateToMock).not.toHaveBeenCalled()
  })
})
