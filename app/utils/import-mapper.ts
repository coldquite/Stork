import type {
  PostCommitteeDto,
  PostCommitteeItemDto,
  PostStudentItemDto,
  StudyLanguageDto,
  StudyProgramTypeDto,
  ThesisLanguageDto
} from '#shared/types/time-schedules'
import { resolveStudyLevelFromStudentsCap } from '~/utils/import'
import type { ImportCsvRow, ImportDataset, ImportPayload, ImportSzzType } from '~/types/import'
import type {
  ImportMappingError,
  ImportMappingErrorCode,
  MapImportPayloadToDraftInput,
  MapImportPayloadToDraftResult
} from '~/types/import-mapper'
import type { DraftScheduleSource } from '~/types/schedule-draft'

const COMMITTEE_START_MINUTE = 525 // 8:45
const DEFAULT_PREPARE_MINUTES = 45
const DEFAULT_EXAM_MINUTES = 30

type DatasetLevel = 'bachelor' | 'master'
type SourceDatasetKey = 'studentsCap' | 'studentsCommittees' | 'committees'

interface SourceRow {
  datasetKey: SourceDatasetKey
  fileName: string
  rowNumber: number
  level: DatasetLevel | null
  row: ImportCsvRow
}

interface StudentsDatasetsBundle {
  studentsCapRows: SourceRow[]
  studentsCommitteesRows: SourceRow[]
}

interface CommitteesMappingResult {
  committees: PostCommitteeDto[]
  committeesByName: Map<string, PostCommitteeDto>
}

class ImportMappingFailure extends Error {
  readonly mappingError: ImportMappingError

  constructor(mappingError: ImportMappingError) {
    super(mappingError.code)
    this.mappingError = mappingError
    this.name = 'ImportMappingFailure'
  }
}

const COMMITTEE_GROUP_INVARIANT_COLUMNS: readonly string[] = [
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

function throwMappingError(
  code: ImportMappingErrorCode,
  source: Pick<SourceRow, 'datasetKey' | 'fileName' | 'rowNumber'> | null,
  options: {
    datasetKey?: ImportMappingError['datasetKey']
    column?: string | null
    context?: Record<string, string | number | boolean | null>
  } = {}
): never {
  throw new ImportMappingFailure({
    code,
    datasetKey: options.datasetKey ?? source?.datasetKey ?? 'committees',
    fileName: source?.fileName ?? null,
    rowNumber: source?.rowNumber ?? null,
    column: options.column ?? null,
    context: options.context ?? {}
  })
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeNullable(value: string): string | null {
  const normalized = normalizeWhitespace(value)
  return normalized.length > 0 ? normalized : null
}

function normalizeCompareValue(value: string): string {
  return normalizeWhitespace(value).toLowerCase()
}

function normalizeEmail(value: string): string {
  return normalizeWhitespace(value).toLowerCase()
}

function normalizeSpecializationCode(value: string): string {
  const normalized = normalizeWhitespace(value)
  const matched = normalized.match(/^(.*?)(\d+)$/)
  if (!matched) {
    return normalized
  }

  const prefix = matched[1] ?? ''
  const digits = matched[2] ?? ''
  if (prefix.endsWith('.')) {
    return `${prefix}${digits}`
  }

  return `${prefix}.${digits}`
}

function normalizeSpecializationCodeForComparison(value: string): string {
  const normalized = normalizeCompareValue(value).replace(/k-/g, '-')
  const withoutVersionSuffix = normalized.replace(/\.\d+$/u, '').replace(/\d+$/u, '')
  return withoutVersionSuffix.replace(/[.-]+$/u, '')
}

function preprocessCommitteeName(value: string): string {
  const normalized = normalizeWhitespace(value)
  if (normalized.length === 0) {
    return ''
  }

  const splitByComma = normalized.split(',')
  if (splitByComma.length < 2) {
    return normalized
  }

  const suffix = normalizeWhitespace(splitByComma[1] ?? '')
  return suffix.length > 0 ? suffix : normalized
}

function toSourceRows(dataset: ImportDataset, datasetKey: SourceDatasetKey, level: DatasetLevel | null): SourceRow[] {
  return dataset.rows.map((row, index) => ({
    datasetKey,
    fileName: dataset.fileName,
    rowNumber: index + 2,
    level,
    row
  }))
}

function parseStudyProgramType(value: string): StudyProgramTypeDto | null {
  const firstSymbol = normalizeWhitespace(value).toUpperCase()[0] ?? ''

  if (firstSymbol === 'B') {
    return 'BACHELOR'
  }

  if (firstSymbol === 'M' || firstSymbol === 'N') {
    return 'MASTER'
  }

  return null
}

function normalizeLanguageCode(rawValue: string): string {
  return normalizeWhitespace(rawValue).toUpperCase()
}

function parseStudyLanguage(rawValue: string): StudyLanguageDto | null {
  const normalized = normalizeLanguageCode(rawValue)
  if (normalized.length === 0) {
    return null
  }

  if (['CZ', 'CS', 'CZECH'].includes(normalized)) {
    return 'CZECH'
  }

  if (['EN', 'ENGLISH'].includes(normalized)) {
    return 'ENGLISH'
  }

  return null
}

function parseThesisLanguage(rawValue: string): ThesisLanguageDto | null {
  const studyLanguage = parseStudyLanguage(rawValue)
  if (studyLanguage) {
    return studyLanguage
  }

  const normalized = normalizeLanguageCode(rawValue)
  if (['SL', 'SK', 'SLOVAK'].includes(normalized)) {
    return 'SLOVAK'
  }

  return null
}

function parseCommitteeDateToIso(rawValue: string): string | null {
  const normalized = normalizeWhitespace(rawValue)
  const matched = normalized.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (!matched) {
    return null
  }

  const day = Number.parseInt(matched[1] ?? '', 10)
  const month = Number.parseInt(matched[2] ?? '', 10)
  const year = Number.parseInt(matched[3] ?? '', 10)

  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
    return null
  }

  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null
  }

  return date.toISOString()
}

function parseOptionalDateTimeToIso(rawValue: string): string | null {
  const normalized = normalizeWhitespace(rawValue)
  if (normalized.length === 0) {
    return null
  }

  const czDate = parseCommitteeDateToIso(normalized)
  if (czDate) {
    return czDate
  }

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toISOString()
}

function readRequiredValue(source: SourceRow, column: string): string {
  const rawValue = source.row[column] ?? ''
  const normalized = normalizeWhitespace(rawValue)

  if (normalized.length === 0) {
    throwMappingError('MISSING_REQUIRED_VALUE', source, {
      column,
      context: {
        reason: 'required_value_is_empty'
      }
    })
  }

  return normalized
}

function readOptionalValue(source: SourceRow, column: string): string | null {
  return normalizeNullable(source.row[column] ?? '')
}

function resolveSingleLevelKey(szzType: Exclude<ImportSzzType, 'MIXED'>): DatasetLevel {
  return szzType === 'BACHELOR' ? 'bachelor' : 'master'
}

function requireDataset(
  dataset: ImportDataset | undefined,
  datasetKey: SourceDatasetKey,
  context: { level: DatasetLevel }
): ImportDataset {
  if (dataset) {
    return dataset
  }

  throwMappingError('MISSING_DATASET', null, {
    datasetKey,
    context: {
      datasetKey,
      level: context.level
    }
  })
}

function collectStudentDatasets(payload: ImportPayload, szzType: ImportSzzType): StudentsDatasetsBundle {
  if (szzType === 'MIXED') {
    const studentsCapBachelor = requireDataset(payload.studentsCap.bachelor, 'studentsCap', { level: 'bachelor' })
    const studentsCapMaster = requireDataset(payload.studentsCap.master, 'studentsCap', { level: 'master' })
    const studentsCommitteesBachelor = requireDataset(payload.studentsCommittees.bachelor, 'studentsCommittees', {
      level: 'bachelor'
    })
    const studentsCommitteesMaster = requireDataset(payload.studentsCommittees.master, 'studentsCommittees', {
      level: 'master'
    })

    return {
      studentsCapRows: [
        ...toSourceRows(studentsCapBachelor, 'studentsCap', 'bachelor'),
        ...toSourceRows(studentsCapMaster, 'studentsCap', 'master')
      ],
      studentsCommitteesRows: [
        ...toSourceRows(studentsCommitteesBachelor, 'studentsCommittees', 'bachelor'),
        ...toSourceRows(studentsCommitteesMaster, 'studentsCommittees', 'master')
      ]
    }
  }

  const level = resolveSingleLevelKey(szzType)
  const studentsCapDataset = requireDataset(payload.studentsCap[level], 'studentsCap', { level })
  const studentsCommitteesDataset = requireDataset(payload.studentsCommittees[level], 'studentsCommittees', {
    level
  })

  return {
    studentsCapRows: toSourceRows(studentsCapDataset, 'studentsCap', level),
    studentsCommitteesRows: toSourceRows(studentsCommitteesDataset, 'studentsCommittees', level)
  }
}

function assertCommitteeGroupConsistency(groupRows: SourceRow[], committeeName: string): void {
  const baseRow = groupRows[0]
  if (!baseRow) {
    return
  }

  for (const column of COMMITTEE_GROUP_INVARIANT_COLUMNS) {
    const expectedRaw = baseRow.row[column] ?? ''
    const expected =
      column === 'Obor/spec - kód'
        ? normalizeSpecializationCodeForComparison(normalizeSpecializationCode(expectedRaw))
        : normalizeWhitespace(expectedRaw)

    for (const currentRow of groupRows) {
      const currentRaw = currentRow.row[column] ?? ''
      const current =
        column === 'Obor/spec - kód'
          ? normalizeSpecializationCodeForComparison(normalizeSpecializationCode(currentRaw))
          : normalizeWhitespace(currentRaw)

      if (current === expected) {
        continue
      }

      throwMappingError('COMMITTEE_GROUP_INCONSISTENT', currentRow, {
        column,
        context: {
          committeeName,
          referenceRow: baseRow.rowNumber,
          expectedValue: expected,
          actualValue: current
        }
      })
    }
  }
}

function assertEqualFieldsBetweenSources(
  left: { source: SourceRow; column: string; value: string },
  right: { source: SourceRow; column: string; value: string },
  committeeName: string
): void {
  const leftValue = normalizeWhitespace(left.value)
  const rightValue = normalizeWhitespace(right.value)

  if (normalizeCompareValue(leftValue) === normalizeCompareValue(rightValue)) {
    return
  }

  throwMappingError('COMMITTEE_FIELD_MISMATCH', right.source, {
    column: right.column,
    context: {
      committeeName,
      leftColumn: left.column,
      rightColumn: right.column,
      leftValue,
      rightValue
    }
  })
}

function mapCommittees(
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
    assertEqualFieldsBetweenSources(
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
      committeeName
    )

    const studentsSpecializationName = readRequiredValue(representativeStudentsRow, 'Obor/spec - název')
    const committeesSpecializationName = readRequiredValue(committeeRow, 'Název oboru/specializace')
    assertEqualFieldsBetweenSources(
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
      committeeName
    )

    const studentsDefenseDepartmentCode = readOptionalValue(
      representativeStudentsRow,
      'VŠKP-typ A: Katedra obhajoby - kod'
    )
    const committeesDefenseDepartmentCode = readRequiredValue(committeeRow, 'Kat')
    if (studentsDefenseDepartmentCode) {
      assertEqualFieldsBetweenSources(
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
        committeeName
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
    const committeeDate = parseCommitteeDateToIso(committeeDateRaw)
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

function buildStudentMatchKeyByCap(row: SourceRow): string {
  const email = normalizeEmail(readRequiredValue(row, 'Email studenta'))
  const firstName = normalizeCompareValue(readRequiredValue(row, 'Jméno'))
  const lastName = normalizeCompareValue(readRequiredValue(row, 'Příjmení'))

  return `${email}|${firstName}|${lastName}`
}

function buildStudentMatchKeyByStudentsCommittees(row: SourceRow): string {
  const email = normalizeEmail(readRequiredValue(row, 'Email adresa'))
  const firstName = normalizeCompareValue(readRequiredValue(row, 'Jméno studenta'))
  const lastName = normalizeCompareValue(readRequiredValue(row, 'Příjmení studenta'))

  return `${email}|${firstName}|${lastName}`
}

function assertStudentFieldEquality(
  committeeName: string,
  left: { source: SourceRow; column: string; value: string },
  right: { source: SourceRow; column: string; value: string }
): void {
  if (normalizeCompareValue(left.value) === normalizeCompareValue(right.value)) {
    return
  }

  throwMappingError('STUDENT_VALUE_MISMATCH', right.source, {
    column: right.column,
    context: {
      committeeName,
      leftColumn: left.column,
      rightColumn: right.column,
      leftValue: left.value,
      rightValue: right.value
    }
  })
}

function assertOptionalStudentFieldEquality(
  committeeName: string,
  left: { source: SourceRow; column: string; value: string | null },
  right: { source: SourceRow; column: string; value: string | null }
): void {
  const leftValue = left.value ?? ''
  const rightValue = right.value ?? ''

  if (normalizeCompareValue(leftValue) === normalizeCompareValue(rightValue)) {
    return
  }

  throwMappingError('STUDENT_VALUE_MISMATCH', right.source, {
    column: right.column,
    context: {
      committeeName,
      leftColumn: left.column,
      rightColumn: right.column,
      leftValue,
      rightValue
    }
  })
}

function appendStudentsToCommittees(
  szzType: ImportSzzType,
  committeesByName: Map<string, PostCommitteeDto>,
  studentsCapRows: SourceRow[],
  studentsCommitteesRows: SourceRow[]
): void {
  const studentsRowsByKey = new Map<string, SourceRow[]>()
  for (const studentsRow of studentsCommitteesRows) {
    const key = buildStudentMatchKeyByStudentsCommittees(studentsRow)
    const existingRows = studentsRowsByKey.get(key) ?? []
    existingRows.push(studentsRow)
    studentsRowsByKey.set(key, existingRows)
  }

  const usedStudentsCommitteesRows = new Set<SourceRow>()
  const bufferedStudentItems = new Map<string, Array<{ rowNumber: number; student: PostStudentItemDto }>>()

  for (const studentsCapRow of studentsCapRows) {
    const key = buildStudentMatchKeyByCap(studentsCapRow)
    const matches = studentsRowsByKey.get(key) ?? []

    if (matches.length === 0) {
      throwMappingError('STUDENT_MATCH_NOT_FOUND', studentsCapRow, {
        context: {
          matchingKey: key
        }
      })
    }

    if (matches.length > 1) {
      throwMappingError('STUDENT_MATCH_AMBIGUOUS', studentsCapRow, {
        context: {
          matchingKey: key,
          matches: matches.length
        }
      })
    }

    const studentsCommitteesRow = matches[0]
    if (!studentsCommitteesRow) {
      continue
    }

    if (usedStudentsCommitteesRows.has(studentsCommitteesRow)) {
      throwMappingError('STUDENT_MATCH_AMBIGUOUS', studentsCapRow, {
        context: {
          matchingKey: key,
          reason: 'students_committees_row_reused'
        }
      })
    }
    usedStudentsCommitteesRows.add(studentsCommitteesRow)

    const capFirstName = readRequiredValue(studentsCapRow, 'Jméno')
    const committeesFirstName = readRequiredValue(studentsCommitteesRow, 'Jméno studenta')
    assertStudentFieldEquality(
      preprocessCommitteeName(readRequiredValue(studentsCommitteesRow, 'Komise - název')),
      {
        source: studentsCapRow,
        column: 'Jméno',
        value: capFirstName
      },
      {
        source: studentsCommitteesRow,
        column: 'Jméno studenta',
        value: committeesFirstName
      }
    )

    const capLastName = readRequiredValue(studentsCapRow, 'Příjmení')
    const committeesLastName = readRequiredValue(studentsCommitteesRow, 'Příjmení studenta')
    assertStudentFieldEquality(
      preprocessCommitteeName(readRequiredValue(studentsCommitteesRow, 'Komise - název')),
      {
        source: studentsCapRow,
        column: 'Příjmení',
        value: capLastName
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

    const studyProgramType = resolveStudyLevelFromStudentsCap([studentsCapRow.row])
    if (!studyProgramType) {
      throwMappingError('INVALID_STUDY_PROGRAM_TYPE', studentsCapRow, {
        column: 'Studijní plán (název)',
        context: {
          rawValue: studentsCapRow.row['Studijní plán (název)'] ?? ''
        }
      })
    }

    if (szzType !== 'MIXED' && studyProgramType !== szzType) {
      throwMappingError('COMMITTEE_SZZ_TYPE_MISMATCH', studentsCapRow, {
        column: 'Studijní plán (název)',
        context: {
          detectedType: studyProgramType,
          selectedType: szzType
        }
      })
    }

    const capThesisTitleLocal = readRequiredValue(studentsCapRow, 'VŠKP-typ A: Název práce')
    const committeesThesisTitleLocal = readRequiredValue(studentsCommitteesRow, 'VŠKP-typ A: Český název práce')
    assertStudentFieldEquality(
      committeeName,
      {
        source: studentsCapRow,
        column: 'VŠKP-typ A: Název práce',
        value: capThesisTitleLocal
      },
      {
        source: studentsCommitteesRow,
        column: 'VŠKP-typ A: Český název práce',
        value: committeesThesisTitleLocal
      }
    )

    const capThesisTitleEn = readRequiredValue(studentsCapRow, 'VŠKP-typ A: Překlad názvu práce')
    const committeesThesisTitleEn = readRequiredValue(studentsCommitteesRow, 'VŠKP-typ A: Anglický název práce')
    assertStudentFieldEquality(
      committeeName,
      {
        source: studentsCapRow,
        column: 'VŠKP-typ A: Překlad názvu práce',
        value: capThesisTitleEn
      },
      {
        source: studentsCommitteesRow,
        column: 'VŠKP-typ A: Anglický název práce',
        value: committeesThesisTitleEn
      }
    )

    const capThesisLanguageRaw = readRequiredValue(studentsCapRow, 'VŠKP-typ A: jazyk práce')
    const committeesThesisLanguageRaw = readRequiredValue(studentsCommitteesRow, 'VŠKP-typ A: Jazyk práce')
    const capThesisLanguage = parseThesisLanguage(capThesisLanguageRaw)
    if (!capThesisLanguage) {
      throwMappingError('INVALID_LANGUAGE', studentsCapRow, {
        column: 'VŠKP-typ A: jazyk práce',
        context: {
          languageTarget: 'thesis',
          rawValue: capThesisLanguageRaw
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

    if (capThesisLanguage !== committeesThesisLanguage) {
      throwMappingError('STUDENT_VALUE_MISMATCH', studentsCommitteesRow, {
        column: 'VŠKP-typ A: Jazyk práce',
        context: {
          committeeName,
          leftColumn: 'VŠKP-typ A: jazyk práce',
          rightColumn: 'VŠKP-typ A: Jazyk práce',
          leftValue: capThesisLanguage,
          rightValue: committeesThesisLanguage
        }
      })
    }

    const capSupervisorName = readRequiredValue(studentsCapRow, 'VŠKP-typ A: Vedoucí práce 1')
    const committeesSupervisorName = readRequiredValue(studentsCommitteesRow, 'VŠKP-typ A: Vedoucí práce 1')
    assertStudentFieldEquality(
      committeeName,
      {
        source: studentsCapRow,
        column: 'VŠKP-typ A: Vedoucí práce 1',
        value: capSupervisorName
      },
      {
        source: studentsCommitteesRow,
        column: 'VŠKP-typ A: Vedoucí práce 1',
        value: committeesSupervisorName
      }
    )

    const capAdditionalSupervisorName = readOptionalValue(studentsCapRow, 'VŠKP-typ A: Vedoucí práce 2')
    const committeesAdditionalSupervisorName = readOptionalValue(studentsCommitteesRow, 'VŠKP-typ A: Vedoucí práce 2')
    assertOptionalStudentFieldEquality(
      committeeName,
      {
        source: studentsCapRow,
        column: 'VŠKP-typ A: Vedoucí práce 2',
        value: capAdditionalSupervisorName
      },
      {
        source: studentsCommitteesRow,
        column: 'VŠKP-typ A: Vedoucí práce 2',
        value: committeesAdditionalSupervisorName
      }
    )

    const capReviewerName = readRequiredValue(studentsCapRow, 'VŠKP-typ A: Oponent práce 1')
    const committeesReviewerName = readRequiredValue(studentsCommitteesRow, 'VŠKP-typ A: Oponent práce 1')
    assertStudentFieldEquality(
      committeeName,
      {
        source: studentsCapRow,
        column: 'VŠKP-typ A: Oponent práce 1',
        value: capReviewerName
      },
      {
        source: studentsCommitteesRow,
        column: 'VŠKP-typ A: Oponent práce 1',
        value: committeesReviewerName
      }
    )

    const capAdditionalReviewerName = readOptionalValue(studentsCapRow, 'VŠKP-typ A: Oponent práce 2')
    const committeesAdditionalReviewerName = readOptionalValue(studentsCommitteesRow, 'VŠKP-typ A: Oponent práce 2')
    assertOptionalStudentFieldEquality(
      committeeName,
      {
        source: studentsCapRow,
        column: 'VŠKP-typ A: Oponent práce 2',
        value: capAdditionalReviewerName
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

    const thesisSubmissionAtRaw = studentsCapRow.row['VŠKP-typ A: Termín odevzdání práce'] ?? ''
    const thesisSubmissionAt = parseOptionalDateTimeToIso(thesisSubmissionAtRaw)
    if (normalizeWhitespace(thesisSubmissionAtRaw).length > 0 && !thesisSubmissionAt) {
      throwMappingError('INVALID_THESIS_SUBMISSION_DATE', studentsCapRow, {
        column: 'VŠKP-typ A: Termín odevzdání práce',
        context: {
          rawValue: thesisSubmissionAtRaw
        }
      })
    }

    const mappedStudent: PostStudentItemDto = {
      personalNumber: readOptionalValue(studentsCommitteesRow, 'Osobní číslo'),
      firstName: capFirstName,
      lastName: capLastName,
      titlesBefore: readOptionalValue(studentsCapRow, 'Titul'),
      titlesAfter: readOptionalValue(studentsCapRow, 'titul za'),
      thesisTitleLocal: capThesisTitleLocal,
      thesisTitleEn: capThesisTitleEn,
      thesisLanguage: capThesisLanguage,
      supervisorName: capSupervisorName,
      reviewerName: capReviewerName,
      additionalSupervisorName: capAdditionalSupervisorName,
      additionalReviewerName: capAdditionalReviewerName,
      studyProgramName: readRequiredValue(studentsCapRow, 'Studijní program (název)'),
      studyProgramType,
      specializationName: readRequiredValue(studentsCapRow, 'Obor/spec - název'),
      specializationCode: normalizeSpecializationCode(readRequiredValue(studentsCapRow, 'Kód studijního plánu')),
      defenseDepartmentCode: readRequiredValue(studentsCapRow, 'Katedra studenta (kód)'),
      defenseDepartmentName: readRequiredValue(studentsCapRow, 'Katedra studenta (název)'),
      studyLanguage,
      thesisSubmissionAt: thesisSubmissionAt ?? null,
      repeatType: 'NONE',
      elsa: false,
      prepareMinutes: DEFAULT_PREPARE_MINUTES,
      examMinutes: DEFAULT_EXAM_MINUTES
    }

    if (mappedStudent.studyProgramType !== targetCommittee.studyProgramType) {
      throwMappingError('STUDENT_COMMITTEE_MISMATCH', studentsCapRow, {
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
      throwMappingError('STUDENT_COMMITTEE_MISMATCH', studentsCapRow, {
        column: 'Studijní program (název)',
        context: {
          committeeName,
          field: 'studyProgramName',
          studentValue: mappedStudent.studyProgramName,
          committeeValue: targetCommittee.studyProgramName
        }
      })
    }

    const normalizedStudentSpecializationCode = normalizeSpecializationCodeForComparison(
      mappedStudent.specializationCode
    )
    const normalizedCommitteeSpecializationCode = normalizeSpecializationCodeForComparison(
      targetCommittee.specializationCode
    )

    if (!normalizedStudentSpecializationCode.startsWith(normalizedCommitteeSpecializationCode)) {
      throwMappingError('STUDENT_COMMITTEE_MISMATCH', studentsCapRow, {
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

    const existingStudents = bufferedStudentItems.get(committeeName) ?? []
    existingStudents.push({
      rowNumber: studentsCommitteesRow.rowNumber,
      student: mappedStudent
    })
    bufferedStudentItems.set(committeeName, existingStudents)
  }

  for (const studentsCommitteesRow of studentsCommitteesRows) {
    if (usedStudentsCommitteesRows.has(studentsCommitteesRow)) {
      continue
    }

    throwMappingError('STUDENT_MATCH_NOT_FOUND', studentsCommitteesRow, {
      context: {
        reason: 'students_committees_row_without_matching_students_cap'
      }
    })
  }

  for (const [committeeName, committee] of committeesByName.entries()) {
    const sortedCommitteeStudents = (bufferedStudentItems.get(committeeName) ?? [])
      .slice()
      .sort((left, right) => left.rowNumber - right.rowNumber)

    const items: PostCommitteeItemDto[] = sortedCommitteeStudents.map((entry, index) => ({
      type: 'STUDENT',
      position: index + 1,
      student: entry.student,
      pause: null
    }))

    committee.items = items
  }
}

function normalizeScheduleName(value: string): string {
  return normalizeWhitespace(value)
}

export function mapImportPayloadToDraftSource(input: MapImportPayloadToDraftInput): MapImportPayloadToDraftResult {
  try {
    const scheduleName = normalizeScheduleName(input.scheduleName)
    const studentsDatasets = collectStudentDatasets(input.payload, input.szzType)
    const committeesMappingResult = mapCommittees(
      input.szzType,
      input.payload.committees,
      studentsDatasets.studentsCommitteesRows
    )

    appendStudentsToCommittees(
      input.szzType,
      committeesMappingResult.committeesByName,
      studentsDatasets.studentsCapRows,
      studentsDatasets.studentsCommitteesRows
    )

    const draft: DraftScheduleSource = {
      name: scheduleName,
      type: 'MANUAL',
      committees: committeesMappingResult.committees
    }

    return {
      ok: true,
      draft
    }
  } catch (error: unknown) {
    if (error instanceof ImportMappingFailure) {
      return {
        ok: false,
        error: error.mappingError
      }
    }

    throw error
  }
}
