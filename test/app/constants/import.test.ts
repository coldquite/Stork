import { describe, expect, it } from 'vitest'
import { getImportFormFieldsBySzzType, IMPORT_SCHEMAS, resolveImportDatasetKeyByHeaders } from '~/constants/import'

describe('import constants', () => {
  it('returns single-file field config for bachelor and master modes', () => {
    const bachelorFields = getImportFormFieldsBySzzType('BACHELOR')
    const masterFields = getImportFormFieldsBySzzType('MASTER')

    expect(bachelorFields.map((field) => field.key)).toEqual([
      'studentsCapSingle',
      'studentsCommitteesSingle',
      'committees'
    ])
    expect(masterFields.map((field) => field.key)).toEqual([
      'studentsCapSingle',
      'studentsCommitteesSingle',
      'committees'
    ])
  })

  it('returns split fields for mixed mode with dedicated committees label', () => {
    const mixedFields = getImportFormFieldsBySzzType('MIXED')

    expect(mixedFields.map((field) => field.key)).toEqual([
      'studentsCapBachelor',
      'studentsCapMaster',
      'studentsCommitteesBachelor',
      'studentsCommitteesMaster',
      'committees'
    ])
    expect(mixedFields.at(-1)?.labelKey).toBe('homepage.actions.create.import.fields.committeesMixed')
  })

  it('resolves dataset key by headers regardless of header order', () => {
    const headers = [...IMPORT_SCHEMAS.studentsCommittees].reverse()
    expect(resolveImportDatasetKeyByHeaders(headers)).toBe('studentsCommittees')
  })

  it('returns null for duplicate or incomplete headers', () => {
    const duplicateHeaders = [...IMPORT_SCHEMAS.committees, 'Datum']
    const incompleteHeaders = IMPORT_SCHEMAS.studentsCap.slice(0, -1)

    expect(resolveImportDatasetKeyByHeaders(duplicateHeaders)).toBeNull()
    expect(resolveImportDatasetKeyByHeaders(incompleteHeaders)).toBeNull()
  })
})
