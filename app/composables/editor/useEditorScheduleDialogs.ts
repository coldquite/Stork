import { EDITOR_DRAFT_NAME_MAX_LENGTH } from '~/constants/editor'
import { useValidationField } from '~/composables/useValidationField'
import { useScheduleDraftStore } from '~/stores/schedule-draft'

/**
 * Draft rename and manual cloud-save modal flows (validation + store calls).
 */
export function useEditorScheduleDialogs() {
  const { t } = useI18n()
  const scheduleDraftStore = useScheduleDraftStore()

  const isRenameDraftDialogOpen = ref(false)
  const renameDraftName = ref('')
  const renameDraftValidationError = ref<string | null>(null)
  const isCloudSaveDialogOpen = ref(false)
  const cloudSaveName = ref('')
  const cloudSaveValidationError = ref<string | null>(null)

  const isCloudSaveLoading = computed(() => scheduleDraftStore.isManualSaveLoading)

  useValidationField(renameDraftName, renameDraftValidationError)
  useValidationField(cloudSaveName, cloudSaveValidationError)

  function validateDraftName(nextName: string): string | null {
    const normalizedName = nextName.trim()

    if (normalizedName.length < 1) {
      return t('editor.schedule.rename.validation.required')
    }

    if (nextName !== normalizedName) {
      return t('editor.schedule.rename.validation.leadingTrailingWhitespace')
    }

    if (normalizedName.length > EDITOR_DRAFT_NAME_MAX_LENGTH) {
      return t('editor.schedule.rename.validation.maxLength', { max: EDITOR_DRAFT_NAME_MAX_LENGTH })
    }

    return null
  }

  function openRenameDraftDialog(): void {
    const draft = scheduleDraftStore.draft
    if (!draft) {
      return
    }

    renameDraftName.value = draft.name
    renameDraftValidationError.value = null
    isRenameDraftDialogOpen.value = true
  }

  function closeRenameDraftDialog(): void {
    isRenameDraftDialogOpen.value = false
    renameDraftName.value = ''
    renameDraftValidationError.value = null
  }

  function openCloudSaveDialog(): void {
    const draft = scheduleDraftStore.draft
    if (!draft) {
      return
    }

    cloudSaveName.value = draft.name
    cloudSaveValidationError.value = null
    isCloudSaveDialogOpen.value = true
  }

  function closeCloudSaveDialog(): void {
    if (isCloudSaveLoading.value) {
      return
    }

    isCloudSaveDialogOpen.value = false
    cloudSaveName.value = ''
    cloudSaveValidationError.value = null
  }

  function submitRenameDraft(): void {
    const draft = scheduleDraftStore.draft
    if (!draft) {
      closeRenameDraftDialog()
      return
    }

    const validationError = validateDraftName(renameDraftName.value)
    if (validationError) {
      renameDraftValidationError.value = validationError
      return
    }

    draft.name = renameDraftName.value.trim()
    closeRenameDraftDialog()
  }

  async function submitCloudSave(): Promise<void> {
    if (isCloudSaveLoading.value || scheduleDraftStore.isAutoSaveRunning) {
      return
    }

    const validationError = validateDraftName(cloudSaveName.value)
    if (validationError) {
      cloudSaveValidationError.value = validationError
      return
    }

    const savedSuccessfully = await scheduleDraftStore
      .saveManualDraft(cloudSaveName.value.trim(), true)
      .then(() => true)
      .catch(() => false)

    if (!savedSuccessfully) {
      // `saveManualDraft` sets `manualSaveErrorCode` before rejecting and `useScheduleAutoSaveToasts` shows it
      return
    }

    closeCloudSaveDialog()
  }

  return {
    isRenameDraftDialogOpen,
    renameDraftName,
    renameDraftValidationError,
    isCloudSaveDialogOpen,
    cloudSaveName,
    cloudSaveValidationError,
    isCloudSaveLoading,
    openRenameDraftDialog,
    closeRenameDraftDialog,
    openCloudSaveDialog,
    closeCloudSaveDialog,
    submitRenameDraft,
    submitCloudSave,
    draftNameMaxLength: EDITOR_DRAFT_NAME_MAX_LENGTH
  }
}
