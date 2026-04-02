import Papa from 'papaparse'
import {
  IMPORT_CSV_OPTIONS,
  normalizeCsvHeader,
  normalizeCsvHeaders,
  removeUtf8BomFromCsvHeader
} from '~/constants/import'
import type { UpsertTeachersDictionaryEntryDto } from '#shared/types/teachers-dictionary'

const TEACHERS_DICTIONARY_REQUIRED_HEADERS = Object.freeze({
  lastName: 'Příjmení',
  firstName: 'Jméno',
  titleBefore: 'Titul osoby (před jménem)',
  titleAfter: 'Titul osoby (za jménem)'
})

const REQUIRED_HEADERS = normalizeCsvHeaders(Object.values(TEACHERS_DICTIONARY_REQUIRED_HEADERS)) as readonly string[]

interface TeachersDictionaryCsvRow {
  lastName: string
  firstName: string
  titleBefore: string
  titleAfter: string
}

type ParseTeachersDictionaryCsvFailureReason =
  | 'parse_error'
  | 'empty_headers'
  | 'empty_rows'
  | 'missing_required_headers'

interface ParseTeachersDictionaryCsvFailure {
  ok: false
  reason: ParseTeachersDictionaryCsvFailureReason
  details: {
    missingHeaders?: string[]
    parseErrors?: string[]
  }
}

interface ParseTeachersDictionaryCsvSuccess {
  ok: true
  entries: UpsertTeachersDictionaryEntryDto[]
}

type ParseTeachersDictionaryCsvResult = ParseTeachersDictionaryCsvSuccess | ParseTeachersDictionaryCsvFailure

function normalizeStringValue(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim()
  }

  if (value === null || value === undefined) {
    return ''
  }

  return String(value).trim()
}

function normalizeWhitespaceTokens(value: string): string[] {
  return value
    .trim()
    .split(/\s+/u)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
}

function buildTeachersDictionaryCanonicalName(row: TeachersDictionaryCsvRow): string {
  const baseName = [...normalizeWhitespaceTokens(row.firstName), ...normalizeWhitespaceTokens(row.lastName)].join(' ')

  if (baseName.length === 0) {
    return ''
  }

  const titleBefore = normalizeWhitespaceTokens(row.titleBefore).join(' ')
  const titleAfter = normalizeWhitespaceTokens(row.titleAfter).join(' ')
  const nameWithTitleBefore = [titleBefore, baseName].filter(Boolean).join(' ')

  return titleAfter.length === 0 ? nameWithTitleBefore : `${nameWithTitleBefore}, ${titleAfter}`
}

function normalizeTeachersDictionaryCsvRow(row: Record<string, unknown>): TeachersDictionaryCsvRow {
  return {
    lastName: normalizeStringValue(row[TEACHERS_DICTIONARY_REQUIRED_HEADERS.lastName]),
    firstName: normalizeStringValue(row[TEACHERS_DICTIONARY_REQUIRED_HEADERS.firstName]),
    titleBefore: normalizeStringValue(row[TEACHERS_DICTIONARY_REQUIRED_HEADERS.titleBefore]),
    titleAfter: normalizeStringValue(row[TEACHERS_DICTIONARY_REQUIRED_HEADERS.titleAfter])
  }
}

// KOS-like exports may have trailing omitted cells in some rows; ignore those parser warnings.
function isRecoverableCsvParseError(error: Papa.ParseError): boolean {
  return error.type === 'FieldMismatch' && (error.code === 'TooFewFields' || error.code === 'TooManyFields')
}

export function parseTeachersDictionaryCsvText(content: string): ParseTeachersDictionaryCsvResult {
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
        parseErrors: blockingErrors.map((error) => error.message)
      }
    }
  }

  const headers = normalizeCsvHeaders(parseResult.meta.fields ?? [])
  if (headers.length === 0) {
    return {
      ok: false,
      reason: 'empty_headers',
      details: {}
    }
  }

  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header))
  if (missingHeaders.length > 0) {
    return {
      ok: false,
      reason: 'missing_required_headers',
      details: {
        missingHeaders
      }
    }
  }

  const entries: UpsertTeachersDictionaryEntryDto[] = []
  const sourceRows = parseResult.data.map((row) => normalizeTeachersDictionaryCsvRow(row))

  for (const row of sourceRows) {
    const canonicalName = buildTeachersDictionaryCanonicalName(row)
    if (canonicalName.length === 0) {
      continue
    }

    entries.push({
      canonicalName,
      isCustom: false
    })
  }

  if (entries.length === 0) {
    return {
      ok: false,
      reason: 'empty_rows',
      details: {}
    }
  }

  return {
    ok: true,
    entries
  }
}
