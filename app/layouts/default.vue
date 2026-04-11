<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { NEW_SCHEDULE_NAME_MAX_LENGTH } from '~/constants/schedule'
import { useDefaultLayoutScheduleActions } from '~/composables/layout/useDefaultLayoutScheduleActions'

const { t } = useI18n()
const authStore = useAuthStore()
const route = useRoute()
const isLogoutDialogOpen = ref(false)
const isNavigationDrawerOpen = ref(false)
const editorHeaderUi = {
  container: 'max-w-full min-[1700px]:max-w-[98vw]'
}

const usernameLabel = computed(() => authStore.username || '-')
const isEditorRoute = computed(() => route.path.startsWith('/editor'))
const headerUi = computed(() => (isEditorRoute.value ? editorHeaderUi : undefined))
const editorBackToHomepageLabel = computed(() => t('editor.navigation.backToHomepage'))
const editorOpenSavedSchedulesLabel = computed(() => t('editor.navigation.openSavedSchedulesTitle'))
const editorCreateScheduleFromImportLabel = computed(() => t('editor.navigation.createScheduleFromImportTitle'))
const teachersDictionaryPageLabel = computed(() => t('teachersDictionary.navigation.openPage'))
const userManualPageLabel = computed(() => t('userManual.navigation.openPage'))
const mobileNavigationDrawerTitle = computed(() => t('layout.header.mobileNavigationTitle'))
const mobileNavigationDrawerDescription = computed(() => t('layout.header.mobileNavigationDescription'))
const headerActionButtonClass = 'cursor-pointer hover:bg-primary/20 hover:ring-primary/40'
const editorHeaderActionButtonClass = `${headerActionButtonClass} whitespace-nowrap shrink-0`
const secondaryHeaderButtonClass = `${editorHeaderActionButtonClass} bg-secondary/20 ring-secondary/30 hover:bg-secondary/30 hover:ring-secondary/70`
const logoutHeaderButtonClass = `${headerActionButtonClass} whitespace-nowrap shrink-0`
const logoutButtonLabel = computed(() => {
  return `${t('dashboard.logoutButton')}: ${usernameLabel.value}`
})

const mobileNavigationItems = computed(() => {
  const commonItems = [
    {
      label: teachersDictionaryPageLabel.value,
      icon: 'i-lucide-graduation-cap',
      to: '/teachers-dictionary',
      onSelect: closeNavigationDrawer
    },
    {
      label: userManualPageLabel.value,
      icon: 'i-lucide-book-user',
      to: '/user-manual',
      onSelect: closeNavigationDrawer
    }
  ]

  if (!isEditorRoute.value) {
    return commonItems
  }

  return [
    {
      label: editorBackToHomepageLabel.value,
      icon: 'i-lucide-house',
      to: '/',
      onSelect: closeNavigationDrawer
    },
    {
      label: editorCreateScheduleFromImportLabel.value,
      icon: 'i-lucide-circle-plus',
      onSelect: onNavigationCreateScheduleSelect
    },
    {
      label: editorOpenSavedSchedulesLabel.value,
      icon: 'i-lucide-folder-open',
      onSelect: onNavigationBrowseSchedulesSelect
    },
    ...commonItems
  ]
})

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

function openLogoutDialog(): void {
  if (authStore.isLogoutLoading) {
    return
  }

  isNavigationDrawerOpen.value = false
  isLogoutDialogOpen.value = true
}

function openNavigationDrawer(): void {
  const activeElement = globalThis.document?.activeElement
  if (activeElement instanceof HTMLElement) {
    activeElement.blur()
  }

  isNavigationDrawerOpen.value = true
}

function closeNavigationDrawer(): void {
  isNavigationDrawerOpen.value = false
}

function onNavigationCreateScheduleSelect(event: Event): void {
  event.preventDefault()
  closeNavigationDrawer()
  requestCreateSchedule()
}

function onNavigationBrowseSchedulesSelect(event: Event): void {
  event.preventDefault()
  closeNavigationDrawer()
  requestBrowseSchedules()
}

async function confirmLogout(): Promise<void> {
  isLogoutDialogOpen.value = false
  await authStore.logout()
}
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <UHeader :toggle="false" class="border-b-2" :ui="headerUi">
      <template #left>
        <div class="flex min-w-0 items-center gap-3 min-[1700px]:gap-44">
          <NuxtLink to="/">
            <CommonAppLogo class="origin-left scale-115" />
          </NuxtLink>

          <nav
            v-if="isEditorRoute"
            class="hidden items-center gap-3 min-[1700px]:flex"
            :aria-label="t('layout.header.editorNavigation')"
          >
            <UButton
              to="/"
              color="primary"
              variant="subtle"
              size="xl"
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
              size="xl"
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
              size="xl"
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
              size="xl"
              icon="i-lucide-graduation-cap"
              :aria-label="teachersDictionaryPageLabel"
              :class="secondaryHeaderButtonClass"
              :ui="{ leadingIcon: 'text-toned' }"
            >
              <span class="text-default">{{ teachersDictionaryPageLabel }}</span>
            </UButton>
          </nav>
        </div>
      </template>

      <template #right>
        <nav class="hidden items-center gap-3 min-[1700px]:flex" :aria-label="t('layout.header.mainNavigation')">
          <UButton
            v-if="!isEditorRoute"
            to="/teachers-dictionary"
            color="secondary"
            variant="subtle"
            size="xl"
            icon="i-lucide-graduation-cap"
            :aria-label="teachersDictionaryPageLabel"
            :class="secondaryHeaderButtonClass"
            :ui="{ leadingIcon: 'text-toned' }"
          >
            <span class="text-default">{{ teachersDictionaryPageLabel }}</span>
          </UButton>

          <UButton
            to="/user-manual"
            color="secondary"
            variant="subtle"
            size="xl"
            icon="i-lucide-book-user"
            :aria-label="userManualPageLabel"
            :class="secondaryHeaderButtonClass"
            :ui="{ leadingIcon: 'text-toned' }"
          >
            <span class="text-default">{{ userManualPageLabel }}</span>
          </UButton>

          <UButton
            color="primary"
            variant="subtle"
            size="xl"
            icon="i-lucide-log-out"
            :aria-label="logoutButtonLabel"
            :class="logoutHeaderButtonClass"
            :loading="authStore.isLogoutLoading"
            @click="openLogoutDialog"
          >
            <span>{{ `${t('dashboard.logoutButton')}:` }}</span>
            <span class="text-toned">{{ usernameLabel }}</span>
          </UButton>
        </nav>

        <ClientOnly>
          <UColorModeButton size="xl" class="cursor-pointer" :ui="{ leadingIcon: 'size-6' }" />
        </ClientOnly>
        <UButton
          color="neutral"
          variant="ghost"
          size="xl"
          icon="i-lucide-menu"
          :aria-label="t('layout.header.openNavigation')"
          class="cursor-pointer min-[1700px]:hidden"
          @click="openNavigationDrawer"
        />
      </template>
    </UHeader>

    <UDrawer
      v-model:open="isNavigationDrawerOpen"
      direction="right"
      :handle="false"
      :title="mobileNavigationDrawerTitle"
      :description="mobileNavigationDrawerDescription"
      :ui="{ content: 'max-w-md', body: 'p-4 sm:p-6' }"
    >
      <template #body>
        <div class="space-y-3">
          <UNavigationMenu
            orientation="vertical"
            :items="mobileNavigationItems"
            class="w-full"
            :ui="{
              root: 'w-full',
              list: 'w-full',
              link: 'text-base px-3 py-2.5',
              linkLeadingIcon: 'size-6',
              linkLabel: 'font-medium',
              linkTrailingIcon: 'size-6'
            }"
          />

          <UButton
            color="primary"
            variant="subtle"
            size="xl"
            icon="i-lucide-log-out"
            :aria-label="logoutButtonLabel"
            :class="[logoutHeaderButtonClass, 'hover:!ring-primary/40 w-full justify-start !ring-transparent']"
            :loading="authStore.isLogoutLoading"
            @click="openLogoutDialog"
          >
            <span>{{ `${t('dashboard.logoutButton')}:` }}</span>
            <span class="text-toned">{{ usernameLabel }}</span>
          </UButton>
        </div>
      </template>
    </UDrawer>

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
