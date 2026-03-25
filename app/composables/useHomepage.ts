import { differenceInSeconds, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns'
import { cs } from 'date-fns/locale'
import { computed, ref, watch } from 'vue'
import type { TimeScheduleListItemDto, TimeScheduleTypeDto } from '#shared/types/time-schedules'
import { useScheduleDraftStore } from '~/stores/schedule-draft'
import { useHomepageStore } from '~/stores/homepage'

interface HomepageDraftListItem {
  id: string
  name: string
  updatedAt: string
  committeesCount: number
  studentsCount: number
}

interface PlanOpenCandidate {
  id: string
  name: string
}

export const HOMEPAGE_NEW_PLAN_NAME_MAX_LENGTH = 120
const HOMEPAGE_BROWSE_PLANS_PAGE_SIZE = 20

export function useHomepage() {
  const { t } = useI18n()
  const homepageStore = useHomepageStore()
  const scheduleDraftStore = useScheduleDraftStore()

  const isOpenRecentPlanDialogOpen = ref(false)
  const isOpeningRecentPlan = ref(false)
  const pendingOpenPlan = ref<PlanOpenCandidate | null>(null)
  const recentPlanOpenError = ref<string | null>(null)

  const isCreatePlanConfirmDialogOpen = ref(false)
  const isCreatePlanNameDialogOpen = ref(false)
  const isCreatingNewPlan = ref(false)
  const newPlanNameInput = ref('')
  const newPlanNameError = ref<string | null>(null)

  const isBrowsePlansDialogOpen = ref(false)
  const isBrowsePlansLoading = ref(false)
  let browsePlansRequestId = 0

  const manualDrafts = ref<HomepageDraftListItem[]>([])
  const autoDrafts = ref<HomepageDraftListItem[]>([])

  const showRestoreCard = computed(() => {
    return scheduleDraftStore.hasDraft && !isOpeningRecentPlan.value && !isCreatingNewPlan.value
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

  function validateNewPlanName(name: string): string | null {
    const trimmedName = name.trim()

    if (trimmedName.length < 1) {
      return t('homepage.actions.create.validation.required')
    }

    if (name !== trimmedName) {
      return t('homepage.actions.create.validation.leadingTrailingWhitespace')
    }

    if (trimmedName.length > HOMEPAGE_NEW_PLAN_NAME_MAX_LENGTH) {
      return t('homepage.actions.create.validation.maxLength', { max: HOMEPAGE_NEW_PLAN_NAME_MAX_LENGTH })
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

  async function fetchDraftsByType(type: TimeScheduleTypeDto): Promise<HomepageDraftListItem[]> {
    const requestFetch = useRequestFetch()
    const plans = await requestFetch<TimeScheduleListItemDto[]>(
      `/api/time-schedules?page=1&pageSize=${HOMEPAGE_BROWSE_PLANS_PAGE_SIZE}&type=${type}`
    )

    return plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      updatedAt: plan.createdAt,
      committeesCount: plan.counts.committees,
      studentsCount: plan.counts.students
    }))
  }

  async function refreshBrowsePlans(): Promise<void> {
    const requestId = ++browsePlansRequestId
    isBrowsePlansLoading.value = true
    manualDrafts.value = []
    autoDrafts.value = []

    try {
      const [manualPlans, autoPlans] = await Promise.all([fetchDraftsByType('MANUAL'), fetchDraftsByType('AUTO')])

      if (requestId !== browsePlansRequestId) {
        return
      }

      manualDrafts.value = manualPlans
      autoDrafts.value = autoPlans
    } catch {
      if (requestId !== browsePlansRequestId) {
        return
      }

      manualDrafts.value = []
      autoDrafts.value = []
    } finally {
      if (requestId === browsePlansRequestId) {
        isBrowsePlansLoading.value = false
      }
    }
  }

  function requestBrowsePlans(): void {
    isBrowsePlansDialogOpen.value = true
    void refreshBrowsePlans()
  }

  function requestRestoreDraft(): void {
    if (isCreatingNewPlan.value || isOpeningRecentPlan.value || !scheduleDraftStore.hasDraft) {
      return
    }

    void navigateTo('/editor')
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

  async function openPlanById(planId: string): Promise<void> {
    if (isOpeningRecentPlan.value) {
      return
    }

    isOpeningRecentPlan.value = true
    recentPlanOpenError.value = null

    try {
      await scheduleDraftStore.loadDraftByScheduleId(planId)
      await navigateTo('/editor')
    } catch {
      recentPlanOpenError.value = t('homepage.recent.openPlanErrorDescription')
    } finally {
      isOpeningRecentPlan.value = false
    }
  }

  function requestOpenPlan(plan: PlanOpenCandidate, closeBrowseModal = false): void {
    if (isOpeningRecentPlan.value) {
      return
    }

    recentPlanOpenError.value = null
    if (closeBrowseModal) {
      isBrowsePlansDialogOpen.value = false
    }

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

  function requestOpenBrowsePlan(plan: HomepageDraftListItem): void {
    requestOpenPlan(plan, true)
  }

  function cancelOpenRecentPlan(): void {
    if (isOpeningRecentPlan.value) {
      return
    }

    isOpenRecentPlanDialogOpen.value = false
    pendingOpenPlan.value = null
  }

  async function confirmOpenRecentPlan(): Promise<void> {
    const selectedPlan = pendingOpenPlan.value

    if (!selectedPlan || isOpeningRecentPlan.value) {
      return
    }

    isOpenRecentPlanDialogOpen.value = false
    pendingOpenPlan.value = null
    await openPlanById(selectedPlan.id)
  }

  return {
    homepageStore,
    manualDrafts,
    autoDrafts,
    restoreDraftLine,
    restoreDraftUpdatedLine,
    showRestoreCard,
    isOpenRecentPlanDialogOpen,
    isOpeningRecentPlan,
    recentPlanOpenError,
    openRecentPlanDialogDescription,
    requestOpenRecentPlan,
    requestOpenBrowsePlan,
    cancelOpenRecentPlan,
    confirmOpenRecentPlan,
    isCreatePlanConfirmDialogOpen,
    isCreatePlanNameDialogOpen,
    isCreatingNewPlan,
    isBrowsePlansDialogOpen,
    isBrowsePlansLoading,
    newPlanNameInput,
    newPlanNameError,
    requestCreatePlan,
    requestBrowsePlans,
    requestRestoreDraft,
    cancelCreatePlanConfirm,
    confirmCreatePlanConfirm,
    cancelCreatePlanNameDialog,
    submitCreatePlanName
  }
}
