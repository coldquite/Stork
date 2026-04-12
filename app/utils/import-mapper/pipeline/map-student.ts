import type { PostCommitteeDto, PostStudentItemDto } from '#shared/types/time-schedules'
import { resolveStudyLevelFromStudentsStork } from '~/utils/import'
import type { ImportSzzType } from '~/types/import'
import { assertFieldEquality } from '~/utils/import-mapper/core/assertions'
import { IMPORT_COLUMN_NAMES } from '~/utils/import-mapper/core/columns'
import { throwMappingError } from '~/utils/import-mapper/core/errors'
import {
  normalizeCompareValue,
  normalizeSpecializationCode,
  normalizeSpecializationCodeForComparison,
  preprocessCommitteeName
} from '~/utils/import-mapper/core/normalize'
import { parseStudyLanguage, parseThesisLanguage } from '~/utils/import-mapper/core/parsers'
import { readOptionalValue, readRequiredValue } from '~/utils/import-mapper/core/readers'
import { resolveStudentRepeatType } from '~/utils/import-mapper/core/student-repeat'
import type { MappedStudentPlacement, MatchedStudentRows } from '~/utils/import-mapper/core/types'
import { resolveStudentDurationByStudyProgramAndRepeat } from '~/utils/student-duration'

interface MapStudentInput {
  szzType: ImportSzzType
  committeesByName: Map<string, PostCommitteeDto>
  matchedRows: MatchedStudentRows
}

function normalizeThesisTitleTypographicDashes(value: string): string {
  // KOS exports can contain `--` which should be rendered as en dash in thesis titles
  return value.replaceAll('--', '–')
}

export function mapStudent(input: MapStudentInput): MappedStudentPlacement {
  const { szzType, committeesByName, matchedRows } = input
  const { studentsStorkRow, studentsCommitteesRow } = matchedRows
  const storkColumns = IMPORT_COLUMN_NAMES.studentsStork
  const committeesColumns = IMPORT_COLUMN_NAMES.studentsCommittees

  const storkFirstName = readRequiredValue(studentsStorkRow, storkColumns.firstName)
  const committeesFirstName = readRequiredValue(studentsCommitteesRow, committeesColumns.firstName)
  assertFieldEquality(
    preprocessCommitteeName(readRequiredValue(studentsCommitteesRow, committeesColumns.committeeName)),
    {
      source: studentsStorkRow,
      column: storkColumns.firstName,
      value: storkFirstName
    },
    {
      source: studentsCommitteesRow,
      column: committeesColumns.firstName,
      value: committeesFirstName
    }
  )

  const storkLastName = readRequiredValue(studentsStorkRow, storkColumns.lastName)
  const committeesLastName = readRequiredValue(studentsCommitteesRow, committeesColumns.lastName)
  assertFieldEquality(
    preprocessCommitteeName(readRequiredValue(studentsCommitteesRow, committeesColumns.committeeName)),
    {
      source: studentsStorkRow,
      column: storkColumns.lastName,
      value: storkLastName
    },
    {
      source: studentsCommitteesRow,
      column: committeesColumns.lastName,
      value: committeesLastName
    }
  )

  const committeeName = preprocessCommitteeName(
    readRequiredValue(studentsCommitteesRow, committeesColumns.committeeName)
  )
  const targetCommittee = committeesByName.get(committeeName)
  if (!targetCommittee) {
    throwMappingError('STUDENT_COMMITTEE_NOT_FOUND', studentsCommitteesRow, {
      column: committeesColumns.committeeName,
      context: {
        committeeName
      }
    })
  }

  const storkEmail = readRequiredValue(studentsStorkRow, storkColumns.studentEmail)
  const committeesEmail = readRequiredValue(studentsCommitteesRow, committeesColumns.studentEmail)
  assertFieldEquality(
    committeeName,
    {
      source: studentsStorkRow,
      column: storkColumns.studentEmail,
      value: storkEmail
    },
    {
      source: studentsCommitteesRow,
      column: committeesColumns.studentEmail,
      value: committeesEmail
    }
  )

  const studyProgramType = resolveStudyLevelFromStudentsStork([studentsStorkRow.row])
  if (!studyProgramType) {
    throwMappingError('INVALID_STUDY_PROGRAM_TYPE', studentsStorkRow, {
      column: storkColumns.studyPlanName,
      context: {
        rawValue: studentsStorkRow.row[storkColumns.studyPlanName] ?? ''
      }
    })
  }

  if (szzType !== 'MIXED' && studyProgramType !== szzType) {
    throwMappingError('COMMITTEE_SZZ_TYPE_MISMATCH', studentsStorkRow, {
      column: storkColumns.studyPlanName,
      context: {
        detectedType: studyProgramType,
        selectedType: szzType
      }
    })
  }

  const storkThesisTitleLocal = normalizeThesisTitleTypographicDashes(
    readRequiredValue(studentsStorkRow, storkColumns.thesisTitleLocal)
  )
  const committeesThesisTitleLocal = normalizeThesisTitleTypographicDashes(
    readRequiredValue(studentsCommitteesRow, committeesColumns.thesisTitleLocal)
  )
  assertFieldEquality(
    committeeName,
    {
      source: studentsStorkRow,
      column: storkColumns.thesisTitleLocal,
      value: storkThesisTitleLocal
    },
    {
      source: studentsCommitteesRow,
      column: committeesColumns.thesisTitleLocal,
      value: committeesThesisTitleLocal
    }
  )

  const storkThesisTitleEn = normalizeThesisTitleTypographicDashes(
    readRequiredValue(studentsStorkRow, storkColumns.thesisTitleEn)
  )
  const committeesThesisTitleEn = normalizeThesisTitleTypographicDashes(
    readRequiredValue(studentsCommitteesRow, committeesColumns.thesisTitleEn)
  )
  assertFieldEquality(
    committeeName,
    {
      source: studentsStorkRow,
      column: storkColumns.thesisTitleEn,
      value: storkThesisTitleEn
    },
    {
      source: studentsCommitteesRow,
      column: committeesColumns.thesisTitleEn,
      value: committeesThesisTitleEn
    }
  )

  const storkThesisLanguageRaw = readRequiredValue(studentsStorkRow, storkColumns.thesisLanguage)
  const committeesThesisLanguageRaw = readRequiredValue(studentsCommitteesRow, committeesColumns.thesisLanguage)
  const storkThesisLanguage = parseThesisLanguage(storkThesisLanguageRaw)
  if (!storkThesisLanguage) {
    throwMappingError('INVALID_LANGUAGE', studentsStorkRow, {
      column: storkColumns.thesisLanguage,
      context: {
        languageTarget: 'thesis',
        rawValue: storkThesisLanguageRaw
      }
    })
  }

  const committeesThesisLanguage = parseThesisLanguage(committeesThesisLanguageRaw)
  if (!committeesThesisLanguage) {
    throwMappingError('INVALID_LANGUAGE', studentsCommitteesRow, {
      column: committeesColumns.thesisLanguage,
      context: {
        languageTarget: 'thesis',
        rawValue: committeesThesisLanguageRaw
      }
    })
  }

  if (storkThesisLanguage !== committeesThesisLanguage) {
    throwMappingError('STUDENT_VALUE_MISMATCH', studentsCommitteesRow, {
      column: committeesColumns.thesisLanguage,
      context: {
        committeeName,
        leftDataset: studentsStorkRow.datasetKey,
        rightDataset: studentsCommitteesRow.datasetKey,
        leftFileName: studentsStorkRow.fileName,
        rightFileName: studentsCommitteesRow.fileName,
        leftColumn: storkColumns.thesisLanguage,
        rightColumn: committeesColumns.thesisLanguage,
        leftValue: storkThesisLanguage,
        rightValue: committeesThesisLanguage
      }
    })
  }

  const storkSupervisorName = readRequiredValue(studentsStorkRow, storkColumns.supervisorName)
  const committeesSupervisorName = readRequiredValue(studentsCommitteesRow, committeesColumns.supervisorName)
  assertFieldEquality(
    committeeName,
    {
      source: studentsStorkRow,
      column: storkColumns.supervisorName,
      value: storkSupervisorName
    },
    {
      source: studentsCommitteesRow,
      column: committeesColumns.supervisorName,
      value: committeesSupervisorName
    }
  )

  const storkAdditionalSupervisorName = readOptionalValue(studentsStorkRow, storkColumns.additionalSupervisorName)
  const committeesAdditionalSupervisorName = readOptionalValue(
    studentsCommitteesRow,
    committeesColumns.additionalSupervisorName
  )
  assertFieldEquality(
    committeeName,
    {
      source: studentsStorkRow,
      column: storkColumns.additionalSupervisorName,
      value: storkAdditionalSupervisorName
    },
    {
      source: studentsCommitteesRow,
      column: committeesColumns.additionalSupervisorName,
      value: committeesAdditionalSupervisorName
    }
  )

  const storkReviewerName = readRequiredValue(studentsStorkRow, storkColumns.reviewerName)
  const committeesReviewerName = readRequiredValue(studentsCommitteesRow, committeesColumns.reviewerName)
  assertFieldEquality(
    committeeName,
    {
      source: studentsStorkRow,
      column: storkColumns.reviewerName,
      value: storkReviewerName
    },
    {
      source: studentsCommitteesRow,
      column: committeesColumns.reviewerName,
      value: committeesReviewerName
    }
  )

  const storkAdditionalReviewerName = readOptionalValue(studentsStorkRow, storkColumns.additionalReviewerName)
  const committeesAdditionalReviewerName = readOptionalValue(
    studentsCommitteesRow,
    committeesColumns.additionalReviewerName
  )
  assertFieldEquality(
    committeeName,
    {
      source: studentsStorkRow,
      column: storkColumns.additionalReviewerName,
      value: storkAdditionalReviewerName
    },
    {
      source: studentsCommitteesRow,
      column: committeesColumns.additionalReviewerName,
      value: committeesAdditionalReviewerName
    }
  )

  const studyLanguageRaw = readRequiredValue(studentsCommitteesRow, committeesColumns.studyLanguage)
  const studyLanguage = parseStudyLanguage(studyLanguageRaw)
  if (!studyLanguage) {
    throwMappingError('INVALID_LANGUAGE', studentsCommitteesRow, {
      column: committeesColumns.studyLanguage,
      context: {
        languageTarget: 'study',
        rawValue: studyLanguageRaw
      }
    })
  }

  const repeatType = resolveStudentRepeatType(studentsCommitteesRow)
  const { prepareMinutes, examMinutes } = resolveStudentDurationByStudyProgramAndRepeat(studyProgramType, repeatType)

  const mappedStudent: PostStudentItemDto = {
    firstName: storkFirstName,
    lastName: storkLastName,
    email: storkEmail,
    titlesBefore: readOptionalValue(studentsStorkRow, storkColumns.titlesBefore),
    titlesAfter: readOptionalValue(studentsStorkRow, storkColumns.titlesAfter),
    thesisTitleLocal: storkThesisTitleLocal,
    thesisTitleEn: storkThesisTitleEn,
    thesisLanguage: storkThesisLanguage,
    supervisorName: storkSupervisorName,
    reviewerName: storkReviewerName,
    additionalSupervisorName: storkAdditionalSupervisorName,
    additionalReviewerName: storkAdditionalReviewerName,
    studyProgramName: readRequiredValue(studentsStorkRow, storkColumns.studyProgramName),
    studyProgramType,
    specializationName: readRequiredValue(studentsStorkRow, storkColumns.specializationName),
    specializationCode: normalizeSpecializationCode(
      readRequiredValue(studentsStorkRow, storkColumns.specializationCode)
    ),
    studyLanguage,
    repeatType,
    prepareMinutes,
    examMinutes
  }

  if (mappedStudent.studyProgramType !== targetCommittee.studyProgramType) {
    throwMappingError('STUDENT_COMMITTEE_MISMATCH', studentsStorkRow, {
      column: storkColumns.studyPlanName,
      context: {
        committeeName,
        field: 'studyProgramType',
        studentValue: mappedStudent.studyProgramType,
        committeeValue: targetCommittee.studyProgramType
      }
    })
  }

  if (
    normalizeCompareValue(mappedStudent.studyProgramName) !== normalizeCompareValue(targetCommittee.studyProgramName)
  ) {
    throwMappingError('STUDENT_COMMITTEE_MISMATCH', studentsStorkRow, {
      column: storkColumns.studyProgramName,
      context: {
        committeeName,
        field: 'studyProgramName',
        studentValue: mappedStudent.studyProgramName,
        committeeValue: targetCommittee.studyProgramName
      }
    })
  }

  const normalizedStudentSpecializationCode = normalizeSpecializationCodeForComparison(mappedStudent.specializationCode)
  const normalizedCommitteeSpecializationCode = normalizeSpecializationCodeForComparison(
    targetCommittee.specializationCode
  )

  if (!normalizedStudentSpecializationCode.startsWith(normalizedCommitteeSpecializationCode)) {
    throwMappingError('STUDENT_COMMITTEE_MISMATCH', studentsStorkRow, {
      column: storkColumns.specializationCode,
      context: {
        committeeName,
        field: 'specializationCode',
        studentValue: mappedStudent.specializationCode,
        committeeValue: targetCommittee.specializationCode
      }
    })
  }

  if (mappedStudent.studyLanguage !== targetCommittee.language) {
    throwMappingError('STUDENT_COMMITTEE_MISMATCH', studentsCommitteesRow, {
      column: committeesColumns.studyLanguage,
      context: {
        committeeName,
        field: 'studyLanguage',
        studentValue: mappedStudent.studyLanguage,
        committeeValue: targetCommittee.language
      }
    })
  }

  return {
    committeeName,
    studentsCommitteesRowNumber: studentsCommitteesRow.rowNumber,
    student: mappedStudent
  }
}
