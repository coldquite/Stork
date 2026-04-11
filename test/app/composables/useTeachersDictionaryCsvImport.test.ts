import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTeachersDictionaryCsvImport } from '~/composables/teachers-dictionary/useTeachersDictionaryCsvImport'

const REQUIRED_HEADERS = ['Příjmení', 'Jméno', 'Titul osoby (před jménem)', 'Titul osoby (za jménem)'] as const

const { i18nTranslateMock, requestFetchMock } = vi.hoisted(() => ({
  i18nTranslateMock: vi.fn((key: string, params?: Record<string, unknown>) => {
    if (key === 'teachersDictionary.import.validation.missingColumns') {
      return `${key}:${String(params?.columns ?? '')}`
    }

    return key
  }),
  requestFetchMock: vi.fn()
}))

mockNuxtImport('useI18n', () => {
  return () => ({
    t: i18nTranslateMock
  })
})

mockNuxtImport('useRequestFetch', () => {
  return () => requestFetchMock
})

function toCsvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

function createCsvContent(headers: readonly string[], rows: Array<Record<string, string>>): string {
  const rowsText = rows.map((row) => {
    return headers.map((header) => toCsvCell(row[header] ?? '')).join(';')
  })

  return [headers.map(toCsvCell).join(';'), ...rowsText].join('\n')
}

function createValidTeachersDictionaryCsvFile(
  fileName = 'teachers-dictionary.csv',
  rowOverrides: Partial<Record<string, string>> = {}
): File {
  const row = {
    Příjmení: 'Testov',
    Jméno: 'Alex',
    'Titul osoby (před jménem)': 'Ing.',
    'Titul osoby (za jménem)': 'Ph.D.',
    ...rowOverrides
  }

  return new File([createCsvContent(REQUIRED_HEADERS, [row])], fileName, {
    type: 'text/csv'
  })
}

function createMissingHeadersCsvFile(fileName = 'missing-headers.csv'): File {
  const headers = [REQUIRED_HEADERS[0], REQUIRED_HEADERS[1]]
  const row = {
    [REQUIRED_HEADERS[0]]: 'Testov',
    [REQUIRED_HEADERS[1]]: 'Alex'
  }

  return new File([createCsvContent(headers, [row])], fileName, {
    type: 'text/csv'
  })
}

function createFileChangeEvent(file: File): Event {
  const inputLike = {
    files: [file],
    value: file.name
  } as unknown as HTMLInputElement

  return { target: inputLike } as unknown as Event
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, resolve, reject }
}

function encodeUtf8(value: string): ArrayBuffer {
  return new TextEncoder().encode(value).buffer as ArrayBuffer
}

describe('useTeachersDictionaryCsvImport', () => {
  beforeEach(() => {
    i18nTranslateMock.mockClear()
    requestFetchMock.mockReset()
  })

  it('exposes clean initial state', () => {
    const { importState, hasImportStateValues, isSubmitDisabled, isSubmitting, submitError } =
      useTeachersDictionaryCsvImport()

    expect(importState.value).toEqual({
      file: null,
      error: null,
      entries: null,
      isValidating: false
    })
    expect(hasImportStateValues.value).toBe(false)
    expect(isSubmitDisabled.value).toBe(true)
    expect(isSubmitting.value).toBe(false)
    expect(submitError.value).toBeNull()
  })

  it('rejects non-csv files by extension', async () => {
    const { importState, handleImportFileChange } = useTeachersDictionaryCsvImport()
    const invalidFile = new File(['content'], 'teachers-dictionary.txt', { type: 'text/plain' })

    await handleImportFileChange(createFileChangeEvent(invalidFile))

    expect(importState.value.file).toBeNull()
    expect(importState.value.entries).toBeNull()
    expect(importState.value.error).toBe('homepage.actions.create.import.validation.invalidExtension')
  })

  it('rejects csv files with invalid UTF-8 encoding', async () => {
    const { importState, handleImportFileChange } = useTeachersDictionaryCsvImport()
    const invalidUtf8File = new File([new Uint8Array([0xff, 0xfe, 0xfd])], 'teachers-dictionary.csv', {
      type: 'text/csv'
    })

    await handleImportFileChange(createFileChangeEvent(invalidUtf8File))

    expect(importState.value.file).toBeNull()
    expect(importState.value.entries).toBeNull()
    expect(importState.value.error).toBe('homepage.actions.create.import.validation.invalidEncoding')
  })

  it('reports missing required headers with translated columns list', async () => {
    const { importState, handleImportFileChange } = useTeachersDictionaryCsvImport()

    await handleImportFileChange(createFileChangeEvent(createMissingHeadersCsvFile()))

    expect(importState.value.file).toBeNull()
    expect(importState.value.entries).toBeNull()
    expect(importState.value.error).toContain('teachersDictionary.import.validation.missingColumns')
    expect(importState.value.error).toContain('Titul osoby (před jménem)')
    expect(importState.value.error).toContain('Titul osoby (za jménem)')
  })

  it('accepts valid csv and enables submit', async () => {
    const { importState, handleImportFileChange, isSubmitDisabled } = useTeachersDictionaryCsvImport()

    await handleImportFileChange(createFileChangeEvent(createValidTeachersDictionaryCsvFile('valid.csv')))

    expect(importState.value.file?.name).toBe('valid.csv')
    expect(importState.value.error).toBeNull()
    expect(importState.value.entries).toEqual([
      {
        canonicalName: 'Ing. Alex Testov, Ph.D.',
        isCustom: false
      }
    ])
    expect(isSubmitDisabled.value).toBe(false)
  })

  it('ignores stale async validation result when a newer file is selected', async () => {
    const { importState, handleImportFileChange } = useTeachersDictionaryCsvImport()
    const deferred = createDeferred<ArrayBuffer>()

    const slowFile = {
      name: 'slow.csv',
      arrayBuffer: vi.fn(() => deferred.promise)
    } as unknown as File

    const slowChangePromise = handleImportFileChange(createFileChangeEvent(slowFile))
    await handleImportFileChange(createFileChangeEvent(createValidTeachersDictionaryCsvFile('fast.csv')))

    expect(importState.value.file?.name).toBe('fast.csv')
    expect(importState.value.error).toBeNull()

    deferred.resolve(
      encodeUtf8(
        createCsvContent(
          [REQUIRED_HEADERS[0], REQUIRED_HEADERS[1]],
          [
            {
              [REQUIRED_HEADERS[0]]: 'Testov',
              [REQUIRED_HEADERS[1]]: 'Alex'
            }
          ]
        )
      )
    )
    await slowChangePromise

    expect(importState.value.file?.name).toBe('fast.csv')
    expect(importState.value.error).toBeNull()
    expect(importState.value.entries?.[0]?.canonicalName).toBe('Ing. Alex Testov, Ph.D.')
  })

  it('returns ok=false from submitImport when submit is disabled', async () => {
    const { submitImport } = useTeachersDictionaryCsvImport()

    const result = await submitImport()

    expect(result).toEqual({
      ok: false,
      response: null
    })
    expect(requestFetchMock).not.toHaveBeenCalled()
  })

  it('submits parsed entries and resets import state on success', async () => {
    requestFetchMock.mockResolvedValue({
      processed: 1,
      created: 1,
      updated: 0
    })

    const { importState, hasImportStateValues, submitError, handleImportFileChange, submitImport } =
      useTeachersDictionaryCsvImport()

    await handleImportFileChange(createFileChangeEvent(createValidTeachersDictionaryCsvFile()))
    const result = await submitImport()

    expect(requestFetchMock).toHaveBeenCalledTimes(1)
    expect(requestFetchMock).toHaveBeenCalledWith('/api/teachers-dictionary/bulk', {
      method: 'PUT',
      body: [
        {
          canonicalName: 'Ing. Alex Testov, Ph.D.',
          isCustom: false
        }
      ]
    })
    expect(result).toEqual({
      ok: true,
      response: {
        processed: 1,
        created: 1,
        updated: 0
      }
    })

    expect(importState.value).toEqual({
      file: null,
      error: null,
      entries: null,
      isValidating: false
    })
    expect(hasImportStateValues.value).toBe(false)
    expect(submitError.value).toBeNull()
  })

  it('keeps parsed entries and exposes submitError when submit request fails', async () => {
    requestFetchMock.mockRejectedValue(new Error('bulk save failed'))

    const { importState, isSubmitting, submitError, handleImportFileChange, submitImport } =
      useTeachersDictionaryCsvImport()

    await handleImportFileChange(createFileChangeEvent(createValidTeachersDictionaryCsvFile()))
    const result = await submitImport()

    expect(result).toEqual({
      ok: false,
      response: null
    })
    expect(importState.value.entries).not.toBeNull()
    expect(submitError.value).toBe('bulk save failed')
    expect(isSubmitting.value).toBe(false)
  })
})
