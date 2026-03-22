import type { TimeScheduleListItemDto } from '#shared/types/time-schedules'

export const useStartStore = defineStore('start', () => {
  const recentPlans = ref<TimeScheduleListItemDto[]>([])
  const isRecentPlansLoading = ref(false)
  const hasRecentPlansError = ref(false)

  async function fetchRecentPlans(limit = 5): Promise<void> {
    if (isRecentPlansLoading.value) {
      return
    }

    isRecentPlansLoading.value = true
    hasRecentPlansError.value = false

    try {
      const requestFetch = useRequestFetch()
      const schedules = await requestFetch<TimeScheduleListItemDto[]>('/api/time-schedules')
      recentPlans.value = schedules.slice(0, limit)
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
