import type { PostStudentItemDto, StudyProgramTypeDto } from '#shared/types/time-schedules'
import { STUDENT_DURATION_MINUTES_BY_STUDY_PROGRAM_AND_REPEAT } from '~/utils/import-mapper/core/constants'
import { throwMappingError } from '~/utils/import-mapper/core/errors'
import { readOptionalValue } from '~/utils/import-mapper/core/readers'
import type { SourceRow } from '~/utils/import-mapper/core/types'

const VALID_FIRST_TERM_GRADES = new Set(['A', 'B', 'C', 'D', 'E', 'F'])

function validateAndResolveFirstTermDate(studentsCommitteesRow: SourceRow): string | null {
  const firstTermDate = readOptionalValue(studentsCommitteesRow, 'Předmět 1 - 1.term. datum')
  const firstTermGrade = readOptionalValue(studentsCommitteesRow, 'Předmět 1 - 1.term. hodnocení')
  const hasFirstTermDate = Boolean(firstTermDate)
  const hasFirstTermGrade = Boolean(firstTermGrade)

  if (hasFirstTermDate !== hasFirstTermGrade) {
    const dateWithoutGrade = hasFirstTermDate
    throwMappingError('INVALID_FIRST_TERM_RESULT_STATE', studentsCommitteesRow, {
      column: dateWithoutGrade ? 'Předmět 1 - 1.term. hodnocení' : 'Předmět 1 - 1.term. datum',
      context: {
        reason: dateWithoutGrade ? 'first_term_date_without_grade' : 'first_term_grade_without_date',
        firstTermDate: firstTermDate ?? null,
        firstTermGrade: firstTermGrade ?? null
      }
    })
  }

  if (!firstTermGrade) {
    return firstTermDate
  }

  if (VALID_FIRST_TERM_GRADES.has(firstTermGrade)) {
    return firstTermDate
  }

  throwMappingError('INVALID_FIRST_TERM_GRADE', studentsCommitteesRow, {
    column: 'Předmět 1 - 1.term. hodnocení',
    context: {
      rawValue: firstTermGrade
    }
  })
}

export function resolveStudentRepeatType(studentsCommitteesRow: SourceRow): PostStudentItemDto['repeatType'] {
  const firstTermDate = validateAndResolveFirstTermDate(studentsCommitteesRow)

  const thesisDefenseDate = readOptionalValue(studentsCommitteesRow, 'VŠKP-typ A: Datum obhajoby')
  const secondTermDate = readOptionalValue(studentsCommitteesRow, 'Předmět 1 - 2.term. datum')

  if (secondTermDate) {
    throwMappingError('STUDENT_REPEAT_NOT_ALLOWED', studentsCommitteesRow, {
      column: 'Předmět 1 - 2.term. datum',
      context: {
        reason: 'second_term_attempt_already_exists',
        secondTermDate
      }
    })
  }

  if (!firstTermDate && !thesisDefenseDate) {
    return 'NONE'
  }

  if (firstTermDate && !thesisDefenseDate) {
    // The student repeats for sure, but import data cannot distinguish thesis-only vs both.
    return 'UNKNOWN'
  }

  if (firstTermDate && thesisDefenseDate) {
    return 'ORAL_EXAM'
  }

  throwMappingError('INVALID_REPEAT_TYPE_STATE', studentsCommitteesRow, {
    column: 'VŠKP-typ A: Datum obhajoby',
    context: {
      reason: 'defense_date_without_first_term_date',
      thesisDefenseDate,
      firstTermDate: firstTermDate ?? null
    }
  })
}

export function resolveStudentDurationByStudyProgramAndRepeat(
  studyProgramType: StudyProgramTypeDto,
  repeatType: PostStudentItemDto['repeatType']
): { prepareMinutes: number; examMinutes: number } {
  return STUDENT_DURATION_MINUTES_BY_STUDY_PROGRAM_AND_REPEAT[studyProgramType][repeatType]
}
