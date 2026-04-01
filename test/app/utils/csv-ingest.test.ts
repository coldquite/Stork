import { describe, expect, it, vi } from 'vitest'
import { clearInputFileValue, ingestCsvInputFile } from '~/utils/csv-ingest'

function createFileChangeEvent(file: File | null): Event {
  const files = file ? [file] : []
  const inputLike = {
    files,
    value: file?.name ?? ''
  } as unknown as HTMLInputElement

  return { target: inputLike } as unknown as Event
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void

  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })

  return { promise, resolve }
}

function createCsvFile(fileName = 'dataset.csv', content = 'h1;h2\nv1;v2'): File {
  return new File([content], fileName, { type: 'text/csv' })
}

describe('csv-ingest utils', () => {
  it('clearInputFileValue clears input value and tolerates null input', () => {
    const inputLike = { value: 'dataset.csv' } as HTMLInputElement

    clearInputFileValue(inputLike)
    clearInputFileValue(null)

    expect(inputLike.value).toBe('')
  })

  it('returns no_file and resets state when no file is selected', async () => {
    const setValidatingState = vi.fn()
    const resetStateOnNoFile = vi.fn()

    const result = await ingestCsvInputFile({
      event: createFileChangeEvent(null),
      beginValidationRequest: () => 1,
      isValidationRequestStale: () => false,
      setValidatingState,
      resetStateOnNoFile,
      parseCsvText: () => ({ ok: true as const }),
      isParsedResultSuccess: (parsedResult): parsedResult is { ok: true } => parsedResult.ok
    })

    expect(result.status).toBe('no_file')
    expect(resetStateOnNoFile).toHaveBeenCalledTimes(1)
    expect(setValidatingState).not.toHaveBeenCalled()
  })

  it('returns invalid_extension for non-csv files and clears input value', async () => {
    const setValidatingState = vi.fn()
    const resetStateOnNoFile = vi.fn()
    const invalidFile = new File(['payload'], 'dataset.txt', { type: 'text/plain' })
    const event = createFileChangeEvent(invalidFile)
    const input = event.target as HTMLInputElement

    const result = await ingestCsvInputFile({
      event,
      beginValidationRequest: () => 1,
      isValidationRequestStale: () => false,
      setValidatingState,
      resetStateOnNoFile,
      parseCsvText: () => ({ ok: true as const }),
      isParsedResultSuccess: (parsedResult): parsedResult is { ok: true } => parsedResult.ok
    })

    expect(result.status).toBe('invalid_extension')
    expect(input.value).toBe('')
    expect(setValidatingState).not.toHaveBeenCalled()
    expect(resetStateOnNoFile).not.toHaveBeenCalled()
  })

  it('returns invalid_encoding when UTF-8 decoding fails', async () => {
    const invalidUtf8Csv = new File([new Uint8Array([0xff, 0xfe, 0xfd])], 'dataset.csv', { type: 'text/csv' })
    const event = createFileChangeEvent(invalidUtf8Csv)
    const input = event.target as HTMLInputElement

    const result = await ingestCsvInputFile({
      event,
      beginValidationRequest: () => 1,
      isValidationRequestStale: () => false,
      setValidatingState: vi.fn(),
      resetStateOnNoFile: vi.fn(),
      parseCsvText: () => ({ ok: true as const }),
      isParsedResultSuccess: (parsedResult): parsedResult is { ok: true } => parsedResult.ok
    })

    expect(result.status).toBe('invalid_encoding')
    expect(input.value).toBe('')
  })

  it('returns stale when async decode belongs to an outdated request id', async () => {
    let currentRequestId = 1
    const deferred = createDeferred<ArrayBuffer>()
    const slowCsvFile = {
      name: 'slow.csv',
      arrayBuffer: vi.fn(() => deferred.promise)
    } as unknown as File

    const ingestPromise = ingestCsvInputFile({
      event: createFileChangeEvent(slowCsvFile),
      beginValidationRequest: () => 1,
      isValidationRequestStale: (requestId) => requestId !== currentRequestId,
      setValidatingState: vi.fn(),
      resetStateOnNoFile: vi.fn(),
      parseCsvText: () => ({ ok: true as const }),
      isParsedResultSuccess: (parsedResult): parsedResult is { ok: true } => parsedResult.ok
    })

    currentRequestId = 2
    deferred.resolve(new TextEncoder().encode('h1;h2\nv1;v2').buffer as ArrayBuffer)

    const result = await ingestPromise
    expect(result.status).toBe('stale')
  })

  it('returns parse_error and clears input when parser result is rejected by success guard', async () => {
    const event = createFileChangeEvent(createCsvFile())
    const input = event.target as HTMLInputElement
    type ParseResult = { ok: true } | { ok: false; reason: 'schema_mismatch' }

    const result = await ingestCsvInputFile({
      event,
      beginValidationRequest: () => 1,
      isValidationRequestStale: () => false,
      setValidatingState: vi.fn(),
      resetStateOnNoFile: vi.fn(),
      parseCsvText: (): ParseResult => ({ ok: false, reason: 'schema_mismatch' }),
      isParsedResultSuccess: (parsedResult): parsedResult is { ok: true } => parsedResult.ok
    })

    expect(result.status).toBe('parse_error')
    expect(input.value).toBe('')
    if (result.status === 'parse_error' && 'reason' in result.parsedResult) {
      expect(result.parsedResult.reason).toBe('schema_mismatch')
    }
  })

  it('returns success with parsed result, original file, and clears input value for same-file reselect', async () => {
    const csvFile = createCsvFile('valid.csv')
    const parsedSuccess = { ok: true as const, datasetKey: 'committees' as const }
    const event = createFileChangeEvent(csvFile)
    const input = event.target as HTMLInputElement

    const result = await ingestCsvInputFile({
      event,
      beginValidationRequest: () => 1,
      isValidationRequestStale: () => false,
      setValidatingState: vi.fn(),
      resetStateOnNoFile: vi.fn(),
      parseCsvText: () => parsedSuccess,
      isParsedResultSuccess: (
        parsedResult
      ): parsedResult is {
        ok: true
        datasetKey: 'committees'
      } => parsedResult.ok
    })

    expect(result.status).toBe('success')
    expect(input.value).toBe('')
    if (result.status === 'success') {
      expect(result.file.name).toBe('valid.csv')
      expect(result.parsedResult).toEqual(parsedSuccess)
    }
  })
})
