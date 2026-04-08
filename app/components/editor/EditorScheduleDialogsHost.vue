<script setup lang="ts">
import type { useEditorPage } from '~/composables/editor/useEditorPage'
import type { EditorScheduleDialogsCopy, EditorStudentsPanelCommitteeLabels } from '~/types/editor'

type EditorPageGroups = ReturnType<typeof useEditorPage>

const props = defineProps<{
  committeeList: EditorPageGroups['committeeList']
  invigilators: EditorPageGroups['invigilators']
  committeeItemsActions: EditorPageGroups['committeeItemsActions']
  studentCreation: EditorPageGroups['studentCreation']
  pauseCreation: EditorPageGroups['pauseCreation']
  scheduleDialogs: EditorPageGroups['scheduleDialogs']
  copy: EditorScheduleDialogsCopy
  committeeLabels: EditorStudentsPanelCommitteeLabels
}>()

const cl = props.committeeList
const inv = props.invigilators
const cia = props.committeeItemsActions
const sc = props.studentCreation
const pc = props.pauseCreation
const sd = props.scheduleDialogs

const renameCommitteeOpen = computed({
  get: () => cl.isRenameCommitteeDialogOpen.value,
  set: (v: boolean) => {
    cl.isRenameCommitteeDialogOpen.value = v
  }
})
const renameCommitteeNameModel = computed({
  get: () => cl.renameCommitteeName.value,
  set: (v: string) => {
    cl.renameCommitteeName.value = v
  }
})

const renameDraftOpen = computed({
  get: () => sd.isRenameDraftDialogOpen.value,
  set: (v: boolean) => {
    sd.isRenameDraftDialogOpen.value = v
  }
})
const renameDraftNameModel = computed({
  get: () => sd.renameDraftName.value,
  set: (v: string) => {
    sd.renameDraftName.value = v
  }
})

const cloudSaveOpen = computed({
  get: () => sd.isCloudSaveDialogOpen.value,
  set: (v: boolean) => {
    sd.isCloudSaveDialogOpen.value = v
  }
})
const cloudSaveNameModel = computed({
  get: () => sd.cloudSaveName.value,
  set: (v: string) => {
    sd.cloudSaveName.value = v
  }
})

const addInvigilatorOpen = computed({
  get: () => inv.isAddInvigilatorDialogOpen.value,
  set: (v: boolean) => {
    inv.isAddInvigilatorDialogOpen.value = v
  }
})
const newInvigilatorNameModel = computed({
  get: () => inv.newInvigilatorName.value,
  set: (v: string) => {
    inv.newInvigilatorName.value = v
  }
})

const createCommitteeOpen = computed({
  get: () => cl.isCreateCommitteeDialogOpen.value,
  set: (v: boolean) => {
    cl.isCreateCommitteeDialogOpen.value = v
  }
})
const createCommitteeNameModel = computed({
  get: () => cl.createCommitteeName.value,
  set: (v: string) => {
    cl.createCommitteeName.value = v
  }
})
const createCommitteeDraftModel = computed(() => cl.createCommitteeDraft.value)
const createCommitteeDateLabel = computed(() => cl.createCommitteeDateLabel.value)

const createStudentOpen = computed({
  get: () => sc.isCreateStudentDialogOpen.value,
  set: (v: boolean) => {
    if (v) {
      sc.openCreateStudentDialog()
      return
    }

    sc.closeCreateStudentDialog()
  }
})
const createStudentDraftModel = computed(() => sc.createStudentDraft.value)
const createStudentValidationErrors = computed(() => sc.createStudentValidationErrors.value)
const createStudentCommitteeLabel = computed(() => sc.createStudentCommitteeLabel.value)
const createStudentStudyProgramNameOptions = computed(() => sc.createStudentStudyProgramNameOptions.value)
const createStudentSpecializationOptions = computed(() => sc.createStudentSpecializationOptions.value)

const pauseDialogOpen = computed({
  get: () => pc.isPauseDialogOpen.value,
  set: (v: boolean) => {
    if (v) {
      return
    }

    pc.closePauseDialog()
  }
})
const pauseDialogMode = computed(() => pc.pauseDialogMode.value)
const pauseDraftModel = computed(() => pc.pauseDraft.value)
const pauseValidationErrors = computed(() => pc.pauseValidationErrors.value)

const deleteCommitteeConfirmOpen = computed({
  get: () => cl.isDeleteCommitteeConfirmOpen.value,
  set: (v: boolean) => {
    cl.isDeleteCommitteeConfirmOpen.value = v
  }
})

const deleteInvigilatorConfirmOpen = computed({
  get: () => inv.isDeleteInvigilatorConfirmOpen.value,
  set: (v: boolean) => {
    inv.isDeleteInvigilatorConfirmOpen.value = v
  }
})
const deleteItemConfirmOpen = computed({
  get: () => cia.isDeleteItemConfirmOpen.value,
  set: (v: boolean) => {
    cia.isDeleteItemConfirmOpen.value = v
  }
})
const moveStudentDialogOpen = computed({
  get: () => cia.isMoveStudentDialogOpen.value,
  set: (v: boolean) => {
    if (v) {
      return
    }

    cia.closeMoveStudentDialog()
  }
})

const renameCommitteeDescriptionText = computed(() => cl.renameCommitteeDialogDescription.value)
const renameCommitteeValidationText = computed(() => cl.renameCommitteeValidationError.value)
const renameDraftValidationText = computed(() => sd.renameDraftValidationError.value)
const cloudSaveLoadingFlag = computed(() => sd.isCloudSaveLoading.value)
const cloudSaveValidationText = computed(() => sd.cloudSaveValidationError.value)
const invigilatorValidationText = computed(() => inv.invigilatorValidationError.value)
const createCommitteeValidationText = computed(() => cl.createCommitteeValidationError.value)
const createCommitteeSubmitDisabled = computed(() => cl.isCreateCommitteeSubmitDisabled.value)

const deleteCommitteeDescriptionText = computed(() => cl.deleteCommitteeConfirmDescription.value)
const deleteInvigilatorDescriptionText = computed(() => inv.deleteInvigilatorConfirmDescription.value)
const deleteItemActionLabel = computed(() => cia.deleteItemConfirmActionLabel.value)
const deleteItemDescriptionText = computed(() => cia.deleteItemConfirmDescription.value)
const moveStudentDialogTitle = computed(() => cia.moveStudentDialogTitle.value)
const moveStudentDialogDescriptionText = computed(() => cia.moveStudentDialogDescription.value)
const moveStudentSourceCommitteeId = computed(() => cia.moveStudentSourceCommitteeId.value)
const moveStudentSelectedTargetCommitteeId = computed(() => cia.selectedMoveStudentTargetCommitteeId.value)
const moveStudentCurrentCommitteeBadgeLabel = computed(() => cia.moveStudentCurrentCommitteeBadgeLabel.value)
const moveStudentRewritePreview = computed(() => cia.moveStudentRewritePreview.value)
const moveStudentHasRewriteChanges = computed(() => cia.moveStudentHasRewriteChanges.value)
const moveStudentSubmitLabel = computed(() => cia.moveStudentSubmitLabel.value)
const isMoveStudentSubmitDisabled = computed(() => cia.isMoveStudentSubmitDisabled.value)
</script>

<template>
  <EditorCommitteeNameModal
    v-model:open="renameCommitteeOpen"
    v-model:name="renameCommitteeNameModel"
    :title="copy.renameCommittee.title"
    :description="renameCommitteeDescriptionText"
    :placeholder="copy.renameCommittee.placeholder"
    :hint="copy.renameCommittee.hint"
    :submit-label="copy.renameCommittee.submit"
    :cancel-label="copy.commonCancel"
    :validation-error="renameCommitteeValidationText"
    @cancel="cl.closeRenameCommitteeDialog()"
    @submit="cl.submitRenameCommittee()"
  />

  <EditorCommitteeNameModal
    v-model:open="renameDraftOpen"
    v-model:name="renameDraftNameModel"
    :title="copy.renameDraft.title"
    :description="copy.renameDraft.description"
    :placeholder="copy.renameDraft.placeholder"
    :hint="copy.renameDraft.hint"
    :submit-label="copy.renameDraft.submit"
    :cancel-label="copy.commonCancel"
    :validation-error="renameDraftValidationText"
    @cancel="sd.closeRenameDraftDialog()"
    @submit="sd.submitRenameDraft()"
  />

  <EditorCommitteeNameModal
    v-model:open="cloudSaveOpen"
    v-model:name="cloudSaveNameModel"
    :title="copy.cloudSave.title"
    :description="copy.cloudSave.description"
    :placeholder="copy.cloudSave.placeholder"
    :hint="copy.cloudSave.hint"
    :submit-label="copy.cloudSave.submit"
    :cancel-label="copy.commonCancel"
    :loading="cloudSaveLoadingFlag"
    :validation-error="cloudSaveValidationText"
    @cancel="sd.closeCloudSaveDialog()"
    @submit="sd.submitCloudSave()"
  />

  <EditorCommitteeNameModal
    v-model:open="addInvigilatorOpen"
    v-model:name="newInvigilatorNameModel"
    :title="copy.addInvigilator.title"
    :description="copy.addInvigilator.description"
    :placeholder="copy.addInvigilator.placeholder"
    :hint="copy.addInvigilator.hint"
    :submit-label="copy.addInvigilator.submit"
    :cancel-label="copy.commonCancel"
    :validation-error="invigilatorValidationText"
    @cancel="inv.closeAddInvigilatorDialog()"
    @submit="inv.submitAddInvigilator()"
  />

  <EditorCreateCommitteeModal
    v-model:open="createCommitteeOpen"
    v-model:name="createCommitteeNameModel"
    :title="copy.createCommittee.title"
    :description="copy.createCommittee.description"
    :placeholder="copy.createCommittee.placeholder"
    :hint="copy.createCommittee.hint"
    :submit-label="copy.createCommittee.submit"
    :cancel-label="copy.commonCancel"
    :validation-error="createCommitteeValidationText"
    :submit-disabled="createCommitteeSubmitDisabled"
    :selected-committee="createCommitteeDraftModel"
    :selected-committee-date="createCommitteeDateLabel"
    :date-label="committeeLabels.date"
    :room-label="committeeLabels.room"
    :language-label="committeeLabels.language"
    :language-czech-label="committeeLabels.languageCzech"
    :language-english-label="committeeLabels.languageEnglish"
    :start-time-label="committeeLabels.startTime"
    :start-time-hour-label="committeeLabels.startTimeHour"
    :start-time-minute-label="committeeLabels.startTimeMinute"
    :secretary-label="committeeLabels.secretary"
    :study-program-type-label="committeeLabels.studyProgramType"
    :study-program-type-bachelor-label="committeeLabels.studyProgramTypeBachelor"
    :study-program-type-master-label="committeeLabels.studyProgramTypeMaster"
    :study-program-name-label="committeeLabels.studyProgramName"
    :specialization-code-label="committeeLabels.specializationCode"
    :department-label="committeeLabels.department"
    @committee-string-field="cl.updateCreateCommitteeStringField($event)"
    @update:committee-date="cl.updateCreateCommitteeDate($event)"
    @update:committee-start-minute="cl.updateCreateCommitteeStartMinute($event)"
    @update:committee-language="cl.updateCreateCommitteeLanguage($event)"
    @update:committee-study-program-type="cl.updateCreateCommitteeStudyProgramType($event)"
    @cancel="cl.closeCreateCommitteeDialog()"
    @submit="cl.submitCreateCommittee()"
  />

  <EditorCreateStudentModal
    v-model:open="createStudentOpen"
    :draft="createStudentDraftModel"
    :committee-label="createStudentCommitteeLabel"
    :validation-errors="createStudentValidationErrors"
    :study-program-name-options="createStudentStudyProgramNameOptions"
    :specialization-options="createStudentSpecializationOptions"
    @update:text-field="sc.updateCreateStudentTextField($event.field, $event.value)"
    @update:minutes-field="sc.updateCreateStudentMinutesField($event.field, $event.value)"
    @update:study-language="sc.updateCreateStudentStudyLanguage($event)"
    @update:study-program-type="sc.updateCreateStudentStudyProgramType($event)"
    @update:study-program-name="sc.updateCreateStudentStudyProgramName($event)"
    @update:specialization-code="sc.updateCreateStudentSpecializationCode($event)"
    @update:thesis-language="sc.updateCreateStudentThesisLanguage($event)"
    @update:repeat-type="sc.updateCreateStudentRepeatType($event)"
    @cancel="sc.closeCreateStudentDialog()"
    @submit="sc.submitCreateStudent()"
  />

  <EditorCreatePauseModal
    v-model:open="pauseDialogOpen"
    :mode="pauseDialogMode"
    :draft="pauseDraftModel"
    :validation-errors="pauseValidationErrors"
    @update:pause-type="pc.updatePauseType($event)"
    @update:custom-label-enabled="pc.updatePauseCustomLabelEnabled($event)"
    @update:custom-label="pc.updatePauseCustomLabel($event)"
    @update:duration-minutes="pc.updatePauseDurationMinutes($event)"
    @cancel="pc.closePauseDialog()"
    @submit="pc.submitPauseDialog()"
  />

  <EditorMoveStudentDialog
    v-model:open="moveStudentDialogOpen"
    :title="moveStudentDialogTitle"
    :description="moveStudentDialogDescriptionText"
    :committee-sidebar-items="cl.committeeSidebarItems.value"
    :selected-target-committee-id="moveStudentSelectedTargetCommitteeId"
    :disabled-committee-id="moveStudentSourceCommitteeId"
    :current-committee-badge-label="moveStudentCurrentCommitteeBadgeLabel"
    :cancel-label="copy.commonCancel"
    :submit-label="moveStudentSubmitLabel"
    :submit-disabled="isMoveStudentSubmitDisabled"
    :has-rewrite-changes="moveStudentHasRewriteChanges"
    :rewrite-preview="moveStudentRewritePreview"
    @cancel="cia.closeMoveStudentDialog()"
    @select-committee="cia.selectMoveStudentTargetCommittee($event)"
    @submit="cia.submitMoveStudentToCommittee()"
  />

  <CommonAppActionConfirmDialog
    v-model:open="deleteCommitteeConfirmOpen"
    :action-label="copy.deleteCommitteeConfirmAction"
    :description="deleteCommitteeDescriptionText"
    :confirm-label="copy.deleteCommitteeConfirmAction"
    @cancel="cl.closeDeleteCommitteeConfirm()"
    @confirm="cl.submitDeleteCommittee()"
  />

  <CommonAppActionConfirmDialog
    v-model:open="deleteInvigilatorConfirmOpen"
    :action-label="copy.deleteInvigilatorConfirmAction"
    :description="deleteInvigilatorDescriptionText"
    :confirm-label="copy.deleteInvigilatorConfirmAction"
    @cancel="inv.closeDeleteInvigilatorConfirm()"
    @confirm="inv.submitDeleteInvigilator()"
  />

  <CommonAppActionConfirmDialog
    v-model:open="deleteItemConfirmOpen"
    :action-label="deleteItemActionLabel"
    :description="deleteItemDescriptionText"
    :confirm-label="deleteItemActionLabel"
    @cancel="cia.closeDeleteItemConfirm()"
    @confirm="cia.submitDeleteItem()"
  />
</template>
