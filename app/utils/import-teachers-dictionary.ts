/**
 * This util handles teacher-name normalization before the main import mapper runs
 *
 * Why it exists:
 * KOS exports contain names/titles in the wrong order, moreover, without any meaningful separator
 * As a result, original properly formatted values are not recoverable without an additional source of data
 *
 * We normalize everything and resolve names through the teacher's dictionary
 * first, then pass a cleaned payload to mapping
 *
 * What it does:
 * - Clones import payload to avoid mutating the original upload data
 * - Collects seed entries from students-stork payload (STUDENTS_Stork_DICTIONARY_SOURCE_COLUMNS) and prepares dictionary upserts with `isCustom: false`
 *   (This step allows to extend the dictionary as a side effect of importing, as such column already contains properly formatted values)
 * - Builds an in-memory lookup map from dictionary API response
 * - Applies dictionary resolution to Students Committees fields (STUDENTS_COMMITTEES_DICTIONARY_TARGET_COLUMNS), rewriting row values to properly formatted values
 * - Collects unresolved names (unique by lookup key) so UI can ask the user once and store manual corrections
 * - Reuses one normalization pipeline for CSV values and manual user input
 */

import type {
  GetTeachersDictionaryResponseDto,
  UpsertTeachersDictionaryEntryDto
} from '#shared/types/teachers-dictionary'
import { buildTeachersDictionaryLookupKey, normalizeTeachersDictionaryName } from '#shared/utils/teachers-dictionary'
import type { ImportCsvRow, ImportPayload } from '~/types/import'

type ImportPayloadLevel = keyof ImportPayload['studentsStork']

export interface MissingTeachersDictionaryEntry {
  lookupKey: string
  sourceValue: string
}

const IMPORT_LEVEL_KEYS: readonly ImportPayloadLevel[] = ['bachelor', 'master']

export const STUDENTS_Stork_DICTIONARY_SOURCE_COLUMNS = [
  'VŠKP-typ A: Vedoucí práce 1',
  'VŠKP-typ A: Vedoucí práce 2',
  'VŠKP-typ A: Oponent práce 1',
  'VŠKP-typ A: Oponent práce 2'
] as const

export const STUDENTS_COMMITTEES_DICTIONARY_TARGET_COLUMNS = [
  'VŠKP-typ A: Vedoucí práce 1',
  'VŠKP-typ A: Vedoucí práce 2',
  'VŠKP-typ A: Oponent práce 1',
  'VŠKP-typ A: Oponent práce 2',
  'Komise - předseda',
  'Komise - místopředseda',
  'Komise - člen 1',
  'Komise - člen 2',
  'Komise - člen 3'
] as const

// Flattens rows from all available payload levels (bachelor/master) into one list
function collectRowsFromPayloadLevelMap(
  datasets: ImportPayload['studentsStork'] | ImportPayload['studentsCommittees']
): ImportCsvRow[] {
  const rows: ImportCsvRow[] = []

  for (const levelKey of IMPORT_LEVEL_KEYS) {
    const dataset = datasets[levelKey]
    if (!dataset) {
      continue
    }

    rows.push(...dataset.rows)
  }

  return rows
}

// Normalizes a raw teacher value and derives a stable dictionary lookup key
// Returns null when input cannot produce a usable canonical name or lookup key
function normalizeTeacherValueForLookup(value: string): { canonicalName: string; lookupKey: string } | null {
  const canonicalName = normalizeTeachersDictionaryName(value)
  if (canonicalName.length === 0) {
    return null
  }

  const lookupKey = buildTeachersDictionaryLookupKey(canonicalName)
  if (lookupKey.length === 0) {
    return null
  }

  return {
    canonicalName,
    lookupKey
  }
}

function cloneImportDatasetRows(rows: ImportCsvRow[]): ImportCsvRow[] {
  return rows.map((row) => ({ ...row }))
}

// Creates a mutable working copy so dictionary normalization can rewrite values without mutating original import data
// So, in case something went wrong, the app can always rollback to the original state of payload without forcing the user to reupload files
export function cloneImportPayload(payload: ImportPayload): ImportPayload {
  return {
    committees: {
      fileName: payload.committees.fileName,
      headers: [...payload.committees.headers],
      rows: cloneImportDatasetRows(payload.committees.rows)
    },
    studentsStork: {
      bachelor: payload.studentsStork.bachelor
        ? {
            fileName: payload.studentsStork.bachelor.fileName,
            headers: [...payload.studentsStork.bachelor.headers],
            rows: cloneImportDatasetRows(payload.studentsStork.bachelor.rows)
          }
        : undefined,
      master: payload.studentsStork.master
        ? {
            fileName: payload.studentsStork.master.fileName,
            headers: [...payload.studentsStork.master.headers],
            rows: cloneImportDatasetRows(payload.studentsStork.master.rows)
          }
        : undefined
    },
    studentsCommittees: {
      bachelor: payload.studentsCommittees.bachelor
        ? {
            fileName: payload.studentsCommittees.bachelor.fileName,
            headers: [...payload.studentsCommittees.bachelor.headers],
            rows: cloneImportDatasetRows(payload.studentsCommittees.bachelor.rows)
          }
        : undefined,
      master: payload.studentsCommittees.master
        ? {
            fileName: payload.studentsCommittees.master.fileName,
            headers: [...payload.studentsCommittees.master.headers],
            rows: cloneImportDatasetRows(payload.studentsCommittees.master.rows)
          }
        : undefined
    }
  }
}

// Extracts supervisor/opponent names from Students Stork rows, normalizes them, and returns unique dictionary upsert entries
// !!! Side effect: rewrites source row cells to canonical name form
export function collectTeachersDictionarySeedEntries(payload: ImportPayload): UpsertTeachersDictionaryEntryDto[] {
  const entriesByLookupKey = new Map<string, UpsertTeachersDictionaryEntryDto>()
  const studentsStorkRows = collectRowsFromPayloadLevelMap(payload.studentsStork)

  for (const row of studentsStorkRows) {
    for (const column of STUDENTS_Stork_DICTIONARY_SOURCE_COLUMNS) {
      const value = normalizeTeacherValueForLookup(row[column] ?? '')
      if (!value) {
        row[column] = ''
        continue
      }

      row[column] = value.canonicalName

      entriesByLookupKey.set(value.lookupKey, {
        canonicalName: value.canonicalName,
        isCustom: false
      })
    }
  }

  return Array.from(entriesByLookupKey.values())
}

export function createTeachersDictionaryLookupMap(entries: GetTeachersDictionaryResponseDto): Map<string, string> {
  const dictionaryByLookupKey = new Map<string, string>()

  for (const entry of entries) {
    const canonicalName = normalizeTeachersDictionaryName(entry.canonicalName)
    const lookupKey = entry.normalizedLookupKey.trim()

    // such a data shouldn't be in the db, but I would rather double check it
    if (lookupKey.length === 0 || canonicalName.length === 0) {
      continue
    }

    dictionaryByLookupKey.set(lookupKey, canonicalName)
  }

  return dictionaryByLookupKey
}

function applyTeachersDictionaryToRow(
  row: ImportCsvRow,
  dictionaryByLookupKey: ReadonlyMap<string, string>,
  missingByLookupKey: Map<string, MissingTeachersDictionaryEntry>
): void {
  for (const column of STUDENTS_COMMITTEES_DICTIONARY_TARGET_COLUMNS) {
    const normalizedValue = normalizeTeacherValueForLookup(row[column] ?? '')
    if (!normalizedValue) {
      row[column] = ''
      continue
    }

    const resolvedName = dictionaryByLookupKey.get(normalizedValue.lookupKey)
    if (resolvedName) {
      row[column] = resolvedName
      continue
    }

    row[column] = normalizedValue.canonicalName

    if (!missingByLookupKey.has(normalizedValue.lookupKey)) {
      missingByLookupKey.set(normalizedValue.lookupKey, {
        lookupKey: normalizedValue.lookupKey,
        sourceValue: normalizedValue.canonicalName
      })
    }
  }
}

// Normalizes and resolves target teacher-name columns in a single row using dictionary lookup and
// collects unresolved unique entries into missingByLookupKey for later manual resolution
// !!! Side effects: rewrites row values to resolved canonical names
export function applyTeachersDictionaryToStudentsCommittees(
  payload: ImportPayload,
  dictionaryByLookupKey: ReadonlyMap<string, string>
): MissingTeachersDictionaryEntry[] {
  const missingByLookupKey = new Map<string, MissingTeachersDictionaryEntry>()
  const studentsCommitteesRows = collectRowsFromPayloadLevelMap(payload.studentsCommittees)

  for (const row of studentsCommitteesRows) {
    applyTeachersDictionaryToRow(row, dictionaryByLookupKey, missingByLookupKey)
  }

  return Array.from(missingByLookupKey.values())
}
