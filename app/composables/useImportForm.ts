// Composable that owns client-side CSV import workflow for plan creation
// Business logic:
// - manage per-field file states (file, parsed data, errors, validation status),
// - validate selected files (extension, UTF-8, CSV schema),
// - auto-route uploaded file into the correct logical field by detected dataset/study level,
// - expose submit readiness and build normalized import payload only when all required inputs are ready.

import { getImportFormFieldsBySzzType } from '~/constants/import'
import { decodeUtf8File, isCsvFile, parseImportCsvText, resolveImportTargetFieldKey } from '~/utils/import'
import type { ImportCsvRow, ImportDataset, ImportFieldKey, ImportPayload, ImportSzzType } from '~/types/import'

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
  'studentsCapSingle',
  'studentsCommitteesSingle',
  'studentsCapBachelor',
  'studentsCapMaster',
  'studentsCommitteesBachelor',
  'studentsCommitteesMaster',
  'committees'
]

type ImportPayloadLevelKey = keyof ImportPayload['studentsCap']

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

// Creates an immutable snapshot of validated field data for submit payload
// We intentionally copy arrays/objects to avoid leaking reactive form references:
// after submit, user can still change file inputs, but previously built payload
// must stay stable and represent exactly what was validated at that moment
function cloneDataset(fieldState: ImportFieldState): ImportDataset {
  return {
    fileName: fieldState.file!.name,
    headers: [...fieldState.headers!],
    rows: fieldState.rows!.map((row) => ({ ...row }))
  }
}

export function useImportForm(selectedSzzType: Ref<ImportSzzType>) {
  const { t } = useI18n()

  const importFileStates = ref<ImportFieldStates>(createInitialImportFieldStates())
  const importValidationRequestIds = ref<ImportValidationRequestIds>(createInitialValidationRequestIds())

  const importFileFields = computed(() => getImportFormFieldsBySzzType(selectedSzzType.value))

  // Keep submit disabled until every required file field is fully loaded and validated
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
    const studentsCapSingleState = getReadyFieldState('studentsCapSingle')
    const studentsCommitteesSingleState = getReadyFieldState('studentsCommitteesSingle')
    if (!studentsCapSingleState || !studentsCommitteesSingleState) return false

    payload.studentsCap[levelKey] = cloneDataset(studentsCapSingleState)
    payload.studentsCommittees[levelKey] = cloneDataset(studentsCommitteesSingleState)
    return true
  }

  // Fill payload for mixed SZZ by requiring and assigning separate bachelor/master datasets for both CSV types
  function assignMixedLevelPayload(payload: ImportPayload): boolean {
    const studentsCapBachelorState = getReadyFieldState('studentsCapBachelor')
    const studentsCapMasterState = getReadyFieldState('studentsCapMaster')
    const studentsCommitteesBachelorState = getReadyFieldState('studentsCommitteesBachelor')
    const studentsCommitteesMasterState = getReadyFieldState('studentsCommitteesMaster')

    if (
      !studentsCapBachelorState ||
      !studentsCapMasterState ||
      !studentsCommitteesBachelorState ||
      !studentsCommitteesMasterState
    ) {
      return false
    }

    payload.studentsCap.bachelor = cloneDataset(studentsCapBachelorState)
    payload.studentsCap.master = cloneDataset(studentsCapMasterState)
    payload.studentsCommittees.bachelor = cloneDataset(studentsCommitteesBachelorState)
    payload.studentsCommittees.master = cloneDataset(studentsCommitteesMasterState)
    return true
  }

  // Start payload from the mandatory "committees" dataset, without it any import cannot proceed.
  function createPayloadWithCommittees(): ImportPayload | null {
    const committeesState = getReadyFieldState('committees')
    if (!committeesState) return null

    const payload: ImportPayload = {
      committees: cloneDataset(committeesState),
      studentsCap: {},
      studentsCommittees: {}
    }
    return payload
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
  // (e.g. user selected another file before previous validation finished)
  function incrementValidationRequestId(key: ImportFieldKey): number {
    importValidationRequestIds.value[key] += 1
    return importValidationRequestIds.value[key]
  }

  function clearInputFileValue(input: HTMLInputElement | null): void {
    if (input) {
      input.value = ''
    }
  }

  function setFieldError(key: ImportFieldKey, message: string): void {
    importFileStates.value[key] = {
      ...createInitialImportFieldState(),
      error: message
    }
  }

  // Handles file input change end-to-end for one import field:
  // 1) resets/validates basic file constraints (.csv),
  // 2) runs async UTF-8 decode and ignores stale async results via requestId,
  // 3) parses and validates CSV schema,
  // 4) resolves the correct target field by detected dataset/study level,
  // 5) moves parsed data into target field state (or sets translated validation error),
  // so the UI always reflects a consistent, race-safe import state (at least I hope it does :D)
  async function handleImportFileChange(event: Event, sourceKey: ImportFieldKey): Promise<void> {
    const input = event.target as HTMLInputElement | null
    const selectedFile = input?.files?.[0] ?? null
    const previousSourceState = { ...importFileStates.value[sourceKey] }
    const requestId = incrementValidationRequestId(sourceKey)

    if (!selectedFile) {
      importFileStates.value[sourceKey] = createInitialImportFieldState()
      return
    }

    if (!isCsvFile(selectedFile)) {
      setFieldError(sourceKey, t('homepage.actions.create.import.validation.invalidExtension'))
      clearInputFileValue(input)
      return
    }

    importFileStates.value[sourceKey] = {
      ...createInitialImportFieldState(),
      isValidating: true
    }

    const decodedContent = await decodeUtf8File(selectedFile)
    if (importValidationRequestIds.value[sourceKey] !== requestId) {
      return
    }

    if (!decodedContent) {
      setFieldError(sourceKey, t('homepage.actions.create.import.validation.invalidEncoding'))
      clearInputFileValue(input)
      return
    }

    const parsedImport = parseImportCsvText(decodedContent)
    if (!parsedImport.ok) {
      setFieldError(sourceKey, t('homepage.actions.create.import.validation.invalidStructure'))
      clearInputFileValue(input)
      return
    }

    const targetFieldKey = resolveImportTargetFieldKey(
      selectedSzzType.value,
      parsedImport.datasetKey,
      parsedImport.rows
    )
    if (!targetFieldKey) {
      setFieldError(sourceKey, t('homepage.actions.create.import.validation.invalidProgramType'))
      clearInputFileValue(input)
      return
    }

    if (sourceKey !== targetFieldKey) {
      importFileStates.value[sourceKey] = shouldRestoreSourceFieldState(previousSourceState)
        ? {
            ...previousSourceState,
            isValidating: false
          }
        : createInitialImportFieldState()

      clearInputFileValue(input)
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
