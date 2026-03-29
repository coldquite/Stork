import type { TimeScheduleListItemDto, TimeScheduleTypeDto } from '#shared/types/time-schedules'
import type { HomepagePlanListItem } from '~/types/homepage'

const HOMEPAGE_BROWSE_PLANS_PAGE_SIZE = 20
const HOMEPAGE_BROWSE_SEARCH_DEBOUNCE_MS = 250 // To avoid the server burnout, I want to say hi to the BI-TWA ultimate tutors team. I still remember how they showed it :)

type BrowsePlansTabKey = 'manual' | 'auto'

export function useHomepageBrowsePlans() {
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

  let manualBrowseRequestId = 0
  let autoBrowseRequestId = 0
  let browseSearchDebounceTimer: ReturnType<typeof setTimeout> | null = null

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

  return {
    isBrowsePlansDialogOpen,
    isBrowsePlansLoading,
    browsePlansSearchQuery,
    isManualLoadMoreLoading,
    isAutoLoadMoreLoading,
    manualDrafts,
    autoDrafts,
    hasMoreManualDrafts,
    hasMoreAutoDrafts,
    requestBrowsePlans,
    requestBrowsePlansSearch,
    loadMoreManualDrafts,
    loadMoreAutoDrafts
  }
}
