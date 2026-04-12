import type { PostCommitteeDto } from '#shared/types/time-schedules'
import type { ImportDataset, ImportSzzType } from '~/types/import'
import { COMMITTEE_START_MINUTE } from '~/utils/import-mapper/core/constants'
import { IMPORT_COLUMN_NAMES } from '~/utils/import-mapper/core/columns'
import { throwMappingError } from '~/utils/import-mapper/core/errors'
import { preprocessCommitteeName, normalizeSpecializationCode } from '~/utils/import-mapper/core/normalize'
import { parseDateToIso, parseStudyLanguage, parseStudyProgramType } from '~/utils/import-mapper/core/parsers'
import { readOptionalValue, readRequiredValue } from '~/utils/import-mapper/core/readers'
import { toSourceRows } from '~/utils/import-mapper/core/source-rows'
import type { CommitteesMappingResult, SourceRow } from '~/utils/import-mapper/core/types'
import { assertCommitteeGroupConsistency, assertFieldEquality } from '~/utils/import-mapper/core/assertions'

export function mapCommittees(
  szzType: ImportSzzType,
  committeesDataset: ImportDataset,
  studentsCommitteesRows: SourceRow[]
): CommitteesMappingResult {
  const committeeRows = toSourceRows(committeesDataset, 'committees', null)
  const committeeRowsByName = new Map<string, SourceRow>()
  const committeeNamesInOrder: string[] = []

  for (const committeeRow of committeeRows) {
    const committeeName = preprocessCommitteeName(committeeRow.row[IMPORT_COLUMN_NAMES.committees.committeeName] ?? '')
    if (!committeeName) {
      throwMappingError('INVALID_COMMITTEE_NAME', committeeRow, {
        column: IMPORT_COLUMN_NAMES.committees.committeeName
      })
    }

    if (committeeRowsByName.has(committeeName)) {
      throwMappingError('DUPLICATE_COMMITTEE_NAME', committeeRow, {
        column: IMPORT_COLUMN_NAMES.committees.committeeName,
        context: {
          committeeName
        }
      })
    }

    committeeRowsByName.set(committeeName, committeeRow)
    committeeNamesInOrder.push(committeeName)
  }

  const studentsRowsByCommitteeName = new Map<string, SourceRow[]>()
  for (const studentsRow of studentsCommitteesRows) {
    const committeeName = preprocessCommitteeName(
      studentsRow.row[IMPORT_COLUMN_NAMES.studentsCommittees.committeeName] ?? ''
    )
    if (!committeeName) {
      throwMappingError('INVALID_COMMITTEE_NAME', studentsRow, {
        column: IMPORT_COLUMN_NAMES.studentsCommittees.committeeName
      })
    }

    const existingRows = studentsRowsByCommitteeName.get(committeeName) ?? []
    existingRows.push(studentsRow)
    studentsRowsByCommitteeName.set(committeeName, existingRows)
  }

  for (const committeeName of committeeNamesInOrder) {
    if (!studentsRowsByCommitteeName.has(committeeName)) {
      const committeeRow = committeeRowsByName.get(committeeName)
      if (!committeeRow) {
        continue
      }

      throwMappingError('COMMITTEE_NOT_FOUND_IN_STUDENTS', committeeRow, {
        column: IMPORT_COLUMN_NAMES.committees.committeeName,
        context: {
          committeeName
        }
      })
    }
  }

  for (const [committeeName, studentsRows] of studentsRowsByCommitteeName.entries()) {
    if (!committeeRowsByName.has(committeeName)) {
      const firstRow = studentsRows[0]
      if (!firstRow) {
        continue
      }

      throwMappingError('COMMITTEE_NOT_FOUND_IN_COMMITTEES', firstRow, {
        column: IMPORT_COLUMN_NAMES.studentsCommittees.committeeName,
        context: {
          committeeName
        }
      })
    }
  }

  const mappedCommitteesByName = new Map<string, PostCommitteeDto>()

  for (const committeeName of committeeNamesInOrder) {
    const committeeRow = committeeRowsByName.get(committeeName)
    const studentsRows = studentsRowsByCommitteeName.get(committeeName)

    if (!committeeRow || !studentsRows || studentsRows.length === 0) {
      continue
    }

    assertCommitteeGroupConsistency(studentsRows, committeeName)

    const representativeStudentsRow = studentsRows[0]
    if (!representativeStudentsRow) {
      continue
    }

    const studentsProgramName = readRequiredValue(
      representativeStudentsRow,
      IMPORT_COLUMN_NAMES.studentsCommittees.studyProgramName
    )
    const committeesProgramName = readRequiredValue(committeeRow, IMPORT_COLUMN_NAMES.committees.studyProgramName)
    assertFieldEquality(
      committeeName,
      {
        source: representativeStudentsRow,
        column: IMPORT_COLUMN_NAMES.studentsCommittees.studyProgramName,
        value: studentsProgramName
      },
      {
        source: committeeRow,
        column: IMPORT_COLUMN_NAMES.committees.studyProgramName,
        value: committeesProgramName
      },
      'COMMITTEE_FIELD_MISMATCH'
    )

    const studentsSpecializationName = readRequiredValue(
      representativeStudentsRow,
      IMPORT_COLUMN_NAMES.studentsCommittees.specializationName
    )
    const committeesSpecializationName = readRequiredValue(
      committeeRow,
      IMPORT_COLUMN_NAMES.committees.specializationName
    )
    assertFieldEquality(
      committeeName,
      {
        source: representativeStudentsRow,
        column: IMPORT_COLUMN_NAMES.studentsCommittees.specializationName,
        value: studentsSpecializationName
      },
      {
        source: committeeRow,
        column: IMPORT_COLUMN_NAMES.committees.specializationName,
        value: committeesSpecializationName
      },
      'COMMITTEE_FIELD_MISMATCH'
    )

    const studyProgramTypeValue = readRequiredValue(
      representativeStudentsRow,
      IMPORT_COLUMN_NAMES.studentsCommittees.studyProgramType
    )
    const studyProgramType = parseStudyProgramType(studyProgramTypeValue)
    if (!studyProgramType) {
      throwMappingError('INVALID_STUDY_PROGRAM_TYPE', representativeStudentsRow, {
        column: IMPORT_COLUMN_NAMES.studentsCommittees.studyProgramType,
        context: {
          committeeName,
          rawValue: studyProgramTypeValue
        }
      })
    }

    if (szzType !== 'MIXED' && studyProgramType !== szzType) {
      throwMappingError('COMMITTEE_SZZ_TYPE_MISMATCH', representativeStudentsRow, {
        column: IMPORT_COLUMN_NAMES.studentsCommittees.studyProgramType,
        context: {
          committeeName,
          detectedType: studyProgramType,
          selectedType: szzType
        }
      })
    }

    const languageValue = readRequiredValue(
      representativeStudentsRow,
      IMPORT_COLUMN_NAMES.studentsCommittees.studyLanguage
    )
    const language = parseStudyLanguage(languageValue)
    if (!language) {
      throwMappingError('INVALID_LANGUAGE', representativeStudentsRow, {
        column: IMPORT_COLUMN_NAMES.studentsCommittees.studyLanguage,
        context: {
          committeeName,
          rawValue: languageValue,
          languageTarget: 'study'
        }
      })
    }

    const committeeDateRaw = readRequiredValue(committeeRow, IMPORT_COLUMN_NAMES.committees.date)
    const committeeDate = parseDateToIso(committeeDateRaw)
    if (!committeeDate) {
      throwMappingError('INVALID_COMMITTEE_DATE', committeeRow, {
        column: IMPORT_COLUMN_NAMES.committees.date,
        context: {
          committeeName,
          rawValue: committeeDateRaw
        }
      })
    }

    const mappedCommittee: PostCommitteeDto = {
      name: committeeName,
      startMinute: COMMITTEE_START_MINUTE,
      date: committeeDate,
      room: readOptionalValue(committeeRow, IMPORT_COLUMN_NAMES.committees.room),
      preparationRoom: null,
      secretaryName: readOptionalValue(committeeRow, IMPORT_COLUMN_NAMES.committees.secretaryName),
      invigilators: [],
      language,
      studyProgramName: committeesProgramName,
      studyProgramType,
      specializationName: committeesSpecializationName,
      specializationCode: normalizeSpecializationCode(
        readRequiredValue(representativeStudentsRow, IMPORT_COLUMN_NAMES.studentsCommittees.specializationCode)
      ),
      chairName: readRequiredValue(representativeStudentsRow, IMPORT_COLUMN_NAMES.studentsCommittees.chairName),
      viceChairName: readRequiredValue(representativeStudentsRow, IMPORT_COLUMN_NAMES.studentsCommittees.viceChairName),
      member1Name: readRequiredValue(representativeStudentsRow, IMPORT_COLUMN_NAMES.studentsCommittees.member1Name),
      member2Name: readRequiredValue(representativeStudentsRow, IMPORT_COLUMN_NAMES.studentsCommittees.member2Name),
      member3Name: readRequiredValue(representativeStudentsRow, IMPORT_COLUMN_NAMES.studentsCommittees.member3Name),
      items: []
    }

    mappedCommitteesByName.set(committeeName, mappedCommittee)
  }

  const mappedCommittees = committeeNamesInOrder
    .map((committeeName) => mappedCommitteesByName.get(committeeName))
    .filter((committee): committee is PostCommitteeDto => committee !== undefined)

  return {
    committees: mappedCommittees,
    committeesByName: mappedCommitteesByName
  }
}
