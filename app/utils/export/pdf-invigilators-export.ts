import type { RepeatTypeDto } from '#shared/types/time-schedules'
import type {
  PdfInvigilatorsSectionDto,
  PdfInvigilatorsStudentRowDto,
  PostPdfInvigilatorsExportRequestDto
} from '#shared/types/export/pdf-invigilators'
import { PDF_INVIGILATORS_EXPORT_DICTIONARY } from '#shared/i18n/pdf-invigilators-export'
import type { ScheduleDraftCommittee } from '~/types/schedule-draft'
import {
  buildCommitteeTimelineEntries,
  formatEditorMinuteLabel,
  type CommitteeTimelineEntry
} from '~/utils/editor/committee-timeline'
import { compareCommitteesByTimeline, resolveCommitteeLabel } from '~/utils/editor/draft-committee'
import { downloadBlobFile } from '~/utils/export/file-download'
import { CZECH_TIME_ZONE } from '~/utils/export/file-name'
import {
  buildPdfExportFileName,
  collectUniquePdfExportValues,
  normalizePdfExportTextOrFallback,
  PDF_EXPORT_EMPTY_VALUE,
  resolvePdfStudentFullName,
  tryParsePdfExportDate
} from '~/utils/export/pdf-export-shared'

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

function resolveDayMeta(dateIsoValue: string): { dayKey: string; dayLabel: string } {
  const parsedDate = tryParsePdfExportDate(dateIsoValue)
  if (!parsedDate) {
    const fallbackDayLabel = normalizePdfExportTextOrFallback(dateIsoValue)
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

function resolveCommitteeRoomLabel(committee: ScheduleDraftCommittee): string {
  return normalizePdfExportTextOrFallback(committee.room)
}

function resolvePreparationRoomLabel(committee: ScheduleDraftCommittee): string {
  return normalizePdfExportTextOrFallback(committee.preparationRoom)
}

function collectUniqueInvigilatorNames(committees: ScheduleDraftCommittee[]): string[] {
  return collectUniquePdfExportValues(
    committees.flatMap((committee) => committee.invigilators.map((invigilator) => invigilator.name))
  )
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
  const secretaryLabel = normalizePdfExportTextOrFallback(committee.secretaryName)

  return {
    prepareStartTime: formatEditorMinuteLabel(prepareStartMinute),
    committeeExamRangeTime: `${formatEditorMinuteLabel(timelineEntry.startMinute)}–${formatEditorMinuteLabel(
      timelineEntry.endMinute
    )}`,
    studentName: resolvePdfStudentFullName({
      firstName: student.firstName,
      lastName: student.lastName,
      titlesBefore: student.titlesBefore,
      titlesAfter: student.titlesAfter
    }),
    repeatLabel: normalizePdfExportTextOrFallback(repeatTypeLabelResolver(student.repeatType)),
    committeeLabel,
    roomLabel,
    secretaryLabel,
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
    const preparationRoomLabel = resolvePreparationRoomLabel(committee)
    const dayMeta = resolveDayMeta(committee.date)
    const groupKey = `${dayMeta.dayKey}__${preparationRoomLabel}`
    const existingGroup = groups.get(groupKey)

    const group: PdfInvigilatorsSectionAccumulator = existingGroup ?? {
      dayKey: dayMeta.dayKey,
      dayLabel: dayMeta.dayLabel,
      roomLabel: preparationRoomLabel,
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

      // Students with no preparation time do not attend the preparation room,
      // so they are excluded from the invigilators schedule.
      if (timelineEntry.item.student.prepareMinutes <= 0) {
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

  return Array.from(groups.values())
    .filter((group) => group.students.length > 0)
    .map((group) => {
      const students = group.students
        .slice()
        .sort(sortStudentsByPrepareStart)
        .map((row) => toStudentRowDto(row))

      return {
        dayKey: group.dayKey,
        dayLabel: group.dayLabel,
        roomLabel: group.roomLabel,
        invigilatorsLabel: group.invigilators.join(', ') || PDF_EXPORT_EMPTY_VALUE,
        students
      }
    })
}

export function buildPdfInvigilatorsFileName(draftName: string, now: Date = new Date()): string {
  return buildPdfExportFileName(PDF_INVIGILATORS_EXPORT_DICTIONARY.fileNamePrefix, draftName, now)
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
  downloadBlobFile(blob, fileName)
}
