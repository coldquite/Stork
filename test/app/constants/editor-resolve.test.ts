import { describe, expect, it } from 'vitest'
import {
  normalizeEditorSpecializationCodeForDepartmentLookup,
  resolveEditorSpecializationOptionByCode,
  resolveEditorSpecializationOptionForDepartment,
  resolveEditorStudyProgramTypeBySpecializationCode
} from '#shared/constants/editor'

describe('editor specialization resolve', () => {
  it('normalizes specialization code for department lookup without year suffix', () => {
    expect(normalizeEditorSpecializationCodeForDepartmentLookup('BI-SI21')).toBe('BI-SI')
    expect(normalizeEditorSpecializationCodeForDepartmentLookup('BI-SI.2027')).toBe('BI-SI')
    expect(normalizeEditorSpecializationCodeForDepartmentLookup('NI-ZI')).toBe('NI-ZI')
    expect(normalizeEditorSpecializationCodeForDepartmentLookup('BI-PS-ISP-515623')).toBe('BI-PS')
    expect(normalizeEditorSpecializationCodeForDepartmentLookup('BI-PS.21-isp-515623')).toBe('BI-PS')
  })

  it('keeps resolveEditorSpecializationOptionByCode exact and year-sensitive', () => {
    expect(resolveEditorSpecializationOptionByCode('BACHELOR', 'Informatika', 'BI-SI.21')?.specializationCode).toBe(
      'BI-SI.21'
    )
    expect(resolveEditorSpecializationOptionByCode('BACHELOR', 'Informatika', 'BI-SI.2099')).toBeNull()
  })

  it('resolves department mapping year-insensitively in current program context', () => {
    const resolved = resolveEditorSpecializationOptionForDepartment('BACHELOR', 'Informatika', 'BI-SI.2099')

    expect(resolved).not.toBeNull()
    expect(resolved?.departmentCode).toBe('18102')
  })

  it('resolves department mapping year-insensitively with global fallback', () => {
    const resolved = resolveEditorSpecializationOptionForDepartment('BACHELOR', 'Informatika', 'NIE-SI.404')

    expect(resolved).not.toBeNull()
    expect(resolved?.departmentCode).toBe('18102')
  })

  it('returns null for unknown specialization code in department resolver', () => {
    expect(resolveEditorSpecializationOptionForDepartment('MASTER', 'Informatika', 'UNKNOWN-SPEC.999')).toBeNull()
  })

  it('resolves department for ISP specialization through non-individual code', () => {
    const resolved = resolveEditorSpecializationOptionForDepartment('BACHELOR', 'Informatika', 'BI-PS-ISP-515623')

    expect(resolved).not.toBeNull()
    expect(resolved?.departmentCode).toBe('18104')
  })

  it('resolves study-program type from regular and ISP specialization code', () => {
    expect(resolveEditorStudyProgramTypeBySpecializationCode('BI-PS.21')).toBe('BACHELOR')
    expect(resolveEditorStudyProgramTypeBySpecializationCode('BI-PS-ISP-515623')).toBe('BACHELOR')
    expect(resolveEditorStudyProgramTypeBySpecializationCode('NI-SI-ISP-900001')).toBe('MASTER')
    expect(resolveEditorStudyProgramTypeBySpecializationCode('UNKNOWN-SPEC')).toBeNull()
  })
})
