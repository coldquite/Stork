import type { Ref } from 'vue'
import type { GetTeachersDictionaryResponseDto } from '#shared/types/teachers-dictionary'
import { normalizeTeachersDictionaryName } from '#shared/utils/teachers-dictionary'
import { useScheduleDraftStore } from '~/stores/schedule-draft'
import type { ImportPayload, ImportSzzType } from '~/types/import'
import { mapImportPayloadToDraftSource } from '~/utils/import-mapper'
import type { ImportMappingError } from '~/types/import-mapper'
import {
  applyTeachersDictionaryToStudentsCommittees,
  cloneImportPayload,
  collectTeachersDictionarySeedEntries,
  createTeachersDictionaryLookupMap,
  type MissingTeachersDictionaryEntry
} from '~/utils/import-teachers-dictionary'

type TeachersDictionaryRequestStage = 'seed' | 'fetch'

interface TeachersDictionaryResolutionEntry extends MissingTeachersDictionaryEntry {
  canonicalName: string
}

interface PendingTeachersDictionaryResolutionContext {
  planName: string
  szzType: ImportSzzType
  payload: ImportPayload
  dictionaryByLookupKey: Map<string, string>
}

interface UseHomepageCreateAndImportOptions {
  isCreatingNewPlan: Ref<boolean>
  isOpeningRecentPlan: Readonly<Ref<boolean>>
  planNameMaxLength: number
}

export function useHomepageCreateAndImport(options: UseHomepageCreateAndImportOptions) {
  const { t } = useI18n()
  const scheduleDraftStore = useScheduleDraftStore()

  const isCreatePlanConfirmDialogOpen = ref(false)
  const isCreatePlanNameDialogOpen = ref(false)
  const newPlanNameInput = ref('')
  const newPlanNameError = ref<string | null>(null)

  const isImportMappingErrorDialogOpen = ref(false)
  const importMappingError = ref<ImportMappingError | null>(null)

  const isTeachersDictionaryResolutionDialogOpen = ref(false)
  const teachersDictionaryResolutionEntries = ref<TeachersDictionaryResolutionEntry[]>([])
  const teachersDictionaryResolutionError = ref<string | null>(null)
  const teachersDictionaryResolutionFieldErrors = ref<Record<string, string>>({})
  const pendingTeachersDictionaryResolutionContext = ref<PendingTeachersDictionaryResolutionContext | null>(null)

  const isTeachersDictionaryResolutionSubmitDisabled = computed(() => {
    if (options.isCreatingNewPlan.value || teachersDictionaryResolutionEntries.value.length === 0) {
      return true
    }

    return teachersDictionaryResolutionEntries.value.some((entry) => {
      return normalizeTeachersDictionaryName(entry.canonicalName).length === 0
    })
  })

  watch(newPlanNameInput, () => {
    if (newPlanNameError.value) {
      newPlanNameError.value = null
    }
  })

  watch(isCreatePlanNameDialogOpen, (isOpen) => {
    if (!isOpen && !options.isCreatingNewPlan.value) {
      newPlanNameInput.value = ''
      newPlanNameError.value = null
      clearTeachersDictionaryResolutionState()
    }
  })

  function clearImportMappingError(): void {
    importMappingError.value = null
    isImportMappingErrorDialogOpen.value = false
  }

  function clearTeachersDictionaryResolutionState(): void {
    isTeachersDictionaryResolutionDialogOpen.value = false
    teachersDictionaryResolutionEntries.value = []
    teachersDictionaryResolutionError.value = null
    teachersDictionaryResolutionFieldErrors.value = {}
    pendingTeachersDictionaryResolutionContext.value = null
  }

  function collectTeachersDictionaryResolutionFieldErrors(): Record<string, string> {
    const fieldErrors: Record<string, string> = {}

    for (const entry of teachersDictionaryResolutionEntries.value) {
      const canonicalName = normalizeTeachersDictionaryName(entry.canonicalName)
      if (canonicalName.length === 0) {
        continue
      }

      if (canonicalName.includes(',')) {
        fieldErrors[entry.lookupKey] = t(
          'homepage.actions.create.import.teachersDictionaryResolution.invalidCommaFormat'
        )
      }
    }

    return fieldErrors
  }

  function validateNewPlanName(name: string): string | null {
    const trimmedName = name.trim()

    if (trimmedName.length < 1) {
      return t('homepage.actions.create.validation.required')
    }

    if (name !== trimmedName) {
      return t('homepage.actions.create.validation.leadingTrailingWhitespace')
    }

    if (trimmedName.length > options.planNameMaxLength) {
      return t('homepage.actions.create.validation.maxLength', { max: options.planNameMaxLength })
    }

    return null
  }

  function openCreatePlanNameDialog(): void {
    clearImportMappingError()
    clearTeachersDictionaryResolutionState()
    isCreatePlanNameDialogOpen.value = true
  }

  function requestCreatePlan(): void {
    if (options.isCreatingNewPlan.value || options.isOpeningRecentPlan.value) {
      return
    }

    if (scheduleDraftStore.hasDraft) {
      isCreatePlanConfirmDialogOpen.value = true
      return
    }

    openCreatePlanNameDialog()
  }

  function cancelCreatePlanConfirm(): void {
    if (options.isCreatingNewPlan.value) {
      return
    }

    isCreatePlanConfirmDialogOpen.value = false
  }

  function confirmCreatePlanConfirm(): void {
    if (options.isCreatingNewPlan.value) {
      return
    }

    isCreatePlanConfirmDialogOpen.value = false
    openCreatePlanNameDialog()
  }

  function cancelCreatePlanNameDialog(): void {
    if (options.isCreatingNewPlan.value) {
      return
    }

    isCreatePlanNameDialogOpen.value = false
  }

  async function submitCreatePlanName(): Promise<void> {
    if (options.isCreatingNewPlan.value || options.isOpeningRecentPlan.value) {
      return
    }

    const validationError = validateNewPlanName(newPlanNameInput.value)
    if (validationError) {
      newPlanNameError.value = validationError
      return
    }

    options.isCreatingNewPlan.value = true

    try {
      scheduleDraftStore.initializeNewDraft({ name: newPlanNameInput.value.trim() })
      isCreatePlanNameDialogOpen.value = false
      clearImportMappingError()
      await navigateTo('/editor')
    } finally {
      options.isCreatingNewPlan.value = false
    }
  }

  function resolveRequestErrorMessage(error: unknown): string | null {
    if (!error || typeof error !== 'object') {
      return null
    }

    const candidate = error as {
      data?: {
        statusMessage?: string
        message?: string
      }
      statusMessage?: string
      message?: string
    }

    return (
      candidate.data?.statusMessage ?? candidate.data?.message ?? candidate.statusMessage ?? candidate.message ?? null
    )
  }

  function openTeachersDictionaryRequestError(stage: TeachersDictionaryRequestStage, error: unknown): void {
    importMappingError.value = {
      code: 'TEACHERS_DICTIONARY_REQUEST_FAILED',
      datasetKey: 'studentsCommittees',
      fileName: null,
      rowNumber: null,
      column: null,
      context: {
        stage,
        message: resolveRequestErrorMessage(error) ?? t('common.errors.unexpected')
      }
    }
    isImportMappingErrorDialogOpen.value = true
  }

  async function mapPreparedImportPayload(optionsForMapping: {
    payload: ImportPayload
    planName: string
    szzType: ImportSzzType
  }): Promise<void> {
    const mappingResult = mapImportPayloadToDraftSource({
      planName: optionsForMapping.planName,
      szzType: optionsForMapping.szzType,
      payload: optionsForMapping.payload
    })

    if (!mappingResult.ok) {
      importMappingError.value = mappingResult.error
      isImportMappingErrorDialogOpen.value = true
      return
    }

    scheduleDraftStore.initializeFromSource(mappingResult.draft)
    isCreatePlanNameDialogOpen.value = false
    clearTeachersDictionaryResolutionState()
    clearImportMappingError()
    await navigateTo('/editor')
  }

  function openTeachersDictionaryResolutionDialog(
    context: PendingTeachersDictionaryResolutionContext,
    missingEntries: MissingTeachersDictionaryEntry[]
  ): void {
    pendingTeachersDictionaryResolutionContext.value = context
    teachersDictionaryResolutionEntries.value = missingEntries.map((entry) => ({
      ...entry,
      canonicalName: ''
    }))
    teachersDictionaryResolutionError.value = null
    teachersDictionaryResolutionFieldErrors.value = {}
    isTeachersDictionaryResolutionDialogOpen.value = true
  }

  function cancelTeachersDictionaryResolution(): void {
    if (options.isCreatingNewPlan.value) {
      return
    }

    clearTeachersDictionaryResolutionState()
  }

  function updateTeachersDictionaryResolutionEntry(payload: { lookupKey: string; value: string }): void {
    const entry = teachersDictionaryResolutionEntries.value.find(
      (candidate) => candidate.lookupKey === payload.lookupKey
    )
    if (!entry) {
      return
    }

    entry.canonicalName = payload.value

    if (teachersDictionaryResolutionError.value) {
      teachersDictionaryResolutionError.value = null
    }

    if (teachersDictionaryResolutionFieldErrors.value[payload.lookupKey]) {
      const { [payload.lookupKey]: _removedFieldError, ...nextFieldErrors } =
        teachersDictionaryResolutionFieldErrors.value
      teachersDictionaryResolutionFieldErrors.value = nextFieldErrors
    }
  }

  async function submitTeachersDictionaryResolution(): Promise<void> {
    if (options.isCreatingNewPlan.value || isTeachersDictionaryResolutionSubmitDisabled.value) {
      return
    }

    const pendingContext = pendingTeachersDictionaryResolutionContext.value
    if (!pendingContext) {
      return
    }

    const fieldErrors = collectTeachersDictionaryResolutionFieldErrors()
    if (Object.keys(fieldErrors).length > 0) {
      teachersDictionaryResolutionFieldErrors.value = fieldErrors
      return
    }

    teachersDictionaryResolutionFieldErrors.value = {}

    options.isCreatingNewPlan.value = true
    teachersDictionaryResolutionError.value = null
    clearImportMappingError()

    try {
      const manualEntries = teachersDictionaryResolutionEntries.value.map((entry) => {
        const canonicalName = normalizeTeachersDictionaryName(entry.canonicalName)

        return {
          lookupKey: entry.lookupKey,
          canonicalName
        }
      })

      const requestFetch = useRequestFetch()
      await requestFetch('/api/teachers-dictionary/bulk', {
        method: 'PUT',
        body: manualEntries.map((entry) => ({
          canonicalName: entry.canonicalName,
          isCustom: true
        }))
      })

      for (const entry of manualEntries) {
        pendingContext.dictionaryByLookupKey.set(entry.lookupKey, entry.canonicalName)
      }

      const unresolvedEntries = applyTeachersDictionaryToStudentsCommittees(
        pendingContext.payload,
        pendingContext.dictionaryByLookupKey
      )
      if (unresolvedEntries.length > 0) {
        teachersDictionaryResolutionEntries.value = unresolvedEntries.map((entry) => ({
          ...entry,
          canonicalName: ''
        }))
        teachersDictionaryResolutionFieldErrors.value = {}
        teachersDictionaryResolutionError.value = t(
          'homepage.actions.create.import.teachersDictionaryResolution.unresolvedError'
        )
        return
      }

      await mapPreparedImportPayload({
        payload: pendingContext.payload,
        planName: pendingContext.planName,
        szzType: pendingContext.szzType
      })
      if (isImportMappingErrorDialogOpen.value) {
        clearTeachersDictionaryResolutionState()
      }
    } catch (error: unknown) {
      teachersDictionaryResolutionError.value =
        resolveRequestErrorMessage(error) ??
        t('homepage.actions.create.import.teachersDictionaryResolution.submitErrorFallback')
    } finally {
      options.isCreatingNewPlan.value = false
    }
  }

  async function submitCreatePlanImport(optionsForImport: {
    payload: ImportPayload
    szzType: ImportSzzType
  }): Promise<void> {
    if (options.isCreatingNewPlan.value || options.isOpeningRecentPlan.value) {
      return
    }

    const validationError = validateNewPlanName(newPlanNameInput.value)
    if (validationError) {
      newPlanNameError.value = validationError
      return
    }

    options.isCreatingNewPlan.value = true

    try {
      // Ensure loading state is rendered before synchronous mapping starts.
      await nextTick()
      if (import.meta.client) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      }

      clearImportMappingError()
      teachersDictionaryResolutionError.value = null

      const payload = cloneImportPayload(optionsForImport.payload)
      const requestFetch = useRequestFetch()
      const seedEntries = collectTeachersDictionarySeedEntries(payload)
      if (seedEntries.length > 0) {
        try {
          await requestFetch('/api/teachers-dictionary/bulk', {
            method: 'PUT',
            body: seedEntries
          })
        } catch (error: unknown) {
          openTeachersDictionaryRequestError('seed', error)
          return
        }
      }

      let dictionaryEntries: GetTeachersDictionaryResponseDto
      try {
        dictionaryEntries = await requestFetch<GetTeachersDictionaryResponseDto>('/api/teachers-dictionary')
      } catch (error: unknown) {
        openTeachersDictionaryRequestError('fetch', error)
        return
      }

      const dictionaryByLookupKey = createTeachersDictionaryLookupMap(dictionaryEntries)
      const missingEntries = applyTeachersDictionaryToStudentsCommittees(payload, dictionaryByLookupKey)
      if (missingEntries.length > 0) {
        openTeachersDictionaryResolutionDialog(
          {
            planName: newPlanNameInput.value.trim(),
            szzType: optionsForImport.szzType,
            payload,
            dictionaryByLookupKey
          },
          missingEntries
        )
        return
      }

      await mapPreparedImportPayload({
        payload,
        planName: newPlanNameInput.value.trim(),
        szzType: optionsForImport.szzType
      })
    } finally {
      options.isCreatingNewPlan.value = false
    }
  }

  return {
    isCreatePlanConfirmDialogOpen,
    isCreatePlanNameDialogOpen,
    newPlanNameInput,
    newPlanNameError,
    isImportMappingErrorDialogOpen,
    importMappingError,
    isTeachersDictionaryResolutionDialogOpen,
    teachersDictionaryResolutionEntries,
    teachersDictionaryResolutionError,
    teachersDictionaryResolutionFieldErrors,
    isTeachersDictionaryResolutionSubmitDisabled,
    requestCreatePlan,
    cancelCreatePlanConfirm,
    confirmCreatePlanConfirm,
    cancelCreatePlanNameDialog,
    submitCreatePlanName,
    submitCreatePlanImport,
    cancelTeachersDictionaryResolution,
    submitTeachersDictionaryResolution,
    updateTeachersDictionaryResolutionEntry
  }
}
