import { describe, expect, it } from 'vitest'
import {
  applySpecializationCodeChange,
  applyStudyLanguageChange,
  applyStudyProgramNameChange,
  applyStudyProgramTypeChange,
  resolveSpecializationNameForStudyProfile,
  resolveSpecializationOptionsForStudyProfile,
  resolveStudyProgramNameOptionsForStudyProfile,
  type StudentStudyProfileFields
} from '~/utils/editor/student-study-profile'

function createFields(overrides: Partial<StudentStudyProfileFields> = {}): StudentStudyProfileFields {
  return {
    studyLanguage: 'CZECH',
    studyProgramType: 'BACHELOR',
    studyProgramName: 'Informatika',
    specializationCode: 'BI-SI.21',
    ...overrides
  }
}

describe('student-study-profile', () => {
  it('clears program and specialization when language makes program invalid', () => {
    const next = applyStudyLanguageChange(createFields(), 'ENGLISH')

    expect(next.studyLanguage).toBe('ENGLISH')
    expect(next.studyProgramName).toBe('')
    expect(next.specializationCode).toBe('')
  })

  it('keeps compatible program on study program type change and resets specialization', () => {
    const next = applyStudyProgramTypeChange(createFields(), 'MASTER')

    expect(next.studyProgramType).toBe('MASTER')
    expect(next.studyProgramName).toBe('Informatika')
    expect(next.specializationCode).toBe('')
  })

  it('clears specialization when study program name changes', () => {
    const next = applyStudyProgramNameChange(
      createFields({
        studyLanguage: 'ENGLISH',
        studyProgramType: 'MASTER',
        studyProgramName: 'Informatics'
      }),
      'Applied Informatics'
    )

    expect(next.studyProgramName).toBe('Applied Informatics')
    expect(next.specializationCode).toBe('')
  })

  it('resolves specialization name by selected student study profile', () => {
    const fields = createFields({
      studyLanguage: 'ENGLISH',
      studyProgramName: 'Informatics',
      specializationCode: 'BIE-SI.21'
    })
    const next = applySpecializationCodeChange(fields, 'BIE-SI.21')
    const specializationName = resolveSpecializationNameForStudyProfile(
      next.studyProgramType,
      next.studyProgramName,
      next.specializationCode
    )

    expect(specializationName).toBe('Software Engineering 2021')
  })

  it('resolves BIE-PI.24 to explicit English catalog label', () => {
    expect(resolveSpecializationNameForStudyProfile('BACHELOR', 'Informatics', 'BIE-PI.24')).toBe(
      'Computer Engineering 2024'
    )
  })

  it('resolves .24 bachelor Czech specialization name with 2024 label from catalog duplicate', () => {
    expect(resolveSpecializationNameForStudyProfile('BACHELOR', 'Informatika', 'BI-SI.24')).toBe(
      'Softwarové inženýrství 2024'
    )
  })

  it('keeps current study program name in options when not in catalog', () => {
    const options = resolveStudyProgramNameOptionsForStudyProfile('BACHELOR', 'CZECH', 'Vlastní program')

    expect(options[0]).toBe('Vlastní program')
    expect(options).toContain('Informatika')
  })

  it('keeps current specialization code in options when not in catalog', () => {
    const options = resolveSpecializationOptionsForStudyProfile('BACHELOR', 'Informatika', 'CUSTOM-001')

    expect(options[0]?.specializationCode).toBe('CUSTOM-001')
    expect(options[0]?.specializationName).toBe('CUSTOM-001')
  })

  it('keeps ISP specialization name as raw code in study profile', () => {
    expect(resolveSpecializationNameForStudyProfile('BACHELOR', 'Informatika', 'BI-PS-ISP-515623')).toBe(
      'BI-PS-ISP-515623'
    )
  })
})
