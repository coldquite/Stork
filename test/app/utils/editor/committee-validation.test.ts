import { describe, expect, it } from 'vitest'
import type { ScheduleDraftCommittee, ScheduleDraftItem } from '~/types/schedule-draft'
import {
  collectCommitteeValidationIssues,
  countCommitteeValidationIssuesByCommitteeId,
  groupCommitteeValidationIssuesByCommitteeId,
  groupCommitteeValidationIssuesBySection
} from '~/utils/editor/committee-validation'

function createCommittee({
  localId,
  ...overrides
}: Partial<ScheduleDraftCommittee> & { localId: string }): ScheduleDraftCommittee {
  return {
    name: '048-BI-PV.24',
    startMinute: 540,
    date: '2026-05-28T00:00:00.000Z',
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
    items: [] as ScheduleDraftItem[],
    ...overrides,
    localId
  }
}

describe('committee-validation', () => {
  it('collects required and invalid issues for incomplete committee data', () => {
    const committee = createCommittee({
      localId: 'committee-invalid',
      name: '   ',
      startMinute: -10,
      date: '   ',
      room: null,
      preparationRoom: ' ',
      secretaryName: null,
      studyProgramName: '',
      specializationCode: '',
      chairName: ' ',
      viceChairName: '',
      member1Name: '',
      member2Name: ' ',
      member3Name: '',
      invigilators: []
    })

    const issues = collectCommitteeValidationIssues([committee])

    expect(issues).toHaveLength(14)
    expect(
      issues.some((issue) => issue.section === 'BASICS' && issue.fieldKey === 'name' && issue.code === 'REQUIRED')
    ).toBe(true)
    expect(
      issues.some((issue) => issue.section === 'BASICS' && issue.fieldKey === 'date' && issue.code === 'REQUIRED')
    ).toBe(true)
    expect(
      issues.some(
        (issue) =>
          issue.section === 'BASICS' && issue.fieldKey === 'startMinute' && issue.code === 'INVALID_START_MINUTE'
      )
    ).toBe(true)
    expect(
      issues.some(
        (issue) => issue.section === 'STUDY' && issue.fieldKey === 'studyProgramName' && issue.code === 'REQUIRED'
      )
    ).toBe(true)
    expect(
      issues.some((issue) => issue.section === 'MEMBERS' && issue.fieldKey === 'chair' && issue.code === 'REQUIRED')
    ).toBe(true)
    expect(
      issues.some(
        (issue) => issue.section === 'INVIGILATORS' && issue.fieldKey === 'preparationRoom' && issue.code === 'REQUIRED'
      )
    ).toBe(true)
    expect(
      issues.some(
        (issue) =>
          issue.section === 'INVIGILATORS' && issue.fieldKey === 'invigilators' && issue.code === 'MIN_INVIGILATORS'
      )
    ).toBe(true)
  })

  it('collects unresolved department issue as separate study issue', () => {
    const committee = createCommittee({
      localId: 'committee-unresolved-department',
      specializationCode: 'UNKNOWN'
    })

    const issues = collectCommitteeValidationIssues([committee])

    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({
      committeeId: 'committee-unresolved-department',
      section: 'STUDY',
      fieldKey: 'department',
      code: 'UNRESOLVED_DEPARTMENT'
    })
  })

  it('collects individual issues for each blank invigilator name', () => {
    const committee = createCommittee({
      localId: 'committee-empty-invigilator-names',
      invigilators: [
        { localId: 'invigilator-empty-1', name: '' },
        { localId: 'invigilator-empty-2', name: '   ' },
        { localId: 'invigilator-valid', name: 'Dozor valid' }
      ]
    })

    const issues = collectCommitteeValidationIssues([committee])
    const invigilatorNameIssues = issues.filter(
      (issue) => issue.section === 'INVIGILATORS' && issue.fieldKey === 'invigilatorName' && issue.code === 'REQUIRED'
    )

    expect(invigilatorNameIssues).toHaveLength(2)
    expect(invigilatorNameIssues.map((issue) => issue.invigilatorLocalId)).toEqual([
      'invigilator-empty-1',
      'invigilator-empty-2'
    ])
    expect(invigilatorNameIssues.map((issue) => issue.invigilatorIndex)).toEqual([0, 1])
    expect(invigilatorNameIssues.map((issue) => issue.issueId)).toEqual([
      'committee-empty-invigilator-names:invigilatorName:REQUIRED:invigilator-empty-1',
      'committee-empty-invigilator-names:invigilatorName:REQUIRED:invigilator-empty-2'
    ])
  })

  it('groups issues by committee and section and computes counts', () => {
    const incompleteCommittee = createCommittee({
      localId: 'committee-incomplete',
      name: ' ',
      room: null,
      preparationRoom: '',
      secretaryName: null,
      studyProgramName: '',
      specializationCode: '',
      chairName: '',
      viceChairName: '',
      member1Name: '',
      member2Name: '',
      member3Name: '',
      invigilators: []
    })
    const unresolvedDepartmentCommittee = createCommittee({
      localId: 'committee-unresolved',
      specializationCode: 'UNKNOWN'
    })

    const issues = collectCommitteeValidationIssues([incompleteCommittee, unresolvedDepartmentCommittee])
    const issuesByCommitteeId = groupCommitteeValidationIssuesByCommitteeId(issues)
    const countByCommitteeId = countCommitteeValidationIssuesByCommitteeId(issuesByCommitteeId)
    const groupedBySection = groupCommitteeValidationIssuesBySection(issuesByCommitteeId['committee-incomplete'] ?? [])

    expect(Object.keys(issuesByCommitteeId).sort()).toEqual(['committee-incomplete', 'committee-unresolved'])
    expect(countByCommitteeId).toEqual({
      'committee-incomplete': 12,
      'committee-unresolved': 1
    })
    expect(groupedBySection.map((group) => group.section)).toEqual(['BASICS', 'STUDY', 'MEMBERS', 'INVIGILATORS'])
  })
})
