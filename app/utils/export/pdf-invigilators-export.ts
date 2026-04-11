import type { RepeatTypeDto } from '#shared/types/time-schedules'
import type {
  PdfInvigilatorsSectionDto,
  PdfInvigilatorsStudentRowDto,
  PostPdfInvigilatorsExportRequestDto
} from '#shared/types/export/pdf-invigilators'
import type { ScheduleDraftCommittee } from '~/types/schedule-draft'
import {
  buildCommitteeTimelineEntries,
  formatEditorMinuteLabel,
  type CommitteeTimelineEntry
} from '~/utils/editor/committee-timeline'
import { compareCommitteesByTimeline, resolveCommitteeLabel } from '~/utils/editor/draft-committee'

interface BuildPdfInvigilatorsSectionsInput {
  committees: ScheduleDraftCommittee[]
  fallbackCommitteeLabel: string
  repeatTypeLabelResolver: (repeatType: RepeatTypeDto) => string
}

interface BuildPdfInvigilatorsExportPayloadInput extends BuildPdfInvigilatorsSectionsInput {
  draftName: string
}

interface PdfInvigilatorsStudentRowAccumulator extends PdfInvigilatorsStudentRowDto {
  prepareStartMinute: number
  examStartMinute: number
  committeeSortIndex: number
  committeeStudentOrder: number
}

interface PdfInvigilatorsSectionAccumulator {
  dayKey: string
  dayLabel: string
  roomLabel: string
  invigilators: string[]
  students: PdfInvigilatorsStudentRowAccumulator[]
}

const CZECH_TIME_ZONE = 'Europe/Prague'
const FALLBACK_EMPTY_VALUE = '—'
const FILE_NAME_UNSAFE_CHARACTERS_REGEX = /[<>:"/\\|?*]/g
const FILE_NAME_TRAILING_DOTS_REGEX = /\.+$/u

const czechWeekdayFormatter = new Intl.DateTimeFormat('cs-CZ', {
  timeZone: CZECH_TIME_ZONE,
  weekday: 'long'
})

const czechNumericDateFormatter = new Intl.DateTimeFormat('cs-CZ', {
  timeZone: CZECH_TIME_ZONE,
  day: 'numeric',
  month: 'numeric',
  year: 'numeric'
})

const czechDayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CZECH_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
})

function normalizeText(value: string | null | undefined): string {
  return value?.trim() ?? ''
}

function normalizeTextOrFallback(value: string | null | undefined, fallback = FALLBACK_EMPTY_VALUE): string {
  const normalized = normalizeText(value)
  return normalized.length > 0 ? normalized : fallback
}

function tryParseDate(value: string): Date | null {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function resolveDayMeta(dateIsoValue: string): { dayKey: string; dayLabel: string } {
  const parsedDate = tryParseDate(dateIsoValue)
  if (!parsedDate) {
    const fallbackDayLabel = normalizeTextOrFallback(dateIsoValue)
    return {
      dayKey: `invalid-${fallbackDayLabel}`,
      dayLabel: fallbackDayLabel
    }
  }

  const dayKey = czechDayKeyFormatter.format(parsedDate)
  const weekdayLabel = czechWeekdayFormatter.format(parsedDate).toLocaleUpperCase('cs-CZ')
  const numericDateLabel = czechNumericDateFormatter.format(parsedDate)

  return {
    dayKey,
    dayLabel: `${weekdayLabel} ${numericDateLabel}`
  }
}

function resolveStudentFullName(input: {
  firstName: string
  lastName: string
  titlesBefore: string | null
  titlesAfter: string | null
}): string {
  const titlesBefore = normalizeText(input.titlesBefore)
  const firstName = normalizeText(input.firstName)
  const lastName = normalizeText(input.lastName)
  const titlesAfter = normalizeText(input.titlesAfter)
  const baseName = [firstName, lastName].filter((part) => part.length > 0).join(' ')
  const fullNamePrefix = [titlesBefore, baseName].filter((part) => part.length > 0).join(' ')

  if (titlesAfter.length > 0 && fullNamePrefix.length > 0) {
    return `${fullNamePrefix}, ${titlesAfter}`
  }

  if (fullNamePrefix.length > 0) {
    return fullNamePrefix
  }

  return titlesAfter.length > 0 ? titlesAfter : FALLBACK_EMPTY_VALUE
}

function resolveThesisTitleByWrittenLanguage(input: {
  thesisLanguage: 'CZECH' | 'ENGLISH' | 'SLOVAK'
  thesisTitleLocal: string
  thesisTitleEn: string
}): string {
  const localTitle = normalizeText(input.thesisTitleLocal)
  const englishTitle = normalizeText(input.thesisTitleEn)

  if (input.thesisLanguage === 'ENGLISH') {
    return englishTitle || localTitle || FALLBACK_EMPTY_VALUE
  }

  return localTitle || englishTitle || FALLBACK_EMPTY_VALUE
}

function resolveCommitteeRoomLabel(committee: ScheduleDraftCommittee): string {
  return normalizeTextOrFallback(committee.room)
}

function collectUniqueInvigilatorNames(committees: ScheduleDraftCommittee[]): string[] {
  const names: string[] = []
  const seenNamesLowerCase = new Set<string>()

  for (const committee of committees) {
    for (const invigilator of committee.invigilators) {
      const normalizedName = normalizeText(invigilator.name)
      if (normalizedName.length < 1) {
        continue
      }

      const deduplicationKey = normalizedName.toLocaleLowerCase('cs-CZ')
      if (seenNamesLowerCase.has(deduplicationKey)) {
        continue
      }

      seenNamesLowerCase.add(deduplicationKey)
      names.push(normalizedName)
    }
  }

  return names
}

function buildStudentAccumulator(
  timelineEntry: Extract<CommitteeTimelineEntry, { kind: 'STUDENT' }>,
  committeeSortIndex: number,
  committeeStudentOrder: number,
  committee: ScheduleDraftCommittee,
  fallbackCommitteeLabel: string,
  repeatTypeLabelResolver: (repeatType: RepeatTypeDto) => string
): PdfInvigilatorsStudentRowAccumulator {
  const student = timelineEntry.item.student
  const prepareStartMinute = timelineEntry.startMinute - student.prepareMinutes
  const examStartMinute = timelineEntry.startMinute
  const committeeLabel = resolveCommitteeLabel(committee, fallbackCommitteeLabel)
  const roomLabel = resolveCommitteeRoomLabel(committee)

  return {
    prepareStartTime: formatEditorMinuteLabel(prepareStartMinute),
    committeeExamRangeTime: `${formatEditorMinuteLabel(timelineEntry.startMinute)} - ${formatEditorMinuteLabel(
      timelineEntry.endMinute
    )}`,
    studentName: resolveStudentFullName({
      firstName: student.firstName,
      lastName: student.lastName,
      titlesBefore: student.titlesBefore,
      titlesAfter: student.titlesAfter
    }),
    repeatLabel: normalizeTextOrFallback(repeatTypeLabelResolver(student.repeatType)),
    thesisTitle: resolveThesisTitleByWrittenLanguage({
      thesisLanguage: student.thesisLanguage,
      thesisTitleLocal: student.thesisTitleLocal,
      thesisTitleEn: student.thesisTitleEn
    }),
    committeeLabel,
    roomLabel,
    prepareStartMinute,
    examStartMinute,
    committeeSortIndex,
    committeeStudentOrder
  }
}

function sortStudentsByPrepareStart(
  left: PdfInvigilatorsStudentRowAccumulator,
  right: PdfInvigilatorsStudentRowAccumulator
): number {
  const prepareStartDiff = left.prepareStartMinute - right.prepareStartMinute
  if (prepareStartDiff !== 0) {
    return prepareStartDiff
  }

  const examStartDiff = left.examStartMinute - right.examStartMinute
  if (examStartDiff !== 0) {
    return examStartDiff
  }

  const committeeDiff = left.committeeSortIndex - right.committeeSortIndex
  if (committeeDiff !== 0) {
    return committeeDiff
  }

  return left.committeeStudentOrder - right.committeeStudentOrder
}

function toStudentRowDto(row: PdfInvigilatorsStudentRowAccumulator): PdfInvigilatorsStudentRowDto {
  const {
    prepareStartMinute: _prepareStartMinute,
    examStartMinute: _examStartMinute,
    committeeSortIndex: _sortIndex,
    committeeStudentOrder: _committeeStudentOrder,
    ...dto
  } = row
  return dto
}

export function buildPdfInvigilatorsSections(input: BuildPdfInvigilatorsSectionsInput): PdfInvigilatorsSectionDto[] {
  const sortedCommittees = input.committees.slice().sort(compareCommitteesByTimeline)
  const groups = new Map<string, PdfInvigilatorsSectionAccumulator>()

  for (const [committeeSortIndex, committee] of sortedCommittees.entries()) {
    const roomLabel = resolveCommitteeRoomLabel(committee)
    const dayMeta = resolveDayMeta(committee.date)
    const groupKey = `${dayMeta.dayKey}__${roomLabel}`
    const existingGroup = groups.get(groupKey)

    const group: PdfInvigilatorsSectionAccumulator = existingGroup ?? {
      dayKey: dayMeta.dayKey,
      dayLabel: dayMeta.dayLabel,
      roomLabel,
      invigilators: [],
      students: []
    }

    if (!existingGroup) {
      groups.set(groupKey, group)
    }

    const groupInvigilators = collectUniqueInvigilatorNames([committee])
    if (groupInvigilators.length > 0) {
      const existingInvigilatorsSet = new Set(group.invigilators.map((value) => value.toLocaleLowerCase('cs-CZ')))
      for (const invigilatorName of groupInvigilators) {
        const key = invigilatorName.toLocaleLowerCase('cs-CZ')
        if (existingInvigilatorsSet.has(key)) {
          continue
        }

        existingInvigilatorsSet.add(key)
        group.invigilators.push(invigilatorName)
      }
    }

    let committeeStudentOrder = 0
    for (const timelineEntry of buildCommitteeTimelineEntries(committee)) {
      if (timelineEntry.kind !== 'STUDENT') {
        continue
      }

      committeeStudentOrder += 1
      group.students.push(
        buildStudentAccumulator(
          timelineEntry,
          committeeSortIndex,
          committeeStudentOrder,
          committee,
          input.fallbackCommitteeLabel,
          input.repeatTypeLabelResolver
        )
      )
    }
  }

  return Array.from(groups.values()).map((group) => {
    const students = group.students
      .slice()
      .sort(sortStudentsByPrepareStart)
      .map((row) => toStudentRowDto(row))

    return {
      dayKey: group.dayKey,
      dayLabel: group.dayLabel,
      roomLabel: group.roomLabel,
      invigilatorsLabel: group.invigilators.join(', ') || FALLBACK_EMPTY_VALUE,
      students
    }
  })
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

export function buildPdfInvigilatorsFileName(draftName: string, now: Date = new Date()): string {
  const normalizedDraftName = sanitizeFileNamePart(draftName, 'Export')
  const timestamp = buildCzechTimestampForFileName(now)
  return `Dozor_${normalizedDraftName}_${timestamp}.pdf`
}

export function buildPdfInvigilatorsExportPayload(
  input: BuildPdfInvigilatorsExportPayloadInput
): PostPdfInvigilatorsExportRequestDto {
  return {
    draftName: input.draftName,
    sections: buildPdfInvigilatorsSections({
      committees: input.committees,
      fallbackCommitteeLabel: input.fallbackCommitteeLabel,
      repeatTypeLabelResolver: input.repeatTypeLabelResolver
    })
  }
}

export function downloadPdfFile(content: ArrayBuffer, fileName: string): void {
  const blob = new Blob([content], { type: 'application/pdf' })
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
