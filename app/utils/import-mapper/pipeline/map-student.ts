import type { PostCommitteeDto, PostStudentItemDto } from '#shared/types/time-schedules'
import { resolveStudyLevelFromStudentsStork } from '~/utils/import'
import type { ImportSzzType } from '~/types/import'
import { assertFieldEquality } from '~/utils/import-mapper/core/assertions'
import { throwMappingError } from '~/utils/import-mapper/core/errors'
import {
  normalizeCompareValue,
  normalizeSpecializationCode,
  normalizeSpecializationCodeForComparison,
  preprocessCommitteeName
} from '~/utils/import-mapper/core/normalize'
import { parseDateToIso, parseStudyLanguage, parseThesisLanguage } from '~/utils/import-mapper/core/parsers'
import { readOptionalValue, readRequiredValue } from '~/utils/import-mapper/core/readers'
import {
  resolveStudentDurationByStudyProgramAndRepeat,
  resolveStudentRepeatType
} from '~/utils/import-mapper/core/student-repeat'
import type { MappedStudentPlacement, MatchedStudentRows } from '~/utils/import-mapper/core/types'

interface MapStudentInput {
  szzType: ImportSzzType
  committeesByName: Map<string, PostCommitteeDto>
  matchedRows: MatchedStudentRows
}

export function mapStudent(input: MapStudentInput): MappedStudentPlacement {
  const { szzType, committeesByName, matchedRows } = input
  const { studentsStorkRow, studentsCommitteesRow } = matchedRows

  const storkFirstName = readRequiredValue(studentsStorkRow, 'Jméno')
  const committeesFirstName = readRequiredValue(studentsCommitteesRow, 'Jméno studenta')
  assertFieldEquality(
    preprocessCommitteeName(readRequiredValue(studentsCommitteesRow, 'Komise - název')),
    {
      source: studentsStorkRow,
      column: 'Jméno',
      value: storkFirstName
    },
    {
      source: studentsCommitteesRow,
      column: 'Jméno studenta',
      value: committeesFirstName
    }
  )

  const storkLastName = readRequiredValue(studentsStorkRow, 'Příjmení')
  const committeesLastName = readRequiredValue(studentsCommitteesRow, 'Příjmení studenta')
  assertFieldEquality(
    preprocessCommitteeName(readRequiredValue(studentsCommitteesRow, 'Komise - název')),
    {
      source: studentsStorkRow,
      column: 'Příjmení',
      value: storkLastName
    },
    {
      source: studentsCommitteesRow,
      column: 'Příjmení studenta',
      value: committeesLastName
    }
  )

  const committeeName = preprocessCommitteeName(readRequiredValue(studentsCommitteesRow, 'Komise - název'))
  const targetCommittee = committeesByName.get(committeeName)
  if (!targetCommittee) {
    throwMappingError('STUDENT_COMMITTEE_NOT_FOUND', studentsCommitteesRow, {
      column: 'Komise - název',
      context: {
        committeeName
      }
    })
  }

  const studyProgramType = resolveStudyLevelFromStudentsStork([studentsStorkRow.row])
  if (!studyProgramType) {
    throwMappingError('INVALID_STUDY_PROGRAM_TYPE', studentsStorkRow, {
      column: 'Studijní plán (název)',
      context: {
        rawValue: studentsStorkRow.row['Studijní plán (název)'] ?? ''
      }
    })
  }

  if (szzType !== 'MIXED' && studyProgramType !== szzType) {
    throwMappingError('COMMITTEE_SZZ_TYPE_MISMATCH', studentsStorkRow, {
      column: 'Studijní plán (název)',
      context: {
        detectedType: studyProgramType,
        selectedType: szzType
      }
    })
  }

  const storkThesisTitleLocal = readRequiredValue(studentsStorkRow, 'VŠKP-typ A: Název práce')
  const committeesThesisTitleLocal = readRequiredValue(studentsCommitteesRow, 'VŠKP-typ A: Český název práce')
  assertFieldEquality(
    committeeName,
    {
      source: studentsStorkRow,
      column: 'VŠKP-typ A: Název práce',
      value: storkThesisTitleLocal
    },
    {
      source: studentsCommitteesRow,
      column: 'VŠKP-typ A: Český název práce',
      value: committeesThesisTitleLocal
    }
  )

  const storkThesisTitleEn = readRequiredValue(studentsStorkRow, 'VŠKP-typ A: Překlad názvu práce')
  const committeesThesisTitleEn = readRequiredValue(studentsCommitteesRow, 'VŠKP-typ A: Anglický název práce')
  assertFieldEquality(
    committeeName,
    {
      source: studentsStorkRow,
      column: 'VŠKP-typ A: Překlad názvu práce',
      value: storkThesisTitleEn
    },
    {
      source: studentsCommitteesRow,
      column: 'VŠKP-typ A: Anglický název práce',
      value: committeesThesisTitleEn
    }
  )

  const storkThesisLanguageRaw = readRequiredValue(studentsStorkRow, 'VŠKP-typ A: jazyk práce')
  const committeesThesisLanguageRaw = readRequiredValue(studentsCommitteesRow, 'VŠKP-typ A: Jazyk práce')
  const storkThesisLanguage = parseThesisLanguage(storkThesisLanguageRaw)
  if (!storkThesisLanguage) {
    throwMappingError('INVALID_LANGUAGE', studentsStorkRow, {
      column: 'VŠKP-typ A: jazyk práce',
      context: {
        languageTarget: 'thesis',
        rawValue: storkThesisLanguageRaw
      }
    })
  }

  const committeesThesisLanguage = parseThesisLanguage(committeesThesisLanguageRaw)
  if (!committeesThesisLanguage) {
    throwMappingError('INVALID_LANGUAGE', studentsCommitteesRow, {
      column: 'VŠKP-typ A: Jazyk práce',
      context: {
        languageTarget: 'thesis',
        rawValue: committeesThesisLanguageRaw
      }
    })
  }

  if (storkThesisLanguage !== committeesThesisLanguage) {
    throwMappingError('STUDENT_VALUE_MISMATCH', studentsCommitteesRow, {
      column: 'VŠKP-typ A: Jazyk práce',
      context: {
        committeeName,
        leftColumn: 'VŠKP-typ A: jazyk práce',
        rightColumn: 'VŠKP-typ A: Jazyk práce',
        leftValue: storkThesisLanguage,
        rightValue: committeesThesisLanguage
      }
    })
  }

  const storkSupervisorName = readRequiredValue(studentsStorkRow, 'VŠKP-typ A: Vedoucí práce 1')
  const committeesSupervisorName = readRequiredValue(studentsCommitteesRow, 'VŠKP-typ A: Vedoucí práce 1')
  assertFieldEquality(
    committeeName,
    {
      source: studentsStorkRow,
      column: 'VŠKP-typ A: Vedoucí práce 1',
      value: storkSupervisorName
    },
    {
      source: studentsCommitteesRow,
      column: 'VŠKP-typ A: Vedoucí práce 1',
      value: committeesSupervisorName
    }
  )

  const storkAdditionalSupervisorName = readOptionalValue(studentsStorkRow, 'VŠKP-typ A: Vedoucí práce 2')
  const committeesAdditionalSupervisorName = readOptionalValue(studentsCommitteesRow, 'VŠKP-typ A: Vedoucí práce 2')
  assertFieldEquality(
    committeeName,
    {
      source: studentsStorkRow,
      column: 'VŠKP-typ A: Vedoucí práce 2',
      value: storkAdditionalSupervisorName
    },
    {
      source: studentsCommitteesRow,
      column: 'VŠKP-typ A: Vedoucí práce 2',
      value: committeesAdditionalSupervisorName
    }
  )

  const storkReviewerName = readRequiredValue(studentsStorkRow, 'VŠKP-typ A: Oponent práce 1')
  const committeesReviewerName = readRequiredValue(studentsCommitteesRow, 'VŠKP-typ A: Oponent práce 1')
  assertFieldEquality(
    committeeName,
    {
      source: studentsStorkRow,
      column: 'VŠKP-typ A: Oponent práce 1',
      value: storkReviewerName
    },
    {
      source: studentsCommitteesRow,
      column: 'VŠKP-typ A: Oponent práce 1',
      value: committeesReviewerName
    }
  )

  const storkAdditionalReviewerName = readOptionalValue(studentsStorkRow, 'VŠKP-typ A: Oponent práce 2')
  const committeesAdditionalReviewerName = readOptionalValue(studentsCommitteesRow, 'VŠKP-typ A: Oponent práce 2')
  assertFieldEquality(
    committeeName,
    {
      source: studentsStorkRow,
      column: 'VŠKP-typ A: Oponent práce 2',
      value: storkAdditionalReviewerName
    },
    {
      source: studentsCommitteesRow,
      column: 'VŠKP-typ A: Oponent práce 2',
      value: committeesAdditionalReviewerName
    }
  )

  const studyLanguageRaw = readRequiredValue(studentsCommitteesRow, 'Jazyk výuky')
  const studyLanguage = parseStudyLanguage(studyLanguageRaw)
  if (!studyLanguage) {
    throwMappingError('INVALID_LANGUAGE', studentsCommitteesRow, {
      column: 'Jazyk výuky',
      context: {
        languageTarget: 'study',
        rawValue: studyLanguageRaw
      }
    })
  }

  const thesisSubmissionAtRaw = readOptionalValue(studentsStorkRow, 'VŠKP-typ A: Termín odevzdání práce')
  const thesisSubmissionAt = thesisSubmissionAtRaw ? parseDateToIso(thesisSubmissionAtRaw) : null
  if (thesisSubmissionAtRaw && !thesisSubmissionAt) {
    throwMappingError('INVALID_THESIS_SUBMISSION_DATE', studentsStorkRow, {
      column: 'VŠKP-typ A: Termín odevzdání práce',
      context: {
        rawValue: thesisSubmissionAtRaw
      }
    })
  }

  const repeatType = resolveStudentRepeatType(studentsCommitteesRow)
  const { prepareMinutes, examMinutes } = resolveStudentDurationByStudyProgramAndRepeat(studyProgramType, repeatType)

  const mappedStudent: PostStudentItemDto = {
    personalNumber: readOptionalValue(studentsCommitteesRow, 'Osobní číslo'),
    firstName: storkFirstName,
    lastName: storkLastName,
    titlesBefore: readOptionalValue(studentsStorkRow, 'Titul'),
    titlesAfter: readOptionalValue(studentsStorkRow, 'titul za'),
    thesisTitleLocal: storkThesisTitleLocal,
    thesisTitleEn: storkThesisTitleEn,
    thesisLanguage: storkThesisLanguage,
    supervisorName: storkSupervisorName,
    reviewerName: storkReviewerName,
    additionalSupervisorName: storkAdditionalSupervisorName,
    additionalReviewerName: storkAdditionalReviewerName,
    studyProgramName: readRequiredValue(studentsStorkRow, 'Studijní program (název)'),
    studyProgramType,
    specializationName: readRequiredValue(studentsStorkRow, 'Obor/spec - název'),
    specializationCode: normalizeSpecializationCode(readRequiredValue(studentsStorkRow, 'Kód studijního plánu')),
    defenseDepartmentCode: readRequiredValue(studentsStorkRow, 'Katedra studenta (kód)'),
    defenseDepartmentName: readRequiredValue(studentsStorkRow, 'Katedra studenta (název)'),
    studyLanguage,
    thesisSubmissionAt: thesisSubmissionAt ?? null,
    repeatType,
    elsa: false,
    prepareMinutes,
    examMinutes
  }

  if (mappedStudent.studyProgramType !== targetCommittee.studyProgramType) {
    throwMappingError('STUDENT_COMMITTEE_MISMATCH', studentsStorkRow, {
      column: 'Studijní plán (název)',
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
      column: 'Studijní program (název)',
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
      column: 'Kód studijního plánu',
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
      column: 'Jazyk výuky',
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
