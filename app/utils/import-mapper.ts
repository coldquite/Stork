import type {
  PostCommitteeDto,
  PostCommitteeItemDto,
  PostStudentItemDto,
  StudyLanguageDto,
  StudyProgramTypeDto,
  ThesisLanguageDto
} from '#shared/types/time-schedules'
import { resolveStudyLevelFromStudentsStork } from '~/utils/import'
import type { ImportCsvRow, ImportDataset, ImportPayload, ImportSzzType } from '~/types/import'
import type {
  ImportMappingError,
  ImportMappingErrorCode,
  MapImportPayloadToDraftInput,
  MapImportPayloadToDraftResult
} from '~/types/import-mapper'
import type { DraftScheduleSource } from '~/types/schedule-draft'

const COMMITTEE_START_MINUTE = 525 // 8:45

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

type DatasetLevel = 'bachelor' | 'master'
type SourceDatasetKey = 'studentsStork' | 'studentsCommittees' | 'committees'

interface SourceRow {
  datasetKey: SourceDatasetKey
  fileName: string
  rowNumber: number
  level: DatasetLevel | null
  row: ImportCsvRow
}

interface StudentsDatasetsBundle {
  studentsStorkRows: SourceRow[]
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

const COMMITTEE_CONSISTENCY_CHECK_COLUMNS: readonly string[] = [
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

/**
 * Throws a normalized mapping failure with source-aware metadata
 * ensures every error has a safe default dataset key and context object so View can properly display it
 */
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

// Normalizes specialization code to a consistent shape
// KOS exports use different formats for the same value across export types (I wonder know why)
// Example: BI-IB21 => BI-IB.21
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

// Normalizes specialization code for tolerant comparisons across combined-study tracks
//
// Example:
//   - "BIK-SI.21" -> "bi-si"
//   - "BI-SI.21" -> "bi-si"
//   - "BIE-SI.21" -> "bie-si"
function normalizeSpecializationCodeForComparison(value: string): string {
  const normalized = normalizeCompareValue(value).replace(/k-/g, '-')
  const withoutVersionSuffix = normalized.replace(/\.\d+$/u, '').replace(/\d+$/u, '')
  return withoutVersionSuffix.replace(/[.-]+$/u, '')
}

// Normalizes committee name into the canonical form used in student rows.
// KOS committee labels can look like "242-BI, 5-BI-PI.21"
//
// Example: "242-BI, 5-BI-PI.21" -> "5-BI-PI.21"
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

// Converts parsed CSV rows to source-aware rows with metadata used by validators and error reporting
function toSourceRows(dataset: ImportDataset, datasetKey: SourceDatasetKey, level: DatasetLevel | null): SourceRow[] {
  return dataset.rows.map((row, index) => ({
    datasetKey,
    fileName: dataset.fileName,
    rowNumber: index + 2, // Unlike JS arrays, CSV lines are 1-based, plus one line for the header.
    level,
    row
  }))
}

// Parses study program type from the first significant symbol
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

// Parses a date from Czech format "DD.MM.YYYY" to ISO string in UTC midnight
//
// Example: "23.06.2025" -> "2025-06-23T00:00:00.000Z"
// Invalid dates return null.
function parseDateToIso(rawValue: string): string | null {
  const normalized = normalizeWhitespace(rawValue)
  const matched = normalized.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (!matched) {
    return null
  }

  const [, dayValue, monthValue, yearValue] = matched
  const day = Number.parseInt(dayValue ?? '', 10)
  const month = Number.parseInt(monthValue ?? '', 10)
  const year = Number.parseInt(yearValue ?? '', 10)

  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null
  }

  return date.toISOString()
}

function resolveStudentRepeatType(studentsCommitteesRow: SourceRow): PostStudentItemDto['repeatType'] {
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

const STUDENT_DURATION_MINUTES_BY_STUDY_PROGRAM_AND_REPEAT: Readonly<
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
      // We use first/both slot duration to avoid underestimating total exam time.
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
      // We use first/both slot duration to avoid underestimating total exam time.
      prepareMinutes: MASTER_FIRST_OR_BOTH_PREPARE_MINUTES,
      examMinutes: MASTER_FIRST_OR_BOTH_EXAM_MINUTES
    }
  }
}

function resolveStudentDurationByStudyProgramAndRepeat(
  studyProgramType: StudyProgramTypeDto,
  repeatType: PostStudentItemDto['repeatType']
): { prepareMinutes: number; examMinutes: number } {
  return STUDENT_DURATION_MINUTES_BY_STUDY_PROGRAM_AND_REPEAT[studyProgramType][repeatType]
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

/**
 * Normalizes uploaded student datasets into one consistent shape for mapping
 *
 * The app supports two import modes:
 * - MIXED: requires bachelor + master datasets for both Students Stork and Students Committees
 * - Single-level: requires only the level selected by the user
 */
function collectStudentDatasets(payload: ImportPayload, szzType: ImportSzzType): StudentsDatasetsBundle {
  if (szzType === 'MIXED') {
    const studentsStorkBachelor = requireDataset(payload.studentsStork.bachelor, 'studentsStork', { level: 'bachelor' })
    const studentsStorkMaster = requireDataset(payload.studentsStork.master, 'studentsStork', { level: 'master' })
    const studentsCommitteesBachelor = requireDataset(payload.studentsCommittees.bachelor, 'studentsCommittees', {
      level: 'bachelor'
    })
    const studentsCommitteesMaster = requireDataset(payload.studentsCommittees.master, 'studentsCommittees', {
      level: 'master'
    })

    return {
      studentsStorkRows: [
        ...toSourceRows(studentsStorkBachelor, 'studentsStork', 'bachelor'),
        ...toSourceRows(studentsStorkMaster, 'studentsStork', 'master')
      ],
      studentsCommitteesRows: [
        ...toSourceRows(studentsCommitteesBachelor, 'studentsCommittees', 'bachelor'),
        ...toSourceRows(studentsCommitteesMaster, 'studentsCommittees', 'master')
      ]
    }
  }

  const level = resolveSingleLevelKey(szzType)
  const studentsStorkDataset = requireDataset(payload.studentsStork[level], 'studentsStork', { level })
  const studentsCommitteesDataset = requireDataset(payload.studentsCommittees[level], 'studentsCommittees', {
    level
  })

  return {
    studentsStorkRows: toSourceRows(studentsStorkDataset, 'studentsStork', level),
    studentsCommitteesRows: toSourceRows(studentsCommitteesDataset, 'studentsCommittees', level)
  }
}

/**
 * For a single committee ensures that all CSV records from a `studentsCommittees` dataset are internally consistent.
 * The first row is used as a reference. All other rows are compared against it for columns listed in `COMMITTEE_CONSISTENCY_CHECK_COLUMNS`
 */
function assertCommitteeGroupConsistency(committeeRows: SourceRow[], committeeName: string): void {
  const baseRow = committeeRows[0]
  if (!baseRow) {
    return
  }

  for (const column of COMMITTEE_CONSISTENCY_CHECK_COLUMNS) {
    const expectedRaw = baseRow.row[column] ?? ''
    const expected =
      column === 'Obor/spec - kód'
        ? normalizeSpecializationCodeForComparison(normalizeSpecializationCode(expectedRaw))
        : normalizeWhitespace(expectedRaw)

    for (const currentRow of committeeRows) {
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

function assertFieldEquality(
  committeeName: string,
  left: { source: SourceRow; column: string; value: string | null },
  right: { source: SourceRow; column: string; value: string | null },
  errorCode: Extract<
    ImportMappingErrorCode,
    'COMMITTEE_FIELD_MISMATCH' | 'STUDENT_VALUE_MISMATCH'
  > = 'STUDENT_VALUE_MISMATCH'
): void {
  const leftValue = normalizeWhitespace(left.value ?? '')
  const rightValue = normalizeWhitespace(right.value ?? '')

  if (normalizeCompareValue(leftValue) === normalizeCompareValue(rightValue)) {
    return
  }

  throwMappingError(errorCode, right.source, {
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

function buildStudentMatchKeyByStudentsStork(row: SourceRow): string {
  const email = normalizeCompareValue(readRequiredValue(row, 'Email studenta'))
  const firstName = normalizeCompareValue(readRequiredValue(row, 'Jméno'))
  const lastName = normalizeCompareValue(readRequiredValue(row, 'Příjmení'))

  return `${email}|${firstName}|${lastName}`
}

function buildStudentMatchKeyByStudentsCommittees(row: SourceRow): string {
  const email = normalizeCompareValue(readRequiredValue(row, 'Email adresa'))
  const firstName = normalizeCompareValue(readRequiredValue(row, 'Jméno studenta'))
  const lastName = normalizeCompareValue(readRequiredValue(row, 'Příjmení studenta'))

  return `${email}|${firstName}|${lastName}`
}

function appendStudentsToCommittees(
  szzType: ImportSzzType,
  committeesByName: Map<string, PostCommitteeDto>,
  studentsStorkRows: SourceRow[],
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

  for (const studentsStorkRow of studentsStorkRows) {
    const key = buildStudentMatchKeyByStudentsStork(studentsStorkRow)
    const matches = studentsRowsByKey.get(key) ?? []

    if (matches.length === 0) {
      throwMappingError('STUDENT_MATCH_NOT_FOUND', studentsStorkRow, {
        context: {
          matchingKey: key
        }
      })
    }

    if (matches.length > 1) {
      throwMappingError('STUDENT_MATCH_AMBIGUOUS', studentsStorkRow, {
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
      throwMappingError('STUDENT_MATCH_AMBIGUOUS', studentsStorkRow, {
        context: {
          matchingKey: key,
          reason: 'students_committees_row_reused'
        }
      })
    }
    usedStudentsCommitteesRows.add(studentsCommitteesRow)

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

    const normalizedStudentSpecializationCode = normalizeSpecializationCodeForComparison(
      mappedStudent.specializationCode
    )
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

export function mapImportPayloadToDraftSource(input: MapImportPayloadToDraftInput): MapImportPayloadToDraftResult {
  try {
    const scheduleName = normalizeWhitespace(input.scheduleName)
    const studentsDatasets = collectStudentDatasets(input.payload, input.szzType)
    const committeesMappingResult = mapCommittees(
      input.szzType,
      input.payload.committees,
      studentsDatasets.studentsCommitteesRows
    )

    appendStudentsToCommittees(
      input.szzType,
      committeesMappingResult.committeesByName,
      studentsDatasets.studentsStorkRows,
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
