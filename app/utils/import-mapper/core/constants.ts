import type { PostStudentItemDto, StudyProgramTypeDto } from '#shared/types/time-schedules'

export const COMMITTEE_START_MINUTE = 525 // 8:45

export const COMMITTEE_CONSISTENCY_CHECK_COLUMNS: readonly string[] = [
  'Komise - název',
  'St. program - kód',
  'St. program - název',
  'St. program - typ',
  'Obor/spec - název',
  'Obor/spec - kód',
  'VŠKP-typ A: Katedra obhajoby - kod',
  'VŠKP-typ A: Katedra obhajoby - název',
  'Jazyk výuky',
  'Komise - předseda',
  'Komise - místopředseda',
  'Komise - člen 1',
  'Komise - člen 2',
  'Komise - člen 3'
]

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

export const STUDENT_DURATION_MINUTES_BY_STUDY_PROGRAM_AND_REPEAT: Readonly<
  Record<
    StudyProgramTypeDto,
    Readonly<Record<PostStudentItemDto['repeatType'], { prepareMinutes: number; examMinutes: number }>>
  >
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
      // Unknown means repeat is certain, but import cannot distinguish thesis-only vs both.
      // Use first/both slot duration to avoid underestimating total exam time.
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
      // Unknown means repeat is certain, but import cannot distinguish thesis-only vs both.
      // Use first/both slot duration to avoid underestimating total exam time.
      prepareMinutes: MASTER_FIRST_OR_BOTH_PREPARE_MINUTES,
      examMinutes: MASTER_FIRST_OR_BOTH_EXAM_MINUTES
    }
  }
}
