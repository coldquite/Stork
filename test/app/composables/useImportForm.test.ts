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

function createFileChangeEvent(fileOrFiles: File | File[]): Event {
  const files = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles]
  const inputLike = {
    files,
    value: files.map((file) => file.name).join(', ')
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

  it('remaps students-committees and students-stork files in mixed mode by detected study level', async () => {
    const selectedSzzType = ref<ImportSzzType>('MIXED')
    const { importFileStates, handleImportFileChange } = useImportForm(selectedSzzType)

    const committeesBachelorFile = createCsvFile('studentsCommittees', 'studenti-komise-bc.csv', {
      'St. program - typ': 'B'
    })
    await handleImportFileChange(createFileChangeEvent(committeesBachelorFile), 'studentsCommitteesMaster')

    expect(importFileStates.value.studentsCommitteesBachelor.file?.name).toBe(committeesBachelorFile.name)
    expect(importFileStates.value.studentsCommitteesMaster.file).toBeNull()

    const storkMasterFile = createCsvFile('studentsStork', 'studenti-stork-mgr.csv', {
      'Studijní plán (název)': 'Mgr. Informatika'
    })
    await handleImportFileChange(createFileChangeEvent(storkMasterFile), 'studentsStorkBachelor')

    expect(importFileStates.value.studentsStorkMaster.file?.name).toBe(storkMasterFile.name)
    expect(importFileStates.value.studentsStorkBachelor.file).toBeNull()
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
    const invalidFile = new File(['content'], 'studenti-stork.txt', { type: 'text/plain' })

    await handleImportFileChange(createFileChangeEvent(invalidFile), 'studentsStorkSingle')

    expect(importFileStates.value.studentsStorkSingle.file).toBeNull()
    expect(importFileStates.value.studentsStorkSingle.error).toBe(
      'homepage.actions.create.import.validation.invalidExtension'
    )
  })

  it('rejects file with invalid UTF-8 encoding', async () => {
    const selectedSzzType = ref<ImportSzzType>('BACHELOR')
    const { importFileStates, handleImportFileChange } = useImportForm(selectedSzzType)
    const invalidUtf8File = new File([new Uint8Array([0xff, 0xfe, 0xfd])], 'studenti-stork.csv', { type: 'text/csv' })

    await handleImportFileChange(createFileChangeEvent(invalidUtf8File), 'studentsStorkSingle')

    expect(importFileStates.value.studentsStorkSingle.file).toBeNull()
    expect(importFileStates.value.studentsStorkSingle.error).toBe(
      'homepage.actions.create.import.validation.invalidEncoding'
    )
  })

  it('builds bachelor payload using single-file fields', async () => {
    const selectedSzzType = ref<ImportSzzType>('BACHELOR')
    const { handleImportFileChange, buildImportPayload, isImportSubmitDisabled } = useImportForm(selectedSzzType)

    await handleImportFileChange(
      createFileChangeEvent(
        createCsvFile('studentsStork', 'studenti-stork.csv', { 'Studijní plán (název)': 'Bc. SI' })
      ),
      'studentsStorkSingle'
    )
    await handleImportFileChange(
      createFileChangeEvent(createCsvFile('studentsCommittees', 'studenti-komise.csv', { 'St. program - typ': 'B' })),
      'studentsCommitteesSingle'
    )
    await handleImportFileChange(createFileChangeEvent(createCsvFile('committees', 'komise.csv')), 'committees')

    expect(isImportSubmitDisabled.value).toBe(false)

    const payload = buildImportPayload()
    expect(payload).not.toBeNull()
    expect(payload?.studentsStork.bachelor?.fileName).toBe('studenti-stork.csv')
    expect(payload?.studentsStork.master).toBeUndefined()
    expect(payload?.studentsCommittees.bachelor?.fileName).toBe('studenti-komise.csv')
    expect(payload?.studentsCommittees.master).toBeUndefined()
  })

  it('maps three files selected in one batch in single mode', async () => {
    const selectedSzzType = ref<ImportSzzType>('BACHELOR')
    const { importFileStates, handleImportFileChange, buildImportPayload, isImportSubmitDisabled } =
      useImportForm(selectedSzzType)

    const filesBatch = [
      createCsvFile('studentsStork', 'studenti-stork.csv', { 'Studijní plán (název)': 'Bc. SI' }),
      createCsvFile('studentsCommittees', 'studenti-komise.csv', { 'St. program - typ': 'B' }),
      createCsvFile('committees', 'komise.csv')
    ]

    await handleImportFileChange(createFileChangeEvent(filesBatch), 'studentsStorkSingle')

    expect(importFileStates.value.studentsStorkSingle.file?.name).toBe('studenti-stork.csv')
    expect(importFileStates.value.studentsCommitteesSingle.file?.name).toBe('studenti-komise.csv')
    expect(importFileStates.value.committees.file?.name).toBe('komise.csv')
    expect(isImportSubmitDisabled.value).toBe(false)

    const payload = buildImportPayload()
    expect(payload).not.toBeNull()
    expect(payload?.studentsStork.bachelor?.fileName).toBe('studenti-stork.csv')
    expect(payload?.studentsCommittees.bachelor?.fileName).toBe('studenti-komise.csv')
    expect(payload?.committees.fileName).toBe('komise.csv')
  })

  it('builds master payload using single-file fields', async () => {
    const selectedSzzType = ref<ImportSzzType>('MASTER')
    const { handleImportFileChange, buildImportPayload, isImportSubmitDisabled } = useImportForm(selectedSzzType)

    await handleImportFileChange(
      createFileChangeEvent(
        createCsvFile('studentsStork', 'studenti-stork-mgr.csv', { 'Studijní plán (název)': 'Mgr. Informatika' })
      ),
      'studentsStorkSingle'
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
    expect(payload?.studentsStork.master?.fileName).toBe('studenti-stork-mgr.csv')
    expect(payload?.studentsStork.bachelor).toBeUndefined()
    expect(payload?.studentsCommittees.master?.fileName).toBe('studenti-komise-mgr.csv')
    expect(payload?.studentsCommittees.bachelor).toBeUndefined()
  })

  it('auto-switches single-mode SZZ type when uploaded student file belongs to opposite level', async () => {
    const selectedSzzType = ref<ImportSzzType>('BACHELOR')
    const { importFileStates, handleImportFileChange } = useImportForm(selectedSzzType)

    await handleImportFileChange(
      createFileChangeEvent(
        createCsvFile('studentsStork', 'studenti-stork-mgr.csv', { 'Studijní plán (název)': 'Mgr. Informatika' })
      ),
      'studentsStorkSingle'
    )

    expect(selectedSzzType.value).toBe('MASTER')
    expect(importFileStates.value.studentsStorkSingle.file?.name).toBe('studenti-stork-mgr.csv')
    expect(importFileStates.value.studentsStorkSingle.error).toBeNull()
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
        createCsvFile('studentsStork', 'studenti-stork-mgr.csv', { 'Studijní plán (název)': 'Mgr. Informatika' })
      ),
      'studentsStorkSingle'
    )

    expect(selectedSzzType.value).toBe('BACHELOR')
    expect(importFileStates.value.studentsStorkSingle.file).toBeNull()
    expect(importFileStates.value.studentsStorkSingle.error).toBe(
      'homepage.actions.create.import.validation.levelSwitchBlockedMaster'
    )
    expect(importFileStates.value.studentsCommitteesSingle.file?.name).toBe('studenti-komise-bc.csv')
    expect(importFileStates.value.committees.file?.name).toBe('komise.csv')
  })

  it('continues processing other files in a batch after one file fails validation', async () => {
    const selectedSzzType = ref<ImportSzzType>('BACHELOR')
    const { importFileStates, handleImportFileChange } = useImportForm(selectedSzzType)

    const invalidFile = new File(['payload'], 'invalid.txt', { type: 'text/plain' })
    const validCommitteesStudentsFile = createCsvFile('studentsCommittees', 'studenti-komise.csv', {
      'St. program - typ': 'B'
    })

    await handleImportFileChange(
      createFileChangeEvent([invalidFile, validCommitteesStudentsFile]),
      'studentsStorkSingle'
    )

    expect(importFileStates.value.studentsStorkSingle.error).toBe(
      'homepage.actions.create.import.validation.invalidExtension'
    )
    expect(importFileStates.value.studentsCommitteesSingle.file?.name).toBe('studenti-komise.csv')
  })

  it('enforces max selected files limit in single mode', async () => {
    const selectedSzzType = ref<ImportSzzType>('BACHELOR')
    const { importFileStates, handleImportFileChange } = useImportForm(selectedSzzType)

    const tooManyFilesBatch = [
      createCsvFile('studentsStork', 'studenti-stork.csv', { 'Studijní plán (název)': 'Bc. SI' }),
      createCsvFile('studentsCommittees', 'studenti-komise.csv', { 'St. program - typ': 'B' }),
      createCsvFile('committees', 'komise.csv'),
      createCsvFile('committees', 'komise-extra.csv')
    ]

    await handleImportFileChange(createFileChangeEvent(tooManyFilesBatch), 'studentsStorkSingle')

    expect(importFileStates.value.studentsStorkSingle.file).toBeNull()
    expect(importFileStates.value.studentsStorkSingle.error).toBe(
      'homepage.actions.create.import.validation.tooManyFiles'
    )
    expect(importFileStates.value.studentsCommitteesSingle.file).toBeNull()
    expect(importFileStates.value.committees.file).toBeNull()
  })

  it('clears old validation errors from all fields on a new upload attempt', async () => {
    const selectedSzzType = ref<ImportSzzType>('BACHELOR')
    const { importFileStates, handleImportFileChange } = useImportForm(selectedSzzType)

    const tooManyFilesBatch = [
      createCsvFile('studentsStork', 'studenti-stork.csv', { 'Studijní plán (název)': 'Bc. SI' }),
      createCsvFile('studentsCommittees', 'studenti-komise.csv', { 'St. program - typ': 'B' }),
      createCsvFile('committees', 'komise.csv'),
      createCsvFile('committees', 'komise-extra.csv')
    ]

    await handleImportFileChange(createFileChangeEvent(tooManyFilesBatch), 'studentsStorkSingle')
    expect(importFileStates.value.studentsStorkSingle.error).toBe(
      'homepage.actions.create.import.validation.tooManyFiles'
    )

    const validStudentsCommitteesFile = createCsvFile('studentsCommittees', 'studenti-komise-valid.csv', {
      'St. program - typ': 'B'
    })
    await handleImportFileChange(createFileChangeEvent(validStudentsCommitteesFile), 'studentsCommitteesSingle')

    expect(importFileStates.value.studentsStorkSingle.error).toBeNull()
    expect(importFileStates.value.studentsCommitteesSingle.error).toBeNull()
    expect(importFileStates.value.studentsCommitteesSingle.file?.name).toBe('studenti-komise-valid.csv')
  })

  it('requires five files and builds mixed payload with both levels', async () => {
    const selectedSzzType = ref<ImportSzzType>('MIXED')
    const { handleImportFileChange, buildImportPayload, isImportSubmitDisabled, importFileStates } =
      useImportForm(selectedSzzType)

    const uploads: Array<{ sourceKey: ImportFieldKey; file: File }> = [
      {
        sourceKey: 'studentsStorkMaster',
        file: createCsvFile('studentsStork', 'studenti-stork-bc.csv', { 'Studijní plán (název)': 'Bc. Informatika' })
      },
      {
        sourceKey: 'studentsStorkBachelor',
        file: createCsvFile('studentsStork', 'studenti-stork-mgr.csv', { 'Studijní plán (název)': 'Mgr. Informatika' })
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

    expect(importFileStates.value.studentsStorkBachelor.file?.name).toBe('studenti-stork-bc.csv')
    expect(importFileStates.value.studentsStorkMaster.file?.name).toBe('studenti-stork-mgr.csv')
    expect(importFileStates.value.studentsCommitteesBachelor.file?.name).toBe('studenti-komise-bc.csv')
    expect(importFileStates.value.studentsCommitteesMaster.file?.name).toBe('studenti-komise-mgr.csv')
    expect(importFileStates.value.committees.file?.name).toBe('komise.csv')
    expect(isImportSubmitDisabled.value).toBe(false)

    const payload = buildImportPayload()
    expect(payload).not.toBeNull()
    expect(payload?.studentsStork.bachelor?.fileName).toBe('studenti-stork-bc.csv')
    expect(payload?.studentsStork.master?.fileName).toBe('studenti-stork-mgr.csv')
    expect(payload?.studentsCommittees.bachelor?.fileName).toBe('studenti-komise-bc.csv')
    expect(payload?.studentsCommittees.master?.fileName).toBe('studenti-komise-mgr.csv')
    expect(payload?.committees.fileName).toBe('komise.csv')
  })

  it('enforces max selected files limit in mixed mode', async () => {
    const selectedSzzType = ref<ImportSzzType>('MIXED')
    const { importFileStates, handleImportFileChange } = useImportForm(selectedSzzType)

    const tooManyFilesBatch = [
      createCsvFile('studentsStork', 'studenti-stork-bc.csv', { 'Studijní plán (název)': 'Bc. Informatika' }),
      createCsvFile('studentsStork', 'studenti-stork-mgr.csv', { 'Studijní plán (název)': 'Mgr. Informatika' }),
      createCsvFile('studentsCommittees', 'studenti-komise-bc.csv', { 'St. program - typ': 'B' }),
      createCsvFile('studentsCommittees', 'studenti-komise-mgr.csv', { 'St. program - typ': 'N' }),
      createCsvFile('committees', 'komise.csv'),
      createCsvFile('committees', 'komise-extra.csv')
    ]

    await handleImportFileChange(createFileChangeEvent(tooManyFilesBatch), 'studentsStorkBachelor')

    expect(importFileStates.value.studentsStorkBachelor.file).toBeNull()
    expect(importFileStates.value.studentsStorkBachelor.error).toBe(
      'homepage.actions.create.import.validation.tooManyFiles'
    )
    expect(importFileStates.value.studentsStorkMaster.file).toBeNull()
    expect(importFileStates.value.studentsCommitteesBachelor.file).toBeNull()
    expect(importFileStates.value.studentsCommitteesMaster.file).toBeNull()
    expect(importFileStates.value.committees.file).toBeNull()
  })

  it('clears import field errors without dropping already parsed file data', async () => {
    const selectedSzzType = ref<ImportSzzType>('BACHELOR')
    const { importFileStates, handleImportFileChange, clearImportFieldErrors } = useImportForm(selectedSzzType)

    await handleImportFileChange(
      createFileChangeEvent(createCsvFile('studentsCommittees', 'studenti-komise.csv', { 'St. program - typ': 'B' })),
      'studentsStorkSingle'
    )

    const invalidFile = new File(['payload'], 'invalid.txt', { type: 'text/plain' })
    await handleImportFileChange(createFileChangeEvent(invalidFile), 'studentsStorkSingle')

    expect(importFileStates.value.studentsStorkSingle.error).toBe(
      'homepage.actions.create.import.validation.invalidExtension'
    )
    expect(importFileStates.value.studentsCommitteesSingle.file?.name).toBe('studenti-komise.csv')

    clearImportFieldErrors()

    expect(importFileStates.value.studentsStorkSingle.error).toBeNull()
    expect(importFileStates.value.studentsStorkSingle.file).toBeNull()
    expect(importFileStates.value.studentsCommitteesSingle.error).toBeNull()
    expect(importFileStates.value.studentsCommitteesSingle.file?.name).toBe('studenti-komise.csv')
  })

  it('ignores stale async validation result when user selects a newer file in the same field', async () => {
    const selectedSzzType = ref<ImportSzzType>('BACHELOR')
    const { importFileStates, handleImportFileChange } = useImportForm(selectedSzzType)
    const deferred = createDeferred<ArrayBuffer>()

    const slowCsvFile = {
      name: 'studenti-stork-slow.csv',
      arrayBuffer: vi.fn(() => deferred.promise)
    } as unknown as File

    const fastCsvFile = createCsvFile('studentsStork', 'studenti-stork-fast.csv', {
      'Studijní plán (název)': 'Bc. Informatika'
    })

    const slowChangePromise = handleImportFileChange(createFileChangeEvent(slowCsvFile), 'studentsStorkSingle')
    await handleImportFileChange(createFileChangeEvent(fastCsvFile), 'studentsStorkSingle')

    expect(importFileStates.value.studentsStorkSingle.file?.name).toBe('studenti-stork-fast.csv')
    expect(importFileStates.value.studentsStorkSingle.error).toBeNull()

    deferred.resolve(
      encodeUtf8(
        createCsvContent('studentsStork', {
          'Studijní plán (název)': 'Bc. Informatika'
        })
      )
    )
    await slowChangePromise

    expect(importFileStates.value.studentsStorkSingle.file?.name).toBe('studenti-stork-fast.csv')
    expect(importFileStates.value.studentsStorkSingle.error).toBeNull()
    expect(importFileStates.value.studentsStorkSingle.isValidating).toBe(false)
  })
})
