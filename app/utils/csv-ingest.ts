import { decodeUtf8File, isCsvFile } from '~/utils/import'

type CsvIngestStatus = 'no_file' | 'stale' | 'invalid_extension' | 'invalid_encoding' | 'parse_error' | 'success'

interface CsvIngestBaseResult {
  status: CsvIngestStatus
}

interface CsvIngestInvalidExtensionResult extends CsvIngestBaseResult {
  status: 'invalid_extension'
  input: HTMLInputElement | null
}

interface CsvIngestInvalidEncodingResult extends CsvIngestBaseResult {
  status: 'invalid_encoding'
  input: HTMLInputElement | null
}

interface CsvIngestParseErrorResult<ParsedResult> extends CsvIngestBaseResult {
  status: 'parse_error'
  input: HTMLInputElement | null
  parsedResult: ParsedResult
}

interface CsvIngestSuccessResult<ParsedSuccessResult> extends CsvIngestBaseResult {
  status: 'success'
  input: HTMLInputElement | null
  file: File
  parsedResult: ParsedSuccessResult
}

interface CsvIngestNoFileResult extends CsvIngestBaseResult {
  status: 'no_file'
}

interface CsvIngestStaleResult extends CsvIngestBaseResult {
  status: 'stale'
}

export type IngestCsvInputFileResult<ParsedResult, ParsedSuccessResult extends ParsedResult> =
  | CsvIngestNoFileResult
  | CsvIngestStaleResult
  | CsvIngestInvalidExtensionResult
  | CsvIngestInvalidEncodingResult
  | CsvIngestParseErrorResult<ParsedResult>
  | CsvIngestSuccessResult<ParsedSuccessResult>

interface IngestCsvInputFileOptions<ParsedResult, ParsedSuccessResult extends ParsedResult> {
  event: Event
  beginValidationRequest: () => number
  isValidationRequestStale: (requestId: number) => boolean
  setValidatingState: () => void
  resetStateOnNoFile: () => void
  parseCsvText: (content: string) => ParsedResult
  isParsedResultSuccess: (parsedResult: ParsedResult) => parsedResult is ParsedSuccessResult
}

interface IngestCsvFileOptions<ParsedResult, ParsedSuccessResult extends ParsedResult> {
  file: File
  beginValidationRequest: () => number
  isValidationRequestStale: (requestId: number) => boolean
  setValidatingState: () => void
  parseCsvText: (content: string) => ParsedResult
  isParsedResultSuccess: (parsedResult: ParsedResult) => parsedResult is ParsedSuccessResult
}

export type IngestCsvFileResult<ParsedResult, ParsedSuccessResult extends ParsedResult> =
  | CsvIngestStaleResult
  | CsvIngestInvalidExtensionResult
  | CsvIngestInvalidEncodingResult
  | CsvIngestParseErrorResult<ParsedResult>
  | CsvIngestSuccessResult<ParsedSuccessResult>

export function clearInputFileValue(input: HTMLInputElement | null): void {
  if (!input) {
    return
  }

  input.value = ''
}

async function ingestCsvFileInternal<ParsedResult, ParsedSuccessResult extends ParsedResult>(
  options: IngestCsvFileOptions<ParsedResult, ParsedSuccessResult>,
  input: HTMLInputElement | null
): Promise<IngestCsvFileResult<ParsedResult, ParsedSuccessResult>> {
  const requestId = options.beginValidationRequest()

  if (!isCsvFile(options.file)) {
    return {
      status: 'invalid_extension',
      input
    }
  }

  options.setValidatingState()

  const decodedContent = await decodeUtf8File(options.file)
  if (options.isValidationRequestStale(requestId)) {
    return { status: 'stale' }
  }

  if (!decodedContent) {
    return {
      status: 'invalid_encoding',
      input
    }
  }

  const parsedResult = options.parseCsvText(decodedContent)
  if (!options.isParsedResultSuccess(parsedResult)) {
    return {
      status: 'parse_error',
      input,
      parsedResult
    }
  }

  return {
    status: 'success',
    input,
    file: options.file,
    parsedResult
  }
}

// Shared ingest helper for a single File instance.
// Useful when one file input allows selecting multiple CSV files and each file
// must be validated and parsed independently.
export async function ingestCsvFile<ParsedResult, ParsedSuccessResult extends ParsedResult>(
  options: IngestCsvFileOptions<ParsedResult, ParsedSuccessResult>
): Promise<IngestCsvFileResult<ParsedResult, ParsedSuccessResult>> {
  return ingestCsvFileInternal(options, null)
}

// Shared CSV ingest pipeline for file-input based imports:
// - picks selected file from event target,
// - validates extension and UTF-8 encoding,
// - protects against stale async results via request id guard,
// - parses CSV using caller-provided parser.
export async function ingestCsvInputFile<ParsedResult, ParsedSuccessResult extends ParsedResult>(
  options: IngestCsvInputFileOptions<ParsedResult, ParsedSuccessResult>
): Promise<IngestCsvInputFileResult<ParsedResult, ParsedSuccessResult>> {
  const input = options.event.target as HTMLInputElement | null
  const selectedFile = input?.files?.[0] ?? null

  if (!selectedFile) {
    options.resetStateOnNoFile()
    return { status: 'no_file' }
  }

  // Always clear the native file input after taking the File reference,
  // so selecting the same filename again still triggers the next change event.
  clearInputFileValue(input)

  return ingestCsvFileInternal(
    {
      file: selectedFile,
      beginValidationRequest: options.beginValidationRequest,
      isValidationRequestStale: options.isValidationRequestStale,
      setValidatingState: options.setValidatingState,
      parseCsvText: options.parseCsvText,
      isParsedResultSuccess: options.isParsedResultSuccess
    },
    input
  )
}
