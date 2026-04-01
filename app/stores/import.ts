import type { ImportPayload, ImportSzzType } from '~/types/import'

interface ImportedScheduleDraft {
  scheduleName: string
  szzType: ImportSzzType
  importedAt: string
  payload: ImportPayload
}

export const useImportStore = defineStore('import', () => {
  const importedScheduleDraft = ref<ImportedScheduleDraft | null>(null)

  const hasImportedScheduleDraft = computed(() => importedScheduleDraft.value !== null)

  function setImportedScheduleDraft(scheduleName: string, szzType: ImportSzzType, payload: ImportPayload): void {
    importedScheduleDraft.value = {
      scheduleName,
      szzType,
      importedAt: new Date().toISOString(),
      payload: structuredClone(payload)
    }
  }

  function clearImportedScheduleDraft(): void {
    importedScheduleDraft.value = null
  }

  return {
    importedScheduleDraft,
    hasImportedScheduleDraft,
    setImportedScheduleDraft,
    clearImportedScheduleDraft
  }
})
