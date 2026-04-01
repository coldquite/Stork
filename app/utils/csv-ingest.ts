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

export function clearInputFileValue(input: HTMLInputElement | null): void {
  if (!input) {
    return
  }

  input.value = ''
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
  const requestId = options.beginValidationRequest()

  if (!selectedFile) {
    options.resetStateOnNoFile()
    return { status: 'no_file' }
  }

  if (!isCsvFile(selectedFile)) {
    clearInputFileValue(input)
    return {
      status: 'invalid_extension',
      input
    }
  }

  options.setValidatingState()

  const decodedContent = await decodeUtf8File(selectedFile)
  if (options.isValidationRequestStale(requestId)) {
    return { status: 'stale' }
  }

  if (!decodedContent) {
    clearInputFileValue(input)
    return {
      status: 'invalid_encoding',
      input
    }
  }

  const parsedResult = options.parseCsvText(decodedContent)
  if (!options.isParsedResultSuccess(parsedResult)) {
    clearInputFileValue(input)
    return {
      status: 'parse_error',
      input,
      parsedResult
    }
  }

  return {
    status: 'success',
    input,
    file: selectedFile,
    parsedResult
  }
}
