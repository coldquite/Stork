import type { RepeatTypeDto, StudyProgramTypeDto } from '#shared/types/time-schedules'

export interface StudentDurationMinutes {
  prepareMinutes: number
  examMinutes: number
}

const BACHELOR_FIRST_OR_BOTH_PREPARE_MINUTES = 45
const BACHELOR_FIRST_OR_BOTH_EXAM_MINUTES = 30
const BACHELOR_THESIS_ONLY_PREPARE_MINUTES = 45
const BACHELOR_THESIS_ONLY_EXAM_MINUTES = 15
const BACHELOR_ORAL_ONLY_PREPARE_MINUTES = 45
const BACHELOR_ORAL_ONLY_EXAM_MINUTES = 15

const MASTER_FIRST_OR_BOTH_PREPARE_MINUTES = 45
const MASTER_FIRST_OR_BOTH_EXAM_MINUTES = 35
const MASTER_THESIS_ONLY_PREPARE_MINUTES = 45
const MASTER_THESIS_ONLY_EXAM_MINUTES = 20
const MASTER_ORAL_ONLY_PREPARE_MINUTES = 45
const MASTER_ORAL_ONLY_EXAM_MINUTES = 15

/**
 * Shared source of truth for student slot duration mapping across import and editor flows.
 * UNKNOWN keeps first/both duration to avoid underestimating the total exam timeline.
 */
export const STUDENT_DURATION_MINUTES_BY_STUDY_PROGRAM_AND_REPEAT: Readonly<
  Record<StudyProgramTypeDto, Readonly<Record<RepeatTypeDto, StudentDurationMinutes>>>
> = {
  BACHELOR: {
    NONE: {
      prepareMinutes: BACHELOR_FIRST_OR_BOTH_PREPARE_MINUTES,
      examMinutes: BACHELOR_FIRST_OR_BOTH_EXAM_MINUTES
    },
    THESIS_DEFENSE: {
      prepareMinutes: BACHELOR_THESIS_ONLY_PREPARE_MINUTES,
      examMinutes: BACHELOR_THESIS_ONLY_EXAM_MINUTES
    },
    ORAL_EXAM: {
      prepareMinutes: BACHELOR_ORAL_ONLY_PREPARE_MINUTES,
      examMinutes: BACHELOR_ORAL_ONLY_EXAM_MINUTES
    },
    BOTH: {
      prepareMinutes: BACHELOR_FIRST_OR_BOTH_PREPARE_MINUTES,
      examMinutes: BACHELOR_FIRST_OR_BOTH_EXAM_MINUTES
    },
    UNKNOWN: {
      prepareMinutes: BACHELOR_FIRST_OR_BOTH_PREPARE_MINUTES,
      examMinutes: BACHELOR_FIRST_OR_BOTH_EXAM_MINUTES
    }
  },
  MASTER: {
    NONE: {
      prepareMinutes: MASTER_FIRST_OR_BOTH_PREPARE_MINUTES,
      examMinutes: MASTER_FIRST_OR_BOTH_EXAM_MINUTES
    },
    THESIS_DEFENSE: {
      prepareMinutes: MASTER_THESIS_ONLY_PREPARE_MINUTES,
      examMinutes: MASTER_THESIS_ONLY_EXAM_MINUTES
    },
    ORAL_EXAM: {
      prepareMinutes: MASTER_ORAL_ONLY_PREPARE_MINUTES,
      examMinutes: MASTER_ORAL_ONLY_EXAM_MINUTES
    },
    BOTH: {
      prepareMinutes: MASTER_FIRST_OR_BOTH_PREPARE_MINUTES,
      examMinutes: MASTER_FIRST_OR_BOTH_EXAM_MINUTES
    },
    UNKNOWN: {
      prepareMinutes: MASTER_FIRST_OR_BOTH_PREPARE_MINUTES,
      examMinutes: MASTER_FIRST_OR_BOTH_EXAM_MINUTES
    }
  }
}

export function resolveStudentDurationByStudyProgramAndRepeat(
  studyProgramType: StudyProgramTypeDto,
  repeatType: RepeatTypeDto
): StudentDurationMinutes {
  return STUDENT_DURATION_MINUTES_BY_STUDY_PROGRAM_AND_REPEAT[studyProgramType][repeatType]
}
