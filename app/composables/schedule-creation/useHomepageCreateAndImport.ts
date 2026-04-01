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
import { extractHttpErrorMessage } from '~/utils/http-error'

type TeachersDictionaryRequestStage = 'seed' | 'fetch'

interface TeachersDictionaryResolutionEntry extends MissingTeachersDictionaryEntry {
  canonicalName: string
}

interface PendingTeachersDictionaryResolutionContext {
  scheduleName: string
  szzType: ImportSzzType
  payload: ImportPayload
  dictionaryByLookupKey: Map<string, string>
}

interface UseHomepageCreateAndImportOptions {
  isCreatingNewSchedule: Ref<boolean>
  isOpeningRecentSchedule: Readonly<Ref<boolean>>
  scheduleNameMaxLength: number
}

export function useHomepageCreateAndImport(options: UseHomepageCreateAndImportOptions) {
  const { t } = useI18n()
  const scheduleDraftStore = useScheduleDraftStore()

  const isCreateScheduleConfirmDialogOpen = ref(false)
  const isCreateScheduleDialogOpen = ref(false)
  const newScheduleNameInput = ref('')
  const newScheduleNameError = ref<string | null>(null)

  const isImportMappingErrorDialogOpen = ref(false)
  const importMappingError = ref<ImportMappingError | null>(null)

  const isTeachersDictionaryResolutionDialogOpen = ref(false)
  const teachersDictionaryResolutionEntries = ref<TeachersDictionaryResolutionEntry[]>([])
  const teachersDictionaryResolutionError = ref<string | null>(null)
  const teachersDictionaryResolutionFieldErrors = ref<Record<string, string>>({})
  const pendingTeachersDictionaryResolutionContext = ref<PendingTeachersDictionaryResolutionContext | null>(null)

  const isTeachersDictionaryResolutionSubmitDisabled = computed(() => {
    if (options.isCreatingNewSchedule.value || teachersDictionaryResolutionEntries.value.length === 0) {
      return true
    }

    return teachersDictionaryResolutionEntries.value.some((entry) => {
      return normalizeTeachersDictionaryName(entry.canonicalName).length === 0
    })
  })

  watch(newScheduleNameInput, () => {
    if (newScheduleNameError.value) {
      newScheduleNameError.value = null
    }
  })

  watch(isCreateScheduleDialogOpen, (isOpen) => {
    if (!isOpen && !options.isCreatingNewSchedule.value) {
      newScheduleNameInput.value = ''
      newScheduleNameError.value = null
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

  function validateNewScheduleName(name: string): string | null {
    const trimmedName = name.trim()

    if (trimmedName.length < 1) {
      return t('homepage.actions.create.validation.required')
    }

    if (name !== trimmedName) {
      return t('homepage.actions.create.validation.leadingTrailingWhitespace')
    }

    if (trimmedName.length > options.scheduleNameMaxLength) {
      return t('homepage.actions.create.validation.maxLength', { max: options.scheduleNameMaxLength })
    }

    return null
  }

  function openCreateScheduleDialog(): void {
    clearImportMappingError()
    clearTeachersDictionaryResolutionState()
    isCreateScheduleDialogOpen.value = true
  }

  function requestCreateSchedule(): void {
    if (options.isCreatingNewSchedule.value || options.isOpeningRecentSchedule.value) {
      return
    }

    if (scheduleDraftStore.hasDraft) {
      isCreateScheduleConfirmDialogOpen.value = true
      return
    }

    openCreateScheduleDialog()
  }

  function cancelCreateScheduleConfirm(): void {
    if (options.isCreatingNewSchedule.value) {
      return
    }

    isCreateScheduleConfirmDialogOpen.value = false
  }

  function confirmCreateScheduleConfirm(): void {
    if (options.isCreatingNewSchedule.value) {
      return
    }

    isCreateScheduleConfirmDialogOpen.value = false
    openCreateScheduleDialog()
  }

  function cancelCreateScheduleDialog(): void {
    if (options.isCreatingNewSchedule.value) {
      return
    }

    isCreateScheduleDialogOpen.value = false
  }

  async function submitCreateSchedule(): Promise<void> {
    if (options.isCreatingNewSchedule.value || options.isOpeningRecentSchedule.value) {
      return
    }

    const validationError = validateNewScheduleName(newScheduleNameInput.value)
    if (validationError) {
      newScheduleNameError.value = validationError
      return
    }

    options.isCreatingNewSchedule.value = true

    try {
      scheduleDraftStore.initializeNewDraft({ name: newScheduleNameInput.value.trim() })
      isCreateScheduleDialogOpen.value = false
      clearImportMappingError()
      await navigateTo('/editor')
    } finally {
      options.isCreatingNewSchedule.value = false
    }
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
        message: extractHttpErrorMessage(error) ?? t('common.errors.unexpected')
      }
    }
    isImportMappingErrorDialogOpen.value = true
  }

  async function mapPreparedImportPayload(optionsForMapping: {
    payload: ImportPayload
    scheduleName: string
    szzType: ImportSzzType
  }): Promise<void> {
    const mappingResult = mapImportPayloadToDraftSource({
      scheduleName: optionsForMapping.scheduleName,
      szzType: optionsForMapping.szzType,
      payload: optionsForMapping.payload
    })

    if (!mappingResult.ok) {
      importMappingError.value = mappingResult.error
      isImportMappingErrorDialogOpen.value = true
      return
    }

    scheduleDraftStore.initializeFromSource(mappingResult.draft)
    isCreateScheduleDialogOpen.value = false
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
    if (options.isCreatingNewSchedule.value) {
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
    if (options.isCreatingNewSchedule.value || isTeachersDictionaryResolutionSubmitDisabled.value) {
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

    options.isCreatingNewSchedule.value = true
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
        scheduleName: pendingContext.scheduleName,
        szzType: pendingContext.szzType
      })
      if (isImportMappingErrorDialogOpen.value) {
        clearTeachersDictionaryResolutionState()
      }
    } catch (error: unknown) {
      teachersDictionaryResolutionError.value =
        extractHttpErrorMessage(error) ??
        t('homepage.actions.create.import.teachersDictionaryResolution.submitErrorFallback')
    } finally {
      options.isCreatingNewSchedule.value = false
    }
  }

  async function submitCreateScheduleImport(optionsForImport: {
    payload: ImportPayload
    szzType: ImportSzzType
  }): Promise<void> {
    if (options.isCreatingNewSchedule.value || options.isOpeningRecentSchedule.value) {
      return
    }

    const validationError = validateNewScheduleName(newScheduleNameInput.value)
    if (validationError) {
      newScheduleNameError.value = validationError
      return
    }

    options.isCreatingNewSchedule.value = true

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
            scheduleName: newScheduleNameInput.value.trim(),
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
        scheduleName: newScheduleNameInput.value.trim(),
        szzType: optionsForImport.szzType
      })
    } finally {
      options.isCreatingNewSchedule.value = false
    }
  }

  return {
    isCreateScheduleConfirmDialogOpen,
    isCreateScheduleDialogOpen,
    newScheduleNameInput,
    newScheduleNameError,
    isImportMappingErrorDialogOpen,
    importMappingError,
    isTeachersDictionaryResolutionDialogOpen,
    teachersDictionaryResolutionEntries,
    teachersDictionaryResolutionError,
    teachersDictionaryResolutionFieldErrors,
    isTeachersDictionaryResolutionSubmitDisabled,
    requestCreateSchedule,
    cancelCreateScheduleConfirm,
    confirmCreateScheduleConfirm,
    cancelCreateScheduleDialog,
    submitCreateSchedule,
    submitCreateScheduleImport,
    cancelTeachersDictionaryResolution,
    submitTeachersDictionaryResolution,
    updateTeachersDictionaryResolutionEntry
  }
}
