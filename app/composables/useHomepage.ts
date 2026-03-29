import type { HomepagePlanListItem } from '~/types/homepage'
import { useHomepageBrowsePlans } from '~/composables/homepage/useHomepageBrowsePlans'
import { useHomepageCreateAndImport } from '~/composables/homepage/useHomepageCreateAndImport'
import { useHomepagePlanOpening } from '~/composables/homepage/useHomepagePlanOpening'

export const HOMEPAGE_NEW_PLAN_NAME_MAX_LENGTH = 120

export function useHomepage() {
  const isCreatingNewPlan = ref(false)
  const isOpeningRecentPlan = ref(false)

  const browsePlans = useHomepageBrowsePlans()
  const createAndImport = useHomepageCreateAndImport({
    isCreatingNewPlan,
    isOpeningRecentPlan,
    planNameMaxLength: HOMEPAGE_NEW_PLAN_NAME_MAX_LENGTH
  })
  const planOpening = useHomepagePlanOpening({
    isCreatingNewPlan,
    isOpeningRecentPlan
  })

  function requestOpenBrowsePlan(plan: HomepagePlanListItem): void {
    browsePlans.isBrowsePlansDialogOpen.value = false
    planOpening.requestOpenPlan(plan)
  }

  return {
    recentPlans: planOpening.recentPlans,
    isRecentPlansLoading: planOpening.isRecentPlansLoading,
    hasRecentPlansError: planOpening.hasRecentPlansError,
    fetchRecentPlans: planOpening.fetchRecentPlans,
    manualDrafts: browsePlans.manualDrafts,
    autoDrafts: browsePlans.autoDrafts,
    restoreDraftLine: planOpening.restoreDraftLine,
    restoreDraftUpdatedLine: planOpening.restoreDraftUpdatedLine,
    showRestoreCard: planOpening.showRestoreCard,
    isOpenRecentPlanDialogOpen: planOpening.isOpenRecentPlanDialogOpen,
    isOpeningRecentPlan,
    recentPlanOpenError: planOpening.recentPlanOpenError,
    openRecentPlanDialogDescription: planOpening.openRecentPlanDialogDescription,
    requestOpenRecentPlan: planOpening.requestOpenRecentPlan,
    requestOpenBrowsePlan,
    cancelOpenRecentPlan: planOpening.cancelOpenRecentPlan,
    confirmOpenRecentPlan: planOpening.confirmOpenRecentPlan,
    isCreatePlanConfirmDialogOpen: createAndImport.isCreatePlanConfirmDialogOpen,
    isCreatePlanNameDialogOpen: createAndImport.isCreatePlanNameDialogOpen,
    isCreatingNewPlan,
    isImportMappingErrorDialogOpen: createAndImport.isImportMappingErrorDialogOpen,
    importMappingError: createAndImport.importMappingError,
    isTeachersDictionaryResolutionDialogOpen: createAndImport.isTeachersDictionaryResolutionDialogOpen,
    teachersDictionaryResolutionEntries: createAndImport.teachersDictionaryResolutionEntries,
    teachersDictionaryResolutionError: createAndImport.teachersDictionaryResolutionError,
    teachersDictionaryResolutionFieldErrors: createAndImport.teachersDictionaryResolutionFieldErrors,
    isTeachersDictionaryResolutionSubmitDisabled: createAndImport.isTeachersDictionaryResolutionSubmitDisabled,
    isBrowsePlansDialogOpen: browsePlans.isBrowsePlansDialogOpen,
    isBrowsePlansLoading: browsePlans.isBrowsePlansLoading,
    browsePlansSearchQuery: browsePlans.browsePlansSearchQuery,
    isManualLoadMoreLoading: browsePlans.isManualLoadMoreLoading,
    isAutoLoadMoreLoading: browsePlans.isAutoLoadMoreLoading,
    hasMoreManualDrafts: browsePlans.hasMoreManualDrafts,
    hasMoreAutoDrafts: browsePlans.hasMoreAutoDrafts,
    newPlanNameInput: createAndImport.newPlanNameInput,
    newPlanNameError: createAndImport.newPlanNameError,
    requestCreatePlan: createAndImport.requestCreatePlan,
    requestBrowsePlans: browsePlans.requestBrowsePlans,
    requestBrowsePlansSearch: browsePlans.requestBrowsePlansSearch,
    loadMoreManualDrafts: browsePlans.loadMoreManualDrafts,
    loadMoreAutoDrafts: browsePlans.loadMoreAutoDrafts,
    requestRestoreDraft: planOpening.requestRestoreDraft,
    cancelCreatePlanConfirm: createAndImport.cancelCreatePlanConfirm,
    confirmCreatePlanConfirm: createAndImport.confirmCreatePlanConfirm,
    cancelCreatePlanNameDialog: createAndImport.cancelCreatePlanNameDialog,
    submitCreatePlanName: createAndImport.submitCreatePlanName,
    submitCreatePlanImport: createAndImport.submitCreatePlanImport,
    cancelTeachersDictionaryResolution: createAndImport.cancelTeachersDictionaryResolution,
    submitTeachersDictionaryResolution: createAndImport.submitTeachersDictionaryResolution,
    updateTeachersDictionaryResolutionEntry: createAndImport.updateTeachersDictionaryResolutionEntry
  }
}
