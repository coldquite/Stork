import { differenceInSeconds, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns'
import { cs } from 'date-fns/locale'
import { computed, ref, watch } from 'vue'
import type { TimeScheduleListItemDto } from '#shared/types/time-schedules'
import { useScheduleDraftStore } from '~/stores/schedule-draft'
import { useStartStore } from '~/stores/start'

export const START_NEW_PLAN_NAME_MAX_LENGTH = 120

export function useStartPage() {
  const { t } = useI18n()
  const startStore = useStartStore()
  const scheduleDraftStore = useScheduleDraftStore()

  const isOpenRecentPlanDialogOpen = ref(false)
  const isOpeningRecentPlan = ref(false)
  const pendingRecentPlan = ref<TimeScheduleListItemDto | null>(null)
  const recentPlanOpenError = ref<string | null>(null)

  const isCreatePlanConfirmDialogOpen = ref(false)
  const isCreatePlanNameDialogOpen = ref(false)
  const isCreatingNewPlan = ref(false)
  const newPlanNameInput = ref('')
  const newPlanNameError = ref<string | null>(null)

  const showRestoreCard = computed(() => {
    return scheduleDraftStore.hasDraft && !isOpeningRecentPlan.value && !isCreatingNewPlan.value
  })

  const restoreDraftStatus = computed(() => {
    const draftName = scheduleDraftStore.draft?.name ?? ''
    const relativeTime = formatRelativeTimeCz(scheduleDraftStore.lastSavedAt)

    return t('start.actions.restore.status', {
      name: draftName,
      relativeTime
    })
  })

  const openRecentPlanDialogDescription = computed(() => {
    return t('start.recent.openPlanConfirmDescription', {
      name: pendingRecentPlan.value?.name ?? ''
    })
  })

  watch(newPlanNameInput, () => {
    if (newPlanNameError.value) {
      newPlanNameError.value = null
    }
  })

  watch(isCreatePlanNameDialogOpen, (isOpen) => {
    if (!isOpen && !isCreatingNewPlan.value) {
      newPlanNameInput.value = ''
      newPlanNameError.value = null
    }
  })

  function formatRelativeTimeCz(value: string | null): string {
    if (!value) {
      return t('start.actions.restore.justNow')
    }

    const timestamp = parseISO(value)
    if (!isValid(timestamp)) {
      return t('start.actions.restore.justNow')
    }

    const diffSeconds = Math.abs(differenceInSeconds(new Date(), timestamp))
    if (diffSeconds < 60) {
      return t('start.actions.restore.justNow')
    }

    return formatDistanceToNowStrict(timestamp, {
      addSuffix: true,
      locale: cs,
      roundingMethod: 'floor'
    })
  }

  function validateNewPlanName(name: string): string | null {
    const trimmedName = name.trim()

    if (trimmedName.length < 1) {
      return t('start.actions.create.validation.required')
    }

    if (name !== trimmedName) {
      return t('start.actions.create.validation.leadingTrailingWhitespace')
    }

    if (trimmedName.length > START_NEW_PLAN_NAME_MAX_LENGTH) {
      return t('start.actions.create.validation.maxLength', { max: START_NEW_PLAN_NAME_MAX_LENGTH })
    }

    return null
  }

  function openCreatePlanNameDialog(): void {
    isCreatePlanNameDialogOpen.value = true
  }

  function requestCreatePlan(): void {
    if (isCreatingNewPlan.value || isOpeningRecentPlan.value) {
      return
    }

    if (scheduleDraftStore.hasDraft) {
      isCreatePlanConfirmDialogOpen.value = true
      return
    }

    openCreatePlanNameDialog()
  }

  function cancelCreatePlanConfirm(): void {
    if (isCreatingNewPlan.value) {
      return
    }

    isCreatePlanConfirmDialogOpen.value = false
  }

  function confirmCreatePlanConfirm(): void {
    if (isCreatingNewPlan.value) {
      return
    }

    isCreatePlanConfirmDialogOpen.value = false
    openCreatePlanNameDialog()
  }

  function cancelCreatePlanNameDialog(): void {
    if (isCreatingNewPlan.value) {
      return
    }

    isCreatePlanNameDialogOpen.value = false
  }

  async function submitCreatePlanName(): Promise<void> {
    if (isCreatingNewPlan.value || isOpeningRecentPlan.value) {
      return
    }

    const validationError = validateNewPlanName(newPlanNameInput.value)
    if (validationError) {
      newPlanNameError.value = validationError
      return
    }

    isCreatingNewPlan.value = true

    try {
      scheduleDraftStore.initializeNewDraft({ name: newPlanNameInput.value.trim() })
      isCreatePlanNameDialogOpen.value = false
      await navigateTo('/editor')
    } finally {
      isCreatingNewPlan.value = false
    }
  }

  async function openRecentPlan(planId: string): Promise<void> {
    if (isOpeningRecentPlan.value) {
      return
    }

    isOpeningRecentPlan.value = true
    recentPlanOpenError.value = null

    try {
      await scheduleDraftStore.loadDraftByScheduleId(planId)
      await navigateTo('/editor')
    } catch {
      recentPlanOpenError.value = t('start.recent.openPlanErrorDescription')
    } finally {
      isOpeningRecentPlan.value = false
    }
  }

  function requestOpenRecentPlan(plan: TimeScheduleListItemDto): void {
    if (isOpeningRecentPlan.value) {
      return
    }

    recentPlanOpenError.value = null

    if (!scheduleDraftStore.hasDraft) {
      void openRecentPlan(plan.id)
      return
    }

    pendingRecentPlan.value = plan
    isOpenRecentPlanDialogOpen.value = true
  }

  function cancelOpenRecentPlan(): void {
    if (isOpeningRecentPlan.value) {
      return
    }

    isOpenRecentPlanDialogOpen.value = false
    pendingRecentPlan.value = null
  }

  async function confirmOpenRecentPlan(): Promise<void> {
    const selectedPlan = pendingRecentPlan.value

    if (!selectedPlan || isOpeningRecentPlan.value) {
      return
    }

    isOpenRecentPlanDialogOpen.value = false
    pendingRecentPlan.value = null
    await openRecentPlan(selectedPlan.id)
  }

  return {
    startStore,
    restoreDraftStatus,
    showRestoreCard,
    isOpenRecentPlanDialogOpen,
    isOpeningRecentPlan,
    recentPlanOpenError,
    openRecentPlanDialogDescription,
    requestOpenRecentPlan,
    cancelOpenRecentPlan,
    confirmOpenRecentPlan,
    isCreatePlanConfirmDialogOpen,
    isCreatePlanNameDialogOpen,
    isCreatingNewPlan,
    newPlanNameInput,
    newPlanNameError,
    requestCreatePlan,
    cancelCreatePlanConfirm,
    confirmCreatePlanConfirm,
    cancelCreatePlanNameDialog,
    submitCreatePlanName
  }
}
