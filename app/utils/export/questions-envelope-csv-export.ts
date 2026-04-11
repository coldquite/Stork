import Papa from 'papaparse'
import {
  resolveEditorSpecializationOptionForDepartment,
  type EditorSpecializationOption
} from '#shared/constants/editor'
import type { StudyProgramTypeDto } from '#shared/types/time-schedules'
import { IMPORT_CSV_OPTIONS } from '~/constants/import'
import type { ScheduleDraftCommittee } from '~/types/schedule-draft'
import {
  formatCommitteeDate,
  isStudentItem,
  normalizeRequiredText,
  resolveCommitteeLabel
} from '~/utils/editor/draft-committee'
import type { QuestionsEnvelopeCsvEnumLabelResolver } from '~/utils/export/questions-envelope-csv-enums'

const QUESTIONS_ENVELOPE_CSV_COLUMNS = [
  'Příjmení',
  'Jméno',
  'Titul',
  'Titul za',
  'Email',
  'Typ studijního plánu',
  'Název studijního plánu',
  'Název specializace',
  'Kód studijního plánu',
  'Katedra studenta (název)',
  'Katedra studenta (kód)',
  'Jazyk práce',
  'Název práce',
  'Překlad názvu práce',
  'Vedoucí práce 1',
  'Vedoucí práce 2',
  'Oponent práce 1',
  'Oponent práce 2',
  'Opakování',
  'Komise',
  'Datum konání komise',
  'Pořadí'
] as const

type QuestionsEnvelopeCsvColumn = (typeof QUESTIONS_ENVELOPE_CSV_COLUMNS)[number]
type QuestionsEnvelopeCsvRow = Record<QuestionsEnvelopeCsvColumn, string>

interface BuildQuestionsEnvelopeCsvRowsInput {
  committees: ScheduleDraftCommittee[]
  fallbackCommitteeLabel: string
  enumLabelResolver: QuestionsEnvelopeCsvEnumLabelResolver
}

interface ExportQuestionsEnvelopeCsvInput extends BuildQuestionsEnvelopeCsvRowsInput {
  draftName: string
  now?: Date
}

export interface QuestionsEnvelopeCsvDepartmentMappingIssue {
  studentFullName: string
  committeeLabel: string
  studentEmail?: string
  committeeDate?: string
  committeeStudentOrder?: number
  specializationCode: string
  studyProgramName: string
  studyProgramType: StudyProgramTypeDto
}

export class QuestionsEnvelopeCsvDepartmentMappingError extends Error {
  readonly issues: QuestionsEnvelopeCsvDepartmentMappingIssue[]

  constructor(issues: QuestionsEnvelopeCsvDepartmentMappingIssue[]) {
    super('QUESTIONS_ENVELOPE_CSV_DEPARTMENT_MAPPING_FAILED')
    this.name = 'QuestionsEnvelopeCsvDepartmentMappingError'
    this.issues = issues
  }
}

const CZECH_TIME_ZONE = 'Europe/Prague'
const FILE_NAME_UNSAFE_CHARACTERS_REGEX = /[<>:"/\\|?*]/g
const FILE_NAME_TRAILING_DOTS_REGEX = /\.+$/u

function normalizeCsvCell(value: string | null | undefined): string {
  return value?.trim() ?? ''
}

function resolveStudentDepartmentFromSpecialization(
  studyProgramType: ScheduleDraftCommittee['studyProgramType'],
  studyProgramName: string,
  specializationCode: string
): EditorSpecializationOption | null {
  return resolveEditorSpecializationOptionForDepartment(studyProgramType, studyProgramName, specializationCode)
}

function resolveStudentFullName(lastName: string, firstName: string): string {
  const normalizedLastName = normalizeRequiredText(lastName)
  const normalizedFirstName = normalizeRequiredText(firstName)
  const fullName = [normalizedLastName, normalizedFirstName].filter((value) => value.length > 0).join(' ')
  return fullName.length > 0 ? fullName : 'Neznámý student'
}

function resolveFormatPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? '00'
}

function buildCzechTimestampForFileName(now: Date): string {
  const formatter = new Intl.DateTimeFormat('cs-CZ', {
    timeZone: CZECH_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  const parts = formatter.formatToParts(now)
  const day = resolveFormatPart(parts, 'day')
  const month = resolveFormatPart(parts, 'month')
  const year = resolveFormatPart(parts, 'year')
  const hour = resolveFormatPart(parts, 'hour')
  const minute = resolveFormatPart(parts, 'minute')
  const second = resolveFormatPart(parts, 'second')

  return `${day}.${month}.${year}_${hour}-${minute}-${second}`
}

function sanitizeFileNamePart(value: string, fallbackValue: string): string {
  const normalizedValue = value.trim().replace(/\s+/g, ' ')
  const sanitizedValue = normalizedValue
    .replace(FILE_NAME_UNSAFE_CHARACTERS_REGEX, '-')
    .replace(FILE_NAME_TRAILING_DOTS_REGEX, '')

  return sanitizedValue.length > 0 ? sanitizedValue : fallbackValue
}

export function buildQuestionsEnvelopeCsvRows(input: BuildQuestionsEnvelopeCsvRowsInput): QuestionsEnvelopeCsvRow[] {
  const rows: QuestionsEnvelopeCsvRow[] = []
  const departmentMappingIssues: QuestionsEnvelopeCsvDepartmentMappingIssue[] = []

  for (const committee of input.committees) {
    const committeeLabel = resolveCommitteeLabel(committee, input.fallbackCommitteeLabel)
    const committeeDate = formatCommitteeDate(committee.date)
    const orderedItems = committee.items.slice().sort((left, right) => left.position - right.position)
    let studentOrder = 0

    for (const item of orderedItems) {
      if (!isStudentItem(item)) {
        continue
      }

      studentOrder += 1
      const department = resolveStudentDepartmentFromSpecialization(
        item.student.studyProgramType,
        item.student.studyProgramName,
        item.student.specializationCode
      )
      if (!department) {
        departmentMappingIssues.push({
          studentFullName: resolveStudentFullName(item.student.lastName, item.student.firstName),
          committeeLabel,
          studentEmail: normalizeCsvCell(item.student.email),
          committeeDate,
          committeeStudentOrder: studentOrder,
          specializationCode: normalizeCsvCell(item.student.specializationCode),
          studyProgramName: normalizeCsvCell(item.student.studyProgramName),
          studyProgramType: item.student.studyProgramType
        })
        continue
      }

      rows.push({
        Příjmení: normalizeCsvCell(item.student.lastName),
        Jméno: normalizeCsvCell(item.student.firstName),
        Titul: normalizeCsvCell(item.student.titlesBefore),
        'Titul za': normalizeCsvCell(item.student.titlesAfter),
        Email: normalizeCsvCell(item.student.email),
        'Typ studijního plánu': input.enumLabelResolver.resolveStudyProgramTypeLabel(item.student.studyProgramType),
        'Název studijního plánu': normalizeCsvCell(item.student.studyProgramName),
        'Název specializace': normalizeCsvCell(item.student.specializationName),
        'Kód studijního plánu': normalizeCsvCell(item.student.specializationCode),
        'Katedra studenta (název)': normalizeCsvCell(department.departmentNameCs),
        'Katedra studenta (kód)': normalizeCsvCell(department.departmentCode),
        'Jazyk práce': input.enumLabelResolver.resolveThesisLanguageLabel(item.student.thesisLanguage),
        'Název práce': normalizeCsvCell(item.student.thesisTitleLocal),
        'Překlad názvu práce': normalizeCsvCell(item.student.thesisTitleEn),
        'Vedoucí práce 1': normalizeCsvCell(item.student.supervisorName),
        'Vedoucí práce 2': normalizeCsvCell(item.student.additionalSupervisorName),
        'Oponent práce 1': normalizeCsvCell(item.student.reviewerName),
        'Oponent práce 2': normalizeCsvCell(item.student.additionalReviewerName),
        Opakování: input.enumLabelResolver.resolveRepeatTypeLabel(item.student.repeatType),
        Komise: committeeLabel,
        'Datum konání komise': committeeDate,
        Pořadí: String(studentOrder)
      })
    }
  }

  if (departmentMappingIssues.length > 0) {
    throw new QuestionsEnvelopeCsvDepartmentMappingError(departmentMappingIssues)
  }

  return rows
}

export function serializeQuestionsEnvelopeCsv(rows: QuestionsEnvelopeCsvRow[]): string {
  if (rows.length === 0) {
    return [...QUESTIONS_ENVELOPE_CSV_COLUMNS].join(IMPORT_CSV_OPTIONS.delimiter)
  }

  return Papa.unparse(rows, {
    header: true,
    delimiter: IMPORT_CSV_OPTIONS.delimiter,
    quoteChar: IMPORT_CSV_OPTIONS.quoteChar,
    newline: '\r\n',
    columns: [...QUESTIONS_ENVELOPE_CSV_COLUMNS]
  })
}

export function addUtf8Bom(content: string): string {
  return `\uFEFF${content}`
}

export function buildQuestionsEnvelopeCsvFileName(draftName: string, now: Date = new Date()): string {
  const normalizedDraftName = sanitizeFileNamePart(draftName, 'Export')
  const timestamp = buildCzechTimestampForFileName(now)
  return `${normalizedDraftName}_${timestamp}.csv`
}

export function downloadQuestionsEnvelopeCsvFile(content: string, fileName: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const objectUrl = window.URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  link.style.display = 'none'
  window.document.body.appendChild(link)
  link.click()
  window.document.body.removeChild(link)
  window.URL.revokeObjectURL(objectUrl)
}

export function exportQuestionsEnvelopeCsv(input: ExportQuestionsEnvelopeCsvInput): void {
  const rows = buildQuestionsEnvelopeCsvRows({
    committees: input.committees,
    fallbackCommitteeLabel: input.fallbackCommitteeLabel,
    enumLabelResolver: input.enumLabelResolver
  })
  const csv = serializeQuestionsEnvelopeCsv(rows)
  const contentWithBom = addUtf8Bom(csv)
  const fileName = buildQuestionsEnvelopeCsvFileName(input.draftName, input.now)
  downloadQuestionsEnvelopeCsvFile(contentWithBom, fileName)
}
