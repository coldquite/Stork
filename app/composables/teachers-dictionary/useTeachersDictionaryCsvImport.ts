import type {
  PutTeachersDictionaryBulkResponseDto,
  UpsertTeachersDictionaryEntryDto
} from '#shared/types/teachers-dictionary'
import { extractHttpErrorMessage } from '~/utils/http-error'
import { ingestCsvInputFile } from '~/utils/csv-ingest'
import { parseTeachersDictionaryCsvText } from '~/utils/teachers-dictionary-import'

interface TeachersDictionaryImportState {
  file: File | null
  error: string | null
  entries: UpsertTeachersDictionaryEntryDto[] | null
  isValidating: boolean
}

interface SubmitTeachersDictionaryImportResult {
  ok: boolean
  response: PutTeachersDictionaryBulkResponseDto | null
}

function createInitialImportState(): TeachersDictionaryImportState {
  return {
    file: null,
    error: null,
    entries: null,
    isValidating: false
  }
}

export function useTeachersDictionaryCsvImport() {
  const { t } = useI18n()
  const requestFetch = useRequestFetch()

  const importState = ref<TeachersDictionaryImportState>(createInitialImportState())
  const validationRequestId = ref(0)
  const isSubmitting = ref(false)
  const submitError = ref<string | null>(null)

  const hasImportStateValues = computed(() => {
    const state = importState.value
    return Boolean(state.file || state.error || state.entries || state.isValidating)
  })

  const isSubmitDisabled = computed(() => {
    return isSubmitting.value || importState.value.isValidating || !importState.value.entries
  })

  function resetImportState(): void {
    importState.value = createInitialImportState()
    validationRequestId.value = 0
    submitError.value = null
  }

  function setFileError(message: string): void {
    importState.value = {
      ...createInitialImportState(),
      error: message
    }
  }

  function resolveParseErrorMessage(parsedCsv: ReturnType<typeof parseTeachersDictionaryCsvText>): string {
    if (parsedCsv.ok) {
      return ''
    }

    if (parsedCsv.reason === 'missing_required_headers') {
      return t('teachersDictionary.import.validation.missingColumns', {
        columns: parsedCsv.details.missingHeaders?.join(', ') ?? '-'
      })
    }

    if (parsedCsv.reason === 'empty_rows') {
      return t('teachersDictionary.import.validation.noRows')
    }

    return t('teachersDictionary.import.validation.invalidStructure')
  }

  async function handleImportFileChange(event: Event): Promise<void> {
    submitError.value = null
    const ingestResult = await ingestCsvInputFile({
      event,
      beginValidationRequest: () => {
        validationRequestId.value += 1
        return validationRequestId.value
      },
      isValidationRequestStale: (requestId) => requestId !== validationRequestId.value,
      setValidatingState: () => {
        importState.value = {
          ...createInitialImportState(),
          isValidating: true
        }
      },
      resetStateOnNoFile: () => {
        importState.value = createInitialImportState()
      },
      parseCsvText: parseTeachersDictionaryCsvText,
      isParsedResultSuccess: (
        parsedCsv
      ): parsedCsv is Extract<ReturnType<typeof parseTeachersDictionaryCsvText>, { ok: true }> => parsedCsv.ok
    })

    switch (ingestResult.status) {
      case 'no_file':
      case 'stale':
        return
      case 'invalid_extension':
        setFileError(t('homepage.actions.create.import.validation.invalidExtension'))
        return
      case 'invalid_encoding':
        setFileError(t('homepage.actions.create.import.validation.invalidEncoding'))
        return
      case 'parse_error':
        setFileError(resolveParseErrorMessage(ingestResult.parsedResult))
        return
      case 'success':
        break
    }

    importState.value = {
      file: ingestResult.file,
      error: null,
      entries: ingestResult.parsedResult.entries,
      isValidating: false
    }
  }

  async function submitImport(): Promise<SubmitTeachersDictionaryImportResult> {
    if (isSubmitDisabled.value) {
      return {
        ok: false,
        response: null
      }
    }

    isSubmitting.value = true
    submitError.value = null

    try {
      const response = await requestFetch<PutTeachersDictionaryBulkResponseDto>('/api/teachers-dictionary/bulk', {
        method: 'PUT',
        body: importState.value.entries
      })

      resetImportState()

      return {
        ok: true,
        response
      }
    } catch (error: unknown) {
      submitError.value = extractHttpErrorMessage(error) ?? t('teachersDictionary.import.validation.submitFailed')

      return {
        ok: false,
        response: null
      }
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    importState,
    hasImportStateValues,
    isSubmitDisabled,
    isSubmitting,
    submitError,
    handleImportFileChange,
    resetImportState,
    submitImport
  }
}
