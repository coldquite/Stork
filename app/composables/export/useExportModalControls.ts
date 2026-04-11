import type { Ref } from 'vue'

interface UseExportModalControlsInput {
  loading: Ref<boolean>
  submitDisabled: Ref<boolean>
  loadingLabel: Ref<string>
  open: Ref<boolean>
  emitCancel: () => void
  emitSubmit: () => void
  emitSelectAll: () => void
  emitClearAll: () => void
}

export function useExportModalControls(input: UseExportModalControlsInput) {
  const { t } = useI18n()

  const isLoading = computed(() => input.loading.value)
  const isSubmitDisabled = computed(() => input.submitDisabled.value || isLoading.value)
  const dimmedContainerClass = computed(() => (isLoading.value ? 'pointer-events-none opacity-60' : ''))
  const resolvedLoadingLabel = computed(() => input.loadingLabel.value || t('editor.loading'))

  function runWhenInteractive(action: () => void): void {
    if (isLoading.value) {
      return
    }

    action()
  }

  function handleCancel(): void {
    runWhenInteractive(() => {
      input.open.value = false
      input.emitCancel()
    })
  }

  function handleSubmit(): void {
    if (isSubmitDisabled.value) {
      return
    }

    input.emitSubmit()
  }

  function handleSelectAll(): void {
    runWhenInteractive(() => {
      input.emitSelectAll()
    })
  }

  function handleClearAll(): void {
    runWhenInteractive(() => {
      input.emitClearAll()
    })
  }

  return {
    isLoading,
    isSubmitDisabled,
    dimmedContainerClass,
    resolvedLoadingLabel,
    handleCancel,
    handleSubmit,
    handleSelectAll,
    handleClearAll
  }
}
