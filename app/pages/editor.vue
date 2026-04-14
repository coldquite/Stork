<script setup lang="ts">
import EditorCommitteesPanel from '~/components/editor/committee/EditorCommitteesPanel.vue'
import EditorScheduleDialogsHost from '~/components/editor/dialogs/EditorScheduleDialogsHost.vue'
import EditorStudentSearchDialog from '~/components/editor/dialogs/EditorStudentSearchDialog.vue'
import EditorBottomGlow from '~/components/editor/layout/EditorBottomGlow.vue'
import EditorPageHeader from '~/components/editor/layout/EditorPageHeader.vue'
import EditorStudentsPanel from '~/components/editor/students/EditorStudentsPanel.vue'
import { useEditorPage } from '~/composables/editor/page/useEditorPage'
import type { EditorCommitteeStringFieldPayload, EditorTableRow } from '~/types/editor'

definePageMeta({
  middleware: 'editor-draft'
})

const { t } = useI18n()
const page = useEditorPage()
const {
  committeeList,
  studentTable,
  committeeItemsActions,
  draftSettings,
  studentSearch,
  committeeFields,
  committeeValidation,
  studentValidation,
  validationSummary,
  invigilators,
  studentCreation,
  pauseCreation,
  scheduleDialogs,
  draftName,
  studentsCountLabel,
  isPageLoading
} = page

const cardAccentRootClass = 'h-full rounded-none ring-0 shadow-none divide-y-2 divide-default bg-default'
const draftRenameAriaLabel = computed(() => t('editor.schedule.rename.openAriaLabel', { name: draftName.value }))
const searchStudentsAriaLabel = computed(() => t('editor.studentSearch.openAriaLabel'))
const cloudSaveAriaLabel = computed(() => t('editor.schedule.cloudSave.ariaLabel', { name: draftName.value }))
const validationSummaryErrorCount = computed(() => validationSummary.totalErrorCount.value)
const validationSummaryHasErrors = computed(() => validationSummaryErrorCount.value > 0)
const validationSummaryButtonLabel = computed(() =>
  validationSummaryHasErrors.value
    ? t('editor.schedule.validationSummary.button.errorsLabel', { count: validationSummaryErrorCount.value })
    : t('editor.schedule.validationSummary.button.noErrorsLabel')
)
const validationSummaryButtonAriaLabel = computed(() =>
  t('editor.schedule.validationSummary.button.ariaLabel', { count: validationSummaryErrorCount.value })
)
const exportAriaLabel = computed(() => t('editor.schedule.export.ariaLabel', { name: draftName.value }))

const committeeLabels = computed(() => ({
  committeeTitle: t('editor.committee.title'),
  emptyStateTitle: t('editor.committee.emptyState.title'),
  emptyStateDescription: t('editor.committee.emptyState.description'),
  startTime: t('editor.committee.startTime'),
  startTimeHour: t('editor.committee.startTimeHour'),
  startTimeMinute: t('editor.committee.startTimeMinute'),
  addStudentAction: t('editor.students.add.openAction'),
  addStudentAria: t('editor.students.add.openAriaLabel', { name: committeeList.selectedCommitteeLabel.value }),
  addPauseAction: t('editor.pause.add.openAction'),
  addPauseAria: t('editor.pause.add.openAriaLabel', { name: committeeList.selectedCommitteeLabel.value }),
  columnDisplaySettingsAction: t('editor.committee.columnDisplaySettingsAction'),
  thesisTitleDisplayMode: t('editor.committee.thesisTitleDisplayMode'),
  thesisTitleDisplayModeAuto: t('editor.committee.thesisTitleDisplayModeOptions.auto'),
  thesisTitleDisplayModeBoth: t('editor.committee.thesisTitleDisplayModeOptions.both'),
  tableViewMode: t('editor.committee.tableViewMode'),
  tableViewModeOptimized: t('editor.committee.tableViewModeOptions.optimized'),
  tableViewModeMaximized: t('editor.committee.tableViewModeOptions.maximized'),
  room: t('editor.committee.room'),
  preparationRoom: t('editor.committee.preparationRoom'),
  date: t('editor.committee.date'),
  secretary: t('editor.committee.secretary'),
  chair: t('editor.committee.chair'),
  viceChair: t('editor.committee.viceChair'),
  member1: t('editor.committee.member1'),
  member2: t('editor.committee.member2'),
  member3: t('editor.committee.member3'),
  language: t('editor.committee.language'),
  languageCzech: t('editor.committee.languageOptions.czech'),
  languageEnglish: t('editor.committee.languageOptions.english'),
  studyProgramType: t('editor.committee.studyProgramType'),
  studyProgramTypeBachelor: t('editor.committee.studyProgramTypeOptions.bachelor'),
  studyProgramTypeMaster: t('editor.committee.studyProgramTypeOptions.master'),
  studyProgramName: t('editor.committee.studyProgramName'),
  specializationCode: t('editor.committee.specializationCode'),
  department: t('editor.committee.department'),
  renameCommitteeAction: t('editor.committees.rename.action'),
  deleteCommitteeAction: t('editor.committees.delete.action'),
  renameCommitteeAria: t('editor.committees.rename.openAriaLabel', {
    name: committeeList.selectedCommitteeLabel.value
  }),
  deleteCommitteeAria: t('editor.committees.delete.openAriaLabel', { name: committeeList.selectedCommitteeLabel.value })
}))

const studentsEmpty = computed(() => ({
  emptyTitle: t('editor.students.emptyTitle'),
  emptyDescription: t('editor.students.emptyDescription')
}))

const invigilatorLabels = computed(() => ({
  addAction: t('editor.committee.invigilators.add.action'),
  deleteAria: t('editor.committee.invigilators.delete.ariaLabel'),
  applyPreparationRoomToAll: t('editor.committee.preparationRoomSync.tooltip')
}))

const dialogCopy = computed(() => ({
  commonCancel: t('common.confirmDialog.cancel'),
  renameCommittee: {
    title: t('editor.committees.rename.title'),
    fieldLabel: t('editor.committees.rename.fieldLabel'),
    placeholder: t('editor.committees.rename.placeholder'),
    hint: t('editor.committees.rename.hint'),
    submit: t('editor.committees.rename.submit')
  },
  createCommittee: {
    title: t('editor.committees.create.title'),
    description: t('editor.committees.create.description'),
    fieldLabel: t('editor.committees.create.fieldLabel'),
    placeholder: t('editor.committees.create.placeholder'),
    hint: t('editor.committees.create.hint'),
    submit: t('editor.committees.create.submit')
  },
  renameDraft: {
    title: t('editor.schedule.rename.title'),
    description: t('editor.schedule.rename.description'),
    fieldLabel: t('editor.schedule.rename.fieldLabel'),
    placeholder: t('editor.schedule.rename.placeholder'),
    hint: t('editor.schedule.rename.hint', { max: scheduleDialogs.draftNameMaxLength }),
    submit: t('editor.schedule.rename.submit')
  },
  cloudSave: {
    title: t('editor.schedule.cloudSave.dialog.title'),
    description: t('editor.schedule.cloudSave.dialog.description'),
    fieldLabel: t('editor.schedule.cloudSave.dialog.fieldLabel'),
    placeholder: t('editor.schedule.cloudSave.dialog.placeholder'),
    hint: t('editor.schedule.cloudSave.dialog.hint', { max: scheduleDialogs.draftNameMaxLength }),
    submit: t('editor.schedule.cloudSave.dialog.submit')
  },
  csvExportCommittees: {
    title: t('editor.schedule.export.csvCommitteesDialog.title'),
    description: t('editor.schedule.export.csvCommitteesDialog.description'),
    selectedCount: t('editor.schedule.export.csvCommitteesDialog.selectedCount', {
      count: scheduleDialogs.selectedCsvExportCommitteeIds.value.length
    }),
    orderingHint: t('editor.schedule.export.csvCommitteesDialog.orderingHint'),
    checklistAriaLabel: t('editor.schedule.export.csvCommitteesDialog.checklistAriaLabel'),
    selectAll: t('editor.schedule.export.csvCommitteesDialog.selectAll'),
    clearAll: t('editor.schedule.export.csvCommitteesDialog.clearAll'),
    submit: t('editor.schedule.export.csvCommitteesDialog.submit'),
    emptyTitle: t('editor.schedule.export.csvCommitteesDialog.emptyTitle'),
    emptyDescription: t('editor.schedule.export.csvCommitteesDialog.emptyDescription'),
    errorTitle: t('editor.schedule.export.questionsEnvelopeCsvExport.errors.title'),
    errorDescription: t('editor.schedule.export.questionsEnvelopeCsvExport.errors.description')
  },
  pdfPublicExportCommittees: {
    title: t('editor.schedule.export.pdfPublicDialog.title'),
    description: t('editor.schedule.export.pdfPublicDialog.description'),
    selectedCount: t('editor.schedule.export.pdfPublicDialog.selectedCount', {
      count: scheduleDialogs.selectedPdfPublicExportCommitteeIds.value.length
    }),
    orderingHint: t('editor.schedule.export.pdfPublicDialog.orderingHint'),
    checklistAriaLabel: t('editor.schedule.export.pdfPublicDialog.checklistAriaLabel'),
    selectAll: t('editor.schedule.export.pdfPublicDialog.selectAll'),
    clearAll: t('editor.schedule.export.pdfPublicDialog.clearAll'),
    submit: t('editor.schedule.export.pdfPublicDialog.submit'),
    loading: t('editor.schedule.export.pdfPublicDialog.loading'),
    emptyTitle: t('editor.schedule.export.pdfPublicDialog.emptyTitle'),
    emptyDescription: t('editor.schedule.export.pdfPublicDialog.emptyDescription'),
    errorTitle: t('editor.schedule.export.pdfPublicDialog.errors.title'),
    errorDescription: t('editor.schedule.export.pdfPublicDialog.errors.description')
  },
  pdfInvigilatorsExportCommittees: {
    title: t('editor.schedule.export.pdfInvigilatorsDialog.title'),
    description: t('editor.schedule.export.pdfInvigilatorsDialog.description'),
    selectedCount: t('editor.schedule.export.pdfInvigilatorsDialog.selectedCount', {
      count: scheduleDialogs.selectedPdfInvigilatorsExportCommitteeIds.value.length
    }),
    orderingHint: t('editor.schedule.export.pdfInvigilatorsDialog.orderingHint'),
    checklistAriaLabel: t('editor.schedule.export.pdfInvigilatorsDialog.checklistAriaLabel'),
    selectAll: t('editor.schedule.export.pdfInvigilatorsDialog.selectAll'),
    clearAll: t('editor.schedule.export.pdfInvigilatorsDialog.clearAll'),
    submit: t('editor.schedule.export.pdfInvigilatorsDialog.submit'),
    loading: t('editor.schedule.export.pdfInvigilatorsDialog.loading'),
    emptyTitle: t('editor.schedule.export.pdfInvigilatorsDialog.emptyTitle'),
    emptyDescription: t('editor.schedule.export.pdfInvigilatorsDialog.emptyDescription'),
    errorTitle: t('editor.schedule.export.pdfInvigilatorsDialog.errors.title'),
    errorDescription: t('editor.schedule.export.pdfInvigilatorsDialog.errors.description')
  },
  addInvigilator: {
    title: t('editor.committee.invigilators.add.title'),
    description: t('editor.committee.invigilators.add.description'),
    fieldLabel: t('editor.committee.invigilators.add.fieldLabel'),
    placeholder: t('editor.committee.invigilators.add.placeholder'),
    hint: t('editor.committee.invigilators.add.hint'),
    submit: t('editor.committee.invigilators.add.submit')
  },
  deleteCommitteeConfirmAction: t('editor.committees.delete.confirmAction'),
  deleteInvigilatorConfirmAction: t('editor.committee.invigilators.delete.confirmAction'),
  applyPreparationRoomToAllConfirmAction: t('editor.committee.preparationRoomSync.confirm.action')
}))

function onCommitteeStringField(payload: EditorCommitteeStringFieldPayload): void {
  switch (payload.field) {
    case 'room':
      committeeFields.updateSelectedCommitteeRoom(payload.value)
      break
    case 'preparationRoom':
      committeeFields.updateSelectedCommitteePreparationRoom(payload.value)
      break
    case 'secretary':
      committeeFields.updateSelectedCommitteeSecretary(payload.value)
      break
    case 'chair':
      committeeFields.updateSelectedCommitteeChairName(payload.value)
      break
    case 'viceChair':
      committeeFields.updateSelectedCommitteeViceChairName(payload.value)
      break
    case 'member1':
      committeeFields.updateSelectedCommitteeMember1Name(payload.value)
      break
    case 'member2':
      committeeFields.updateSelectedCommitteeMember2Name(payload.value)
      break
    case 'member3':
      committeeFields.updateSelectedCommitteeMember3Name(payload.value)
      break
    case 'studyProgramName':
      committeeFields.updateSelectedCommitteeStudyProgramName(payload.value)
      break
    case 'specializationCode':
      committeeFields.updateSelectedCommitteeSpecializationCode(payload.value)
      break
    default:
      break
  }
}

function setStudentRows(rows: EditorTableRow[]): void {
  studentTable.selectedRows.value = rows
}

function requestDeleteCommitteeItem(itemId: string): void {
  committeeItemsActions.openDeleteItemConfirm(itemId)
}

function requestMoveStudentToAnotherCommittee(studentId: string): void {
  committeeItemsActions.openMoveStudentDialog(studentId)
}

function requestExportPublicPdf(): void {
  if (validationSummary.hasAnyErrors.value) {
    scheduleDialogs.openExportValidationWarningDialog('PDF_PUBLIC')
    return
  }

  scheduleDialogs.openPdfPublicExportDialog()
}

function requestExportInvigilatorsPdf(): void {
  if (validationSummary.hasAnyErrors.value) {
    scheduleDialogs.openExportValidationWarningDialog('PDF_INVIGILATORS')
    return
  }

  scheduleDialogs.openPdfInvigilatorsExportDialog()
}

function requestExportCsvQuestionsEnvelope(): void {
  if (validationSummary.hasAnyErrors.value) {
    scheduleDialogs.openExportValidationWarningDialog('CSV')
    return
  }

  scheduleDialogs.openCsvExportDialog()
}

function focusStudentFromValidation(studentId: string): void {
  const selectedCommitteeId = committeeList.selectedCommitteeId.value
  if (!selectedCommitteeId) {
    return
  }

  studentSearch.focusStudentInCommittee(selectedCommitteeId, studentId)
}

const committeesCount = computed(() => committeeList.committees.value.length)
const selectedCommitteeIdModel = computed({
  get: () => committeeList.selectedCommitteeId.value,
  set: (id: string) => {
    committeeList.selectedCommitteeId.value = id
  }
})
const committeeSidebarItems = computed(() => committeeList.committeeSidebarItems.value)
const panelSelectedCommittee = computed(() => committeeList.selectedCommittee.value)
const panelCommitteeLabel = computed(() => committeeList.selectedCommitteeLabel.value)
const panelCommitteeDate = computed(() => committeeList.selectedCommitteeDate.value)
const panelStudentsCount = computed(() => studentTable.selectedStudents.value.length)
const panelStudents = computed(() => studentTable.selectedRows.value)
const panelColumns = computed(() => studentTable.columns.value)
const panelThesisTitleDisplayMode = computed(() => draftSettings.thesisTitleDisplayMode.value)
const panelTableViewMode = computed(() => draftSettings.tableViewMode.value)
const panelInvigilators = computed(() => invigilators.selectedInvigilators.value)
const panelInvigilatorsCountLabel = computed(() => invigilators.invigilatorsCountLabel.value)
const panelCommitteeValidationCount = computed(() => committeeValidation.selectedCommitteeCount.value)
const panelCommitteeValidationTitle = computed(() => t('editor.committee.validation.title'))
const panelCommitteeValidationSections = computed(() => committeeValidation.selectedCommitteeSections.value)
const panelStudentValidationCount = computed(() => studentValidation.selectedCommitteeCount.value)
const panelStudentValidationTitle = computed(() => t('editor.student.validation.title'))
const panelStudentValidationStudents = computed(() => studentValidation.selectedCommitteeStudentGroups.value)
const panelStudentValidationIssues = computed(() => studentValidation.selectedCommitteeIssues.value)
const panelHighlightRequest = computed(() => studentSearch.highlightRequest.value)
const cloudSaveLoading = computed(() => scheduleDialogs.isCloudSaveLoading.value)
const draftNameText = computed(() => draftName.value)
</script>

<template>
  <UContainer class="w-[99vw] max-w-none py-10">
    <CommonAppLoadingState v-if="isPageLoading" :label="t('editor.loading')" />

    <div v-else class="space-y-6">
      <EditorPageHeader
        :title="t('editor.title')"
        :draft-name="draftNameText"
        :back-aria-label="t('editor.navigation.backToHomepage')"
        :rename-aria-label="draftRenameAriaLabel"
        :rename-label="t('editor.schedule.rename.action')"
        :search-students-aria-label="searchStudentsAriaLabel"
        :search-students-label="t('editor.studentSearch.action')"
        :cloud-save-aria-label="cloudSaveAriaLabel"
        :cloud-save-label="t('editor.schedule.cloudSave.action')"
        :cloud-save-loading="cloudSaveLoading"
        :validation-summary-aria-label="validationSummaryButtonAriaLabel"
        :validation-summary-label="validationSummaryButtonLabel"
        :validation-summary-has-errors="validationSummaryHasErrors"
        :export-aria-label="exportAriaLabel"
        :export-label="t('editor.schedule.export.action')"
        :export-public-pdf-label="t('editor.schedule.export.options.publicPdf')"
        :export-invigilators-pdf-label="t('editor.schedule.export.options.invigilatorsPdf')"
        :export-csv-questions-envelope-label="t('editor.schedule.export.options.questionsEnvelopeCsv')"
        @rename-draft="scheduleDialogs.openRenameDraftDialog"
        @search-students="studentSearch.openStudentSearchDialog"
        @save-to-cloud="scheduleDialogs.openCloudSaveDialog"
        @open-validation-summary="scheduleDialogs.openValidationSummaryDialog"
        @export-public-pdf="requestExportPublicPdf"
        @export-invigilators-pdf="requestExportInvigilatorsPdf"
        @export-csv-questions-envelope="requestExportCsvQuestionsEnvelope"
      />

      <div class="ring-default overflow-hidden rounded-lg ring-2">
        <div class="divide-default grid divide-y-2 lg:grid-cols-[300px_1fr] lg:divide-x-2 lg:divide-y-0">
          <EditorCommitteesPanel
            v-model:selected-committee-id="selectedCommitteeIdModel"
            :card-root-class="cardAccentRootClass"
            :title="t('editor.committees.title')"
            :sort-hint="t('editor.committees.sortHint')"
            :committees-count="committeesCount"
            :committee-sidebar-items="committeeSidebarItems"
            :create-action-label="t('editor.committees.create.openAction')"
            @create-committee="committeeList.openCreateCommitteeDialog"
          />

          <EditorStudentsPanel
            :card-root-class="cardAccentRootClass"
            :selected-committee="panelSelectedCommittee"
            :selected-committee-label="panelCommitteeLabel"
            :selected-committee-date="panelCommitteeDate"
            :students-count="panelStudentsCount"
            :thesis-title-display-mode="panelThesisTitleDisplayMode"
            :table-view-mode="panelTableViewMode"
            :students-count-label="studentsCountLabel"
            :students="panelStudents"
            :columns="panelColumns"
            :committee-labels="committeeLabels"
            :students-empty="studentsEmpty"
            :invigilator-labels="invigilatorLabels"
            :invigilators="panelInvigilators"
            :invigilators-count-label="panelInvigilatorsCountLabel"
            :committee-validation-count="panelCommitteeValidationCount"
            :committee-validation-title="panelCommitteeValidationTitle"
            :committee-validation-sections="panelCommitteeValidationSections"
            :student-validation-count="panelStudentValidationCount"
            :student-validation-title="panelStudentValidationTitle"
            :student-validation-students="panelStudentValidationStudents"
            :student-validation-issues="panelStudentValidationIssues"
            :highlight-request="panelHighlightRequest"
            @update:students="setStudentRows"
            @committee-string-field="onCommitteeStringField"
            @update:committee-date="committeeFields.updateSelectedCommitteeDate"
            @update:committee-start-minute="committeeFields.updateSelectedCommitteeStartMinute"
            @update:thesis-title-display-mode="draftSettings.updateThesisTitleDisplayMode"
            @update:table-view-mode="draftSettings.updateTableViewMode"
            @update:committee-language="committeeFields.updateSelectedCommitteeLanguage"
            @update:committee-study-program-type="committeeFields.updateSelectedCommitteeStudyProgramType"
            @add-student="studentCreation.openCreateStudentDialog"
            @add-pause="pauseCreation.openCreatePauseDialog"
            @edit-pause="pauseCreation.openEditPauseDialog($event)"
            @request-delete-item="requestDeleteCommitteeItem"
            @request-move-student="requestMoveStudentToAnotherCommittee"
            @add-invigilator="invigilators.openAddInvigilatorDialog"
            @apply-preparation-room-to-all="invigilators.openApplyPreparationRoomToAllConfirm"
            @delete-invigilator="invigilators.openDeleteInvigilatorConfirm($event)"
            @rename-committee="committeeList.openRenameCommitteeDialog($event)"
            @delete-committee="committeeList.openDeleteCommitteeConfirm($event)"
            @focus-validation-student="focusStudentFromValidation"
          />
        </div>
      </div>

      <EditorBottomGlow />
    </div>

    <EditorStudentSearchDialog
      v-model:open="studentSearch.isStudentSearchDialogOpen.value"
      :results="studentSearch.studentSearchResults.value"
      :search-query="studentSearch.studentSearchQuery.value"
      :is-loading="studentSearch.isStudentSearchLoading.value"
      @search-change="studentSearch.updateStudentSearchQuery"
      @select-result="studentSearch.selectStudentSearchResult"
    />

    <EditorScheduleDialogsHost
      :committee-list="committeeList"
      :invigilators="invigilators"
      :committee-items-actions="committeeItemsActions"
      :student-creation="studentCreation"
      :pause-creation="pauseCreation"
      :schedule-dialogs="scheduleDialogs"
      :validation-summary="validationSummary"
      :student-search="studentSearch"
      :copy="dialogCopy"
      :committee-labels="committeeLabels"
    />
  </UContainer>
</template>
