<script setup lang="ts">
import { START_NEW_PLAN_NAME_MAX_LENGTH } from '~/composables/useStartPage'

const { t } = useI18n()
const {
  startStore,
  restoreDraftStatus,
  showRestoreCard,
  isOpenRecentPlanDialogOpen,
  isOpeningRecentPlan,
  recentPlanOpenError,
  openRecentPlanDialogDescription,
  requestOpenRecentPlan,
  cancelOpenRecentPlan,
  confirmOpenRecentPlan,
  isCreatePlanConfirmDialogOpen,
  isCreatePlanNameDialogOpen,
  isCreatingNewPlan,
  newPlanNameInput,
  newPlanNameError,
  requestCreatePlan,
  cancelCreatePlanConfirm,
  confirmCreatePlanConfirm,
  cancelCreatePlanNameDialog,
  submitCreatePlanName
} = useStartPage()

await callOnce('start-recent-plans', async () => {
  await startStore.fetchRecentPlans()
})
</script>

<template>
  <UContainer class="max-w-5xl py-14">
    <header class="mb-12 text-center">
      <h1 class="mx-auto mb-3 max-w-[20ch]">
        {{ t('start.title') }}
      </h1>
      <p class="text-muted mx-auto max-w-3xl text-lg">
        {{ t('start.description') }}
      </p>
    </header>

    <StartActionCards
      :restore-draft-status="restoreDraftStatus"
      :show-restore-card="showRestoreCard"
      @create-click="requestCreatePlan"
    />

    <StartRecentPlansCard
      :recent-plans="startStore.recentPlans"
      :is-recent-plans-loading="startStore.isRecentPlansLoading"
      :has-recent-plans-error="startStore.hasRecentPlansError"
      :recent-plan-open-error="recentPlanOpenError"
      @open-plan="requestOpenRecentPlan"
    />

    <CommonAppActionConfirmDialog
      v-model:open="isOpenRecentPlanDialogOpen"
      :action-label="t('start.recent.openPlanAction')"
      :description="openRecentPlanDialogDescription"
      :confirm-label="t('start.recent.openPlanAction')"
      :loading="isOpeningRecentPlan"
      @cancel="cancelOpenRecentPlan"
      @confirm="confirmOpenRecentPlan"
    />

    <CommonAppActionConfirmDialog
      v-model:open="isCreatePlanConfirmDialogOpen"
      :action-label="t('start.actions.create.confirmAction')"
      :description="t('start.actions.create.confirmDescription')"
      :confirm-label="t('start.actions.create.confirmAction')"
      :loading="isCreatingNewPlan"
      @cancel="cancelCreatePlanConfirm"
      @confirm="confirmCreatePlanConfirm"
    />

    <StartCreatePlanNameDialog
      v-model:open="isCreatePlanNameDialogOpen"
      v-model:name="newPlanNameInput"
      :loading="isCreatingNewPlan"
      :max-length="START_NEW_PLAN_NAME_MAX_LENGTH"
      :validation-error="newPlanNameError"
      @cancel="cancelCreatePlanNameDialog"
      @submit="submitCreatePlanName"
    />
  </UContainer>
</template>
