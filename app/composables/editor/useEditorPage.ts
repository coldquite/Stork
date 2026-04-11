import { useEditorCommitteeFields } from '~/composables/editor/useEditorCommitteeFields'
import { useEditorCommitteeItemsActions } from '~/composables/editor/useEditorCommitteeItemsActions'
import { useEditorCommitteeList } from '~/composables/editor/useEditorCommitteeList'
import { useEditorInvigilators } from '~/composables/editor/useEditorInvigilators'
import { useEditorPauseCreation } from '~/composables/editor/useEditorPauseCreation'
import { useEditorScheduleDialogs } from '~/composables/editor/useEditorScheduleDialogs'
import { useEditorStudentCreation } from '~/composables/editor/useEditorStudentCreation'
import { useEditorStudentSearch } from '~/composables/editor/useEditorStudentSearch'
import { useEditorStudentTable } from '~/composables/editor/useEditorStudentTable'
import { useEditorTablePreferencesStore } from '~/stores/editor-table-preferences'
import { useScheduleDraftStore } from '~/stores/schedule-draft'
import type { ScheduleDraftThesisTitleDisplayMode } from '~/types/schedule-draft'
import type { EditorStudentsTableViewMode } from '~/types/editor-table-preferences'

/**
 * Facade composable for the schedule editor page: composes committee list, student table,
 * field mutations, invigilators, and draft/cloud dialogs.
 *
 * Return value is grouped by domain so pages and dialog hosts can bind smaller surface areas
 * without a flat explosion of property names.
 */
export function useEditorPage() {
  const { t } = useI18n()
  const scheduleDraftStore = useScheduleDraftStore()
  const editorTablePreferencesStore = useEditorTablePreferencesStore()

  const committeeList = useEditorCommitteeList()
  const thesisTitleDisplayMode = computed<ScheduleDraftThesisTitleDisplayMode>(
    () => editorTablePreferencesStore.thesisTitleDisplayMode
  )
  const tableViewMode = computed<EditorStudentsTableViewMode>(() => editorTablePreferencesStore.tableViewMode)
  const studentTable = useEditorStudentTable(committeeList.selectedCommittee, thesisTitleDisplayMode, tableViewMode)
  const studentSearch = useEditorStudentSearch(committeeList.selectedCommitteeId)
  const committeeItemsActions = useEditorCommitteeItemsActions(
    committeeList.selectedCommittee,
    studentSearch.focusStudentInCommittee
  )
  const committeeFields = useEditorCommitteeFields(committeeList.selectedCommittee)
  const invigilators = useEditorInvigilators(committeeList.selectedCommittee)
  const studentCreation = useEditorStudentCreation(committeeList.selectedCommittee)
  const pauseCreation = useEditorPauseCreation(committeeList.selectedCommittee)
  const scheduleDialogs = useEditorScheduleDialogs()

  function updateThesisTitleDisplayMode(nextMode: ScheduleDraftThesisTitleDisplayMode): void {
    editorTablePreferencesStore.setThesisTitleDisplayMode(nextMode)
  }

  function updateTableViewMode(nextMode: EditorStudentsTableViewMode): void {
    editorTablePreferencesStore.setTableViewMode(nextMode)
  }

  const draftName = computed(() => scheduleDraftStore.draft?.name ?? t('editor.untitled'))
  const studentsCountLabel = computed(() =>
    t('editor.students.count', { count: studentTable.selectedStudents.value.length })
  )
  const isPageLoading = computed(() => scheduleDraftStore.isDraftLoading)

  return {
    committeeList: {
      committees: committeeList.committees,
      selectedCommittee: committeeList.selectedCommittee,
      selectedCommitteeId: committeeList.selectedCommitteeId,
      selectedCommitteeLabel: committeeList.selectedCommitteeLabel,
      selectedCommitteeDate: committeeList.selectedCommitteeDate,
      committeeSidebarItems: committeeList.committeeSidebarItems,
      isCreateCommitteeDialogOpen: committeeList.isCreateCommitteeDialogOpen,
      createCommitteeName: committeeList.createCommitteeName,
      createCommitteeDraft: committeeList.createCommitteeDraft,
      createCommitteeDateLabel: committeeList.createCommitteeDateLabel,
      isCreateCommitteeSubmitDisabled: committeeList.isCreateCommitteeSubmitDisabled,
      createCommitteeValidationError: committeeList.createCommitteeValidationError,
      isRenameCommitteeDialogOpen: committeeList.isRenameCommitteeDialogOpen,
      renameCommitteeName: committeeList.renameCommitteeName,
      renameCommitteeValidationError: committeeList.renameCommitteeValidationError,
      isDeleteCommitteeConfirmOpen: committeeList.isDeleteCommitteeConfirmOpen,
      renameCommitteeDialogDescription: committeeList.renameCommitteeDialogDescription,
      deleteCommitteeConfirmDescription: committeeList.deleteCommitteeConfirmDescription,
      openCreateCommitteeDialog: committeeList.openCreateCommitteeDialog,
      closeCreateCommitteeDialog: committeeList.closeCreateCommitteeDialog,
      updateCreateCommitteeDate: committeeList.updateCreateCommitteeDate,
      updateCreateCommitteeStartMinute: committeeList.updateCreateCommitteeStartMinute,
      updateCreateCommitteeLanguage: committeeList.updateCreateCommitteeLanguage,
      updateCreateCommitteeStudyProgramType: committeeList.updateCreateCommitteeStudyProgramType,
      updateCreateCommitteeStringField: committeeList.updateCreateCommitteeStringField,
      openRenameCommitteeDialog: committeeList.openRenameCommitteeDialog,
      closeRenameCommitteeDialog: committeeList.closeRenameCommitteeDialog,
      openDeleteCommitteeConfirm: committeeList.openDeleteCommitteeConfirm,
      closeDeleteCommitteeConfirm: committeeList.closeDeleteCommitteeConfirm,
      submitCreateCommittee: committeeList.submitCreateCommittee,
      submitRenameCommittee: committeeList.submitRenameCommittee,
      submitDeleteCommittee: committeeList.submitDeleteCommittee
    },

    studentTable: {
      selectedRows: studentTable.selectedRows,
      selectedStudents: studentTable.selectedStudents,
      columns: studentTable.columns
    },

    committeeItemsActions: {
      isDeleteItemConfirmOpen: committeeItemsActions.isDeleteItemConfirmOpen,
      deleteItemConfirmActionLabel: committeeItemsActions.deleteItemConfirmActionLabel,
      deleteItemConfirmDescription: committeeItemsActions.deleteItemConfirmDescription,
      isMoveStudentDialogOpen: committeeItemsActions.isMoveStudentDialogOpen,
      moveStudentDialogTitle: committeeItemsActions.moveStudentDialogTitle,
      moveStudentDialogDescription: committeeItemsActions.moveStudentDialogDescription,
      moveStudentSourceCommitteeId: committeeItemsActions.moveStudentSourceCommitteeId,
      selectedMoveStudentTargetCommitteeId: committeeItemsActions.selectedMoveStudentTargetCommitteeId,
      moveStudentCurrentCommitteeBadgeLabel: committeeItemsActions.moveStudentCurrentCommitteeBadgeLabel,
      moveStudentRewritePreview: committeeItemsActions.moveStudentRewritePreview,
      moveStudentHasRewriteChanges: committeeItemsActions.moveStudentHasRewriteChanges,
      moveStudentSubmitLabel: committeeItemsActions.moveStudentSubmitLabel,
      isMoveStudentSubmitDisabled: committeeItemsActions.isMoveStudentSubmitDisabled,
      openDeleteItemConfirm: committeeItemsActions.openDeleteItemConfirm,
      closeDeleteItemConfirm: committeeItemsActions.closeDeleteItemConfirm,
      submitDeleteItem: committeeItemsActions.submitDeleteItem,
      openMoveStudentDialog: committeeItemsActions.openMoveStudentDialog,
      selectMoveStudentTargetCommittee: committeeItemsActions.selectMoveStudentTargetCommittee,
      closeMoveStudentDialog: committeeItemsActions.closeMoveStudentDialog,
      submitMoveStudentToCommittee: committeeItemsActions.submitMoveStudentToCommittee,
      requestMoveStudentToAnotherCommittee: committeeItemsActions.requestMoveStudentToAnotherCommittee
    },

    draftSettings: {
      thesisTitleDisplayMode,
      updateThesisTitleDisplayMode,
      tableViewMode,
      updateTableViewMode
    },

    committeeFields: {
      updateSelectedCommitteeRoom: committeeFields.updateSelectedCommitteeRoom,
      updateSelectedCommitteePreparationRoom: committeeFields.updateSelectedCommitteePreparationRoom,
      updateSelectedCommitteeDate: committeeFields.updateSelectedCommitteeDate,
      updateSelectedCommitteeStartMinute: committeeFields.updateSelectedCommitteeStartMinute,
      updateSelectedCommitteeSecretary: committeeFields.updateSelectedCommitteeSecretary,
      updateSelectedCommitteeChairName: committeeFields.updateSelectedCommitteeChairName,
      updateSelectedCommitteeViceChairName: committeeFields.updateSelectedCommitteeViceChairName,
      updateSelectedCommitteeMember1Name: committeeFields.updateSelectedCommitteeMember1Name,
      updateSelectedCommitteeMember2Name: committeeFields.updateSelectedCommitteeMember2Name,
      updateSelectedCommitteeMember3Name: committeeFields.updateSelectedCommitteeMember3Name,
      updateSelectedCommitteeLanguage: committeeFields.updateSelectedCommitteeLanguage,
      updateSelectedCommitteeStudyProgramType: committeeFields.updateSelectedCommitteeStudyProgramType,
      updateSelectedCommitteeStudyProgramName: committeeFields.updateSelectedCommitteeStudyProgramName,
      updateSelectedCommitteeSpecializationCode: committeeFields.updateSelectedCommitteeSpecializationCode
    },

    invigilators: {
      selectedInvigilators: invigilators.selectedInvigilators,
      invigilatorsCountLabel: invigilators.invigilatorsCountLabel,
      isAddInvigilatorDialogOpen: invigilators.isAddInvigilatorDialogOpen,
      newInvigilatorName: invigilators.newInvigilatorName,
      invigilatorValidationError: invigilators.invigilatorValidationError,
      isDeleteInvigilatorConfirmOpen: invigilators.isDeleteInvigilatorConfirmOpen,
      deleteInvigilatorConfirmDescription: invigilators.deleteInvigilatorConfirmDescription,
      openAddInvigilatorDialog: invigilators.openAddInvigilatorDialog,
      closeAddInvigilatorDialog: invigilators.closeAddInvigilatorDialog,
      openDeleteInvigilatorConfirm: invigilators.openDeleteInvigilatorConfirm,
      closeDeleteInvigilatorConfirm: invigilators.closeDeleteInvigilatorConfirm,
      submitAddInvigilator: invigilators.submitAddInvigilator,
      submitDeleteInvigilator: invigilators.submitDeleteInvigilator
    },

    studentCreation: {
      isCreateStudentDialogOpen: studentCreation.isCreateStudentDialogOpen,
      createStudentDraft: studentCreation.createStudentDraft,
      createStudentValidationErrors: studentCreation.createStudentValidationErrors,
      createStudentCommitteeLabel: studentCreation.createStudentCommitteeLabel,
      createStudentStudyProgramNameOptions: studentCreation.createStudentStudyProgramNameOptions,
      createStudentSpecializationOptions: studentCreation.createStudentSpecializationOptions,
      openCreateStudentDialog: studentCreation.openCreateStudentDialog,
      closeCreateStudentDialog: studentCreation.closeCreateStudentDialog,
      submitCreateStudent: studentCreation.submitCreateStudent,
      updateCreateStudentTextField: studentCreation.updateCreateStudentTextField,
      updateCreateStudentMinutesField: studentCreation.updateCreateStudentMinutesField,
      updateCreateStudentStudyLanguage: studentCreation.updateCreateStudentStudyLanguage,
      updateCreateStudentStudyProgramType: studentCreation.updateCreateStudentStudyProgramType,
      updateCreateStudentStudyProgramName: studentCreation.updateCreateStudentStudyProgramName,
      updateCreateStudentSpecializationCode: studentCreation.updateCreateStudentSpecializationCode,
      updateCreateStudentThesisLanguage: studentCreation.updateCreateStudentThesisLanguage,
      updateCreateStudentRepeatType: studentCreation.updateCreateStudentRepeatType
    },

    pauseCreation: {
      isPauseDialogOpen: pauseCreation.isPauseDialogOpen,
      pauseDialogMode: pauseCreation.pauseDialogMode,
      pauseDraft: pauseCreation.pauseDraft,
      pauseValidationErrors: pauseCreation.pauseValidationErrors,
      openCreatePauseDialog: pauseCreation.openCreatePauseDialog,
      openEditPauseDialog: pauseCreation.openEditPauseDialog,
      closePauseDialog: pauseCreation.closePauseDialog,
      submitPauseDialog: pauseCreation.submitPauseDialog,
      updatePauseType: pauseCreation.updatePauseType,
      updatePauseCustomLabelEnabled: pauseCreation.updatePauseCustomLabelEnabled,
      updatePauseCustomLabel: pauseCreation.updatePauseCustomLabel,
      updatePauseDurationMinutes: pauseCreation.updatePauseDurationMinutes
    },

    scheduleDialogs: {
      isRenameDraftDialogOpen: scheduleDialogs.isRenameDraftDialogOpen,
      renameDraftName: scheduleDialogs.renameDraftName,
      renameDraftValidationError: scheduleDialogs.renameDraftValidationError,
      isCloudSaveDialogOpen: scheduleDialogs.isCloudSaveDialogOpen,
      cloudSaveName: scheduleDialogs.cloudSaveName,
      cloudSaveValidationError: scheduleDialogs.cloudSaveValidationError,
      isCloudSaveLoading: scheduleDialogs.isCloudSaveLoading,
      isCsvExportDialogOpen: scheduleDialogs.isCsvExportDialogOpen,
      selectedCsvExportCommitteeIds: scheduleDialogs.selectedCsvExportCommitteeIds,
      csvExportErrorItems: scheduleDialogs.csvExportErrorItems,
      csvExportCommitteeItems: scheduleDialogs.csvExportCommitteeItems,
      isCsvExportSubmitDisabled: scheduleDialogs.isCsvExportSubmitDisabled,
      isPdfPublicExportDialogOpen: scheduleDialogs.isPdfPublicExportDialogOpen,
      selectedPdfPublicExportCommitteeIds: scheduleDialogs.selectedPdfPublicExportCommitteeIds,
      isPdfPublicExportLoading: scheduleDialogs.isPdfPublicExportLoading,
      pdfPublicExportCommitteeItems: scheduleDialogs.pdfPublicExportCommitteeItems,
      isPdfPublicExportSubmitDisabled: scheduleDialogs.isPdfPublicExportSubmitDisabled,
      isPdfInvigilatorsExportDialogOpen: scheduleDialogs.isPdfInvigilatorsExportDialogOpen,
      selectedPdfInvigilatorsExportCommitteeIds: scheduleDialogs.selectedPdfInvigilatorsExportCommitteeIds,
      isPdfInvigilatorsExportLoading: scheduleDialogs.isPdfInvigilatorsExportLoading,
      pdfInvigilatorsExportDayGroups: scheduleDialogs.pdfInvigilatorsExportDayGroups,
      isPdfInvigilatorsExportSubmitDisabled: scheduleDialogs.isPdfInvigilatorsExportSubmitDisabled,
      openRenameDraftDialog: scheduleDialogs.openRenameDraftDialog,
      closeRenameDraftDialog: scheduleDialogs.closeRenameDraftDialog,
      openCloudSaveDialog: scheduleDialogs.openCloudSaveDialog,
      closeCloudSaveDialog: scheduleDialogs.closeCloudSaveDialog,
      openCsvExportDialog: scheduleDialogs.openCsvExportDialog,
      closeCsvExportDialog: scheduleDialogs.closeCsvExportDialog,
      updateSelectedCsvExportCommitteeIds: scheduleDialogs.updateSelectedCsvExportCommitteeIds,
      selectAllCsvExportCommittees: scheduleDialogs.selectAllCsvExportCommittees,
      clearCsvExportCommittees: scheduleDialogs.clearCsvExportCommittees,
      openPdfPublicExportDialog: scheduleDialogs.openPdfPublicExportDialog,
      closePdfPublicExportDialog: scheduleDialogs.closePdfPublicExportDialog,
      updateSelectedPdfPublicExportCommitteeIds: scheduleDialogs.updateSelectedPdfPublicExportCommitteeIds,
      selectAllPdfPublicExportCommittees: scheduleDialogs.selectAllPdfPublicExportCommittees,
      clearPdfPublicExportCommittees: scheduleDialogs.clearPdfPublicExportCommittees,
      openPdfInvigilatorsExportDialog: scheduleDialogs.openPdfInvigilatorsExportDialog,
      closePdfInvigilatorsExportDialog: scheduleDialogs.closePdfInvigilatorsExportDialog,
      updateSelectedPdfInvigilatorsExportCommitteeIds: scheduleDialogs.updateSelectedPdfInvigilatorsExportCommitteeIds,
      selectAllPdfInvigilatorsExportCommittees: scheduleDialogs.selectAllPdfInvigilatorsExportCommittees,
      clearPdfInvigilatorsExportCommittees: scheduleDialogs.clearPdfInvigilatorsExportCommittees,
      submitRenameDraft: scheduleDialogs.submitRenameDraft,
      submitCloudSave: scheduleDialogs.submitCloudSave,
      submitCsvExportSelection: scheduleDialogs.submitCsvExportSelection,
      submitPdfPublicExportSelection: scheduleDialogs.submitPdfPublicExportSelection,
      submitPdfInvigilatorsExportSelection: scheduleDialogs.submitPdfInvigilatorsExportSelection,
      draftNameMaxLength: scheduleDialogs.draftNameMaxLength
    },

    studentSearch: {
      isStudentSearchDialogOpen: studentSearch.isStudentSearchDialogOpen,
      studentSearchQuery: studentSearch.studentSearchQuery,
      isStudentSearchLoading: studentSearch.isStudentSearchLoading,
      studentSearchResults: studentSearch.studentSearchResults,
      highlightRequest: studentSearch.highlightRequest,
      openStudentSearchDialog: studentSearch.openStudentSearchDialog,
      closeStudentSearchDialog: studentSearch.closeStudentSearchDialog,
      updateStudentSearchQuery: studentSearch.updateStudentSearchQuery,
      selectStudentSearchResult: studentSearch.selectStudentSearchResult
    },

    draftName,
    studentsCountLabel,
    isPageLoading
  }
}
