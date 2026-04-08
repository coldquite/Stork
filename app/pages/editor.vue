<script setup lang="ts">
import { useEditorPage } from '~/composables/editor/useEditorPage'
import type { EditorCommitteeStringFieldPayload, StudentRow } from '~/types/editor'

definePageMeta({
  middleware: 'editor-draft'
})

const { t } = useI18n()
const page = useEditorPage()
const {
  committeeList,
  studentTable,
  draftSettings,
  studentSearch,
  committeeFields,
  invigilators,
  scheduleDialogs,
  draftName,
  studentsCountLabel,
  isPageLoading
} = page

const cardAccentRootClass = 'h-full rounded-none ring-0 shadow-none divide-y-2 divide-default bg-default'
const draftRenameAriaLabel = computed(() => t('editor.schedule.rename.openAriaLabel', { name: draftName.value }))
const searchStudentsAriaLabel = computed(() => t('editor.studentSearch.openAriaLabel'))
const cloudSaveAriaLabel = computed(() => t('editor.schedule.cloudSave.ariaLabel', { name: draftName.value }))

const committeeLabels = computed(() => ({
  committeeTitle: t('editor.committee.title'),
  startTime: t('editor.committee.startTime'),
  startTimeHour: t('editor.committee.startTimeHour'),
  startTimeMinute: t('editor.committee.startTimeMinute'),
  columnDisplaySettingsAction: t('editor.committee.columnDisplaySettingsAction'),
  thesisTitleDisplayMode: t('editor.committee.thesisTitleDisplayMode'),
  thesisTitleDisplayModeAuto: t('editor.committee.thesisTitleDisplayModeOptions.auto'),
  thesisTitleDisplayModeBoth: t('editor.committee.thesisTitleDisplayModeOptions.both'),
  tableViewMode: t('editor.committee.tableViewMode'),
  tableViewModeOptimized: t('editor.committee.tableViewModeOptions.optimized'),
  tableViewModeMaximized: t('editor.committee.tableViewModeOptions.maximized'),
  room: t('editor.committee.room'),
  date: t('editor.committee.date'),
  secretary: t('editor.committee.secretary'),
  members: t('editor.committee.members'),
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
  deleteAria: t('editor.committee.invigilators.delete.ariaLabel')
}))

const dialogCopy = computed(() => ({
  commonCancel: t('common.confirmDialog.cancel'),
  renameCommittee: {
    title: t('editor.committees.rename.title'),
    placeholder: t('editor.committees.rename.placeholder'),
    hint: t('editor.committees.rename.hint'),
    submit: t('editor.committees.rename.submit')
  },
  createCommittee: {
    title: t('editor.committees.create.title'),
    description: t('editor.committees.create.description'),
    placeholder: t('editor.committees.create.placeholder'),
    hint: t('editor.committees.create.hint'),
    submit: t('editor.committees.create.submit')
  },
  renameDraft: {
    title: t('editor.schedule.rename.title'),
    description: t('editor.schedule.rename.description'),
    placeholder: t('editor.schedule.rename.placeholder'),
    hint: t('editor.schedule.rename.hint', { max: scheduleDialogs.draftNameMaxLength }),
    submit: t('editor.schedule.rename.submit')
  },
  cloudSave: {
    title: t('editor.schedule.cloudSave.dialog.title'),
    description: t('editor.schedule.cloudSave.dialog.description'),
    placeholder: t('editor.schedule.cloudSave.dialog.placeholder'),
    hint: t('editor.schedule.cloudSave.dialog.hint', { max: scheduleDialogs.draftNameMaxLength }),
    submit: t('editor.schedule.cloudSave.dialog.submit')
  },
  addInvigilator: {
    title: t('editor.committee.invigilators.add.title'),
    description: t('editor.committee.invigilators.add.description'),
    placeholder: t('editor.committee.invigilators.add.placeholder'),
    hint: t('editor.committee.invigilators.add.hint'),
    submit: t('editor.committee.invigilators.add.submit')
  },
  deleteCommitteeConfirmAction: t('editor.committees.delete.confirmAction'),
  deleteInvigilatorConfirmAction: t('editor.committee.invigilators.delete.confirmAction')
}))

function onCommitteeStringField(payload: EditorCommitteeStringFieldPayload): void {
  switch (payload.field) {
    case 'room':
      committeeFields.updateSelectedCommitteeRoom(payload.value)
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

function setStudentRows(rows: StudentRow[]): void {
  studentTable.selectedStudents.value = rows
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
const panelStudents = computed(() => studentTable.selectedStudents.value)
const panelColumns = computed(() => studentTable.columns.value)
const panelThesisTitleDisplayMode = computed(() => draftSettings.thesisTitleDisplayMode.value)
const panelTableViewMode = computed(() => draftSettings.tableViewMode.value)
const panelInvigilators = computed(() => invigilators.selectedInvigilators.value)
const panelInvigilatorsCountLabel = computed(() => invigilators.invigilatorsCountLabel.value)
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
        @rename-draft="scheduleDialogs.openRenameDraftDialog"
        @search-students="studentSearch.openStudentSearchDialog"
        @save-to-cloud="scheduleDialogs.openCloudSaveDialog"
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
            :highlight-request="panelHighlightRequest"
            @update:students="setStudentRows"
            @committee-string-field="onCommitteeStringField"
            @update:committee-date="committeeFields.updateSelectedCommitteeDate"
            @update:committee-start-minute="committeeFields.updateSelectedCommitteeStartMinute"
            @update:thesis-title-display-mode="draftSettings.updateThesisTitleDisplayMode"
            @update:table-view-mode="draftSettings.updateTableViewMode"
            @update:committee-language="committeeFields.updateSelectedCommitteeLanguage"
            @update:committee-study-program-type="committeeFields.updateSelectedCommitteeStudyProgramType"
            @add-invigilator="invigilators.openAddInvigilatorDialog"
            @delete-invigilator="invigilators.openDeleteInvigilatorConfirm($event)"
            @rename-committee="committeeList.openRenameCommitteeDialog($event)"
            @delete-committee="committeeList.openDeleteCommitteeConfirm($event)"
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
      :schedule-dialogs="scheduleDialogs"
      :copy="dialogCopy"
      :committee-labels="committeeLabels"
    />
  </UContainer>
</template>
