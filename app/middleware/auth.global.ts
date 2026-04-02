import { useAuthStore } from '~/stores/auth'
import { HOME_PATH, LOGIN_PATH } from '~/constants/routes'

export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore()

  if (!authStore.isSessionInitialized) {
    await authStore.fetchSession()
  }

  if (to.path === LOGIN_PATH && authStore.isAuthenticated) {
    return navigateTo(HOME_PATH, { replace: true })
  }

  if (!authStore.isAuthenticated && to.path !== LOGIN_PATH) {
    return navigateTo(LOGIN_PATH, { replace: true })
  }
})
