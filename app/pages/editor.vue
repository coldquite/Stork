<script setup lang="ts">
import { useEditorPage } from '~/composables/editor/useEditorPage'

definePageMeta({
  middleware: 'editor-draft'
})

const { t } = useI18n()
const {
  committees,
  selectedCommittee,
  selectedCommitteeId,
  selectedCommitteeLabel,
  selectedCommitteeDate,
  isCreateCommitteeDialogOpen,
  createCommitteeName,
  createCommitteeValidationError,
  isRenameCommitteeDialogOpen,
  renameCommitteeName,
  renameCommitteeValidationError,
  isDeleteCommitteeConfirmOpen,
  isRenameDraftDialogOpen,
  renameDraftName,
  renameDraftValidationError,
  isCloudSaveDialogOpen,
  cloudSaveName,
  cloudSaveValidationError,
  committeeTabs,
  selectedStudents,
  columns,
  draftName,
  draftNameMaxLength,
  studentsCountLabel,
  isPageLoading,
  isCloudSaveLoading,
  renameCommitteeDialogDescription,
  deleteCommitteeConfirmDescription,
  openCreateCommitteeDialog,
  closeCreateCommitteeDialog,
  openRenameCommitteeDialog,
  closeRenameCommitteeDialog,
  openDeleteCommitteeConfirm,
  closeDeleteCommitteeConfirm,
  openRenameDraftDialog,
  closeRenameDraftDialog,
  openCloudSaveDialog,
  closeCloudSaveDialog,
  submitCreateCommittee,
  submitRenameCommittee,
  submitDeleteCommittee,
  submitRenameDraft,
  submitCloudSave,
  updateSelectedCommitteeRoom,
  updateSelectedCommitteeDate,
  updateSelectedCommitteeSecretary
} = useEditorPage()

const cardAccentRootClass = 'h-full rounded-none ring-0 shadow-none divide-y-2 divide-default bg-default'
const draftRenameAriaLabel = computed(() => t('editor.schedule.rename.openAriaLabel', { name: draftName.value }))
const cloudSaveAriaLabel = computed(() => t('editor.schedule.cloudSave.ariaLabel', { name: draftName.value }))
</script>

<template>
  <UContainer class="w-[99vw] max-w-none py-10">
    <CommonAppLoadingState v-if="isPageLoading" :label="t('editor.loading')" />

    <div v-else class="space-y-6">
      <EditorPageHeader
        :title="t('editor.title')"
        :draft-name="draftName"
        :back-aria-label="t('editor.navigation.backToHomepage')"
        :rename-aria-label="draftRenameAriaLabel"
        :rename-label="t('editor.schedule.rename.action')"
        :cloud-save-aria-label="cloudSaveAriaLabel"
        :cloud-save-label="t('editor.schedule.cloudSave.action')"
        :cloud-save-loading="isCloudSaveLoading"
        @rename-draft="openRenameDraftDialog"
        @save-to-cloud="openCloudSaveDialog"
      />

      <div class="ring-default overflow-hidden rounded-lg ring-2">
        <div class="divide-default grid divide-y-2 lg:grid-cols-[300px_1fr] lg:divide-x-2 lg:divide-y-0">
          <EditorCommitteesPanel
            :card-root-class="cardAccentRootClass"
            :title="t('editor.committees.title')"
            :sort-hint="t('editor.committees.sortHint')"
            :committees-count="committees.length"
            :selected-committee-id="selectedCommitteeId"
            :committee-tabs="committeeTabs"
            :create-action-label="t('editor.committees.create.openAction')"
            @update:selected-committee-id="selectedCommitteeId = $event"
            @create-committee="openCreateCommitteeDialog"
          />

          <EditorStudentsPanel
            :card-root-class="cardAccentRootClass"
            :selected-committee="selectedCommittee"
            :selected-committee-label="selectedCommitteeLabel"
            :selected-committee-date="selectedCommitteeDate"
            :students-count-label="studentsCountLabel"
            :students="selectedStudents"
            :columns="columns"
            :committee-title-label="t('editor.committee.title')"
            :committee-room-label="t('editor.committee.room')"
            :committee-date-label="t('editor.committee.date')"
            :committee-secretary-label="t('editor.committee.secretary')"
            :students-empty-title="t('editor.students.emptyTitle')"
            :students-empty-description="t('editor.students.emptyDescription')"
            :rename-committee-aria-label="t('editor.committees.rename.openAriaLabel', { name: selectedCommitteeLabel })"
            :delete-committee-aria-label="t('editor.committees.delete.openAriaLabel', { name: selectedCommitteeLabel })"
            @update:students="selectedStudents = $event"
            @update:committee-room="updateSelectedCommitteeRoom"
            @update:committee-date="updateSelectedCommitteeDate"
            @update:committee-secretary="updateSelectedCommitteeSecretary"
            @rename-committee="openRenameCommitteeDialog"
            @delete-committee="openDeleteCommitteeConfirm"
          />
        </div>
      </div>

      <EditorBottomGlow />
    </div>

    <EditorCommitteeNameModal
      :open="isRenameCommitteeDialogOpen"
      :name="renameCommitteeName"
      :title="t('editor.committees.rename.title')"
      :description="renameCommitteeDialogDescription"
      :placeholder="t('editor.committees.rename.placeholder')"
      :hint="t('editor.committees.rename.hint')"
      :submit-label="t('editor.committees.rename.submit')"
      :cancel-label="t('common.confirmDialog.cancel')"
      :validation-error="renameCommitteeValidationError"
      @update:open="isRenameCommitteeDialogOpen = $event"
      @update:name="renameCommitteeName = $event"
      @cancel="closeRenameCommitteeDialog"
      @submit="submitRenameCommittee"
    />

    <EditorCommitteeNameModal
      :open="isRenameDraftDialogOpen"
      :name="renameDraftName"
      :title="t('editor.schedule.rename.title')"
      :description="t('editor.schedule.rename.description')"
      :placeholder="t('editor.schedule.rename.placeholder')"
      :hint="t('editor.schedule.rename.hint', { max: draftNameMaxLength })"
      :submit-label="t('editor.schedule.rename.submit')"
      :cancel-label="t('common.confirmDialog.cancel')"
      :validation-error="renameDraftValidationError"
      @update:open="isRenameDraftDialogOpen = $event"
      @update:name="renameDraftName = $event"
      @cancel="closeRenameDraftDialog"
      @submit="submitRenameDraft"
    />

    <EditorCommitteeNameModal
      :open="isCloudSaveDialogOpen"
      :name="cloudSaveName"
      :title="t('editor.schedule.cloudSave.dialog.title')"
      :description="t('editor.schedule.cloudSave.dialog.description')"
      :placeholder="t('editor.schedule.cloudSave.dialog.placeholder')"
      :hint="t('editor.schedule.cloudSave.dialog.hint', { max: draftNameMaxLength })"
      :submit-label="t('editor.schedule.cloudSave.dialog.submit')"
      :cancel-label="t('common.confirmDialog.cancel')"
      :loading="isCloudSaveLoading"
      :validation-error="cloudSaveValidationError"
      @update:open="isCloudSaveDialogOpen = $event"
      @update:name="cloudSaveName = $event"
      @cancel="closeCloudSaveDialog"
      @submit="submitCloudSave"
    />

    <EditorCommitteeNameModal
      :open="isCreateCommitteeDialogOpen"
      :name="createCommitteeName"
      :title="t('editor.committees.create.title')"
      :description="t('editor.committees.create.description')"
      :placeholder="t('editor.committees.create.placeholder')"
      :hint="t('editor.committees.create.hint')"
      :submit-label="t('editor.committees.create.submit')"
      :cancel-label="t('common.confirmDialog.cancel')"
      :validation-error="createCommitteeValidationError"
      @update:open="isCreateCommitteeDialogOpen = $event"
      @update:name="createCommitteeName = $event"
      @cancel="closeCreateCommitteeDialog"
      @submit="submitCreateCommittee"
    />

    <CommonAppActionConfirmDialog
      v-model:open="isDeleteCommitteeConfirmOpen"
      :action-label="t('editor.committees.delete.confirmAction')"
      :description="deleteCommitteeConfirmDescription"
      :confirm-label="t('editor.committees.delete.confirmAction')"
      @cancel="closeDeleteCommitteeConfirm"
      @confirm="submitDeleteCommittee"
    />
  </UContainer>
</template>
