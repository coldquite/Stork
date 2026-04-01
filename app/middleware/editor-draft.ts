import { useScheduleDraftStore } from '~/stores/schedule-draft'
import { HOME_PATH } from '~/constants/routes'

export default defineNuxtRouteMiddleware(() => {
  const scheduleDraftStore = useScheduleDraftStore()

  if (!scheduleDraftStore.hasDraft) {
    return navigateTo(HOME_PATH, { replace: true })
  }
})
