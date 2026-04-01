import type { PostCommitteeDto } from '#shared/types/time-schedules'
import type { ImportDataset, ImportSzzType } from '~/types/import'
import { COMMITTEE_START_MINUTE } from '~/utils/import-mapper/core/constants'
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
    const committeeName = preprocessCommitteeName(committeeRow.row['Název komise'] ?? '')
    if (!committeeName) {
      throwMappingError('INVALID_COMMITTEE_NAME', committeeRow, {
        column: 'Název komise'
      })
    }

    if (committeeRowsByName.has(committeeName)) {
      throwMappingError('DUPLICATE_COMMITTEE_NAME', committeeRow, {
        column: 'Název komise',
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
    const committeeName = preprocessCommitteeName(studentsRow.row['Komise - název'] ?? '')
    if (!committeeName) {
      throwMappingError('INVALID_COMMITTEE_NAME', studentsRow, {
        column: 'Komise - název'
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
        column: 'Název komise',
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
        column: 'Komise - název',
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

    const studentsProgramName = readRequiredValue(representativeStudentsRow, 'St. program - název')
    const committeesProgramName = readRequiredValue(committeeRow, 'Název studijního programu')
    assertFieldEquality(
      committeeName,
      {
        source: representativeStudentsRow,
        column: 'St. program - název',
        value: studentsProgramName
      },
      {
        source: committeeRow,
        column: 'Název studijního programu',
        value: committeesProgramName
      },
      'COMMITTEE_FIELD_MISMATCH'
    )

    const studentsSpecializationName = readRequiredValue(representativeStudentsRow, 'Obor/spec - název')
    const committeesSpecializationName = readRequiredValue(committeeRow, 'Název oboru/specializace')
    assertFieldEquality(
      committeeName,
      {
        source: representativeStudentsRow,
        column: 'Obor/spec - název',
        value: studentsSpecializationName
      },
      {
        source: committeeRow,
        column: 'Název oboru/specializace',
        value: committeesSpecializationName
      },
      'COMMITTEE_FIELD_MISMATCH'
    )

    const studentsDefenseDepartmentCode = readOptionalValue(
      representativeStudentsRow,
      'VŠKP-typ A: Katedra obhajoby - kod'
    )
    const committeesDefenseDepartmentCode = readRequiredValue(committeeRow, 'Kat')
    if (studentsDefenseDepartmentCode) {
      assertFieldEquality(
        committeeName,
        {
          source: representativeStudentsRow,
          column: 'VŠKP-typ A: Katedra obhajoby - kod',
          value: studentsDefenseDepartmentCode
        },
        {
          source: committeeRow,
          column: 'Kat',
          value: committeesDefenseDepartmentCode
        },
        'COMMITTEE_FIELD_MISMATCH'
      )
    }

    const studentsDefenseDepartmentName = readOptionalValue(
      representativeStudentsRow,
      'VŠKP-typ A: Katedra obhajoby - název'
    )

    const studyProgramTypeValue = readRequiredValue(representativeStudentsRow, 'St. program - typ')
    const studyProgramType = parseStudyProgramType(studyProgramTypeValue)
    if (!studyProgramType) {
      throwMappingError('INVALID_STUDY_PROGRAM_TYPE', representativeStudentsRow, {
        column: 'St. program - typ',
        context: {
          committeeName,
          rawValue: studyProgramTypeValue
        }
      })
    }

    if (szzType !== 'MIXED' && studyProgramType !== szzType) {
      throwMappingError('COMMITTEE_SZZ_TYPE_MISMATCH', representativeStudentsRow, {
        column: 'St. program - typ',
        context: {
          committeeName,
          detectedType: studyProgramType,
          selectedType: szzType
        }
      })
    }

    const languageValue = readRequiredValue(representativeStudentsRow, 'Jazyk výuky')
    const language = parseStudyLanguage(languageValue)
    if (!language) {
      throwMappingError('INVALID_LANGUAGE', representativeStudentsRow, {
        column: 'Jazyk výuky',
        context: {
          committeeName,
          rawValue: languageValue,
          languageTarget: 'study'
        }
      })
    }

    const committeeDateRaw = readRequiredValue(committeeRow, 'Datum')
    const committeeDate = parseDateToIso(committeeDateRaw)
    if (!committeeDate) {
      throwMappingError('INVALID_COMMITTEE_DATE', committeeRow, {
        column: 'Datum',
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
      room: readOptionalValue(committeeRow, 'Místo'),
      secretaryName: readOptionalValue(committeeRow, 'Správce'),
      invigilators: [],
      language,
      studyProgramName: committeesProgramName,
      studyProgramType,
      specializationName: committeesSpecializationName,
      specializationCode: normalizeSpecializationCode(readRequiredValue(representativeStudentsRow, 'Obor/spec - kód')),
      defenseDepartmentCode: studentsDefenseDepartmentCode ?? committeesDefenseDepartmentCode,
      defenseDepartmentName: studentsDefenseDepartmentName ?? '',
      chairName: readRequiredValue(representativeStudentsRow, 'Komise - předseda'),
      viceChairName: readRequiredValue(representativeStudentsRow, 'Komise - místopředseda'),
      member1Name: readRequiredValue(representativeStudentsRow, 'Komise - člen 1'),
      member2Name: readRequiredValue(representativeStudentsRow, 'Komise - člen 2'),
      member3Name: readRequiredValue(representativeStudentsRow, 'Komise - člen 3'),
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
