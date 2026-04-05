import { differenceInSeconds, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns'
import { cs } from 'date-fns/locale'
import type { Ref } from 'vue'
import type { TimeScheduleListItemDto } from '#shared/types/time-schedules'
import { useScheduleDraftStore } from '~/stores/schedule-draft'
import type { ScheduleOpenCandidate } from '~/types/homepage'
import { buildTimeSchedulesListUrl } from '~/utils/time-schedules-list-url'

interface UseHomepageScheduleOpeningOptions {
  isCreatingNewSchedule: Readonly<Ref<boolean>>
  isOpeningRecentSchedule: Ref<boolean>
}

export function useHomepageScheduleOpening(options: UseHomepageScheduleOpeningOptions) {
  const { t } = useI18n()
  const scheduleDraftStore = useScheduleDraftStore()

  const recentSchedules = ref<TimeScheduleListItemDto[]>([])
  const isRecentSchedulesLoading = ref(false)
  const hasRecentSchedulesError = ref(false)

  const isOpenRecentScheduleDialogOpen = ref(false)
  const pendingOpenSchedule = ref<ScheduleOpenCandidate | null>(null)
  const recentScheduleOpenError = ref<string | null>(null)

  const showRestoreCard = computed(() => {
    return (
      import.meta.client &&
      scheduleDraftStore.hasDraft &&
      !options.isOpeningRecentSchedule.value &&
      !options.isCreatingNewSchedule.value
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

  const openRecentScheduleDialogDescription = computed(() => {
    return t('homepage.recent.openScheduleConfirmDescription', {
      name: pendingOpenSchedule.value?.name ?? ''
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

  async function fetchRecentSchedules(limit = 7): Promise<void> {
    if (isRecentSchedulesLoading.value) {
      return
    }

    isRecentSchedulesLoading.value = true
    hasRecentSchedulesError.value = false

    try {
      const requestFetch = useRequestFetch()
      recentSchedules.value = await requestFetch<TimeScheduleListItemDto[]>(
        buildTimeSchedulesListUrl({ page: 1, pageSize: limit })
      )
    } catch {
      hasRecentSchedulesError.value = true
      recentSchedules.value = []
    } finally {
      isRecentSchedulesLoading.value = false
    }
  }

  async function openScheduleById(scheduleId: string): Promise<void> {
    if (options.isOpeningRecentSchedule.value) {
      return
    }

    options.isOpeningRecentSchedule.value = true
    recentScheduleOpenError.value = null

    try {
      await scheduleDraftStore.loadDraftByScheduleId(scheduleId)
      await navigateTo('/editor')
    } catch {
      recentScheduleOpenError.value = t('homepage.recent.openScheduleErrorDescription')
    } finally {
      options.isOpeningRecentSchedule.value = false
    }
  }

  function requestOpenSchedule(schedule: ScheduleOpenCandidate): void {
    if (options.isOpeningRecentSchedule.value) {
      return
    }

    recentScheduleOpenError.value = null
    if (!scheduleDraftStore.hasDraft) {
      void openScheduleById(schedule.id)
      return
    }

    pendingOpenSchedule.value = schedule
    isOpenRecentScheduleDialogOpen.value = true
  }

  function requestOpenRecentSchedule(schedule: TimeScheduleListItemDto): void {
    requestOpenSchedule(schedule)
  }

  function cancelOpenRecentSchedule(): void {
    if (options.isOpeningRecentSchedule.value) {
      return
    }

    isOpenRecentScheduleDialogOpen.value = false
    pendingOpenSchedule.value = null
  }

  async function confirmOpenRecentSchedule(): Promise<void> {
    const selectedSchedule = pendingOpenSchedule.value

    if (!selectedSchedule || options.isOpeningRecentSchedule.value) {
      return
    }

    isOpenRecentScheduleDialogOpen.value = false
    pendingOpenSchedule.value = null
    await openScheduleById(selectedSchedule.id)
  }

  function requestRestoreDraft(): void {
    if (options.isCreatingNewSchedule.value || options.isOpeningRecentSchedule.value || !scheduleDraftStore.hasDraft) {
      return
    }

    void navigateTo('/editor')
  }

  return {
    recentSchedules,
    isRecentSchedulesLoading,
    hasRecentSchedulesError,
    isOpenRecentScheduleDialogOpen,
    recentScheduleOpenError,
    showRestoreCard,
    restoreDraftLine,
    restoreDraftUpdatedLine,
    openRecentScheduleDialogDescription,
    fetchRecentSchedules,
    requestOpenSchedule,
    requestOpenRecentSchedule,
    cancelOpenRecentSchedule,
    confirmOpenRecentSchedule,
    requestRestoreDraft
  }
}
