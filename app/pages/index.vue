<script setup lang="ts">
import CreateScheduleDialog from '~/components/schedule-creation/CreateScheduleDialog.vue'
import ImportMappingErrorDialog from '~/components/schedule-creation/ImportMappingErrorDialog.vue'
import ImportTeachersDictionaryResolutionDialog from '~/components/schedule-creation/ImportTeachersDictionaryResolutionDialog.vue'
import { NEW_SCHEDULE_NAME_MAX_LENGTH } from '~/constants/schedule'
import { useHomepage } from '~/composables/homepage/useHomepage'

const { t } = useI18n()
const {
  recentSchedules,
  isRecentSchedulesLoading,
  hasRecentSchedulesError,
  fetchRecentSchedules,
  manualSchedules,
  autoSchedules,
  restoreDraftLine,
  restoreDraftUpdatedLine,
  showRestoreCard,
  isOpenRecentScheduleDialogOpen,
  isOpeningRecentSchedule,
  recentScheduleOpenError,
  openRecentScheduleDialogDescription,
  requestOpenRecentSchedule,
  requestOpenBrowseSchedule,
  cancelOpenRecentSchedule,
  confirmOpenRecentSchedule,
  isCreateScheduleConfirmDialogOpen,
  isCreateScheduleDialogOpen,
  isCreatingNewSchedule,
  isImportMappingErrorDialogOpen,
  importMappingError,
  isTeachersDictionaryResolutionDialogOpen,
  teachersDictionaryResolutionEntries,
  teachersDictionaryResolutionFieldErrors,
  teachersDictionaryResolutionError,
  isTeachersDictionaryResolutionSubmitDisabled,
  isBrowseSchedulesDialogOpen,
  isBrowseSchedulesLoading,
  browseSchedulesSearchQuery,
  isManualLoadMoreLoading,
  isAutoLoadMoreLoading,
  hasMoreManualSchedules,
  hasMoreAutoSchedules,
  newScheduleNameInput,
  newScheduleNameError,
  requestCreateSchedule,
  requestBrowseSchedules,
  requestBrowseSchedulesSearch,
  loadMoreManualSchedules,
  loadMoreAutoSchedules,
  requestRestoreDraft,
  cancelCreateScheduleConfirm,
  confirmCreateScheduleConfirm,
  cancelCreateScheduleDialog,
  submitCreateSchedule,
  submitCreateScheduleImport,
  cancelTeachersDictionaryResolution,
  submitTeachersDictionaryResolution,
  updateTeachersDictionaryResolutionEntry
} = useHomepage()

await fetchRecentSchedules()
</script>

<template>
  <UContainer class="max-w-5xl py-14">
    <div v-if="isOpeningRecentSchedule" class="bg-default/70 fixed inset-0 z-50 backdrop-blur-[1px]">
      <CommonAppLoadingState
        :label="t('homepage.recent.openingSchedule')"
        min-height-class="min-h-screen"
        container-class="px-4"
      />
    </div>

    <header class="mb-12 text-center">
      <h1 class="mx-auto mb-3 max-w-[20ch]">
        {{ t('homepage.title') }}
      </h1>
      <p class="text-muted mx-auto max-w-3xl text-lg">
        {{ t('homepage.description') }}
      </p>
    </header>

    <HomepageActionCards
      :restore-draft-line="restoreDraftLine"
      :restore-draft-updated-line="restoreDraftUpdatedLine"
      :show-restore-card="showRestoreCard"
      @create-click="requestCreateSchedule"
      @browse-click="requestBrowseSchedules"
      @restore-click="requestRestoreDraft"
    />

    <HomepageRecentSchedulesCard
      :recent-schedules="recentSchedules"
      :is-recent-schedules-loading="isRecentSchedulesLoading"
      :has-recent-schedules-error="hasRecentSchedulesError"
      :recent-schedule-open-error="recentScheduleOpenError"
      @open-schedule="requestOpenRecentSchedule"
    />

    <CommonAppActionConfirmDialog
      v-model:open="isOpenRecentScheduleDialogOpen"
      :action-label="t('homepage.recent.openScheduleAction')"
      :description="openRecentScheduleDialogDescription"
      :confirm-label="t('homepage.recent.openScheduleAction')"
      :loading="isOpeningRecentSchedule"
      @cancel="cancelOpenRecentSchedule"
      @confirm="confirmOpenRecentSchedule"
    />

    <CommonAppActionConfirmDialog
      v-model:open="isCreateScheduleConfirmDialogOpen"
      :action-label="t('homepage.actions.create.confirmAction')"
      :description="t('homepage.actions.create.confirmDescription')"
      :confirm-label="t('homepage.actions.create.confirmAction')"
      :loading="isCreatingNewSchedule"
      @cancel="cancelCreateScheduleConfirm"
      @confirm="confirmCreateScheduleConfirm"
    />

    <CreateScheduleDialog
      v-model:open="isCreateScheduleDialogOpen"
      v-model:name="newScheduleNameInput"
      :loading="isCreatingNewSchedule"
      :max-length="NEW_SCHEDULE_NAME_MAX_LENGTH"
      :validation-error="newScheduleNameError"
      @cancel="cancelCreateScheduleDialog"
      @submit="submitCreateSchedule"
      @submit-import="submitCreateScheduleImport"
    />

    <ImportMappingErrorDialog v-model:open="isImportMappingErrorDialogOpen" :error="importMappingError" />

    <ImportTeachersDictionaryResolutionDialog
      v-model:open="isTeachersDictionaryResolutionDialogOpen"
      :loading="isCreatingNewSchedule"
      :entries="teachersDictionaryResolutionEntries"
      :field-errors="teachersDictionaryResolutionFieldErrors"
      :error="teachersDictionaryResolutionError"
      :submit-disabled="isTeachersDictionaryResolutionSubmitDisabled"
      @cancel="cancelTeachersDictionaryResolution"
      @submit="submitTeachersDictionaryResolution"
      @update-canonical-name="updateTeachersDictionaryResolutionEntry"
    />

    <HomepageSchedulesDialog
      v-model:open="isBrowseSchedulesDialogOpen"
      :manual-schedules="manualSchedules"
      :auto-schedules="autoSchedules"
      :is-loading="isBrowseSchedulesLoading"
      :search-query="browseSchedulesSearchQuery"
      :is-manual-load-more-loading="isManualLoadMoreLoading"
      :is-auto-load-more-loading="isAutoLoadMoreLoading"
      :has-more-manual-schedules="hasMoreManualSchedules"
      :has-more-auto-schedules="hasMoreAutoSchedules"
      @open-schedule="requestOpenBrowseSchedule"
      @search-change="requestBrowseSchedulesSearch"
      @load-more-manual="loadMoreManualSchedules"
      @load-more-auto="loadMoreAutoSchedules"
    />
  </UContainer>
</template>
