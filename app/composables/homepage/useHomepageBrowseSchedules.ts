import type { TimeScheduleListItemDto, TimeScheduleTypeDto } from '#shared/types/time-schedules'
import type { HomepageScheduleListItem } from '~/types/homepage'
import { HOMEPAGE_BROWSE_SCHEDULES_PAGE_SIZE, HOMEPAGE_BROWSE_SEARCH_DEBOUNCE_MS } from '~/constants/homepage'
import { extractHttpErrorMessage } from '~/utils/http-error'

type BrowseSchedulesTabKey = 'manual' | 'auto'

export function useHomepageBrowseSchedules() {
  const { t } = useI18n()

  const isBrowseSchedulesDialogOpen = ref(false)
  const isBrowseSchedulesLoading = ref(false)
  const browseSchedulesSearchQuery = ref('')
  const isManualLoadMoreLoading = ref(false)
  const isAutoLoadMoreLoading = ref(false)
  const isDeletingManualSchedule = ref(false)
  const manualScheduleDeleteError = ref<string | null>(null)

  const manualSchedules = ref<HomepageScheduleListItem[]>([])
  const autoSchedules = ref<HomepageScheduleListItem[]>([])
  const hasMoreManualSchedules = ref(false)
  const hasMoreAutoSchedules = ref(false)
  const manualSchedulesPage = ref(0)
  const autoSchedulesPage = ref(0)

  let manualBrowseRequestId = 0
  let autoBrowseRequestId = 0
  let browseSearchDebounceTimer: ReturnType<typeof setTimeout> | null = null

  function toHomepageScheduleListItem(schedule: TimeScheduleListItemDto): HomepageScheduleListItem {
    return {
      id: schedule.id,
      name: schedule.name,
      updatedAt: schedule.createdAt,
      committeesCount: schedule.counts.committees,
      studentsCount: schedule.counts.students
    }
  }

  function getTabRequestIdRef(tab: BrowseSchedulesTabKey): number {
    return tab === 'manual' ? manualBrowseRequestId : autoBrowseRequestId
  }

  function nextTabRequestId(tab: BrowseSchedulesTabKey): number {
    if (tab === 'manual') {
      manualBrowseRequestId += 1
      return manualBrowseRequestId
    }

    autoBrowseRequestId += 1
    return autoBrowseRequestId
  }

  function isTabRequestCurrent(tab: BrowseSchedulesTabKey, requestId: number): boolean {
    return getTabRequestIdRef(tab) === requestId
  }

  function setTabLoadMoreLoading(tab: BrowseSchedulesTabKey, loading: boolean): void {
    if (tab === 'manual') {
      isManualLoadMoreLoading.value = loading
      return
    }

    isAutoLoadMoreLoading.value = loading
  }

  function updateTabSchedulePage(tab: BrowseSchedulesTabKey, page: number): void {
    if (tab === 'manual') {
      manualSchedulesPage.value = page
      return
    }

    autoSchedulesPage.value = page
  }

  function getTabSchedulePage(tab: BrowseSchedulesTabKey): number {
    return tab === 'manual' ? manualSchedulesPage.value : autoSchedulesPage.value
  }

  function getTabHasMore(tab: BrowseSchedulesTabKey): boolean {
    return tab === 'manual' ? hasMoreManualSchedules.value : hasMoreAutoSchedules.value
  }

  function setTabHasMore(tab: BrowseSchedulesTabKey, hasMore: boolean): void {
    if (tab === 'manual') {
      hasMoreManualSchedules.value = hasMore
      return
    }

    hasMoreAutoSchedules.value = hasMore
  }

  function appendTabSchedules(tab: BrowseSchedulesTabKey, schedules: HomepageScheduleListItem[]): void {
    if (tab === 'manual') {
      manualSchedules.value = [...manualSchedules.value, ...schedules]
      return
    }

    autoSchedules.value = [...autoSchedules.value, ...schedules]
  }

  function resolveScheduleTypeByTab(tab: BrowseSchedulesTabKey): TimeScheduleTypeDto {
    return tab === 'manual' ? 'MANUAL' : 'AUTO'
  }

  async function fetchSchedulesByType(
    type: TimeScheduleTypeDto,
    page: number,
    searchQuery: string
  ): Promise<HomepageScheduleListItem[]> {
    const requestFetch = useRequestFetch()
    const encodedSearchQuery = encodeURIComponent(searchQuery)
    const schedules = await requestFetch<TimeScheduleListItemDto[]>(
      `/api/time-schedules?page=${page}&pageSize=${HOMEPAGE_BROWSE_SCHEDULES_PAGE_SIZE}&type=${type}&search=${encodedSearchQuery}`
    )

    return schedules.map((schedule) => toHomepageScheduleListItem(schedule))
  }

  async function refreshBrowseSchedules(): Promise<void> {
    isBrowseSchedulesLoading.value = true
    isManualLoadMoreLoading.value = false
    isAutoLoadMoreLoading.value = false
    manualSchedules.value = []
    autoSchedules.value = []
    hasMoreManualSchedules.value = false
    hasMoreAutoSchedules.value = false
    manualSchedulesPage.value = 0
    autoSchedulesPage.value = 0

    const manualRequestId = nextTabRequestId('manual')
    const autoRequestId = nextTabRequestId('auto')

    try {
      const [manualSchedulesPageData, autoSchedulesPageData] = await Promise.all([
        fetchSchedulesByType('MANUAL', 1, browseSchedulesSearchQuery.value),
        fetchSchedulesByType('AUTO', 1, browseSchedulesSearchQuery.value)
      ])

      if (!isTabRequestCurrent('manual', manualRequestId) || !isTabRequestCurrent('auto', autoRequestId)) {
        return
      }

      manualSchedules.value = manualSchedulesPageData
      autoSchedules.value = autoSchedulesPageData
      manualSchedulesPage.value = 1
      autoSchedulesPage.value = 1
      hasMoreManualSchedules.value = manualSchedulesPageData.length === HOMEPAGE_BROWSE_SCHEDULES_PAGE_SIZE
      hasMoreAutoSchedules.value = autoSchedulesPageData.length === HOMEPAGE_BROWSE_SCHEDULES_PAGE_SIZE
    } catch {
      if (!isTabRequestCurrent('manual', manualRequestId) || !isTabRequestCurrent('auto', autoRequestId)) {
        return
      }

      manualSchedules.value = []
      autoSchedules.value = []
      hasMoreManualSchedules.value = false
      hasMoreAutoSchedules.value = false
      manualSchedulesPage.value = 0
      autoSchedulesPage.value = 0
    } finally {
      if (isTabRequestCurrent('manual', manualRequestId) && isTabRequestCurrent('auto', autoRequestId)) {
        isBrowseSchedulesLoading.value = false
      }
    }
  }

  async function loadMoreBrowseSchedules(tab: BrowseSchedulesTabKey): Promise<void> {
    if (isBrowseSchedulesLoading.value || !getTabHasMore(tab)) {
      return
    }

    if ((tab === 'manual' && isManualLoadMoreLoading.value) || (tab === 'auto' && isAutoLoadMoreLoading.value)) {
      return
    }

    const nextPage = getTabSchedulePage(tab) + 1
    const requestId = nextTabRequestId(tab)
    setTabLoadMoreLoading(tab, true)

    try {
      const schedules = await fetchSchedulesByType(
        resolveScheduleTypeByTab(tab),
        nextPage,
        browseSchedulesSearchQuery.value
      )
      if (!isTabRequestCurrent(tab, requestId)) {
        return
      }

      appendTabSchedules(tab, schedules)
      updateTabSchedulePage(tab, nextPage)
      setTabHasMore(tab, schedules.length === HOMEPAGE_BROWSE_SCHEDULES_PAGE_SIZE)
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

  function requestBrowseSchedules(): void {
    if (browseSearchDebounceTimer) {
      clearTimeout(browseSearchDebounceTimer)
      browseSearchDebounceTimer = null
    }

    isBrowseSchedulesDialogOpen.value = true
    manualScheduleDeleteError.value = null
    void refreshBrowseSchedules()
  }

  function requestBrowseSchedulesSearch(nextSearchQuery: string): void {
    browseSchedulesSearchQuery.value = nextSearchQuery
    manualScheduleDeleteError.value = null
    if (!isBrowseSchedulesDialogOpen.value) {
      return
    }

    if (browseSearchDebounceTimer) {
      clearTimeout(browseSearchDebounceTimer)
    }

    browseSearchDebounceTimer = setTimeout(() => {
      browseSearchDebounceTimer = null
      void refreshBrowseSchedules()
    }, HOMEPAGE_BROWSE_SEARCH_DEBOUNCE_MS)
  }

  function loadMoreManualSchedules(): void {
    void loadMoreBrowseSchedules('manual')
  }

  function loadMoreAutoSchedules(): void {
    void loadMoreBrowseSchedules('auto')
  }

  async function deleteManualSchedule(schedule: HomepageScheduleListItem): Promise<void> {
    if (isDeletingManualSchedule.value) {
      return
    }

    isDeletingManualSchedule.value = true
    manualScheduleDeleteError.value = null

    try {
      const requestFetch = useRequestFetch()
      await requestFetch(`/api/time-schedules/${encodeURIComponent(schedule.id)}`, {
        method: 'DELETE'
      })
      manualSchedules.value = manualSchedules.value.filter((entry) => entry.id !== schedule.id)
    } catch (error: unknown) {
      manualScheduleDeleteError.value =
        extractHttpErrorMessage(error) ?? t('homepage.schedulesModal.delete.errorRequestFailedDescription')
    } finally {
      isDeletingManualSchedule.value = false
    }
  }

  return {
    isBrowseSchedulesDialogOpen,
    isBrowseSchedulesLoading,
    browseSchedulesSearchQuery,
    isManualLoadMoreLoading,
    isAutoLoadMoreLoading,
    isDeletingManualSchedule,
    manualScheduleDeleteError,
    manualSchedules,
    autoSchedules,
    hasMoreManualSchedules,
    hasMoreAutoSchedules,
    requestBrowseSchedules,
    requestBrowseSchedulesSearch,
    loadMoreManualSchedules,
    loadMoreAutoSchedules,
    deleteManualSchedule
  }
}
