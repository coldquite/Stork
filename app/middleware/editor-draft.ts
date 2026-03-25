import { useScheduleDraftStore } from '~/stores/schedule-draft'

const HOME_PATH = '/'

export default defineNuxtRouteMiddleware(() => {
  const scheduleDraftStore = useScheduleDraftStore()

  if (!scheduleDraftStore.hasDraft) {
    return navigateTo(HOME_PATH, { replace: true })
  }
})
