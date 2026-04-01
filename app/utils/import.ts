import Papa from 'papaparse'
import {
  findMatchingImportSchemaKeys,
  IMPORT_CSV_OPTIONS,
  IMPORT_SCHEMAS,
  normalizeCsvHeader,
  normalizeCsvHeaders,
  removeUtf8BomFromCsvHeader,
  resolveImportDatasetKeyByHeaders
} from '~/constants/import'
import type { ImportCsvRow, ImportDatasetKey, ImportFieldKey, ImportSzzType, ImportStudyLevel } from '~/types/import'

type ParseImportCsvSuccess = {
  ok: true
  datasetKey: ImportDatasetKey
  headers: string[]
  rows: ImportCsvRow[]
}

type ParseImportCsvFailure = {
  ok: false
  reason: 'parse_error' | 'empty_headers' | 'schema_mismatch'
  details: {
    headers: string[]
    matchedDatasetKeys?: ImportDatasetKey[]
    parseErrors?: string[]
  }
}

type ParseImportCsvResult = ParseImportCsvSuccess | ParseImportCsvFailure

export function isCsvFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.csv')
}

export async function decodeUtf8File(file: File): Promise<string | null> {
  const fileBuffer = await file.arrayBuffer()
  const utf8Decoder = new TextDecoder('utf-8', { fatal: true })

  try {
    return utf8Decoder.decode(fileBuffer)
  } catch {
    return null
  }
}

// KOS exports can have trailing omitted cells in some rows; keep parsing if only field count differs.
function isRecoverableCsvParseError(error: Papa.ParseError): boolean {
  return error.type === 'FieldMismatch' && (error.code === 'TooFewFields' || error.code === 'TooManyFields')
}

// Parses CSV content, validates schema compatibility with supported KOS exports,
// and normalizes rows to a consistent string-only shape.
export function parseImportCsvText(content: string): ParseImportCsvResult {
  const parseResult = Papa.parse<Record<string, unknown>>(content, {
    header: true,
    delimiter: IMPORT_CSV_OPTIONS.delimiter,
    quoteChar: IMPORT_CSV_OPTIONS.quoteChar,
    skipEmptyLines: 'greedy',
    transformHeader: (header, index) => {
      const trimmedHeader = normalizeCsvHeader(header)
      return index === 0 ? removeUtf8BomFromCsvHeader(trimmedHeader) : trimmedHeader
    }
  })

  const blockingErrors = parseResult.errors.filter((error) => !isRecoverableCsvParseError(error))

  if (blockingErrors.length > 0) {
    return {
      ok: false,
      reason: 'parse_error',
      details: {
        headers: normalizeCsvHeaders(parseResult.meta.fields ?? []),
        parseErrors: blockingErrors.map((error) => error.message)
      }
    }
  }

  const headers = normalizeCsvHeaders(parseResult.meta.fields ?? [])
  if (headers.length === 0) {
    return {
      ok: false,
      reason: 'empty_headers',
      details: {
        headers: []
      }
    }
  }

  const datasetKey = resolveImportDatasetKeyByHeaders(headers)
  if (!datasetKey) {
    return {
      ok: false,
      reason: 'schema_mismatch',
      details: {
        headers,
        matchedDatasetKeys: findMatchingImportSchemaKeys(headers)
      }
    }
  }

  const requiredHeaders = normalizeCsvHeaders([...IMPORT_SCHEMAS[datasetKey]])

  return {
    ok: true,
    datasetKey,
    headers: requiredHeaders,
    rows: parseResult.data.map((row) => normalizeCsvRow(row, requiredHeaders))
  }
}

function normalizeCsvRow(row: Record<string, unknown>, headers: string[]): ImportCsvRow {
  const normalizedRow: ImportCsvRow = {}

  for (const header of headers) {
    const value = row[header]

    if (typeof value === 'string') {
      normalizedRow[header] = value.trim()
      continue
    }

    if (value === null || value === undefined) {
      normalizedRow[header] = ''
      continue
    }

    normalizedRow[header] = String(value).trim()
  }

  return normalizedRow
}

function startsWithAnyPrefix(value: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => value.startsWith(prefix))
}

export function resolveStudyLevelFromStudentsCommittees(rows: ImportCsvRow[]): ImportStudyLevel | null {
  const studyProgramTypeValue = rows[0]?.['St. program - typ']?.trim().toUpperCase() ?? ''
  const firstSymbol = studyProgramTypeValue[0] ?? ''

  if (firstSymbol === 'B') {
    return 'BACHELOR'
  }

  if (firstSymbol === 'N' || firstSymbol === 'M') {
    return 'MASTER'
  }

  return null
}

export function resolveStudyLevelFromStudentsStork(rows: ImportCsvRow[]): ImportStudyLevel | null {
  const studyScheduleName = rows[0]?.['Studijní plán (název)']?.trim().toLowerCase() ?? ''

  if (startsWithAnyPrefix(studyScheduleName, ['bc.', 'bachelor', 'bakalářsk'])) {
    return 'BACHELOR'
  }

  if (startsWithAnyPrefix(studyScheduleName, ['mgr.', 'master', 'magister', 'navazující'])) {
    return 'MASTER'
  }

  return null
}

export function resolveImportTargetFieldKey(
  szzType: ImportSzzType,
  datasetKey: ImportDatasetKey,
  rows: ImportCsvRow[]
): ImportFieldKey | null {
  if (datasetKey === 'committees') {
    return 'committees'
  }

  if (szzType !== 'MIXED') {
    return datasetKey === 'studentsStork' ? 'studentsStorkSingle' : 'studentsCommitteesSingle'
  }

  const studyLevel =
    datasetKey === 'studentsStork'
      ? resolveStudyLevelFromStudentsStork(rows)
      : resolveStudyLevelFromStudentsCommittees(rows)

  if (!studyLevel) {
    return null
  }

  if (datasetKey === 'studentsStork') {
    return studyLevel === 'BACHELOR' ? 'studentsStorkBachelor' : 'studentsStorkMaster'
  }

  return studyLevel === 'BACHELOR' ? 'studentsCommitteesBachelor' : 'studentsCommitteesMaster'
}
