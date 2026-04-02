import { describe, expect, it } from 'vitest'
import { IMPORT_SCHEMAS } from '~/constants/import'
import {
  parseImportCsvText,
  resolveImportTargetFieldKey,
  resolveStudyLevelFromStudentsStork,
  resolveStudyLevelFromStudentsCommittees
} from '~/utils/import'
import type { ImportCsvRow, ImportDatasetKey } from '~/types/import'

function toCsvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

function createCsvContent(datasetKey: ImportDatasetKey, rowOverrides: Partial<Record<string, string>> = {}): string {
  const headers = [...IMPORT_SCHEMAS[datasetKey]]
  const row = headers.map((header, index) => rowOverrides[header] ?? `value-${index + 1}`)

  return `${headers.map(toCsvCell).join(';')}\n${row.map(toCsvCell).join(';')}`
}

function createCsvContentByHeaders(headers: string[]): string {
  const row = headers.map((_, index) => `value-${index + 1}`)
  return `${headers.map(toCsvCell).join(';')}\n${row.map(toCsvCell).join(';')}`
}

describe('import utils', () => {
  it('parses valid CSV and normalizes rows', () => {
    const csv = createCsvContent('committees', { Datum: ' 2026-06-15 ' })
    const result = parseImportCsvText(csv)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected parse success')
    }

    expect(result.datasetKey).toBe('committees')
    expect(result.headers).toEqual(IMPORT_SCHEMAS.committees)
    expect(result.rows[0]?.Datum).toBe('2026-06-15')
  })

  it('accepts recoverable field mismatch errors from CSV parser', () => {
    const headers = IMPORT_SCHEMAS.studentsCommittees
    const fullRow = headers.map((_, index) => toCsvCell(`value-${index + 1}`)).join(';')
    const shortRow = headers
      .slice(0, 20)
      .map((_, index) => toCsvCell(`short-${index + 1}`))
      .join(';')
    const csv = `${headers.map(toCsvCell).join(';')}\n${fullRow}\n${shortRow}`

    const result = parseImportCsvText(csv)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected parse success')
    }

    expect(result.datasetKey).toBe('studentsCommittees')
    expect(result.headers).toEqual(IMPORT_SCHEMAS.studentsCommittees)
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0]?.[headers[0]!]).toBe('value-1')
    expect(result.rows[1]?.[headers[0]!]).toBe('short-1')
    expect(result.rows[1]?.[headers[19]!]).toBe('short-20')
    expect(result.rows[1]?.[headers[20]!]).toBe('')
  })

  it('returns schema_mismatch for unknown structure', () => {
    const result = parseImportCsvText('"foo";"bar"\n"1";"2"')

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected parse failure')
    }

    expect(result.reason).toBe('schema_mismatch')
  })

  it('returns empty_headers for CSV content without header row', () => {
    const result = parseImportCsvText('\n\n')

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected parse failure')
    }

    expect(result.reason).toBe('empty_headers')
    expect(result.details.headers).toEqual([])
  })

  it('returns parse_error with parser diagnostics for malformed CSV', () => {
    const malformedCsv = '"Jméno";"Příjmení"\n"Jan";"Novák'
    const result = parseImportCsvText(malformedCsv)

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected parse failure')
    }

    expect(result.reason).toBe('parse_error')
    expect(result.details.headers).toEqual(['Jméno', 'Příjmení'])
    expect(result.details.parseErrors?.length ?? 0).toBeGreaterThan(0)
  })

  it('returns schema_mismatch details with multiple schema candidates for ambiguous headers', () => {
    const ambiguousHeaders = [...new Set([...IMPORT_SCHEMAS.studentsStork, ...IMPORT_SCHEMAS.studentsCommittees])]
    const result = parseImportCsvText(createCsvContentByHeaders(ambiguousHeaders))

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected parse failure')
    }

    expect(result.reason).toBe('schema_mismatch')
    expect(result.details.matchedDatasetKeys).toEqual(
      expect.arrayContaining<ImportDatasetKey>(['studentsStork', 'studentsCommittees'])
    )
  })

  it('detects study level from both KOS datasets', () => {
    const studentsStorkBachelorRows: ImportCsvRow[] = [{ 'Studijní plán (název)': 'Bc. Informatika' }]
    const studentsStorkMasterRows: ImportCsvRow[] = [{ 'Studijní plán (název)': 'Mgr. Informatika' }]
    const studentsCommitteesBachelorRows: ImportCsvRow[] = [{ 'St. program - typ': 'B' }]
    const studentsCommitteesMasterRows: ImportCsvRow[] = [{ 'St. program - typ': 'N' }]

    expect(resolveStudyLevelFromStudentsStork(studentsStorkBachelorRows)).toBe('BACHELOR')
    expect(resolveStudyLevelFromStudentsStork(studentsStorkMasterRows)).toBe('MASTER')
    expect(resolveStudyLevelFromStudentsCommittees(studentsCommitteesBachelorRows)).toBe('BACHELOR')
    expect(resolveStudyLevelFromStudentsCommittees(studentsCommitteesMasterRows)).toBe('MASTER')
  })

  it('returns null for unsupported students-stork study schedule prefixes', () => {
    const rows: ImportCsvRow[] = [{ 'Studijní plán (název)': 'NMgr. Informatika' }]
    expect(resolveStudyLevelFromStudentsStork(rows)).toBeNull()
  })

  it('resolves target field by SZZ type and detected dataset level', () => {
    const studentsStorkRows: ImportCsvRow[] = [{ 'Studijní plán (název)': 'Mgr. Informatika' }]
    const studentsCommitteesRows: ImportCsvRow[] = [{ 'St. program - typ': 'B' }]

    expect(resolveImportTargetFieldKey('BACHELOR', 'studentsStork', studentsStorkRows)).toBe('studentsStorkSingle')
    expect(resolveImportTargetFieldKey('MASTER', 'studentsCommittees', studentsCommitteesRows)).toBe(
      'studentsCommitteesSingle'
    )
    expect(resolveImportTargetFieldKey('MIXED', 'studentsStork', studentsStorkRows)).toBe('studentsStorkMaster')
    expect(resolveImportTargetFieldKey('MIXED', 'studentsCommittees', studentsCommitteesRows)).toBe(
      'studentsCommitteesBachelor'
    )
    expect(resolveImportTargetFieldKey('MIXED', 'committees', [])).toBe('committees')
  })
})
