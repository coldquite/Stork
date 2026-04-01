import type { PostStudentItemDto, StudyProgramTypeDto } from '#shared/types/time-schedules'
import { STUDENT_DURATION_MINUTES_BY_STUDY_PROGRAM_AND_REPEAT } from '~/utils/import-mapper/core/constants'
import { throwMappingError } from '~/utils/import-mapper/core/errors'
import { readOptionalValue } from '~/utils/import-mapper/core/readers'
import type { SourceRow } from '~/utils/import-mapper/core/types'

export function resolveStudentRepeatType(studentsCommitteesRow: SourceRow): PostStudentItemDto['repeatType'] {
  const thesisDefenseDate = readOptionalValue(studentsCommitteesRow, 'VŠKP-typ A: Datum obhajoby')
  const firstTermDate = readOptionalValue(studentsCommitteesRow, 'Předmět 1 - 1.term. datum')
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
