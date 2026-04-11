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
import { clearInputFileValue, ingestCsvInputFile } from '~/utils/csv-ingest'
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

export function useImportForm(selectedSzzType: Ref<ImportSzzType>) {
  const { t } = useI18n()

  const importFileStates = ref<ImportFieldStates>(createInitialImportFieldStates())
  const importValidationRequestIds = ref<ImportValidationRequestIds>(createInitialValidationRequestIds())

  const importFileFields = computed(() => getImportFormFieldsBySzzType(selectedSzzType.value))

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

  // Handles file input change end-to-end for one import field:
  // 1) resets/validates basic file constraints (.csv),
  // 2) runs async UTF-8 decode and ignores stale async results via requestId,
  // 3) parses and validates CSV schema,
  // 4) for single-mode imports, auto-switches SZZ type when uploaded student file indicates opposite level,
  //    unless other loaded files already lock the form to current level,
  // 5) resolves target field by dataset/study level and stores parsed data or translated validation error.
  async function handleImportFileChange(event: Event, sourceKey: ImportFieldKey): Promise<void> {
    const previousSourceState = { ...importFileStates.value[sourceKey] }
    const ingestResult = await ingestCsvInputFile({
      event,
      beginValidationRequest: () => incrementValidationRequestId(sourceKey),
      isValidationRequestStale: (requestId) => importValidationRequestIds.value[sourceKey] !== requestId,
      setValidatingState: () => {
        importFileStates.value[sourceKey] = {
          ...createInitialImportFieldState(),
          isValidating: true
        }
      },
      resetStateOnNoFile: () => {
        importFileStates.value[sourceKey] = createInitialImportFieldState()
      },
      parseCsvText: parseImportCsvText,
      isParsedResultSuccess: (
        parsedImport
      ): parsedImport is Extract<ReturnType<typeof parseImportCsvText>, { ok: true }> => parsedImport.ok
    })

    switch (ingestResult.status) {
      case 'no_file':
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
        clearInputFileValue(ingestResult.input)
        return
      }

      if (uploadedStudyLevel !== selectedSzzType.value) {
        if (isSingleModeLevelSwitchBlocked(sourceKey, uploadedStudyLevel)) {
          setFieldError(sourceKey, t(resolveLevelSwitchBlockedMessageKey(uploadedStudyLevel)))
          clearInputFileValue(ingestResult.input)
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
      clearInputFileValue(ingestResult.input)
      return
    }

    if (sourceKey !== targetFieldKey) {
      importFileStates.value[sourceKey] = shouldRestoreSourceFieldState(previousSourceState)
        ? {
            ...previousSourceState,
            isValidating: false
          }
        : createInitialImportFieldState()

      clearInputFileValue(ingestResult.input)
    }

    importFileStates.value[targetFieldKey] = {
      file: selectedFile,
      headers: parsedImport.headers,
      rows: parsedImport.rows,
      error: null,
      isValidating: false
    }
  }

  return {
    importFileFields,
    importFileStates,
    isImportSubmitDisabled,
    handleImportFileChange,
    buildImportPayload,
    resetImportState
  }
}

// Field is ready only when validation finished successfully and parsed CSV data is present
function isFieldStateReady(state: ImportFieldState): boolean {
  return !state.error && !state.isValidating && Boolean(state.file && state.headers && state.rows)
}
