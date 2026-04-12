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
 * - Builds an in-memory lookup map from dictionary API response
 * - Applies dictionary resolution to Committees teacher fields (COMMITTEES_DICTIONARY_TARGET_COLUMNS), rewriting row values to properly formatted values
 * - Applies dictionary resolution to Students Stork teacher fields (STUDENTS_STORK_DICTIONARY_TARGET_COLUMNS), rewriting row values to properly formatted values
 * - Applies dictionary resolution to Students Committees fields (STUDENTS_COMMITTEES_DICTIONARY_TARGET_COLUMNS), rewriting row values to properly formatted values
 * - Collects unresolved names (unique by lookup key) so UI can ask the user once and store manual corrections
 * - Reuses one normalization pipeline for CSV values and manual user input
 */

import type { GetTeachersDictionaryResponseDto } from '#shared/types/teachers-dictionary'
import { buildTeachersDictionaryLookupKey, normalizeTeachersDictionaryName } from '#shared/utils/teachers-dictionary'
import type { ImportCsvRow, ImportPayload, PreparedImportPayload } from '~/types/import'
import { IMPORT_COLUMN_NAMES } from '~/utils/import-mapper/core/columns'

type ImportPayloadLevel = keyof ImportPayload['studentsStork']

export interface MissingTeachersDictionaryEntry {
  lookupKey: string
  sourceValue: string
}

export type PrepareImportPayloadForMappingResult =
  | {
      ok: true
      preparedPayload: PreparedImportPayload
    }
  | {
      ok: false
      unresolvedEntries: MissingTeachersDictionaryEntry[]
    }

const IMPORT_LEVEL_KEYS: readonly ImportPayloadLevel[] = ['bachelor', 'master']

const COMMITTEES_DICTIONARY_TARGET_COLUMNS = [IMPORT_COLUMN_NAMES.committees.secretaryName] as const

const STUDENTS_STORK_DICTIONARY_TARGET_COLUMNS = [
  IMPORT_COLUMN_NAMES.studentsStork.supervisorName,
  IMPORT_COLUMN_NAMES.studentsStork.additionalSupervisorName,
  IMPORT_COLUMN_NAMES.studentsStork.reviewerName,
  IMPORT_COLUMN_NAMES.studentsStork.additionalReviewerName
] as const

export const STUDENTS_COMMITTEES_DICTIONARY_TARGET_COLUMNS = [
  IMPORT_COLUMN_NAMES.studentsCommittees.supervisorName,
  IMPORT_COLUMN_NAMES.studentsCommittees.additionalSupervisorName,
  IMPORT_COLUMN_NAMES.studentsCommittees.reviewerName,
  IMPORT_COLUMN_NAMES.studentsCommittees.additionalReviewerName,
  IMPORT_COLUMN_NAMES.studentsCommittees.chairName,
  IMPORT_COLUMN_NAMES.studentsCommittees.viceChairName,
  IMPORT_COLUMN_NAMES.studentsCommittees.member1Name,
  IMPORT_COLUMN_NAMES.studentsCommittees.member2Name,
  IMPORT_COLUMN_NAMES.studentsCommittees.member3Name
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
// So, in case something went wrong, the app can always roll back to the original state of payload without forcing the user to reupload files
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

export function createTeachersDictionaryLookupMap(entries: GetTeachersDictionaryResponseDto): Map<string, string> {
  const dictionaryByLookupKey = new Map<string, string>()

  for (const entry of entries) {
    const canonicalName = normalizeTeachersDictionaryName(entry.canonicalName)
    const lookupKey = entry.normalizedLookupKey.trim()

    // such a data shouldn't be in the db, but I would rather double-check it
    if (lookupKey.length === 0 || canonicalName.length === 0) {
      continue
    }

    dictionaryByLookupKey.set(lookupKey, canonicalName)
  }

  return dictionaryByLookupKey
}

function applyTeachersDictionaryToRow(
  row: ImportCsvRow,
  columns: readonly string[],
  dictionaryByLookupKey: ReadonlyMap<string, string>,
  missingByLookupKey: Map<string, MissingTeachersDictionaryEntry>
): void {
  for (const column of columns) {
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

function applyTeachersDictionaryToStudentsStorkRows(
  payload: ImportPayload,
  dictionaryByLookupKey: ReadonlyMap<string, string>,
  missingByLookupKey: Map<string, MissingTeachersDictionaryEntry>
): void {
  const studentsStorkRows = collectRowsFromPayloadLevelMap(payload.studentsStork)

  for (const row of studentsStorkRows) {
    applyTeachersDictionaryToRow(
      row,
      STUDENTS_STORK_DICTIONARY_TARGET_COLUMNS,
      dictionaryByLookupKey,
      missingByLookupKey
    )
  }
}

function applyTeachersDictionaryToStudentsCommitteesRows(
  payload: ImportPayload,
  dictionaryByLookupKey: ReadonlyMap<string, string>,
  missingByLookupKey: Map<string, MissingTeachersDictionaryEntry>
): void {
  const studentsCommitteesRows = collectRowsFromPayloadLevelMap(payload.studentsCommittees)

  for (const row of studentsCommitteesRows) {
    applyTeachersDictionaryToRow(
      row,
      STUDENTS_COMMITTEES_DICTIONARY_TARGET_COLUMNS,
      dictionaryByLookupKey,
      missingByLookupKey
    )
  }
}

function applyTeachersDictionaryToCommitteesRows(
  payload: ImportPayload,
  dictionaryByLookupKey: ReadonlyMap<string, string>,
  missingByLookupKey: Map<string, MissingTeachersDictionaryEntry>
): void {
  for (const row of payload.committees.rows) {
    applyTeachersDictionaryToRow(row, COMMITTEES_DICTIONARY_TARGET_COLUMNS, dictionaryByLookupKey, missingByLookupKey)
  }
}

/**
 * Final step before mapper: apply dictionary normalization and return an opaque
 * "prepared" payload only when all teacher values are fully resolved.
 */
export function prepareImportPayloadForMapping(
  payload: ImportPayload,
  dictionaryByLookupKey: ReadonlyMap<string, string>
): PrepareImportPayloadForMappingResult {
  const missingByLookupKey = new Map<string, MissingTeachersDictionaryEntry>()
  applyTeachersDictionaryToCommitteesRows(payload, dictionaryByLookupKey, missingByLookupKey)
  applyTeachersDictionaryToStudentsStorkRows(payload, dictionaryByLookupKey, missingByLookupKey)
  applyTeachersDictionaryToStudentsCommitteesRows(payload, dictionaryByLookupKey, missingByLookupKey)
  const unresolvedEntries = Array.from(missingByLookupKey.values())
  if (unresolvedEntries.length > 0) {
    return {
      ok: false,
      unresolvedEntries
    }
  }

  return {
    ok: true,
    preparedPayload: payload as PreparedImportPayload
  }
}
