import { describe, expect, it } from 'vitest'
import {
  normalizeEditorSpecializationCodeForDepartmentLookup,
  resolveEditorSpecializationOptionByCode,
  resolveEditorSpecializationOptionForDepartment
} from '#shared/constants/editor'

describe('editor specialization resolve', () => {
  it('normalizes specialization code for department lookup without year suffix', () => {
    expect(normalizeEditorSpecializationCodeForDepartmentLookup('BI-SI21')).toBe('BI-SI')
    expect(normalizeEditorSpecializationCodeForDepartmentLookup('BI-SI.2027')).toBe('BI-SI')
    expect(normalizeEditorSpecializationCodeForDepartmentLookup('NI-ZI')).toBe('NI-ZI')
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
})
