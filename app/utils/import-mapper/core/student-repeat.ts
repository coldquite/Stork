import type { PostStudentItemDto } from '#shared/types/time-schedules'
import { throwMappingError } from '~/utils/import-mapper/core/errors'
import { readOptionalValue } from '~/utils/import-mapper/core/readers'
import type { SourceRow } from '~/utils/import-mapper/core/types'
import { IMPORT_COLUMN_NAMES } from '~/utils/import-mapper/core/columns'

const VALID_FIRST_TERM_GRADES = new Set(['A', 'B', 'C', 'D', 'E', 'F'])

function validateAndResolveFirstTermResult(studentsCommitteesRow: SourceRow): {
  firstTermDate: string | null
  firstTermGrade: string | null
} {
  const firstTermDate = readOptionalValue(studentsCommitteesRow, IMPORT_COLUMN_NAMES.studentsCommittees.firstTermDate)
  const firstTermGrade = readOptionalValue(studentsCommitteesRow, IMPORT_COLUMN_NAMES.studentsCommittees.firstTermGrade)
  const hasFirstTermDate = Boolean(firstTermDate)
  const hasFirstTermGrade = Boolean(firstTermGrade)

  if (hasFirstTermDate !== hasFirstTermGrade) {
    const dateWithoutGrade = hasFirstTermDate
    throwMappingError('INVALID_FIRST_TERM_RESULT_STATE', studentsCommitteesRow, {
      column: dateWithoutGrade
        ? IMPORT_COLUMN_NAMES.studentsCommittees.firstTermGrade
        : IMPORT_COLUMN_NAMES.studentsCommittees.firstTermDate,
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
    column: IMPORT_COLUMN_NAMES.studentsCommittees.firstTermGrade,
    context: {
      rawValue: firstTermGrade
    }
  })
}

export function resolveStudentRepeatType(studentsCommitteesRow: SourceRow): PostStudentItemDto['repeatType'] {
  const { firstTermDate, firstTermGrade } = validateAndResolveFirstTermResult(studentsCommitteesRow)

  const thesisDefenseDate = readOptionalValue(
    studentsCommitteesRow,
    IMPORT_COLUMN_NAMES.studentsCommittees.thesisDefenseDate
  )
  const secondTermDate = readOptionalValue(studentsCommitteesRow, IMPORT_COLUMN_NAMES.studentsCommittees.secondTermDate)

  if (secondTermDate) {
    throwMappingError('STUDENT_REPEAT_NOT_ALLOWED', studentsCommitteesRow, {
      column: IMPORT_COLUMN_NAMES.studentsCommittees.secondTermDate,
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
      column: IMPORT_COLUMN_NAMES.studentsCommittees.thesisDefenseDate,
      context: {
        reason: 'first_term_passed_and_defense_exists',
        thesisDefenseDate,
        firstTermDate: firstTermDate ?? null,
        firstTermGrade
      }
    })
  }

  throwMappingError('INVALID_REPEAT_TYPE_STATE', studentsCommitteesRow, {
    column: IMPORT_COLUMN_NAMES.studentsCommittees.thesisDefenseDate,
    context: {
      reason: 'defense_date_without_first_term_grade',
      thesisDefenseDate,
      firstTermDate: firstTermDate ?? null,
      firstTermGrade: firstTermGrade ?? null
    }
  })
}
