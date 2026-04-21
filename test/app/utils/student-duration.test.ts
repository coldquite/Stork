import { describe, expect, it } from 'vitest'
import { resolveStudentDurationByStudyProgramAndRepeat } from '~/utils/student-duration'

describe('student-duration', () => {
  it('resolves bachelor duration mapping for every repeatType', () => {
    expect(resolveStudentDurationByStudyProgramAndRepeat('BACHELOR', 'NONE')).toEqual({
      prepareMinutes: 45,
      examMinutes: 30
    })
    expect(resolveStudentDurationByStudyProgramAndRepeat('BACHELOR', 'THESIS_DEFENSE')).toEqual({
      prepareMinutes: 0,
      examMinutes: 15
    })
    expect(resolveStudentDurationByStudyProgramAndRepeat('BACHELOR', 'ORAL_EXAM')).toEqual({
      prepareMinutes: 45,
      examMinutes: 15
    })
    expect(resolveStudentDurationByStudyProgramAndRepeat('BACHELOR', 'BOTH')).toEqual({
      prepareMinutes: 45,
      examMinutes: 30
    })
  })

  it('resolves master duration mapping for every repeatType', () => {
    expect(resolveStudentDurationByStudyProgramAndRepeat('MASTER', 'NONE')).toEqual({
      prepareMinutes: 45,
      examMinutes: 35
    })
    expect(resolveStudentDurationByStudyProgramAndRepeat('MASTER', 'THESIS_DEFENSE')).toEqual({
      prepareMinutes: 0,
      examMinutes: 20
    })
    expect(resolveStudentDurationByStudyProgramAndRepeat('MASTER', 'ORAL_EXAM')).toEqual({
      prepareMinutes: 45,
      examMinutes: 15
    })
    expect(resolveStudentDurationByStudyProgramAndRepeat('MASTER', 'BOTH')).toEqual({
      prepareMinutes: 45,
      examMinutes: 35
    })
  })
})
