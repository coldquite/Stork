<script setup lang="ts">
import { HOMEPAGE_NEW_PLAN_NAME_MAX_LENGTH } from '~/composables/useHomepage'

const { t } = useI18n()
const {
  recentPlans,
  isRecentPlansLoading,
  hasRecentPlansError,
  fetchRecentPlans,
  manualDrafts,
  autoDrafts,
  restoreDraftLine,
  restoreDraftUpdatedLine,
  showRestoreCard,
  isOpenRecentPlanDialogOpen,
  isOpeningRecentPlan,
  recentPlanOpenError,
  openRecentPlanDialogDescription,
  requestOpenRecentPlan,
  requestOpenBrowsePlan,
  cancelOpenRecentPlan,
  confirmOpenRecentPlan,
  isCreatePlanConfirmDialogOpen,
  isCreatePlanNameDialogOpen,
  isCreatingNewPlan,
  isBrowsePlansDialogOpen,
  isBrowsePlansLoading,
  isManualLoadMoreLoading,
  isAutoLoadMoreLoading,
  hasMoreManualDrafts,
  hasMoreAutoDrafts,
  newPlanNameInput,
  newPlanNameError,
  requestCreatePlan,
  requestBrowsePlans,
  loadMoreManualDrafts,
  loadMoreAutoDrafts,
  requestRestoreDraft,
  cancelCreatePlanConfirm,
  confirmCreatePlanConfirm,
  cancelCreatePlanNameDialog,
  submitCreatePlanName,
  submitCreatePlanImport
} = useHomepage()

await fetchRecentPlans()
</script>

<template>
  <UContainer class="max-w-5xl py-14">
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
      @create-click="requestCreatePlan"
      @browse-click="requestBrowsePlans"
      @restore-click="requestRestoreDraft"
    />

    <HomepageRecentPlansCard
      :recent-plans="recentPlans"
      :is-recent-plans-loading="isRecentPlansLoading"
      :has-recent-plans-error="hasRecentPlansError"
      :recent-plan-open-error="recentPlanOpenError"
      @open-plan="requestOpenRecentPlan"
    />

    <CommonAppActionConfirmDialog
      v-model:open="isOpenRecentPlanDialogOpen"
      :action-label="t('homepage.recent.openPlanAction')"
      :description="openRecentPlanDialogDescription"
      :confirm-label="t('homepage.recent.openPlanAction')"
      :loading="isOpeningRecentPlan"
      @cancel="cancelOpenRecentPlan"
      @confirm="confirmOpenRecentPlan"
    />

    <CommonAppActionConfirmDialog
      v-model:open="isCreatePlanConfirmDialogOpen"
      :action-label="t('homepage.actions.create.confirmAction')"
      :description="t('homepage.actions.create.confirmDescription')"
      :confirm-label="t('homepage.actions.create.confirmAction')"
      :loading="isCreatingNewPlan"
      @cancel="cancelCreatePlanConfirm"
      @confirm="confirmCreatePlanConfirm"
    />

    <CommonCreatePlanNameDialog
      v-model:open="isCreatePlanNameDialogOpen"
      v-model:name="newPlanNameInput"
      :loading="isCreatingNewPlan"
      :max-length="HOMEPAGE_NEW_PLAN_NAME_MAX_LENGTH"
      :validation-error="newPlanNameError"
      @cancel="cancelCreatePlanNameDialog"
      @submit="submitCreatePlanName"
      @submit-import="submitCreatePlanImport"
    />

    <HomepagePlansDialog
      v-model:open="isBrowsePlansDialogOpen"
      :manual-drafts="manualDrafts"
      :auto-drafts="autoDrafts"
      :is-loading="isBrowsePlansLoading"
      :is-manual-load-more-loading="isManualLoadMoreLoading"
      :is-auto-load-more-loading="isAutoLoadMoreLoading"
      :has-more-manual-drafts="hasMoreManualDrafts"
      :has-more-auto-drafts="hasMoreAutoDrafts"
      @open-plan="requestOpenBrowsePlan"
      @load-more-manual="loadMoreManualDrafts"
      @load-more-auto="loadMoreAutoDrafts"
    />
  </UContainer>
</template>
