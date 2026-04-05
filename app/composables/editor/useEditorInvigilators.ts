import type { ScheduleDraftCommittee } from '~/types/schedule-draft'

/**
 * Invigilator list UI state and mutations for the selected committee.
 */
export function useEditorInvigilators(selectedCommittee: ComputedRef<ScheduleDraftCommittee | null>) {
  const { t } = useI18n()

  const isAddInvigilatorDialogOpen = ref(false)
  const newInvigilatorName = ref('')
  const invigilatorValidationError = ref<string | null>(null)
  const isDeleteInvigilatorConfirmOpen = ref(false)
  const deleteInvigilatorIndex = ref<number | null>(null)

  const selectedInvigilators = computed(() => selectedCommittee.value?.invigilators ?? [])

  const invigilatorsCountLabel = computed(() =>
    t('editor.committee.invigilators.count', { count: selectedInvigilators.value.length })
  )

  const deleteInvigilatorTargetName = computed(() => {
    const targetIndex = deleteInvigilatorIndex.value
    if (targetIndex === null) {
      return undefined
    }

    return selectedInvigilators.value[targetIndex]
  })
  const deleteInvigilatorConfirmDescription = computed(() => {
    return t('editor.committee.invigilators.delete.description', { name: deleteInvigilatorTargetName.value })
  })

  watch(newInvigilatorName, () => {
    if (invigilatorValidationError.value) {
      invigilatorValidationError.value = null
    }
  })

  function validateInvigilatorName(nextName: string): string | null {
    const normalizedName = nextName.trim()

    if (normalizedName.length < 1) {
      return t('editor.committee.invigilators.add.validation.required')
    }

    if (nextName !== normalizedName) {
      return t('editor.committee.invigilators.add.validation.leadingTrailingWhitespace')
    }

    return null
  }

  function openDeleteInvigilatorConfirm(invigilatorIndex: number): void {
    const committee = selectedCommittee.value
    if (!committee) {
      return
    }

    if (invigilatorIndex < 0 || invigilatorIndex >= committee.invigilators.length) {
      return
    }

    deleteInvigilatorIndex.value = invigilatorIndex
    isDeleteInvigilatorConfirmOpen.value = true
  }

  function closeDeleteInvigilatorConfirm(): void {
    isDeleteInvigilatorConfirmOpen.value = false
    deleteInvigilatorIndex.value = null
  }

  function openAddInvigilatorDialog(): void {
    if (!selectedCommittee.value) {
      return
    }

    newInvigilatorName.value = ''
    invigilatorValidationError.value = null
    isAddInvigilatorDialogOpen.value = true
  }

  function closeAddInvigilatorDialog(): void {
    isAddInvigilatorDialogOpen.value = false
    newInvigilatorName.value = ''
    invigilatorValidationError.value = null
  }

  function submitAddInvigilator(): void {
    const committee = selectedCommittee.value
    if (!committee) {
      closeAddInvigilatorDialog()
      return
    }

    const validationError = validateInvigilatorName(newInvigilatorName.value)
    if (validationError) {
      invigilatorValidationError.value = validationError
      return
    }

    committee.invigilators.push(newInvigilatorName.value.trim())
    closeAddInvigilatorDialog()
  }

  function submitDeleteInvigilator(): void {
    const committee = selectedCommittee.value
    if (!committee) {
      closeDeleteInvigilatorConfirm()
      return
    }

    const invigilatorIndex = deleteInvigilatorIndex.value
    if (invigilatorIndex === null) {
      closeDeleteInvigilatorConfirm()
      return
    }

    if (invigilatorIndex < 0 || invigilatorIndex >= committee.invigilators.length) {
      closeDeleteInvigilatorConfirm()
      return
    }

    committee.invigilators.splice(invigilatorIndex, 1)
    closeDeleteInvigilatorConfirm()
  }

  return {
    selectedInvigilators,
    invigilatorsCountLabel,
    isAddInvigilatorDialogOpen,
    newInvigilatorName,
    invigilatorValidationError,
    isDeleteInvigilatorConfirmOpen,
    deleteInvigilatorConfirmDescription,
    openAddInvigilatorDialog,
    closeAddInvigilatorDialog,
    openDeleteInvigilatorConfirm,
    closeDeleteInvigilatorConfirm,
    submitAddInvigilator,
    submitDeleteInvigilator
  }
}
