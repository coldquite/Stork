import { useAuthStore } from '~/stores/auth'

const LOGIN_PATH = '/login'
const HOME_PATH = '/'

export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()

  if (!authStore.isSessionInitialized) {
    return
  }

  if (to.path === LOGIN_PATH && authStore.isAuthenticated) {
    return navigateTo(HOME_PATH, { replace: true })
  }

  if (!authStore.isAuthenticated && to.path !== LOGIN_PATH) {
    return navigateTo(LOGIN_PATH, { replace: true })
  }
})
