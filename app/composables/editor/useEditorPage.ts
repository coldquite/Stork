import { useEditorCommitteeFields } from '~/composables/editor/useEditorCommitteeFields'
import { useEditorCommitteeList } from '~/composables/editor/useEditorCommitteeList'
import { useEditorInvigilators } from '~/composables/editor/useEditorInvigilators'
import { useEditorScheduleDialogs } from '~/composables/editor/useEditorScheduleDialogs'
import { useEditorStudentTable } from '~/composables/editor/useEditorStudentTable'
import { useScheduleDraftStore } from '~/stores/schedule-draft'

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

  const committeeList = useEditorCommitteeList()
  const studentTable = useEditorStudentTable(committeeList.selectedCommittee)
  const committeeFields = useEditorCommitteeFields(committeeList.selectedCommittee)
  const invigilators = useEditorInvigilators(committeeList.selectedCommittee)
  const scheduleDialogs = useEditorScheduleDialogs()

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
      committeeTabs: committeeList.committeeTabs,
      isCreateCommitteeDialogOpen: committeeList.isCreateCommitteeDialogOpen,
      createCommitteeName: committeeList.createCommitteeName,
      createCommitteeValidationError: committeeList.createCommitteeValidationError,
      isRenameCommitteeDialogOpen: committeeList.isRenameCommitteeDialogOpen,
      renameCommitteeName: committeeList.renameCommitteeName,
      renameCommitteeValidationError: committeeList.renameCommitteeValidationError,
      isDeleteCommitteeConfirmOpen: committeeList.isDeleteCommitteeConfirmOpen,
      renameCommitteeDialogDescription: committeeList.renameCommitteeDialogDescription,
      deleteCommitteeConfirmDescription: committeeList.deleteCommitteeConfirmDescription,
      openCreateCommitteeDialog: committeeList.openCreateCommitteeDialog,
      closeCreateCommitteeDialog: committeeList.closeCreateCommitteeDialog,
      openRenameCommitteeDialog: committeeList.openRenameCommitteeDialog,
      closeRenameCommitteeDialog: committeeList.closeRenameCommitteeDialog,
      openDeleteCommitteeConfirm: committeeList.openDeleteCommitteeConfirm,
      closeDeleteCommitteeConfirm: committeeList.closeDeleteCommitteeConfirm,
      submitCreateCommittee: committeeList.submitCreateCommittee,
      submitRenameCommittee: committeeList.submitRenameCommittee,
      submitDeleteCommittee: committeeList.submitDeleteCommittee
    },

    studentTable: {
      selectedStudents: studentTable.selectedStudents,
      columns: studentTable.columns
    },

    committeeFields: {
      updateSelectedCommitteeRoom: committeeFields.updateSelectedCommitteeRoom,
      updateSelectedCommitteeDate: committeeFields.updateSelectedCommitteeDate,
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

    scheduleDialogs: {
      isRenameDraftDialogOpen: scheduleDialogs.isRenameDraftDialogOpen,
      renameDraftName: scheduleDialogs.renameDraftName,
      renameDraftValidationError: scheduleDialogs.renameDraftValidationError,
      isCloudSaveDialogOpen: scheduleDialogs.isCloudSaveDialogOpen,
      cloudSaveName: scheduleDialogs.cloudSaveName,
      cloudSaveValidationError: scheduleDialogs.cloudSaveValidationError,
      isCloudSaveLoading: scheduleDialogs.isCloudSaveLoading,
      openRenameDraftDialog: scheduleDialogs.openRenameDraftDialog,
      closeRenameDraftDialog: scheduleDialogs.closeRenameDraftDialog,
      openCloudSaveDialog: scheduleDialogs.openCloudSaveDialog,
      closeCloudSaveDialog: scheduleDialogs.closeCloudSaveDialog,
      submitRenameDraft: scheduleDialogs.submitRenameDraft,
      submitCloudSave: scheduleDialogs.submitCloudSave,
      draftNameMaxLength: scheduleDialogs.draftNameMaxLength
    },

    draftName,
    studentsCountLabel,
    isPageLoading
  }
}
