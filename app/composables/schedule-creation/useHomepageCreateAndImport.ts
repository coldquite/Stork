import type { Ref } from 'vue'
import type { GetTeachersDictionaryResponseDto } from '#shared/types/teachers-dictionary'
import { normalizeTeachersDictionaryName } from '#shared/utils/teachers-dictionary'
import { useScheduleDraftStore } from '~/stores/schedule-draft'
import type { ImportPayload, ImportSzzType, PreparedImportPayload } from '~/types/import'
import { mapImportPayloadToDraftSource } from '~/utils/import-mapper'
import type { ImportMappingError } from '~/types/import-mapper'
import {
  cloneImportPayload,
  collectTeachersDictionarySeedEntries,
  createTeachersDictionaryLookupMap,
  prepareImportPayloadForMapping,
  type MissingTeachersDictionaryEntry
} from '~/utils/import-teachers-dictionary'
import { extractHttpErrorMessage } from '~/utils/http-error'

type TeachersDictionaryRequestStage = 'seed' | 'fetch'

const CREATE_IMPORT_WORKFLOW_STAGE = {
  IDLE: 'IDLE',
  CREATE_CONFIRM: 'CREATE_CONFIRM',
  CREATE_DIALOG: 'CREATE_DIALOG',
  CREATING_EMPTY_SCHEDULE: 'CREATING_EMPTY_SCHEDULE',
  IMPORTING_SCHEDULE: 'IMPORTING_SCHEDULE',
  TEACHERS_DICTIONARY_RESOLUTION: 'TEACHERS_DICTIONARY_RESOLUTION',
  TEACHERS_DICTIONARY_RESOLUTION_SUBMITTING: 'TEACHERS_DICTIONARY_RESOLUTION_SUBMITTING'
} as const

type CreateImportWorkflowStage = (typeof CREATE_IMPORT_WORKFLOW_STAGE)[keyof typeof CREATE_IMPORT_WORKFLOW_STAGE]

const CREATE_IMPORT_WORKFLOW_TRANSITIONS: Record<CreateImportWorkflowStage, CreateImportWorkflowStage[]> = {
  IDLE: [CREATE_IMPORT_WORKFLOW_STAGE.CREATE_CONFIRM, CREATE_IMPORT_WORKFLOW_STAGE.CREATE_DIALOG],
  CREATE_CONFIRM: [CREATE_IMPORT_WORKFLOW_STAGE.IDLE, CREATE_IMPORT_WORKFLOW_STAGE.CREATE_DIALOG],
  CREATE_DIALOG: [
    CREATE_IMPORT_WORKFLOW_STAGE.IDLE,
    CREATE_IMPORT_WORKFLOW_STAGE.CREATING_EMPTY_SCHEDULE,
    CREATE_IMPORT_WORKFLOW_STAGE.IMPORTING_SCHEDULE
  ],
  CREATING_EMPTY_SCHEDULE: [CREATE_IMPORT_WORKFLOW_STAGE.IDLE, CREATE_IMPORT_WORKFLOW_STAGE.CREATE_DIALOG],
  IMPORTING_SCHEDULE: [
    CREATE_IMPORT_WORKFLOW_STAGE.CREATE_DIALOG,
    CREATE_IMPORT_WORKFLOW_STAGE.IDLE,
    CREATE_IMPORT_WORKFLOW_STAGE.TEACHERS_DICTIONARY_RESOLUTION
  ],
  TEACHERS_DICTIONARY_RESOLUTION: [
    CREATE_IMPORT_WORKFLOW_STAGE.CREATE_DIALOG,
    CREATE_IMPORT_WORKFLOW_STAGE.TEACHERS_DICTIONARY_RESOLUTION_SUBMITTING
  ],
  TEACHERS_DICTIONARY_RESOLUTION_SUBMITTING: [
    CREATE_IMPORT_WORKFLOW_STAGE.TEACHERS_DICTIONARY_RESOLUTION,
    CREATE_IMPORT_WORKFLOW_STAGE.CREATE_DIALOG,
    CREATE_IMPORT_WORKFLOW_STAGE.IDLE
  ]
}

const CREATE_DIALOG_VISIBLE_STAGES = new Set<CreateImportWorkflowStage>([
  CREATE_IMPORT_WORKFLOW_STAGE.CREATE_DIALOG,
  CREATE_IMPORT_WORKFLOW_STAGE.CREATING_EMPTY_SCHEDULE,
  CREATE_IMPORT_WORKFLOW_STAGE.IMPORTING_SCHEDULE,
  CREATE_IMPORT_WORKFLOW_STAGE.TEACHERS_DICTIONARY_RESOLUTION,
  CREATE_IMPORT_WORKFLOW_STAGE.TEACHERS_DICTIONARY_RESOLUTION_SUBMITTING
])

const TEACHERS_DICTIONARY_DIALOG_VISIBLE_STAGES = new Set<CreateImportWorkflowStage>([
  CREATE_IMPORT_WORKFLOW_STAGE.TEACHERS_DICTIONARY_RESOLUTION,
  CREATE_IMPORT_WORKFLOW_STAGE.TEACHERS_DICTIONARY_RESOLUTION_SUBMITTING
])

const BUSY_WORKFLOW_STAGES = new Set<CreateImportWorkflowStage>([
  CREATE_IMPORT_WORKFLOW_STAGE.CREATING_EMPTY_SCHEDULE,
  CREATE_IMPORT_WORKFLOW_STAGE.IMPORTING_SCHEDULE,
  CREATE_IMPORT_WORKFLOW_STAGE.TEACHERS_DICTIONARY_RESOLUTION_SUBMITTING
])

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

  const workflowStage = ref<CreateImportWorkflowStage>(CREATE_IMPORT_WORKFLOW_STAGE.IDLE)
  const newScheduleNameInput = ref('')
  const newScheduleNameError = ref<string | null>(null)

  const isImportMappingErrorDialogOpen = ref(false)
  const importMappingError = ref<ImportMappingError | null>(null)

  const teachersDictionaryResolutionEntries = ref<TeachersDictionaryResolutionEntry[]>([])
  const teachersDictionaryResolutionError = ref<string | null>(null)
  const teachersDictionaryResolutionFieldErrors = ref<Record<string, string>>({})
  const pendingTeachersDictionaryResolutionContext = ref<PendingTeachersDictionaryResolutionContext | null>(null)

  function setWorkflowStage(nextStage: CreateImportWorkflowStage): void {
    const currentStage = workflowStage.value

    if (currentStage !== nextStage) {
      const allowedTransitions = CREATE_IMPORT_WORKFLOW_TRANSITIONS[currentStage] ?? []
      if (import.meta.dev && !allowedTransitions.includes(nextStage)) {
        console.warn(`[create-import-workflow] unexpected transition: ${currentStage} -> ${nextStage}`)
      }
    }

    workflowStage.value = nextStage
  }

  const isCreateScheduleConfirmDialogOpen = computed({
    get() {
      return workflowStage.value === CREATE_IMPORT_WORKFLOW_STAGE.CREATE_CONFIRM
    },
    set(isOpen: boolean) {
      if (isOpen) {
        setWorkflowStage(CREATE_IMPORT_WORKFLOW_STAGE.CREATE_CONFIRM)
        return
      }

      if (workflowStage.value === CREATE_IMPORT_WORKFLOW_STAGE.CREATE_CONFIRM) {
        setWorkflowStage(CREATE_IMPORT_WORKFLOW_STAGE.IDLE)
      }
    }
  })

  const isCreateScheduleDialogOpen = computed({
    get() {
      return CREATE_DIALOG_VISIBLE_STAGES.has(workflowStage.value)
    },
    set(isOpen: boolean) {
      if (isOpen) {
        setWorkflowStage(CREATE_IMPORT_WORKFLOW_STAGE.CREATE_DIALOG)
        return
      }

      if (CREATE_DIALOG_VISIBLE_STAGES.has(workflowStage.value)) {
        setWorkflowStage(CREATE_IMPORT_WORKFLOW_STAGE.IDLE)
      }
    }
  })

  const isTeachersDictionaryResolutionDialogOpen = computed({
    get() {
      return TEACHERS_DICTIONARY_DIALOG_VISIBLE_STAGES.has(workflowStage.value)
    },
    set(isOpen: boolean) {
      if (isOpen) {
        setWorkflowStage(CREATE_IMPORT_WORKFLOW_STAGE.TEACHERS_DICTIONARY_RESOLUTION)
        return
      }

      if (TEACHERS_DICTIONARY_DIALOG_VISIBLE_STAGES.has(workflowStage.value)) {
        clearTeachersDictionaryResolutionState()
        setWorkflowStage(CREATE_IMPORT_WORKFLOW_STAGE.CREATE_DIALOG)
      }
    }
  })

  watch(
    workflowStage,
    (stage) => {
      options.isCreatingNewSchedule.value = BUSY_WORKFLOW_STAGES.has(stage)
    },
    { immediate: true }
  )
  const createImportWorkflowStage = computed(() => workflowStage.value)

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
    setWorkflowStage(CREATE_IMPORT_WORKFLOW_STAGE.CREATE_DIALOG)
  }

  function requestCreateSchedule(): void {
    if (options.isCreatingNewSchedule.value || options.isOpeningRecentSchedule.value) {
      return
    }

    if (scheduleDraftStore.hasDraft) {
      setWorkflowStage(CREATE_IMPORT_WORKFLOW_STAGE.CREATE_CONFIRM)
      return
    }

    openCreateScheduleDialog()
  }

  function cancelCreateScheduleConfirm(): void {
    if (options.isCreatingNewSchedule.value) {
      return
    }

    setWorkflowStage(CREATE_IMPORT_WORKFLOW_STAGE.IDLE)
  }

  function confirmCreateScheduleConfirm(): void {
    if (options.isCreatingNewSchedule.value) {
      return
    }

    openCreateScheduleDialog()
  }

  function cancelCreateScheduleDialog(): void {
    if (options.isCreatingNewSchedule.value) {
      return
    }

    setWorkflowStage(CREATE_IMPORT_WORKFLOW_STAGE.IDLE)
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

    setWorkflowStage(CREATE_IMPORT_WORKFLOW_STAGE.CREATING_EMPTY_SCHEDULE)

    try {
      scheduleDraftStore.initializeNewDraft({ name: newScheduleNameInput.value.trim() })
      setWorkflowStage(CREATE_IMPORT_WORKFLOW_STAGE.IDLE)
      clearImportMappingError()
      await navigateTo('/editor')
    } catch (error: unknown) {
      if (workflowStage.value === CREATE_IMPORT_WORKFLOW_STAGE.CREATING_EMPTY_SCHEDULE) {
        setWorkflowStage(CREATE_IMPORT_WORKFLOW_STAGE.CREATE_DIALOG)
      }
      throw error
    } finally {
      if (workflowStage.value === CREATE_IMPORT_WORKFLOW_STAGE.CREATING_EMPTY_SCHEDULE) {
        setWorkflowStage(CREATE_IMPORT_WORKFLOW_STAGE.CREATE_DIALOG)
      }
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
    payload: PreparedImportPayload
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
    setWorkflowStage(CREATE_IMPORT_WORKFLOW_STAGE.IDLE)
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
    setWorkflowStage(CREATE_IMPORT_WORKFLOW_STAGE.TEACHERS_DICTIONARY_RESOLUTION)
  }

  function cancelTeachersDictionaryResolution(): void {
    if (options.isCreatingNewSchedule.value) {
      return
    }

    clearTeachersDictionaryResolutionState()
    setWorkflowStage(CREATE_IMPORT_WORKFLOW_STAGE.CREATE_DIALOG)
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

    setWorkflowStage(CREATE_IMPORT_WORKFLOW_STAGE.TEACHERS_DICTIONARY_RESOLUTION_SUBMITTING)
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

      const prepareResult = prepareImportPayloadForMapping(pendingContext.payload, pendingContext.dictionaryByLookupKey)
      if (!prepareResult.ok) {
        teachersDictionaryResolutionEntries.value = prepareResult.unresolvedEntries.map((entry) => ({
          ...entry,
          canonicalName: ''
        }))
        teachersDictionaryResolutionFieldErrors.value = {}
        teachersDictionaryResolutionError.value = t(
          'homepage.actions.create.import.teachersDictionaryResolution.unresolvedError'
        )
        setWorkflowStage(CREATE_IMPORT_WORKFLOW_STAGE.TEACHERS_DICTIONARY_RESOLUTION)
        return
      }

      await mapPreparedImportPayload({
        payload: prepareResult.preparedPayload,
        scheduleName: pendingContext.scheduleName,
        szzType: pendingContext.szzType
      })
      if (isImportMappingErrorDialogOpen.value) {
        clearTeachersDictionaryResolutionState()
        setWorkflowStage(CREATE_IMPORT_WORKFLOW_STAGE.CREATE_DIALOG)
      }
    } catch (error: unknown) {
      teachersDictionaryResolutionError.value =
        extractHttpErrorMessage(error) ??
        t('homepage.actions.create.import.teachersDictionaryResolution.submitErrorFallback')
      setWorkflowStage(CREATE_IMPORT_WORKFLOW_STAGE.TEACHERS_DICTIONARY_RESOLUTION)
    } finally {
      if (workflowStage.value === CREATE_IMPORT_WORKFLOW_STAGE.TEACHERS_DICTIONARY_RESOLUTION_SUBMITTING) {
        setWorkflowStage(CREATE_IMPORT_WORKFLOW_STAGE.TEACHERS_DICTIONARY_RESOLUTION)
      }
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

    setWorkflowStage(CREATE_IMPORT_WORKFLOW_STAGE.IMPORTING_SCHEDULE)

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
          setWorkflowStage(CREATE_IMPORT_WORKFLOW_STAGE.CREATE_DIALOG)
          return
        }
      }

      let dictionaryEntries: GetTeachersDictionaryResponseDto
      try {
        dictionaryEntries = await requestFetch<GetTeachersDictionaryResponseDto>('/api/teachers-dictionary')
      } catch (error: unknown) {
        openTeachersDictionaryRequestError('fetch', error)
        setWorkflowStage(CREATE_IMPORT_WORKFLOW_STAGE.CREATE_DIALOG)
        return
      }

      const dictionaryByLookupKey = createTeachersDictionaryLookupMap(dictionaryEntries)
      const prepareResult = prepareImportPayloadForMapping(payload, dictionaryByLookupKey)
      if (!prepareResult.ok) {
        openTeachersDictionaryResolutionDialog(
          {
            scheduleName: newScheduleNameInput.value.trim(),
            szzType: optionsForImport.szzType,
            payload,
            dictionaryByLookupKey
          },
          prepareResult.unresolvedEntries
        )
        return
      }

      await mapPreparedImportPayload({
        payload: prepareResult.preparedPayload,
        scheduleName: newScheduleNameInput.value.trim(),
        szzType: optionsForImport.szzType
      })
    } finally {
      if (workflowStage.value === CREATE_IMPORT_WORKFLOW_STAGE.IMPORTING_SCHEDULE) {
        setWorkflowStage(CREATE_IMPORT_WORKFLOW_STAGE.CREATE_DIALOG)
      }
    }
  }

  return {
    createImportWorkflowStage,
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
