import { differenceInSeconds, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns'
import { cs } from 'date-fns/locale'
import type { TimeScheduleListItemDto, TimeScheduleTypeDto } from '#shared/types/time-schedules'
import { useScheduleDraftStore } from '~/stores/schedule-draft'
import { useImportStore } from '~/stores/import'
import type { HomepagePlanListItem, PlanOpenCandidate } from '~/types/homepage'
import type { ImportPayload, ImportSzzType } from '~/types/import'

export const HOMEPAGE_NEW_PLAN_NAME_MAX_LENGTH = 120
const HOMEPAGE_BROWSE_PLANS_PAGE_SIZE = 20
const HOMEPAGE_BROWSE_SEARCH_DEBOUNCE_MS = 250 // To avoid the server burnout, I want to say hi to the BI-TWA ultimate tutors team. I still remember how they showed it :)

type BrowsePlansTabKey = 'manual' | 'auto'

export function useHomepage() {
  const { t } = useI18n()
  const importStore = useImportStore()
  const scheduleDraftStore = useScheduleDraftStore()

  const recentPlans = ref<TimeScheduleListItemDto[]>([])
  const isRecentPlansLoading = ref(false)
  const hasRecentPlansError = ref(false)

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
  const browsePlansSearchQuery = ref('')
  const isManualLoadMoreLoading = ref(false)
  const isAutoLoadMoreLoading = ref(false)

  const manualDrafts = ref<HomepagePlanListItem[]>([])
  const autoDrafts = ref<HomepagePlanListItem[]>([])
  const hasMoreManualDrafts = ref(false)
  const hasMoreAutoDrafts = ref(false)
  const manualDraftsPage = ref(0)
  const autoDraftsPage = ref(0)
  const isClientReady = ref(false)

  let manualBrowseRequestId = 0
  let autoBrowseRequestId = 0
  let browseSearchDebounceTimer: ReturnType<typeof setTimeout> | null = null

  onMounted(() => {
    isClientReady.value = true
  })

  const showRestoreCard = computed(() => {
    return isClientReady.value && scheduleDraftStore.hasDraft && !isOpeningRecentPlan.value && !isCreatingNewPlan.value
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

  function toHomepagePlanListItem(plan: TimeScheduleListItemDto): HomepagePlanListItem {
    return {
      id: plan.id,
      name: plan.name,
      updatedAt: plan.createdAt,
      committeesCount: plan.counts.committees,
      studentsCount: plan.counts.students
    }
  }

  function getTabRequestIdRef(tab: BrowsePlansTabKey): number {
    return tab === 'manual' ? manualBrowseRequestId : autoBrowseRequestId
  }

  function nextTabRequestId(tab: BrowsePlansTabKey): number {
    if (tab === 'manual') {
      manualBrowseRequestId += 1
      return manualBrowseRequestId
    }

    autoBrowseRequestId += 1
    return autoBrowseRequestId
  }

  function isTabRequestCurrent(tab: BrowsePlansTabKey, requestId: number): boolean {
    return getTabRequestIdRef(tab) === requestId
  }

  function setTabLoadMoreLoading(tab: BrowsePlansTabKey, loading: boolean): void {
    if (tab === 'manual') {
      isManualLoadMoreLoading.value = loading
      return
    }

    isAutoLoadMoreLoading.value = loading
  }

  function updateTabDraftPage(tab: BrowsePlansTabKey, page: number): void {
    if (tab === 'manual') {
      manualDraftsPage.value = page
      return
    }

    autoDraftsPage.value = page
  }

  function getTabDraftPage(tab: BrowsePlansTabKey): number {
    return tab === 'manual' ? manualDraftsPage.value : autoDraftsPage.value
  }

  function getTabHasMore(tab: BrowsePlansTabKey): boolean {
    return tab === 'manual' ? hasMoreManualDrafts.value : hasMoreAutoDrafts.value
  }

  function setTabHasMore(tab: BrowsePlansTabKey, hasMore: boolean): void {
    if (tab === 'manual') {
      hasMoreManualDrafts.value = hasMore
      return
    }

    hasMoreAutoDrafts.value = hasMore
  }

  function appendTabDrafts(tab: BrowsePlansTabKey, drafts: HomepagePlanListItem[]): void {
    if (tab === 'manual') {
      manualDrafts.value = [...manualDrafts.value, ...drafts]
      return
    }

    autoDrafts.value = [...autoDrafts.value, ...drafts]
  }

  function resolveScheduleTypeByTab(tab: BrowsePlansTabKey): TimeScheduleTypeDto {
    return tab === 'manual' ? 'MANUAL' : 'AUTO'
  }

  async function fetchDraftsByType(
    type: TimeScheduleTypeDto,
    page: number,
    searchQuery: string
  ): Promise<HomepagePlanListItem[]> {
    const requestFetch = useRequestFetch()
    const encodedSearchQuery = encodeURIComponent(searchQuery)
    const plans = await requestFetch<TimeScheduleListItemDto[]>(
      `/api/time-schedules?page=${page}&pageSize=${HOMEPAGE_BROWSE_PLANS_PAGE_SIZE}&type=${type}&search=${encodedSearchQuery}`
    )

    return plans.map((plan) => toHomepagePlanListItem(plan))
  }

  async function refreshBrowsePlans(): Promise<void> {
    isBrowsePlansLoading.value = true
    isManualLoadMoreLoading.value = false
    isAutoLoadMoreLoading.value = false
    manualDrafts.value = []
    autoDrafts.value = []
    hasMoreManualDrafts.value = false
    hasMoreAutoDrafts.value = false
    manualDraftsPage.value = 0
    autoDraftsPage.value = 0

    const manualRequestId = nextTabRequestId('manual')
    const autoRequestId = nextTabRequestId('auto')

    try {
      const [manualPlans, autoPlans] = await Promise.all([
        fetchDraftsByType('MANUAL', 1, browsePlansSearchQuery.value),
        fetchDraftsByType('AUTO', 1, browsePlansSearchQuery.value)
      ])

      if (!isTabRequestCurrent('manual', manualRequestId) || !isTabRequestCurrent('auto', autoRequestId)) {
        return
      }

      manualDrafts.value = manualPlans
      autoDrafts.value = autoPlans
      manualDraftsPage.value = 1
      autoDraftsPage.value = 1
      hasMoreManualDrafts.value = manualPlans.length === HOMEPAGE_BROWSE_PLANS_PAGE_SIZE
      hasMoreAutoDrafts.value = autoPlans.length === HOMEPAGE_BROWSE_PLANS_PAGE_SIZE
    } catch {
      if (!isTabRequestCurrent('manual', manualRequestId) || !isTabRequestCurrent('auto', autoRequestId)) {
        return
      }

      manualDrafts.value = []
      autoDrafts.value = []
      hasMoreManualDrafts.value = false
      hasMoreAutoDrafts.value = false
      manualDraftsPage.value = 0
      autoDraftsPage.value = 0
    } finally {
      if (isTabRequestCurrent('manual', manualRequestId) && isTabRequestCurrent('auto', autoRequestId)) {
        isBrowsePlansLoading.value = false
      }
    }
  }

  async function loadMoreBrowsePlans(tab: BrowsePlansTabKey): Promise<void> {
    if (isBrowsePlansLoading.value || !getTabHasMore(tab)) {
      return
    }

    if ((tab === 'manual' && isManualLoadMoreLoading.value) || (tab === 'auto' && isAutoLoadMoreLoading.value)) {
      return
    }

    const nextPage = getTabDraftPage(tab) + 1
    const requestId = nextTabRequestId(tab)
    setTabLoadMoreLoading(tab, true)

    try {
      const plans = await fetchDraftsByType(resolveScheduleTypeByTab(tab), nextPage, browsePlansSearchQuery.value)
      if (!isTabRequestCurrent(tab, requestId)) {
        return
      }

      appendTabDrafts(tab, plans)
      updateTabDraftPage(tab, nextPage)
      setTabHasMore(tab, plans.length === HOMEPAGE_BROWSE_PLANS_PAGE_SIZE)
    } catch {
      if (!isTabRequestCurrent(tab, requestId)) {
        return
      }
    } finally {
      if (isTabRequestCurrent(tab, requestId)) {
        setTabLoadMoreLoading(tab, false)
      }
    }
  }

  function requestBrowsePlans(): void {
    if (browseSearchDebounceTimer) {
      clearTimeout(browseSearchDebounceTimer)
      browseSearchDebounceTimer = null
    }

    isBrowsePlansDialogOpen.value = true
    void refreshBrowsePlans()
  }

  function requestBrowsePlansSearch(nextSearchQuery: string): void {
    browsePlansSearchQuery.value = nextSearchQuery
    if (!isBrowsePlansDialogOpen.value) {
      return
    }

    if (browseSearchDebounceTimer) {
      clearTimeout(browseSearchDebounceTimer)
    }

    browseSearchDebounceTimer = setTimeout(() => {
      browseSearchDebounceTimer = null
      void refreshBrowsePlans()
    }, HOMEPAGE_BROWSE_SEARCH_DEBOUNCE_MS)
  }

  function loadMoreManualDrafts(): void {
    void loadMoreBrowsePlans('manual')
  }

  function loadMoreAutoDrafts(): void {
    void loadMoreBrowsePlans('auto')
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

  function submitCreatePlanImport(options: { payload: ImportPayload; szzType: ImportSzzType }): void {
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
      importStore.setImportedPlanDraft(newPlanNameInput.value.trim(), options.szzType, options.payload)
      isCreatePlanNameDialogOpen.value = false
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

  function requestOpenBrowsePlan(plan: HomepagePlanListItem): void {
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
    recentPlans,
    isRecentPlansLoading,
    hasRecentPlansError,
    fetchRecentPlans,
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
    browsePlansSearchQuery,
    isManualLoadMoreLoading,
    isAutoLoadMoreLoading,
    hasMoreManualDrafts,
    hasMoreAutoDrafts,
    newPlanNameInput,
    newPlanNameError,
    requestCreatePlan,
    requestBrowsePlans,
    requestBrowsePlansSearch,
    loadMoreManualDrafts,
    loadMoreAutoDrafts,
    requestRestoreDraft,
    cancelCreatePlanConfirm,
    confirmCreatePlanConfirm,
    cancelCreatePlanNameDialog,
    submitCreatePlanName,
    submitCreatePlanImport
  }
}
