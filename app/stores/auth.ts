/**
 * Auth Store
 *
 * Keeps the client-side authentication session state for the current user.
 * It loads session info from the backend, starts FIT login redirect flow,
 * and performs logout while exposing loading flags for UI actions.
 */
import type { AuthSessionResponse } from '#shared/types/auth'
import { useScheduleDraftStore } from '~/stores/schedule-draft'

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const username = ref<string | null>(null)
  const isSessionInitialized = ref(false)
  const isSessionLoading = ref(false)
  const isLogoutLoading = ref(false)

  function clearSessionState(): void {
    isAuthenticated.value = false
    username.value = null
  }

  function applySessionState(session: AuthSessionResponse): void {
    isAuthenticated.value = session.authenticated
    username.value = session.username
  }

  async function fetchSession(): Promise<void> {
    if (isSessionLoading.value) {
      return
    }

    isSessionLoading.value = true

    try {
      const requestFetch = useRequestFetch()
      const session = await requestFetch<AuthSessionResponse>('/api/auth/session')
      applySessionState(session)
    } catch {
      clearSessionState()
    } finally {
      isSessionInitialized.value = true
      isSessionLoading.value = false
    }
  }

  async function startFitLogin(): Promise<void> {
    await navigateTo('/api/auth/login', { external: true })
  }

  async function logout(): Promise<void> {
    if (isLogoutLoading.value) {
      return
    }

    isLogoutLoading.value = true

    try {
      const scheduleDraftStore = useScheduleDraftStore()
      const requestFetch = useRequestFetch()
      await requestFetch('/api/auth/logout', { method: 'POST' })
      scheduleDraftStore.clearDraft()
      clearSessionState()
      await navigateTo('/login', { replace: true })
    } finally {
      isLogoutLoading.value = false
    }
  }

  return {
    isAuthenticated,
    username,
    isSessionInitialized,
    isSessionLoading,
    isLogoutLoading,
    fetchSession,
    startFitLogin,
    logout
  }
})
