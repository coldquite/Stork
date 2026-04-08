import { describe, expect, it } from 'vitest'
import type { PostStudentItemDto } from '#shared/types/time-schedules'
import {
  applyStudentCommitteeRewrite,
  buildStudentCommitteeRewritePreview,
  hasStudentCommitteeRewriteChanges,
  toStudentCommitteeRewritePreviewList
} from '~/utils/editor/student-committee-rewrite'

function createStudent(overrides: Partial<PostStudentItemDto> = {}): PostStudentItemDto {
  return {
    firstName: 'Jan',
    lastName: 'Novak',
    email: '',
    titlesBefore: '',
    titlesAfter: '',
    thesisTitleLocal: 'Thesis CS',
    thesisTitleEn: 'Thesis EN',
    thesisLanguage: 'CZECH',
    supervisorName: 'Supervisor',
    reviewerName: 'Reviewer',
    additionalSupervisorName: '',
    additionalReviewerName: '',
    studyProgramName: 'Informatics',
    studyProgramType: 'BACHELOR',
    specializationName: 'Software Engineering',
    specializationCode: 'BI-SI.21',
    studyLanguage: 'CZECH',
    repeatType: 'THESIS_DEFENSE',
    prepareMinutes: 45,
    examMinutes: 15,
    ...overrides
  }
}

function createTargetCommitteeProfile() {
  return {
    studyProgramName: 'Applied Informatics',
    studyProgramType: 'MASTER' as const,
    specializationName: 'Knowledge Engineering',
    specializationCode: 'NI-ZI.24',
    language: 'ENGLISH' as const
  }
}

describe('student-committee-rewrite utils', () => {
  it('builds preview with strict value comparison and ordered list', () => {
    const student = createStudent({
      studyProgramName: 'Informatics',
      specializationName: 'Software Engineering'
    })
    const target = createTargetCommitteeProfile()

    const preview = buildStudentCommitteeRewritePreview(student, {
      ...target,
      studyProgramName: 'Informatics '
    })

    expect(preview.studyProgramName.willChange).toBe(true)
    expect(preview.specializationName.willChange).toBe(true)
    expect(preview.prepareMinutes.willChange).toBe(false)
    expect(preview.examMinutes.willChange).toBe(true)
    expect(hasStudentCommitteeRewriteChanges(preview)).toBe(true)

    const orderedFields = toStudentCommitteeRewritePreviewList(preview).map((entry) => entry.field)
    expect(orderedFields).toEqual([
      'studyProgramName',
      'studyProgramType',
      'specializationName',
      'specializationCode',
      'studyLanguage',
      'prepareMinutes',
      'examMinutes'
    ])
  })

  it('applies committee profile and remaps duration by target study type and student repeat type', () => {
    const student = createStudent({
      studyProgramType: 'BACHELOR',
      repeatType: 'THESIS_DEFENSE',
      prepareMinutes: 45,
      examMinutes: 15
    })
    const target = createTargetCommitteeProfile()

    applyStudentCommitteeRewrite(student, target)

    expect(student.studyProgramName).toBe(target.studyProgramName)
    expect(student.studyProgramType).toBe(target.studyProgramType)
    expect(student.specializationName).toBe(target.specializationName)
    expect(student.specializationCode).toBe(target.specializationCode)
    expect(student.studyLanguage).toBe(target.language)
    expect(student.prepareMinutes).toBe(45)
    expect(student.examMinutes).toBe(20)
  })
})
