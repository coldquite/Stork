import type { PostStudentItemDto } from '#shared/types/time-schedules'
import { throwMappingError } from '~/utils/import-mapper/core/errors'
import { readOptionalValue } from '~/utils/import-mapper/core/readers'
import type { SourceRow } from '~/utils/import-mapper/core/types'

const VALID_FIRST_TERM_GRADES = new Set(['A', 'B', 'C', 'D', 'E', 'F'])

function validateAndResolveFirstTermResult(studentsCommitteesRow: SourceRow): {
  firstTermDate: string | null
  firstTermGrade: string | null
} {
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
    return {
      firstTermDate,
      firstTermGrade: null
    }
  }

  if (VALID_FIRST_TERM_GRADES.has(firstTermGrade)) {
    return {
      firstTermDate,
      firstTermGrade
    }
  }

  throwMappingError('INVALID_FIRST_TERM_GRADE', studentsCommitteesRow, {
    column: 'Předmět 1 - 1.term. hodnocení',
    context: {
      rawValue: firstTermGrade
    }
  })
}

export function resolveStudentRepeatType(studentsCommitteesRow: SourceRow): PostStudentItemDto['repeatType'] {
  const { firstTermDate, firstTermGrade } = validateAndResolveFirstTermResult(studentsCommitteesRow)

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

  if (!firstTermGrade && !thesisDefenseDate) {
    return 'NONE'
  }

  if (firstTermGrade === 'F' && !thesisDefenseDate) {
    return 'BOTH'
  }

  if (firstTermGrade && firstTermGrade !== 'F' && !thesisDefenseDate) {
    return 'THESIS_DEFENSE'
  }

  if (firstTermGrade === 'F' && thesisDefenseDate) {
    return 'ORAL_EXAM'
  }

  if (firstTermGrade && firstTermGrade !== 'F' && thesisDefenseDate) {
    throwMappingError('INVALID_REPEAT_TYPE_STATE', studentsCommitteesRow, {
      column: 'VŠKP-typ A: Datum obhajoby',
      context: {
        reason: 'first_term_passed_and_defense_exists',
        thesisDefenseDate,
        firstTermDate: firstTermDate ?? null,
        firstTermGrade
      }
    })
  }

  throwMappingError('INVALID_REPEAT_TYPE_STATE', studentsCommitteesRow, {
    column: 'VŠKP-typ A: Datum obhajoby',
    context: {
      reason: 'defense_date_without_first_term_grade',
      thesisDefenseDate,
      firstTermDate: firstTermDate ?? null,
      firstTermGrade: firstTermGrade ?? null
    }
  })
}
