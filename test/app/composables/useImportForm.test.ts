import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IMPORT_SCHEMAS } from '~/constants/import'
import { useImportForm } from '~/composables/schedule-creation/useImportForm'
import type { ImportDatasetKey, ImportFieldKey, ImportSzzType } from '~/types/import'

const { i18nTranslateMock } = vi.hoisted(() => ({
  i18nTranslateMock: vi.fn((key: string) => key)
}))

mockNuxtImport('useI18n', () => {
  return () => ({
    t: i18nTranslateMock
  })
})

function createFileChangeEvent(file: File): Event {
  const inputLike = {
    files: [file],
    value: file.name
  } as unknown as HTMLInputElement

  return { target: inputLike } as unknown as Event
}

function toCsvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

function createCsvContent(datasetKey: ImportDatasetKey, rowOverrides: Partial<Record<string, string>> = {}): string {
  const headers = [...IMPORT_SCHEMAS[datasetKey]]
  const row = headers.map((header, index) => rowOverrides[header] ?? `value-${index + 1}`)

  return `${headers.map(toCsvCell).join(';')}\n${row.map(toCsvCell).join(';')}`
}

function createCsvFile(
  datasetKey: ImportDatasetKey,
  fileName: string,
  rowOverrides: Partial<Record<string, string>> = {}
): File {
  return new File([createCsvContent(datasetKey, rowOverrides)], fileName, { type: 'text/csv' })
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

describe('useImportForm', () => {
  beforeEach(() => {
    i18nTranslateMock.mockClear()
  })

  it('remaps students-committees and students-cap files in mixed mode by detected study level', async () => {
    const selectedSzzType = ref<ImportSzzType>('MIXED')
    const { importFileStates, handleImportFileChange } = useImportForm(selectedSzzType)

    const committeesBachelorFile = createCsvFile('studentsCommittees', 'studenti-komise-bc.csv', {
      'St. program - typ': 'B'
    })
    await handleImportFileChange(createFileChangeEvent(committeesBachelorFile), 'studentsCommitteesMaster')

    expect(importFileStates.value.studentsCommitteesBachelor.file?.name).toBe(committeesBachelorFile.name)
    expect(importFileStates.value.studentsCommitteesMaster.file).toBeNull()

    const capMasterFile = createCsvFile('studentsCap', 'studenti-cap-mgr.csv', {
      'Studijní plán (název)': 'Mgr. Informatika'
    })
    await handleImportFileChange(createFileChangeEvent(capMasterFile), 'studentsCapBachelor')

    expect(importFileStates.value.studentsCapMaster.file?.name).toBe(capMasterFile.name)
    expect(importFileStates.value.studentsCapBachelor.file).toBeNull()
  })

  it('shows validation error when mixed-mode study level cannot be detected', async () => {
    const selectedSzzType = ref<ImportSzzType>('MIXED')
    const { importFileStates, handleImportFileChange } = useImportForm(selectedSzzType)

    const unknownProgramTypeFile = createCsvFile('studentsCommittees', 'studenti-komise-unknown.csv', {
      'St. program - typ': 'X'
    })

    await handleImportFileChange(createFileChangeEvent(unknownProgramTypeFile), 'studentsCommitteesBachelor')

    expect(importFileStates.value.studentsCommitteesBachelor.file).toBeNull()
    expect(importFileStates.value.studentsCommitteesBachelor.error).toBe(
      'homepage.actions.create.import.validation.invalidProgramType'
    )
  })

  it('rejects non-csv file by extension', async () => {
    const selectedSzzType = ref<ImportSzzType>('BACHELOR')
    const { importFileStates, handleImportFileChange } = useImportForm(selectedSzzType)
    const invalidFile = new File(['content'], 'studenti-cap.txt', { type: 'text/plain' })

    await handleImportFileChange(createFileChangeEvent(invalidFile), 'studentsCapSingle')

    expect(importFileStates.value.studentsCapSingle.file).toBeNull()
    expect(importFileStates.value.studentsCapSingle.error).toBe(
      'homepage.actions.create.import.validation.invalidExtension'
    )
  })

  it('rejects file with invalid UTF-8 encoding', async () => {
    const selectedSzzType = ref<ImportSzzType>('BACHELOR')
    const { importFileStates, handleImportFileChange } = useImportForm(selectedSzzType)
    const invalidUtf8File = new File([new Uint8Array([0xff, 0xfe, 0xfd])], 'studenti-cap.csv', { type: 'text/csv' })

    await handleImportFileChange(createFileChangeEvent(invalidUtf8File), 'studentsCapSingle')

    expect(importFileStates.value.studentsCapSingle.file).toBeNull()
    expect(importFileStates.value.studentsCapSingle.error).toBe(
      'homepage.actions.create.import.validation.invalidEncoding'
    )
  })

  it('builds bachelor payload using single-file fields', async () => {
    const selectedSzzType = ref<ImportSzzType>('BACHELOR')
    const { handleImportFileChange, buildImportPayload, isImportSubmitDisabled } = useImportForm(selectedSzzType)

    await handleImportFileChange(
      createFileChangeEvent(createCsvFile('studentsCap', 'studenti-cap.csv', { 'Studijní plán (název)': 'Bc. SI' })),
      'studentsCapSingle'
    )
    await handleImportFileChange(
      createFileChangeEvent(createCsvFile('studentsCommittees', 'studenti-komise.csv', { 'St. program - typ': 'B' })),
      'studentsCommitteesSingle'
    )
    await handleImportFileChange(createFileChangeEvent(createCsvFile('committees', 'komise.csv')), 'committees')

    expect(isImportSubmitDisabled.value).toBe(false)

    const payload = buildImportPayload()
    expect(payload).not.toBeNull()
    expect(payload?.studentsCap.bachelor?.fileName).toBe('studenti-cap.csv')
    expect(payload?.studentsCap.master).toBeUndefined()
    expect(payload?.studentsCommittees.bachelor?.fileName).toBe('studenti-komise.csv')
    expect(payload?.studentsCommittees.master).toBeUndefined()
  })

  it('builds master payload using single-file fields', async () => {
    const selectedSzzType = ref<ImportSzzType>('MASTER')
    const { handleImportFileChange, buildImportPayload, isImportSubmitDisabled } = useImportForm(selectedSzzType)

    await handleImportFileChange(
      createFileChangeEvent(
        createCsvFile('studentsCap', 'studenti-cap-mgr.csv', { 'Studijní plán (název)': 'Mgr. Informatika' })
      ),
      'studentsCapSingle'
    )
    await handleImportFileChange(
      createFileChangeEvent(
        createCsvFile('studentsCommittees', 'studenti-komise-mgr.csv', { 'St. program - typ': 'N' })
      ),
      'studentsCommitteesSingle'
    )
    await handleImportFileChange(createFileChangeEvent(createCsvFile('committees', 'komise.csv')), 'committees')

    expect(isImportSubmitDisabled.value).toBe(false)

    const payload = buildImportPayload()
    expect(payload).not.toBeNull()
    expect(payload?.studentsCap.master?.fileName).toBe('studenti-cap-mgr.csv')
    expect(payload?.studentsCap.bachelor).toBeUndefined()
    expect(payload?.studentsCommittees.master?.fileName).toBe('studenti-komise-mgr.csv')
    expect(payload?.studentsCommittees.bachelor).toBeUndefined()
  })

  it('auto-switches single-mode SZZ type when uploaded student file belongs to opposite level', async () => {
    const selectedSzzType = ref<ImportSzzType>('BACHELOR')
    const { importFileStates, handleImportFileChange } = useImportForm(selectedSzzType)

    await handleImportFileChange(
      createFileChangeEvent(
        createCsvFile('studentsCap', 'studenti-cap-mgr.csv', { 'Studijní plán (název)': 'Mgr. Informatika' })
      ),
      'studentsCapSingle'
    )

    expect(selectedSzzType.value).toBe('MASTER')
    expect(importFileStates.value.studentsCapSingle.file?.name).toBe('studenti-cap-mgr.csv')
    expect(importFileStates.value.studentsCapSingle.error).toBeNull()
  })

  it('blocks single-mode level auto-switch when two other fields are already loaded', async () => {
    const selectedSzzType = ref<ImportSzzType>('BACHELOR')
    const { importFileStates, handleImportFileChange } = useImportForm(selectedSzzType)

    await handleImportFileChange(
      createFileChangeEvent(
        createCsvFile('studentsCommittees', 'studenti-komise-bc.csv', { 'St. program - typ': 'B' })
      ),
      'studentsCommitteesSingle'
    )
    await handleImportFileChange(createFileChangeEvent(createCsvFile('committees', 'komise.csv')), 'committees')

    await handleImportFileChange(
      createFileChangeEvent(
        createCsvFile('studentsCap', 'studenti-cap-mgr.csv', { 'Studijní plán (název)': 'Mgr. Informatika' })
      ),
      'studentsCapSingle'
    )

    expect(selectedSzzType.value).toBe('BACHELOR')
    expect(importFileStates.value.studentsCapSingle.file).toBeNull()
    expect(importFileStates.value.studentsCapSingle.error).toBe(
      'homepage.actions.create.import.validation.levelSwitchBlockedMaster'
    )
    expect(importFileStates.value.studentsCommitteesSingle.file?.name).toBe('studenti-komise-bc.csv')
    expect(importFileStates.value.committees.file?.name).toBe('komise.csv')
  })

  it('requires five files and builds mixed payload with both levels', async () => {
    const selectedSzzType = ref<ImportSzzType>('MIXED')
    const { handleImportFileChange, buildImportPayload, isImportSubmitDisabled, importFileStates } =
      useImportForm(selectedSzzType)

    const uploads: Array<{ sourceKey: ImportFieldKey; file: File }> = [
      {
        sourceKey: 'studentsCapMaster',
        file: createCsvFile('studentsCap', 'studenti-cap-bc.csv', { 'Studijní plán (název)': 'Bc. Informatika' })
      },
      {
        sourceKey: 'studentsCapBachelor',
        file: createCsvFile('studentsCap', 'studenti-cap-mgr.csv', { 'Studijní plán (název)': 'Mgr. Informatika' })
      },
      {
        sourceKey: 'studentsCommitteesMaster',
        file: createCsvFile('studentsCommittees', 'studenti-komise-bc.csv', { 'St. program - typ': 'B' })
      },
      {
        sourceKey: 'studentsCommitteesBachelor',
        file: createCsvFile('studentsCommittees', 'studenti-komise-mgr.csv', { 'St. program - typ': 'N' })
      },
      {
        sourceKey: 'committees',
        file: createCsvFile('committees', 'komise.csv')
      }
    ]

    for (const upload of uploads) {
      await handleImportFileChange(createFileChangeEvent(upload.file), upload.sourceKey)
    }

    expect(importFileStates.value.studentsCapBachelor.file?.name).toBe('studenti-cap-bc.csv')
    expect(importFileStates.value.studentsCapMaster.file?.name).toBe('studenti-cap-mgr.csv')
    expect(importFileStates.value.studentsCommitteesBachelor.file?.name).toBe('studenti-komise-bc.csv')
    expect(importFileStates.value.studentsCommitteesMaster.file?.name).toBe('studenti-komise-mgr.csv')
    expect(importFileStates.value.committees.file?.name).toBe('komise.csv')
    expect(isImportSubmitDisabled.value).toBe(false)

    const payload = buildImportPayload()
    expect(payload).not.toBeNull()
    expect(payload?.studentsCap.bachelor?.fileName).toBe('studenti-cap-bc.csv')
    expect(payload?.studentsCap.master?.fileName).toBe('studenti-cap-mgr.csv')
    expect(payload?.studentsCommittees.bachelor?.fileName).toBe('studenti-komise-bc.csv')
    expect(payload?.studentsCommittees.master?.fileName).toBe('studenti-komise-mgr.csv')
    expect(payload?.committees.fileName).toBe('komise.csv')
  })

  it('ignores stale async validation result when user selects a newer file in the same field', async () => {
    const selectedSzzType = ref<ImportSzzType>('BACHELOR')
    const { importFileStates, handleImportFileChange } = useImportForm(selectedSzzType)
    const deferred = createDeferred<ArrayBuffer>()

    const slowCsvFile = {
      name: 'studenti-cap-slow.csv',
      arrayBuffer: vi.fn(() => deferred.promise)
    } as unknown as File

    const fastCsvFile = createCsvFile('studentsCap', 'studenti-cap-fast.csv', {
      'Studijní plán (název)': 'Bc. Informatika'
    })

    const slowChangePromise = handleImportFileChange(createFileChangeEvent(slowCsvFile), 'studentsCapSingle')
    await handleImportFileChange(createFileChangeEvent(fastCsvFile), 'studentsCapSingle')

    expect(importFileStates.value.studentsCapSingle.file?.name).toBe('studenti-cap-fast.csv')
    expect(importFileStates.value.studentsCapSingle.error).toBeNull()

    deferred.resolve(
      encodeUtf8(
        createCsvContent('studentsCap', {
          'Studijní plán (název)': 'Bc. Informatika'
        })
      )
    )
    await slowChangePromise

    expect(importFileStates.value.studentsCapSingle.file?.name).toBe('studenti-cap-fast.csv')
    expect(importFileStates.value.studentsCapSingle.error).toBeNull()
    expect(importFileStates.value.studentsCapSingle.isValidating).toBe(false)
  })
})
