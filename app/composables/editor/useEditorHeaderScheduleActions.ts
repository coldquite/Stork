import type { HomepageScheduleListItem } from '~/types/homepage'
import { NEW_SCHEDULE_NAME_MAX_LENGTH } from '~/constants/schedule'
import { useHomepageBrowseSchedules } from '~/composables/homepage/useHomepageBrowseSchedules'
import { useHomepageScheduleOpening } from '~/composables/homepage/useHomepageScheduleOpening'
import { useHomepageCreateAndImport } from '~/composables/schedule-creation/useHomepageCreateAndImport'

export function useEditorHeaderScheduleActions() {
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
    manualSchedules: browseSchedules.manualSchedules,
    autoSchedules: browseSchedules.autoSchedules,
    isOpenRecentScheduleDialogOpen: scheduleOpening.isOpenRecentScheduleDialogOpen,
    isOpeningRecentSchedule,
    openRecentScheduleDialogDescription: scheduleOpening.openRecentScheduleDialogDescription,
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
    requestOpenBrowseSchedule,
    createImportWorkflowStage: createAndImport.createImportWorkflowStage,
    cancelCreateScheduleConfirm: createAndImport.cancelCreateScheduleConfirm,
    cancelOpenRecentSchedule: scheduleOpening.cancelOpenRecentSchedule,
    confirmCreateScheduleConfirm: createAndImport.confirmCreateScheduleConfirm,
    confirmOpenRecentSchedule: scheduleOpening.confirmOpenRecentSchedule,
    cancelCreateScheduleDialog: createAndImport.cancelCreateScheduleDialog,
    submitCreateSchedule: createAndImport.submitCreateSchedule,
    submitCreateScheduleImport: createAndImport.submitCreateScheduleImport,
    cancelTeachersDictionaryResolution: createAndImport.cancelTeachersDictionaryResolution,
    submitTeachersDictionaryResolution: createAndImport.submitTeachersDictionaryResolution,
    updateTeachersDictionaryResolutionEntry: createAndImport.updateTeachersDictionaryResolutionEntry,
    loadMoreManualSchedules: browseSchedules.loadMoreManualSchedules,
    loadMoreAutoSchedules: browseSchedules.loadMoreAutoSchedules
  }
}
