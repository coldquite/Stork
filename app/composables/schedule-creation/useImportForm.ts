// Composable that owns client-side CSV import workflow for schedule creation
// Business logic:
// - manage per-field file states (file, parsed data, errors, validation status),
// - validate selected files (extension, UTF-8, CSV schema),
// - auto-route uploaded file into the correct logical field by detecting dataset/study level,
// - expose submit readiness and build normalized import payload only when all required inputs are ready.

import { getImportFormFieldsBySzzType } from '~/constants/import'
import {
  parseImportCsvText,
  resolveImportTargetFieldKey,
  resolveStudyLevelFromStudentsCommittees,
  resolveStudyLevelFromStudentsStork
} from '~/utils/import'
import { clearInputFileValue, ingestCsvFile } from '~/utils/csv-ingest'
import type {
  ImportCsvRow,
  ImportDataset,
  ImportDatasetKey,
  ImportFieldKey,
  ImportPayload,
  ImportStudyLevel,
  ImportSzzType
} from '~/types/import'

interface ImportFieldState {
  file: File | null // Raw file chosen in the input
  headers: string[] | null // Normalized CSV headers detected for the selected dataset
  rows: ImportCsvRow[] | null // Normalized CSV rows mapped by header name
  error: string | null // Localized validation message shown under the field
  isValidating: boolean // Indicates async validation/parsing is still running
}

type ImportFieldStates = Record<ImportFieldKey, ImportFieldState>
// Per-field counters help ignore old async validation results after user selects a newer file
type ImportValidationRequestIds = Record<ImportFieldKey, number>

const IMPORT_FIELD_KEYS: ImportFieldKey[] = [
  'studentsStorkSingle',
  'studentsCommitteesSingle',
  'studentsStorkBachelor',
  'studentsStorkMaster',
  'studentsCommitteesBachelor',
  'studentsCommitteesMaster',
  'committees'
]
const SINGLE_MODE_FIELD_KEYS: ImportFieldKey[] = ['studentsStorkSingle', 'studentsCommitteesSingle', 'committees']
const SINGLE_MODE_STUDENT_FIELD_KEYS: ImportFieldKey[] = ['studentsStorkSingle', 'studentsCommitteesSingle']
const SINGLE_MODE_MAX_FILES_PER_SELECTION = 3
const MIXED_MODE_MAX_FILES_PER_SELECTION = 5

type ImportPayloadLevelKey = keyof ImportPayload['studentsStork']

function createInitialImportFieldState(): ImportFieldState {
  return {
    file: null,
    headers: null,
    rows: null,
    error: null,
    isValidating: false
  }
}

function shouldRestoreSourceFieldState(state: ImportFieldState): boolean {
  // Used during remapping to decide whether source field should be restored or fully reset.
  return state.file !== null || state.headers !== null || state.rows !== null || state.error !== null
}

// Builds the initial state object for all import file fields from IMPORT_FIELD_KEYS
function createInitialImportFieldStates(): ImportFieldStates {
  return Object.fromEntries(IMPORT_FIELD_KEYS.map((key) => [key, createInitialImportFieldState()])) as ImportFieldStates
}

// Initializes per-field async validation counters to drop stale results from older file selections
function createInitialValidationRequestIds(): ImportValidationRequestIds {
  return Object.fromEntries(IMPORT_FIELD_KEYS.map((key) => [key, 0])) as ImportValidationRequestIds
}

// Creates an immutable snapshot of validated field data for submitted payload
// We intentionally copy arrays/objects to avoid leaking reactive form references:
// after submitting, user can still change file inputs, but previously built payload
// must stay stable and represent exactly what was validated at that moment
function cloneDataset(fieldState: ImportFieldState): ImportDataset {
  return {
    fileName: fieldState.file!.name,
    headers: [...fieldState.headers!],
    rows: fieldState.rows!.map((row) => ({ ...row }))
  }
}

function resolveStudyLevelFromDataset(datasetKey: ImportDatasetKey, rows: ImportCsvRow[]): ImportStudyLevel | null {
  if (datasetKey === 'studentsStork') {
    return resolveStudyLevelFromStudentsStork(rows)
  }

  if (datasetKey === 'studentsCommittees') {
    return resolveStudyLevelFromStudentsCommittees(rows)
  }

  return null
}

function resolveMaxImportFilesPerSelection(szzType: ImportSzzType): number {
  return szzType === 'MIXED' ? MIXED_MODE_MAX_FILES_PER_SELECTION : SINGLE_MODE_MAX_FILES_PER_SELECTION
}

export function useImportForm(selectedSzzType: Ref<ImportSzzType>) {
  const { t } = useI18n()

  const importFileStates = ref<ImportFieldStates>(createInitialImportFieldStates())
  const importValidationRequestIds = ref<ImportValidationRequestIds>(createInitialValidationRequestIds())

  const importFileFields = computed(() => getImportFormFieldsBySzzType(selectedSzzType.value))
  const maxImportFilesPerSelection = computed(() => resolveMaxImportFilesPerSelection(selectedSzzType.value))

  // Keep submitting disabled until every required file field is fully loaded and validated
  const isImportSubmitDisabled = computed(() => {
    return importFileFields.value.some(({ key }) => {
      const state = importFileStates.value[key]
      return !isFieldStateReady(state)
    })
  })

  function resetImportState(): void {
    importFileStates.value = createInitialImportFieldStates()
    importValidationRequestIds.value = createInitialValidationRequestIds()
  }

  // Return field state only if it is fully validated and parsed, otherwise return null
  function getReadyFieldState(key: ImportFieldKey): ImportFieldState | null {
    const state = importFileStates.value[key]
    return isFieldStateReady(state) ? state : null
  }

  // Fill payload for one study level (bachelor or master), fail if any required single-level file is not ready
  function assignSingleLevelPayload(payload: ImportPayload, levelKey: ImportPayloadLevelKey): boolean {
    const studentsStorkSingleState = getReadyFieldState('studentsStorkSingle')
    const studentsCommitteesSingleState = getReadyFieldState('studentsCommitteesSingle')
    if (!studentsStorkSingleState || !studentsCommitteesSingleState) return false

    payload.studentsStork[levelKey] = cloneDataset(studentsStorkSingleState)
    payload.studentsCommittees[levelKey] = cloneDataset(studentsCommitteesSingleState)
    return true
  }

  // Fill payload for mixed SZZ by requiring and assigning separate bachelor/master datasets for both CSV types
  function assignMixedLevelPayload(payload: ImportPayload): boolean {
    const studentsStorkBachelorState = getReadyFieldState('studentsStorkBachelor')
    const studentsStorkMasterState = getReadyFieldState('studentsStorkMaster')
    const studentsCommitteesBachelorState = getReadyFieldState('studentsCommitteesBachelor')
    const studentsCommitteesMasterState = getReadyFieldState('studentsCommitteesMaster')

    if (
      !studentsStorkBachelorState ||
      !studentsStorkMasterState ||
      !studentsCommitteesBachelorState ||
      !studentsCommitteesMasterState
    ) {
      return false
    }

    payload.studentsStork.bachelor = cloneDataset(studentsStorkBachelorState)
    payload.studentsStork.master = cloneDataset(studentsStorkMasterState)
    payload.studentsCommittees.bachelor = cloneDataset(studentsCommitteesBachelorState)
    payload.studentsCommittees.master = cloneDataset(studentsCommitteesMasterState)
    return true
  }

  // Start payload from the mandatory "committees" dataset, without it any import cannot proceed.
  function createPayloadWithCommittees(): ImportPayload | null {
    const committeesState = getReadyFieldState('committees')
    if (!committeesState) return null

    return {
      committees: cloneDataset(committeesState),
      studentsStork: {},
      studentsCommittees: {}
    }
  }

  // Build final import payload by combining mandatory committees data with SZZ-type-specific student datasets
  function buildImportPayload(): ImportPayload | null {
    const payload = createPayloadWithCommittees()
    if (!payload) return null

    if (selectedSzzType.value === 'MIXED') {
      return assignMixedLevelPayload(payload) ? payload : null
    }

    const levelKey: ImportPayloadLevelKey = selectedSzzType.value === 'BACHELOR' ? 'bachelor' : 'master'
    return assignSingleLevelPayload(payload, levelKey) ? payload : null
  }

  // Increment per-field validation token before starting async file validation
  // After await, compare returned token with current one to ignore stale results
  // (e.g., user selected another file before previous validation finished)
  function incrementValidationRequestId(key: ImportFieldKey): number {
    importValidationRequestIds.value[key] += 1
    return importValidationRequestIds.value[key]
  }

  function setFieldError(key: ImportFieldKey, message: string): void {
    importFileStates.value[key] = {
      ...createInitialImportFieldState(),
      error: message
    }
  }

  function clearImportFieldErrors(): void {
    for (const key of IMPORT_FIELD_KEYS) {
      const state = importFileStates.value[key]
      if (!state.error) {
        continue
      }

      if (!state.file && !state.headers && !state.rows && !state.isValidating) {
        importFileStates.value[key] = createInitialImportFieldState()
        continue
      }

      importFileStates.value[key] = {
        ...state,
        error: null
      }
    }
  }

  function countReadySingleModeFieldsExcluding(sourceKey: ImportFieldKey): number {
    return SINGLE_MODE_FIELD_KEYS.filter((key) => key !== sourceKey).filter((key) =>
      isFieldStateReady(importFileStates.value[key])
    ).length
  }

  function hasConflictingSingleModeStudentFile(sourceKey: ImportFieldKey, targetStudyLevel: ImportStudyLevel): boolean {
    for (const key of SINGLE_MODE_STUDENT_FIELD_KEYS) {
      if (key === sourceKey) {
        continue
      }

      const state = importFileStates.value[key]
      if (!isFieldStateReady(state) || !state.rows) {
        continue
      }

      const datasetKey: ImportDatasetKey = key === 'studentsStorkSingle' ? 'studentsStork' : 'studentsCommittees'
      const detectedLevel = resolveStudyLevelFromDataset(datasetKey, state.rows)
      if (!detectedLevel || detectedLevel !== targetStudyLevel) {
        return true
      }
    }

    return false
  }

  function isSingleModeLevelSwitchBlocked(sourceKey: ImportFieldKey, targetStudyLevel: ImportStudyLevel): boolean {
    if (countReadySingleModeFieldsExcluding(sourceKey) >= 2) {
      return true
    }

    return hasConflictingSingleModeStudentFile(sourceKey, targetStudyLevel)
  }

  function resolveLevelSwitchBlockedMessageKey(targetStudyLevel: ImportStudyLevel): string {
    if (targetStudyLevel === 'BACHELOR') {
      return 'homepage.actions.create.import.validation.levelSwitchBlockedBachelor'
    }

    return 'homepage.actions.create.import.validation.levelSwitchBlockedMaster'
  }

  async function handleSingleSelectedFileImport(file: File, sourceKey: ImportFieldKey): Promise<void> {
    const previousSourceState = { ...importFileStates.value[sourceKey] }
    const ingestResult = await ingestCsvFile({
      file,
      beginValidationRequest: () => incrementValidationRequestId(sourceKey),
      isValidationRequestStale: (requestId) => importValidationRequestIds.value[sourceKey] !== requestId,
      setValidatingState: () => {
        importFileStates.value[sourceKey] = {
          ...createInitialImportFieldState(),
          isValidating: true
        }
      },
      parseCsvText: parseImportCsvText,
      isParsedResultSuccess: (
        parsedImport
      ): parsedImport is Extract<ReturnType<typeof parseImportCsvText>, { ok: true }> => parsedImport.ok
    })

    switch (ingestResult.status) {
      case 'stale':
        return
      case 'invalid_extension':
        setFieldError(sourceKey, t('homepage.actions.create.import.validation.invalidExtension'))
        return
      case 'invalid_encoding':
        setFieldError(sourceKey, t('homepage.actions.create.import.validation.invalidEncoding'))
        return
      case 'parse_error':
        setFieldError(sourceKey, t('homepage.actions.create.import.validation.invalidStructure'))
        return
      case 'success':
        break
    }

    const selectedFile = ingestResult.file
    const parsedImport = ingestResult.parsedResult

    if (selectedSzzType.value !== 'MIXED' && parsedImport.datasetKey !== 'committees') {
      const uploadedStudyLevel = resolveStudyLevelFromDataset(parsedImport.datasetKey, parsedImport.rows)
      if (!uploadedStudyLevel) {
        setFieldError(sourceKey, t('homepage.actions.create.import.validation.invalidProgramType'))
        return
      }

      if (uploadedStudyLevel !== selectedSzzType.value) {
        if (isSingleModeLevelSwitchBlocked(sourceKey, uploadedStudyLevel)) {
          setFieldError(sourceKey, t(resolveLevelSwitchBlockedMessageKey(uploadedStudyLevel)))
          return
        }

        selectedSzzType.value = uploadedStudyLevel
      }
    }

    const targetFieldKey = resolveImportTargetFieldKey(
      selectedSzzType.value,
      parsedImport.datasetKey,
      parsedImport.rows
    )
    if (!targetFieldKey) {
      setFieldError(sourceKey, t('homepage.actions.create.import.validation.invalidProgramType'))
      return
    }

    if (sourceKey !== targetFieldKey) {
      importFileStates.value[sourceKey] = shouldRestoreSourceFieldState(previousSourceState)
        ? {
            ...previousSourceState,
            isValidating: false
          }
        : createInitialImportFieldState()
    }

    importFileStates.value[targetFieldKey] = {
      file: selectedFile,
      headers: parsedImport.headers,
      rows: parsedImport.rows,
      error: null,
      isValidating: false
    }
  }

  // Handles file input change for one visual field and supports selecting
  // multiple files in one picker action. Each file is validated independently
  // and then auto-routed to the proper logical field.
  async function handleImportFileChange(event: Event, sourceKey: ImportFieldKey): Promise<void> {
    const input = event.target as HTMLInputElement | null
    const selectedFiles = Array.from(input?.files ?? [])
    clearInputFileValue(input)

    if (selectedFiles.length === 0) {
      importFileStates.value[sourceKey] = createInitialImportFieldState()
      return
    }

    // New upload attempt should not keep stale validation messages from prior attempts.
    clearImportFieldErrors()

    if (selectedFiles.length > maxImportFilesPerSelection.value) {
      setFieldError(
        sourceKey,
        t('homepage.actions.create.import.validation.tooManyFiles', {
          max: maxImportFilesPerSelection.value
        })
      )
      return
    }

    for (const file of selectedFiles) {
      await handleSingleSelectedFileImport(file, sourceKey)
    }
  }

  return {
    importFileFields,
    importFileStates,
    maxImportFilesPerSelection,
    isImportSubmitDisabled,
    clearImportFieldErrors,
    handleImportFileChange,
    buildImportPayload,
    resetImportState
  }
}

// Field is ready only when validation finished successfully and parsed CSV data is present
function isFieldStateReady(state: ImportFieldState): boolean {
  return !state.error && !state.isValidating && Boolean(state.file && state.headers && state.rows)
}
