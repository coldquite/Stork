<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { NEW_SCHEDULE_NAME_MAX_LENGTH } from '~/constants/schedule'
import { useDefaultLayoutScheduleActions } from '~/composables/layout/useDefaultLayoutScheduleActions'

const { t } = useI18n()
const authStore = useAuthStore()
const route = useRoute()
const isLogoutDialogOpen = ref(false)
const editorHeaderUi = {
  container: 'max-w-[98vw]'
}

const usernameLabel = computed(() => authStore.username || '-')
const isEditorRoute = computed(() => route.path.startsWith('/editor'))
const headerUi = computed(() => (isEditorRoute.value ? editorHeaderUi : undefined))
const editorBackToHomepageLabel = computed(() => t('editor.navigation.backToHomepage'))
const editorOpenSavedSchedulesLabel = computed(() => t('editor.navigation.openSavedSchedulesTitle'))
const editorCreateScheduleFromImportLabel = computed(() => t('editor.navigation.createScheduleFromImportTitle'))
const teachersDictionaryPageLabel = computed(() => t('teachersDictionary.navigation.openPage'))
const headerActionButtonClass = 'cursor-pointer hover:bg-primary/20 hover:ring-primary/40'
const editorHeaderActionButtonClass = `${headerActionButtonClass} whitespace-nowrap shrink-0`
const teachersDictionaryHeaderButtonClass = `${editorHeaderActionButtonClass} bg-secondary/20 ring-secondary/30 hover:bg-secondary/30 hover:ring-secondary/70`

const {
  manualSchedules,
  autoSchedules,
  isOpenRecentScheduleDialogOpen,
  isOpeningRecentSchedule,
  openRecentScheduleDialogDescription,
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
  isDeletingManualSchedule,
  manualScheduleDeleteError,
  hasMoreManualSchedules,
  hasMoreAutoSchedules,
  newScheduleNameInput,
  newScheduleNameError,
  requestCreateSchedule,
  requestBrowseSchedules,
  requestBrowseSchedulesSearch,
  requestOpenBrowseSchedule,
  requestDeleteBrowseSchedule,
  cancelCreateScheduleConfirm,
  cancelOpenRecentSchedule,
  confirmCreateScheduleConfirm,
  confirmOpenRecentSchedule,
  cancelCreateScheduleDialog,
  submitCreateSchedule,
  submitCreateScheduleImport,
  cancelTeachersDictionaryResolution,
  submitTeachersDictionaryResolution,
  updateTeachersDictionaryResolutionEntry,
  loadMoreManualSchedules,
  loadMoreAutoSchedules
} = useDefaultLayoutScheduleActions()

const logoutButtonLabel = computed(() => {
  return `${t('dashboard.logoutButton')}: ${usernameLabel.value}`
})

function openLogoutDialog(): void {
  if (authStore.isLogoutLoading) {
    return
  }

  isLogoutDialogOpen.value = true
}

async function confirmLogout(): Promise<void> {
  isLogoutDialogOpen.value = false
  await authStore.logout()
}
</script>

<template>
  <div class="flex min-h-dvh min-h-screen flex-col">
    <UHeader class="border-b-2" :ui="headerUi">
      <template #left>
        <div class="flex items-center gap-44">
          <NuxtLink to="/">
            <CommonAppLogo />
          </NuxtLink>

          <div v-if="isEditorRoute" class="flex items-center gap-3">
            <UButton
              to="/"
              color="primary"
              variant="subtle"
              icon="i-lucide-house"
              :aria-label="editorBackToHomepageLabel"
              :class="editorHeaderActionButtonClass"
              :ui="{ leadingIcon: 'text-toned' }"
            >
              {{ editorBackToHomepageLabel }}
            </UButton>

            <UButton
              color="primary"
              variant="subtle"
              icon="i-lucide-circle-plus"
              :aria-label="editorCreateScheduleFromImportLabel"
              :class="editorHeaderActionButtonClass"
              :ui="{ leadingIcon: 'text-toned' }"
              @click="requestCreateSchedule"
            >
              {{ editorCreateScheduleFromImportLabel }}
            </UButton>

            <UButton
              color="primary"
              variant="subtle"
              icon="i-lucide-folder-open"
              :aria-label="editorOpenSavedSchedulesLabel"
              :class="editorHeaderActionButtonClass"
              :ui="{ leadingIcon: 'text-toned' }"
              @click="requestBrowseSchedules"
            >
              {{ editorOpenSavedSchedulesLabel }}
            </UButton>

            <UButton
              to="/teachers-dictionary"
              color="secondary"
              variant="subtle"
              icon="i-lucide-book-user"
              :aria-label="teachersDictionaryPageLabel"
              :class="teachersDictionaryHeaderButtonClass"
              :ui="{ leadingIcon: 'text-toned' }"
            >
              <span class="text-default">{{ teachersDictionaryPageLabel }}</span>
            </UButton>
          </div>
        </div>
      </template>

      <template #right>
        <div class="flex items-center gap-3">
          <UButton
            v-if="!isEditorRoute"
            to="/teachers-dictionary"
            color="secondary"
            variant="subtle"
            icon="i-lucide-book-user"
            :aria-label="teachersDictionaryPageLabel"
            :class="teachersDictionaryHeaderButtonClass"
            :ui="{ leadingIcon: 'text-toned' }"
          >
            <span class="text-default">{{ teachersDictionaryPageLabel }}</span>
          </UButton>

          <UButton
            color="primary"
            variant="subtle"
            icon="i-lucide-log-out"
            :aria-label="logoutButtonLabel"
            :class="headerActionButtonClass"
            :loading="authStore.isLogoutLoading"
            @click="openLogoutDialog"
          >
            <span>{{ `${t('dashboard.logoutButton')}:` }}</span>
            <span class="text-toned">{{ usernameLabel }}</span>
          </UButton>
        </div>

        <ClientOnly>
          <UColorModeButton class="cursor-pointer" />
        </ClientOnly>
      </template>
    </UHeader>

    <CommonAppActionConfirmDialog
      v-model:open="isLogoutDialogOpen"
      :action-label="t('dashboard.logoutButton')"
      :description="t('dashboard.logoutConfirmDescription')"
      :loading="authStore.isLogoutLoading"
      @confirm="confirmLogout"
    />

    <HomepageSchedulesDialog
      v-if="isEditorRoute"
      v-model:open="isBrowseSchedulesDialogOpen"
      :manual-schedules="manualSchedules"
      :auto-schedules="autoSchedules"
      :is-loading="isBrowseSchedulesLoading"
      :search-query="browseSchedulesSearchQuery"
      :is-manual-load-more-loading="isManualLoadMoreLoading"
      :is-auto-load-more-loading="isAutoLoadMoreLoading"
      :is-deleting-manual-schedule="isDeletingManualSchedule"
      :manual-schedule-delete-error="manualScheduleDeleteError"
      :has-more-manual-schedules="hasMoreManualSchedules"
      :has-more-auto-schedules="hasMoreAutoSchedules"
      @open-schedule="requestOpenBrowseSchedule"
      @delete-manual-schedule="requestDeleteBrowseSchedule"
      @search-change="requestBrowseSchedulesSearch"
      @load-more-manual="loadMoreManualSchedules"
      @load-more-auto="loadMoreAutoSchedules"
    />

    <CommonAppActionConfirmDialog
      v-if="isEditorRoute"
      v-model:open="isOpenRecentScheduleDialogOpen"
      :action-label="t('homepage.recent.openScheduleAction')"
      :description="openRecentScheduleDialogDescription"
      :confirm-label="t('homepage.recent.openScheduleAction')"
      :loading="isOpeningRecentSchedule"
      @cancel="cancelOpenRecentSchedule"
      @confirm="confirmOpenRecentSchedule"
    />

    <CommonAppActionConfirmDialog
      v-if="isEditorRoute"
      v-model:open="isCreateScheduleConfirmDialogOpen"
      :action-label="t('homepage.actions.create.confirmAction')"
      :description="t('homepage.actions.create.confirmDescription')"
      :confirm-label="t('homepage.actions.create.confirmAction')"
      :loading="isCreatingNewSchedule"
      @cancel="cancelCreateScheduleConfirm"
      @confirm="confirmCreateScheduleConfirm"
    />

    <ScheduleCreationCreateScheduleDialog
      v-if="isEditorRoute"
      v-model:open="isCreateScheduleDialogOpen"
      v-model:name="newScheduleNameInput"
      :loading="isCreatingNewSchedule"
      :max-length="NEW_SCHEDULE_NAME_MAX_LENGTH"
      :validation-error="newScheduleNameError"
      @cancel="cancelCreateScheduleDialog"
      @submit="submitCreateSchedule"
      @submit-import="submitCreateScheduleImport"
    />

    <ScheduleCreationImportMappingErrorDialog
      v-if="isEditorRoute"
      v-model:open="isImportMappingErrorDialogOpen"
      :error="importMappingError"
    />

    <ScheduleCreationImportTeachersDictionaryResolutionDialog
      v-if="isEditorRoute"
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

    <div class="relative flex-1">
      <CommonHeroBackground />
      <UMain class="relative z-10">
        <slot />
      </UMain>
    </div>

    <LayoutAppSiteFooter class="mt-auto" />
  </div>
</template>
