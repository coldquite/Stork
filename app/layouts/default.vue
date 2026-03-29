<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { HOMEPAGE_NEW_PLAN_NAME_MAX_LENGTH, useHomepage } from '~/composables/useHomepage'

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
const editorOpenSavedPlansLabel = computed(() => t('editor.navigation.openSavedPlansTitle'))
const editorCreatePlanFromImportLabel = computed(() => t('editor.navigation.createPlanFromImportTitle'))
const teachersDictionaryPageLabel = computed(() => t('teachersDictionary.navigation.openPage'))
const headerActionButtonClass = 'cursor-pointer hover:bg-primary/20 hover:ring-primary/40'
const editorHeaderActionButtonClass = `${headerActionButtonClass} whitespace-nowrap shrink-0`
const teachersDictionaryHeaderButtonClass = `${editorHeaderActionButtonClass} bg-secondary/20 ring-secondary/30 hover:bg-secondary/30 hover:ring-secondary/70`

const {
  manualDrafts,
  autoDrafts,
  isOpenRecentPlanDialogOpen,
  isOpeningRecentPlan,
  openRecentPlanDialogDescription,
  isCreatePlanConfirmDialogOpen,
  isCreatePlanNameDialogOpen,
  isCreatingNewPlan,
  isImportMappingErrorDialogOpen,
  importMappingError,
  isTeachersDictionaryResolutionDialogOpen,
  teachersDictionaryResolutionEntries,
  teachersDictionaryResolutionFieldErrors,
  teachersDictionaryResolutionError,
  isTeachersDictionaryResolutionSubmitDisabled,
  isBrowsePlansDialogOpen,
  isBrowsePlansLoading,
  browsePlansSearchQuery,
  isManualLoadMoreLoading,
  isAutoLoadMoreLoading,
  hasMoreManualDrafts,
  hasMoreAutoDrafts,
  newPlanNameInput,
  newPlanNameError,
  requestCreatePlan,
  requestBrowsePlans,
  requestBrowsePlansSearch,
  requestOpenBrowsePlan,
  cancelCreatePlanConfirm,
  cancelOpenRecentPlan,
  confirmCreatePlanConfirm,
  confirmOpenRecentPlan,
  cancelCreatePlanNameDialog,
  submitCreatePlanName,
  submitCreatePlanImport,
  cancelTeachersDictionaryResolution,
  submitTeachersDictionaryResolution,
  updateTeachersDictionaryResolutionEntry,
  loadMoreManualDrafts,
  loadMoreAutoDrafts
} = useHomepage()

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
  <div>
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
              :aria-label="editorCreatePlanFromImportLabel"
              :class="editorHeaderActionButtonClass"
              :ui="{ leadingIcon: 'text-toned' }"
              @click="requestCreatePlan"
            >
              {{ editorCreatePlanFromImportLabel }}
            </UButton>

            <UButton
              color="primary"
              variant="subtle"
              icon="i-lucide-folder-open"
              :aria-label="editorOpenSavedPlansLabel"
              :class="editorHeaderActionButtonClass"
              :ui="{ leadingIcon: 'text-toned' }"
              @click="requestBrowsePlans"
            >
              {{ editorOpenSavedPlansLabel }}
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

        <UColorModeButton class="cursor-pointer" />
      </template>
    </UHeader>

    <CommonAppActionConfirmDialog
      v-model:open="isLogoutDialogOpen"
      :action-label="t('dashboard.logoutButton')"
      :description="t('dashboard.logoutConfirmDescription')"
      :loading="authStore.isLogoutLoading"
      @confirm="confirmLogout"
    />

    <HomepagePlansDialog
      v-if="isEditorRoute"
      v-model:open="isBrowsePlansDialogOpen"
      :manual-drafts="manualDrafts"
      :auto-drafts="autoDrafts"
      :is-loading="isBrowsePlansLoading"
      :search-query="browsePlansSearchQuery"
      :is-manual-load-more-loading="isManualLoadMoreLoading"
      :is-auto-load-more-loading="isAutoLoadMoreLoading"
      :has-more-manual-drafts="hasMoreManualDrafts"
      :has-more-auto-drafts="hasMoreAutoDrafts"
      @open-plan="requestOpenBrowsePlan"
      @search-change="requestBrowsePlansSearch"
      @load-more-manual="loadMoreManualDrafts"
      @load-more-auto="loadMoreAutoDrafts"
    />

    <CommonAppActionConfirmDialog
      v-if="isEditorRoute"
      v-model:open="isOpenRecentPlanDialogOpen"
      :action-label="t('homepage.recent.openPlanAction')"
      :description="openRecentPlanDialogDescription"
      :confirm-label="t('homepage.recent.openPlanAction')"
      :loading="isOpeningRecentPlan"
      @cancel="cancelOpenRecentPlan"
      @confirm="confirmOpenRecentPlan"
    />

    <CommonAppActionConfirmDialog
      v-if="isEditorRoute"
      v-model:open="isCreatePlanConfirmDialogOpen"
      :action-label="t('homepage.actions.create.confirmAction')"
      :description="t('homepage.actions.create.confirmDescription')"
      :confirm-label="t('homepage.actions.create.confirmAction')"
      :loading="isCreatingNewPlan"
      @cancel="cancelCreatePlanConfirm"
      @confirm="confirmCreatePlanConfirm"
    />

    <CommonCreatePlanNameDialog
      v-if="isEditorRoute"
      v-model:open="isCreatePlanNameDialogOpen"
      v-model:name="newPlanNameInput"
      :loading="isCreatingNewPlan"
      :max-length="HOMEPAGE_NEW_PLAN_NAME_MAX_LENGTH"
      :validation-error="newPlanNameError"
      @cancel="cancelCreatePlanNameDialog"
      @submit="submitCreatePlanName"
      @submit-import="submitCreatePlanImport"
    />

    <CommonImportMappingErrorDialog
      v-if="isEditorRoute"
      v-model:open="isImportMappingErrorDialogOpen"
      :error="importMappingError"
    />

    <CommonImportTeachersDictionaryResolutionDialog
      v-if="isEditorRoute"
      v-model:open="isTeachersDictionaryResolutionDialogOpen"
      :loading="isCreatingNewPlan"
      :entries="teachersDictionaryResolutionEntries"
      :field-errors="teachersDictionaryResolutionFieldErrors"
      :error="teachersDictionaryResolutionError"
      :submit-disabled="isTeachersDictionaryResolutionSubmitDisabled"
      @cancel="cancelTeachersDictionaryResolution"
      @submit="submitTeachersDictionaryResolution"
      @update-canonical-name="updateTeachersDictionaryResolutionEntry"
    />

    <div class="relative">
      <CommonHeroBackground />
      <UMain class="relative z-10">
        <slot />
      </UMain>
    </div>

    <LayoutAppSiteFooter class="mt-12" />
  </div>
</template>
