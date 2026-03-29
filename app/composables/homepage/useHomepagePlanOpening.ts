import { differenceInSeconds, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns'
import { cs } from 'date-fns/locale'
import type { Ref } from 'vue'
import type { TimeScheduleListItemDto } from '#shared/types/time-schedules'
import { useScheduleDraftStore } from '~/stores/schedule-draft'
import type { PlanOpenCandidate } from '~/types/homepage'

interface UseHomepagePlanOpeningOptions {
  isCreatingNewPlan: Readonly<Ref<boolean>>
  isOpeningRecentPlan: Ref<boolean>
}

export function useHomepagePlanOpening(options: UseHomepagePlanOpeningOptions) {
  const { t } = useI18n()
  const scheduleDraftStore = useScheduleDraftStore()

  const recentPlans = ref<TimeScheduleListItemDto[]>([])
  const isRecentPlansLoading = ref(false)
  const hasRecentPlansError = ref(false)

  const isOpenRecentPlanDialogOpen = ref(false)
  const pendingOpenPlan = ref<PlanOpenCandidate | null>(null)
  const recentPlanOpenError = ref<string | null>(null)
  const isClientReady = ref(false)

  onMounted(() => {
    isClientReady.value = true
  })

  const showRestoreCard = computed(() => {
    return (
      isClientReady.value &&
      scheduleDraftStore.hasDraft &&
      !options.isOpeningRecentPlan.value &&
      !options.isCreatingNewPlan.value
    )
  })

  const restoreDraftLine = computed(() => {
    const draftName = scheduleDraftStore.draft?.name ?? ''

    return t('homepage.actions.restore.draftLine', {
      name: draftName
    })
  })

  const restoreDraftUpdatedLine = computed(() => {
    const relativeTime = formatRelativeTimeCz(scheduleDraftStore.lastSavedAt)

    return t('homepage.actions.restore.updatedLine', {
      relativeTime
    })
  })

  const openRecentPlanDialogDescription = computed(() => {
    return t('homepage.recent.openPlanConfirmDescription', {
      name: pendingOpenPlan.value?.name ?? ''
    })
  })

  function formatRelativeTimeCz(value: string | null): string {
    if (!value) {
      return t('homepage.actions.restore.justNow')
    }

    const timestamp = parseISO(value)
    if (!isValid(timestamp)) {
      return t('homepage.actions.restore.justNow')
    }

    const diffSeconds = Math.abs(differenceInSeconds(new Date(), timestamp))
    if (diffSeconds < 60) {
      return t('homepage.actions.restore.justNow')
    }

    return formatDistanceToNowStrict(timestamp, {
      addSuffix: true,
      locale: cs,
      roundingMethod: 'floor'
    })
  }

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

  async function openPlanById(planId: string): Promise<void> {
    if (options.isOpeningRecentPlan.value) {
      return
    }

    options.isOpeningRecentPlan.value = true
    recentPlanOpenError.value = null

    try {
      await scheduleDraftStore.loadDraftByScheduleId(planId)
      await navigateTo('/editor')
    } catch {
      recentPlanOpenError.value = t('homepage.recent.openPlanErrorDescription')
    } finally {
      options.isOpeningRecentPlan.value = false
    }
  }

  function requestOpenPlan(plan: PlanOpenCandidate): void {
    if (options.isOpeningRecentPlan.value) {
      return
    }

    recentPlanOpenError.value = null
    if (!scheduleDraftStore.hasDraft) {
      void openPlanById(plan.id)
      return
    }

    pendingOpenPlan.value = plan
    isOpenRecentPlanDialogOpen.value = true
  }

  function requestOpenRecentPlan(plan: TimeScheduleListItemDto): void {
    requestOpenPlan(plan)
  }

  function cancelOpenRecentPlan(): void {
    if (options.isOpeningRecentPlan.value) {
      return
    }

    isOpenRecentPlanDialogOpen.value = false
    pendingOpenPlan.value = null
  }

  async function confirmOpenRecentPlan(): Promise<void> {
    const selectedPlan = pendingOpenPlan.value

    if (!selectedPlan || options.isOpeningRecentPlan.value) {
      return
    }

    isOpenRecentPlanDialogOpen.value = false
    pendingOpenPlan.value = null
    await openPlanById(selectedPlan.id)
  }

  function requestRestoreDraft(): void {
    if (options.isCreatingNewPlan.value || options.isOpeningRecentPlan.value || !scheduleDraftStore.hasDraft) {
      return
    }

    void navigateTo('/editor')
  }

  return {
    recentPlans,
    isRecentPlansLoading,
    hasRecentPlansError,
    isOpenRecentPlanDialogOpen,
    recentPlanOpenError,
    showRestoreCard,
    restoreDraftLine,
    restoreDraftUpdatedLine,
    openRecentPlanDialogDescription,
    fetchRecentPlans,
    requestOpenPlan,
    requestOpenRecentPlan,
    cancelOpenRecentPlan,
    confirmOpenRecentPlan,
    requestRestoreDraft
  }
}
