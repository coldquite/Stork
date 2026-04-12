import { IMPORT_COLUMN_NAMES } from '~/utils/import-mapper/core/columns'

export const COMMITTEE_START_MINUTE = 525 // 8:45

export const COMMITTEE_CONSISTENCY_CHECK_COLUMNS: readonly string[] = [
  IMPORT_COLUMN_NAMES.studentsCommittees.committeeName,
  IMPORT_COLUMN_NAMES.studentsCommittees.studyProgramCode,
  IMPORT_COLUMN_NAMES.studentsCommittees.studyProgramName,
  IMPORT_COLUMN_NAMES.studentsCommittees.studyProgramType,
  IMPORT_COLUMN_NAMES.studentsCommittees.specializationName,
  IMPORT_COLUMN_NAMES.studentsCommittees.specializationCode,
  IMPORT_COLUMN_NAMES.studentsCommittees.studyLanguage,
  IMPORT_COLUMN_NAMES.studentsCommittees.chairName,
  IMPORT_COLUMN_NAMES.studentsCommittees.viceChairName,
  IMPORT_COLUMN_NAMES.studentsCommittees.member1Name,
  IMPORT_COLUMN_NAMES.studentsCommittees.member2Name,
  IMPORT_COLUMN_NAMES.studentsCommittees.member3Name
]

export { STUDENT_DURATION_MINUTES_BY_STUDY_PROGRAM_AND_REPEAT } from '~/utils/student-duration'
