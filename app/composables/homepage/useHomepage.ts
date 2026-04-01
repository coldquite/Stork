import type { HomepageScheduleListItem } from '~/types/homepage'
import { NEW_SCHEDULE_NAME_MAX_LENGTH } from '~/constants/schedule'
import { useHomepageCreateAndImport } from '~/composables/schedule-creation/useHomepageCreateAndImport'
import { useHomepageBrowseSchedules } from '~/composables/homepage/useHomepageBrowseSchedules'
import { useHomepageScheduleOpening } from '~/composables/homepage/useHomepageScheduleOpening'

export function useHomepage() {
  const isCreatingNewSchedule = ref(false)
  const isOpeningRecentSchedule = ref(false)

  const browseSchedules = useHomepageBrowseSchedules()
  const createAndImport = useHomepageCreateAndImport({
    isCreatingNewSchedule,
    isOpeningRecentSchedule,
    scheduleNameMaxLength: NEW_SCHEDULE_NAME_MAX_LENGTH
  })
  const scheduleOpening = useHomepageScheduleOpening({
    isCreatingNewSchedule,
    isOpeningRecentSchedule
  })

  function requestOpenBrowseSchedule(schedule: HomepageScheduleListItem): void {
    browseSchedules.isBrowseSchedulesDialogOpen.value = false
    scheduleOpening.requestOpenSchedule(schedule)
  }

  return {
    recentSchedules: scheduleOpening.recentSchedules,
    isRecentSchedulesLoading: scheduleOpening.isRecentSchedulesLoading,
    hasRecentSchedulesError: scheduleOpening.hasRecentSchedulesError,
    fetchRecentSchedules: scheduleOpening.fetchRecentSchedules,
    manualSchedules: browseSchedules.manualSchedules,
    autoSchedules: browseSchedules.autoSchedules,
    restoreDraftLine: scheduleOpening.restoreDraftLine,
    restoreDraftUpdatedLine: scheduleOpening.restoreDraftUpdatedLine,
    showRestoreCard: scheduleOpening.showRestoreCard,
    isOpenRecentScheduleDialogOpen: scheduleOpening.isOpenRecentScheduleDialogOpen,
    isOpeningRecentSchedule,
    recentScheduleOpenError: scheduleOpening.recentScheduleOpenError,
    openRecentScheduleDialogDescription: scheduleOpening.openRecentScheduleDialogDescription,
    requestOpenRecentSchedule: scheduleOpening.requestOpenRecentSchedule,
    requestOpenBrowseSchedule,
    cancelOpenRecentSchedule: scheduleOpening.cancelOpenRecentSchedule,
    confirmOpenRecentSchedule: scheduleOpening.confirmOpenRecentSchedule,
    isCreateScheduleConfirmDialogOpen: createAndImport.isCreateScheduleConfirmDialogOpen,
    isCreateScheduleDialogOpen: createAndImport.isCreateScheduleDialogOpen,
    isCreatingNewSchedule,
    isImportMappingErrorDialogOpen: createAndImport.isImportMappingErrorDialogOpen,
    importMappingError: createAndImport.importMappingError,
    isTeachersDictionaryResolutionDialogOpen: createAndImport.isTeachersDictionaryResolutionDialogOpen,
    teachersDictionaryResolutionEntries: createAndImport.teachersDictionaryResolutionEntries,
    teachersDictionaryResolutionError: createAndImport.teachersDictionaryResolutionError,
    teachersDictionaryResolutionFieldErrors: createAndImport.teachersDictionaryResolutionFieldErrors,
    isTeachersDictionaryResolutionSubmitDisabled: createAndImport.isTeachersDictionaryResolutionSubmitDisabled,
    isBrowseSchedulesDialogOpen: browseSchedules.isBrowseSchedulesDialogOpen,
    isBrowseSchedulesLoading: browseSchedules.isBrowseSchedulesLoading,
    browseSchedulesSearchQuery: browseSchedules.browseSchedulesSearchQuery,
    isManualLoadMoreLoading: browseSchedules.isManualLoadMoreLoading,
    isAutoLoadMoreLoading: browseSchedules.isAutoLoadMoreLoading,
    hasMoreManualSchedules: browseSchedules.hasMoreManualSchedules,
    hasMoreAutoSchedules: browseSchedules.hasMoreAutoSchedules,
    newScheduleNameInput: createAndImport.newScheduleNameInput,
    newScheduleNameError: createAndImport.newScheduleNameError,
    requestCreateSchedule: createAndImport.requestCreateSchedule,
    requestBrowseSchedules: browseSchedules.requestBrowseSchedules,
    requestBrowseSchedulesSearch: browseSchedules.requestBrowseSchedulesSearch,
    loadMoreManualSchedules: browseSchedules.loadMoreManualSchedules,
    loadMoreAutoSchedules: browseSchedules.loadMoreAutoSchedules,
    requestRestoreDraft: scheduleOpening.requestRestoreDraft,
    cancelCreateScheduleConfirm: createAndImport.cancelCreateScheduleConfirm,
    confirmCreateScheduleConfirm: createAndImport.confirmCreateScheduleConfirm,
    cancelCreateScheduleDialog: createAndImport.cancelCreateScheduleDialog,
    submitCreateSchedule: createAndImport.submitCreateSchedule,
    submitCreateScheduleImport: createAndImport.submitCreateScheduleImport,
    cancelTeachersDictionaryResolution: createAndImport.cancelTeachersDictionaryResolution,
    submitTeachersDictionaryResolution: createAndImport.submitTeachersDictionaryResolution,
    updateTeachersDictionaryResolutionEntry: createAndImport.updateTeachersDictionaryResolutionEntry
  }
}
