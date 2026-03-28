import type { ImportPayload, ImportSzzType } from '~/types/import'

interface ImportedPlanDraft {
  planName: string
  szzType: ImportSzzType
  importedAt: string
  payload: ImportPayload
}

export const useImportStore = defineStore('import', () => {
  const importedPlanDraft = ref<ImportedPlanDraft | null>(null)

  const hasImportedPlanDraft = computed(() => importedPlanDraft.value !== null)

  function setImportedPlanDraft(planName: string, szzType: ImportSzzType, payload: ImportPayload): void {
    importedPlanDraft.value = {
      planName,
      szzType,
      importedAt: new Date().toISOString(),
      payload: structuredClone(payload)
    }
  }

  function clearImportedPlanDraft(): void {
    importedPlanDraft.value = null
  }

  return {
    importedPlanDraft,
    hasImportedPlanDraft,
    setImportedPlanDraft,
    clearImportedPlanDraft
  }
})
