<script setup lang="ts">
import type { useEditorPage } from '~/composables/editor/useEditorPage'
import type { EditorScheduleDialogsCopy } from '~/types/editor'

type EditorPageGroups = ReturnType<typeof useEditorPage>

const props = defineProps<{
  committeeList: EditorPageGroups['committeeList']
  invigilators: EditorPageGroups['invigilators']
  scheduleDialogs: EditorPageGroups['scheduleDialogs']
  copy: EditorScheduleDialogsCopy
}>()

const cl = props.committeeList
const inv = props.invigilators
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

const renameCommitteeDescriptionText = computed(() => cl.renameCommitteeDialogDescription.value)
const renameCommitteeValidationText = computed(() => cl.renameCommitteeValidationError.value)
const renameDraftValidationText = computed(() => sd.renameDraftValidationError.value)
const cloudSaveLoadingFlag = computed(() => sd.isCloudSaveLoading.value)
const cloudSaveValidationText = computed(() => sd.cloudSaveValidationError.value)
const invigilatorValidationText = computed(() => inv.invigilatorValidationError.value)
const createCommitteeValidationText = computed(() => cl.createCommitteeValidationError.value)

const deleteCommitteeDescriptionText = computed(() => cl.deleteCommitteeConfirmDescription.value)
const deleteInvigilatorDescriptionText = computed(() => inv.deleteInvigilatorConfirmDescription.value)
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

  <EditorCommitteeNameModal
    v-model:open="createCommitteeOpen"
    v-model:name="createCommitteeNameModel"
    :title="copy.createCommittee.title"
    :description="copy.createCommittee.description"
    :placeholder="copy.createCommittee.placeholder"
    :hint="copy.createCommittee.hint"
    :submit-label="copy.createCommittee.submit"
    :cancel-label="copy.commonCancel"
    :validation-error="createCommitteeValidationText"
    @cancel="cl.closeCreateCommitteeDialog()"
    @submit="cl.submitCreateCommittee()"
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
</template>
