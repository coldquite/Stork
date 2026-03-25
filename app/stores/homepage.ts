/**
 * Homepage Store
 *
 * Provides data for the homepage "recent plans" section.
 * It fetches schedule list items from the backend, keeps only a limited number of latest entries.
 */
import type { TimeScheduleListItemDto } from '#shared/types/time-schedules'

export const useHomepageStore = defineStore('homepage', () => {
  const recentPlans = ref<TimeScheduleListItemDto[]>([])
  const isRecentPlansLoading = ref(false)
  const hasRecentPlansError = ref(false)

  async function fetchRecentPlans(limit = 7): Promise<void> {
    if (isRecentPlansLoading.value) {
      return
    }

    isRecentPlansLoading.value = true
    hasRecentPlansError.value = false

    try {
      const requestFetch = useRequestFetch()
      recentPlans.value = await requestFetch<TimeScheduleListItemDto[]>(`/api/time-schedules?page=1&pageSize=${limit}`)
    } catch {
      hasRecentPlansError.value = true
      recentPlans.value = []
    } finally {
      isRecentPlansLoading.value = false
    }
  }

  return {
    recentPlans,
    isRecentPlansLoading,
    hasRecentPlansError,
    fetchRecentPlans
  }
})
