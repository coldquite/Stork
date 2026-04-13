import { describe, expect, it } from 'vitest'
import type { PostStudentItemDto } from '#shared/types/time-schedules'
import type { ScheduleDraftCommittee, ScheduleDraftItem } from '~/types/schedule-draft'
import {
  collectStudentValidationIssues,
  countStudentValidationIssuesByCommitteeId,
  groupStudentValidationIssuesByCommitteeId
} from '~/utils/editor/student-validation'

function createIsoDateFromToday(dayOffset: number): string {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + dayOffset)
  return date.toISOString()
}

function createStudentItem({
  localId,
  position,
  student
}: {
  localId: string
  position: number
  student?: Partial<PostStudentItemDto>
}): ScheduleDraftItem {
  return {
    localId,
    type: 'STUDENT',
    position,
    pause: null,
    student: {
      firstName: 'Jan',
      lastName: 'Novák',
      email: 'jan.novak@fit.cvut.cz',
      titlesBefore: null,
      titlesAfter: null,
      thesisTitleLocal: 'Lokální název práce',
      thesisTitleEn: 'English thesis title',
      thesisLanguage: 'CZECH',
      supervisorName: 'Vedoucí práce',
      reviewerName: 'Oponent práce',
      additionalSupervisorName: null,
      additionalReviewerName: null,
      studyProgramName: 'Informatika',
      studyProgramType: 'BACHELOR',
      specializationName: 'Softwarové inženýrství 2021',
      specializationCode: 'BI-SI.21',
      studyLanguage: 'CZECH',
      repeatType: 'NONE',
      prepareMinutes: 45,
      examMinutes: 30,
      ...student
    }
  }
}

function createCommittee({
  localId,
  items,
  ...overrides
}: {
  localId: string
  items?: ScheduleDraftItem[]
} & Partial<ScheduleDraftCommittee>): ScheduleDraftCommittee {
  return {
    localId,
    name: '048-BI-PV.24',
    startMinute: 540,
    date: createIsoDateFromToday(14),
    room: 'TH:A-1435',
    preparationRoom: 'TH:A-1510',
    secretaryName: 'Secretary 048-BI-PV.24',
    invigilators: [{ localId: 'invigilator-1', name: 'Dozor 048-BI-PV.24-1' }],
    language: 'CZECH',
    studyProgramName: 'Informatika',
    studyProgramType: 'BACHELOR',
    specializationName: 'Softwarové inženýrství 2021',
    specializationCode: 'BI-SI.21',
    chairName: 'Chair 048-BI-PV.24',
    viceChairName: 'Vice Chair 048-BI-PV.24',
    member1Name: 'Member A 048-BI-PV.24',
    member2Name: 'Member B 048-BI-PV.24',
    member3Name: 'Member C 048-BI-PV.24',
    items: items ?? [],
    ...overrides
  }
}

describe('student-validation', () => {
  it('collects required, invalid, and marker issues for incomplete student data', () => {
    const invalidStudent = createStudentItem({
      localId: 'student-invalid',
      position: 1,
      student: {
        firstName: ' ',
        lastName: '',
        email: 'student-invalid@fit.cvut.cz',
        titlesBefore: null,
        titlesAfter: null,
        thesisTitleLocal: '',
        thesisTitleEn: '  ',
        thesisLanguage: 'UNKNOWN' as never,
        supervisorName: '',
        reviewerName: ' ',
        additionalSupervisorName: null,
        additionalReviewerName: null,
        studyProgramName: '',
        studyProgramType: 'UNKNOWN' as never,
        specializationName: '',
        specializationCode: '',
        studyLanguage: 'UNKNOWN' as never,
        repeatType: 'UNKNOWN',
        prepareMinutes: -5,
        examMinutes: 0
      }
    })
    const markerStudent = createStudentItem({
      localId: 'student-marker',
      position: 2,
      student: {
        firstName: 'Eva',
        lastName: 'Svobodová',
        email: 'student-marker@fit.cvut.cz',
        titlesBefore: null,
        titlesAfter: null,
        thesisTitleLocal: 'Lokální [?] název',
        thesisTitleEn: 'English [?] title',
        thesisLanguage: 'ENGLISH',
        supervisorName: 'Vedoucí',
        reviewerName: 'Oponent',
        additionalSupervisorName: null,
        additionalReviewerName: null,
        studyProgramName: 'Informatika',
        studyProgramType: 'BACHELOR',
        specializationName: '',
        specializationCode: 'UNKNOWN',
        studyLanguage: 'CZECH',
        repeatType: 'NONE',
        prepareMinutes: 0,
        examMinutes: 30
      }
    })
    const committee = createCommittee({
      localId: 'committee-invalid-students',
      items: [invalidStudent, markerStudent]
    })

    const issues = collectStudentValidationIssues([committee])

    expect(issues).toHaveLength(18)
    expect(
      issues.some(
        (issue) => issue.studentId === 'student-invalid' && issue.fieldKey === 'firstName' && issue.code === 'REQUIRED'
      )
    ).toBe(true)
    expect(
      issues.some(
        (issue) => issue.studentId === 'student-invalid' && issue.fieldKey === 'lastName' && issue.code === 'REQUIRED'
      )
    ).toBe(true)
    expect(
      issues.some(
        (issue) =>
          issue.studentId === 'student-invalid' &&
          issue.fieldKey === 'studyProgramType' &&
          issue.code === 'INVALID_VALUE'
      )
    ).toBe(true)
    expect(
      issues.some(
        (issue) =>
          issue.studentId === 'student-invalid' && issue.fieldKey === 'studyLanguage' && issue.code === 'INVALID_VALUE'
      )
    ).toBe(true)
    expect(
      issues.some(
        (issue) =>
          issue.studentId === 'student-invalid' && issue.fieldKey === 'specializationCode' && issue.code === 'REQUIRED'
      )
    ).toBe(true)
    expect(
      issues.some(
        (issue) =>
          issue.studentId === 'student-invalid' &&
          issue.fieldKey === 'repeatType' &&
          issue.code === 'REPEAT_TYPE_UNKNOWN'
      )
    ).toBe(true)
    expect(
      issues.some(
        (issue) =>
          issue.studentId === 'student-invalid' &&
          issue.fieldKey === 'prepareMinutes' &&
          issue.code === 'PREPARE_MINUTES_NEGATIVE'
      )
    ).toBe(true)
    expect(
      issues.some(
        (issue) =>
          issue.studentId === 'student-invalid' &&
          issue.fieldKey === 'examMinutes' &&
          issue.code === 'EXAM_MINUTES_NOT_POSITIVE'
      )
    ).toBe(true)
    expect(
      issues.some(
        (issue) =>
          issue.studentId === 'student-invalid' && issue.fieldKey === 'thesisTitleLocal' && issue.code === 'REQUIRED'
      )
    ).toBe(true)
    expect(
      issues.some(
        (issue) =>
          issue.studentId === 'student-invalid' && issue.fieldKey === 'thesisTitleEn' && issue.code === 'REQUIRED'
      )
    ).toBe(true)
    expect(
      issues.some(
        (issue) =>
          issue.studentId === 'student-invalid' && issue.fieldKey === 'thesisLanguage' && issue.code === 'INVALID_VALUE'
      )
    ).toBe(true)
    expect(
      issues.some(
        (issue) =>
          issue.studentId === 'student-invalid' && issue.fieldKey === 'supervisorName' && issue.code === 'REQUIRED'
      )
    ).toBe(true)
    expect(
      issues.some(
        (issue) =>
          issue.studentId === 'student-invalid' && issue.fieldKey === 'reviewerName' && issue.code === 'REQUIRED'
      )
    ).toBe(true)
    expect(
      issues.some(
        (issue) =>
          issue.studentId === 'student-marker' &&
          issue.fieldKey === 'specializationCode' &&
          issue.code === 'UNRESOLVED_DEPARTMENT'
      )
    ).toBe(true)
    expect(
      issues.some(
        (issue) =>
          issue.studentId === 'student-marker' &&
          issue.fieldKey === 'specializationCode' &&
          issue.code === 'COMMITTEE_PROFILE_MISMATCH' &&
          issue.committeeValue === 'BI-SI.21'
      )
    ).toBe(true)
    expect(
      issues.some(
        (issue) =>
          issue.studentId === 'student-marker' &&
          issue.fieldKey === 'thesisTitleLocal' &&
          issue.code === 'THESIS_TITLE_UNRESOLVED_MARKER'
      )
    ).toBe(true)
    expect(
      issues.some(
        (issue) =>
          issue.studentId === 'student-marker' &&
          issue.fieldKey === 'thesisTitleEn' &&
          issue.code === 'THESIS_TITLE_UNRESOLVED_MARKER'
      )
    ).toBe(true)
  })

  it('accepts prepareMinutes 0 and rejects examMinutes 0', () => {
    const student = createStudentItem({
      localId: 'student-duration',
      position: 1,
      student: {
        firstName: 'Jan',
        lastName: 'Novák',
        email: 'student-duration@fit.cvut.cz',
        titlesBefore: null,
        titlesAfter: null,
        thesisTitleLocal: 'Lokální název',
        thesisTitleEn: 'English title',
        thesisLanguage: 'CZECH',
        supervisorName: 'Vedoucí',
        reviewerName: 'Oponent',
        additionalSupervisorName: null,
        additionalReviewerName: null,
        studyProgramName: 'Informatika',
        studyProgramType: 'BACHELOR',
        specializationName: 'Softwarové inženýrství 2021',
        specializationCode: 'BI-SI.21',
        studyLanguage: 'CZECH',
        repeatType: 'NONE',
        prepareMinutes: 0,
        examMinutes: 0
      }
    })
    const committee = createCommittee({
      localId: 'committee-duration',
      items: [student]
    })

    const issues = collectStudentValidationIssues([committee])

    expect(
      issues.some((issue) => issue.studentId === 'student-duration' && issue.code === 'PREPARE_MINUTES_NEGATIVE')
    ).toBe(false)
    expect(
      issues.some(
        (issue) =>
          issue.studentId === 'student-duration' &&
          issue.fieldKey === 'examMinutes' &&
          issue.code === 'EXAM_MINUTES_NOT_POSITIVE'
      )
    ).toBe(true)
  })

  it('groups and counts issues by committee', () => {
    const committeeA = createCommittee({
      localId: 'committee-a',
      items: [
        createStudentItem({
          localId: 'student-a',
          position: 1,
          student: {
            firstName: ' ',
            lastName: 'Novák',
            email: 'student-a@fit.cvut.cz',
            titlesBefore: null,
            titlesAfter: null,
            thesisTitleLocal: 'Lokální název',
            thesisTitleEn: 'English title',
            thesisLanguage: 'CZECH',
            supervisorName: 'Vedoucí',
            reviewerName: 'Oponent',
            additionalSupervisorName: null,
            additionalReviewerName: null,
            studyProgramName: 'Informatika',
            studyProgramType: 'BACHELOR',
            specializationName: 'Softwarové inženýrství 2021',
            specializationCode: 'BI-SI.21',
            studyLanguage: 'CZECH',
            repeatType: 'NONE',
            prepareMinutes: 45,
            examMinutes: 30
          }
        })
      ]
    })
    const committeeB = createCommittee({
      localId: 'committee-b',
      items: [
        createStudentItem({
          localId: 'student-b',
          position: 1,
          student: {
            firstName: 'Eva',
            lastName: 'Svobodová',
            email: 'student-b@fit.cvut.cz',
            titlesBefore: null,
            titlesAfter: null,
            thesisTitleLocal: 'Lokální název',
            thesisTitleEn: 'English title',
            thesisLanguage: 'CZECH',
            supervisorName: 'Vedoucí',
            reviewerName: 'Oponent',
            additionalSupervisorName: null,
            additionalReviewerName: null,
            studyProgramName: 'Informatika',
            studyProgramType: 'BACHELOR',
            specializationName: '',
            specializationCode: 'UNKNOWN',
            studyLanguage: 'CZECH',
            repeatType: 'NONE',
            prepareMinutes: 45,
            examMinutes: 30
          }
        })
      ]
    })

    const issues = collectStudentValidationIssues([committeeA, committeeB])
    const issuesByCommitteeId = groupStudentValidationIssuesByCommitteeId(issues)
    const countByCommitteeId = countStudentValidationIssuesByCommitteeId(issuesByCommitteeId)

    expect(Object.keys(issuesByCommitteeId).sort()).toEqual(['committee-a', 'committee-b'])
    expect(countByCommitteeId).toEqual({
      'committee-a': 1,
      'committee-b': 2
    })
  })

  it('adds committee-profile mismatch issues for study profile fields and includes committee value', () => {
    const student = createStudentItem({
      localId: 'student-mismatch',
      position: 1,
      student: {
        firstName: 'Jan',
        lastName: 'Novák',
        email: 'student-mismatch@fit.cvut.cz',
        thesisTitleLocal: 'Lokální název',
        thesisTitleEn: 'English title',
        thesisLanguage: 'ENGLISH',
        supervisorName: 'Vedoucí',
        reviewerName: 'Oponent',
        studyLanguage: 'ENGLISH',
        studyProgramType: 'MASTER',
        studyProgramName: 'Informatics',
        specializationCode: 'NI-ZI.24'
      }
    })
    const committee = createCommittee({
      localId: 'committee-mismatch',
      language: 'CZECH',
      studyProgramType: 'BACHELOR',
      studyProgramName: 'Informatika',
      specializationCode: 'BI-SI.21',
      items: [student]
    })

    const issues = collectStudentValidationIssues([committee])

    expect(
      issues.some(
        (issue) =>
          issue.studentId === 'student-mismatch' &&
          issue.fieldKey === 'studyLanguage' &&
          issue.code === 'COMMITTEE_PROFILE_MISMATCH' &&
          issue.committeeValue === 'CZECH'
      )
    ).toBe(true)
    expect(
      issues.some(
        (issue) =>
          issue.studentId === 'student-mismatch' &&
          issue.fieldKey === 'studyProgramType' &&
          issue.code === 'COMMITTEE_PROFILE_MISMATCH' &&
          issue.committeeValue === 'BACHELOR'
      )
    ).toBe(true)
    expect(
      issues.some(
        (issue) =>
          issue.studentId === 'student-mismatch' &&
          issue.fieldKey === 'studyProgramName' &&
          issue.code === 'COMMITTEE_PROFILE_MISMATCH' &&
          issue.committeeValue === 'Informatika'
      )
    ).toBe(true)
    expect(
      issues.some(
        (issue) =>
          issue.studentId === 'student-mismatch' &&
          issue.fieldKey === 'specializationCode' &&
          issue.code === 'COMMITTEE_PROFILE_MISMATCH' &&
          issue.committeeValue === 'BI-SI.21'
      )
    ).toBe(true)
  })

  it('treats specialization with different year and K- prefix as matching committee specialization', () => {
    const student = createStudentItem({
      localId: 'student-specialization-compatible',
      position: 1,
      student: {
        firstName: 'Jan',
        lastName: 'Novák',
        email: 'student-specialization-compatible@fit.cvut.cz',
        thesisTitleLocal: 'Lokální název',
        thesisTitleEn: 'English title',
        thesisLanguage: 'CZECH',
        supervisorName: 'Vedoucí',
        reviewerName: 'Oponent',
        studyLanguage: 'CZECH',
        studyProgramType: 'BACHELOR',
        studyProgramName: 'Informatika',
        specializationCode: 'BIK-SI.21'
      }
    })
    const committee = createCommittee({
      localId: 'committee-specialization-compatible',
      specializationCode: 'BI-SI.24',
      items: [student]
    })

    const issues = collectStudentValidationIssues([committee])

    expect(
      issues.some(
        (issue) =>
          issue.studentId === 'student-specialization-compatible' &&
          issue.fieldKey === 'specializationCode' &&
          issue.code === 'COMMITTEE_PROFILE_MISMATCH'
      )
    ).toBe(false)
  })
})
