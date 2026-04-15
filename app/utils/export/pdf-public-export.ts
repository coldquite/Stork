import { resolveEditorSpecializationOptionForDepartment } from '#shared/constants/editor'
import { PDF_PUBLIC_EXPORT_DICTIONARY } from '#shared/i18n/pdf-public-export'
import type { PostPdfPublicExportRequestDto, PdfPublicSectionDto } from '#shared/types/export/pdf-public'
import type { StudyLanguageDto } from '#shared/types/time-schedules'
import type { ScheduleDraftCommittee } from '~/types/schedule-draft'
import {
  buildCommitteeTimelineEntries,
  formatEditorMinuteLabel,
  type CommitteeTimelineEntry
} from '~/utils/editor/committee-timeline'
import { compareCommitteesByTimeline, resolveCommitteeLabel } from '~/utils/editor/draft-committee'
import { CZECH_TIME_ZONE } from '~/utils/export/file-name'
import {
  buildPdfExportFileName,
  collectUniquePdfExportValues,
  normalizePdfExportText,
  normalizePdfExportTextOrFallback,
  PDF_EXPORT_EMPTY_VALUE,
  resolvePdfStudentFullName,
  resolvePdfThesisTitleByLanguage,
  tryParsePdfExportDate
} from '~/utils/export/pdf-export-shared'

interface BuildPdfPublicSectionsInput {
  committees: ScheduleDraftCommittee[]
  fallbackCommitteeLabel: string
}

interface BuildPdfPublicExportPayloadInput extends BuildPdfPublicSectionsInput {
  draftName: string
}

type SemesterCode = 'summer' | 'winter' | '—'

const PDF_PUBLIC_FILE_PREFIX = 'Časový plán SZZ'

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

const englishWeekdayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CZECH_TIME_ZONE,
  weekday: 'long'
})

const englishLongDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CZECH_TIME_ZONE,
  day: 'numeric',
  month: 'long',
  year: 'numeric'
})

const czechMonthFormatter = new Intl.DateTimeFormat('cs-CZ', {
  timeZone: CZECH_TIME_ZONE,
  month: 'long'
})

const englishMonthFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CZECH_TIME_ZONE,
  month: 'long'
})

const datePartsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CZECH_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
})

function capitalizeFirstLetter(value: string, locale: 'cs-CZ' | 'en-US'): string {
  if (value.length < 1) {
    return value
  }

  return `${value[0]?.toLocaleUpperCase(locale) ?? ''}${value.slice(1)}`
}

function resolveExportLanguage(committee: ScheduleDraftCommittee): StudyLanguageDto {
  return committee.language
}

function resolveDateParts(date: Date): { year: number; month: number; day: number } | null {
  const parts = datePartsFormatter.formatToParts(date)
  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  const day = Number(parts.find((part) => part.type === 'day')?.value)
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null
  }

  return { year, month, day }
}

function resolveSemesterCodeByDate(date: Date): SemesterCode {
  const parts = resolveDateParts(date)
  if (!parts) {
    return '—'
  }

  const isWinterSemester =
    (parts.month === 9 && parts.day >= 20) ||
    parts.month >= 10 ||
    parts.month === 1 ||
    (parts.month === 2 && parts.day <= 15)
  if (isWinterSemester) {
    return 'winter'
  }

  return 'summer'
}

function resolveAcademicYearForDate(date: Date): string | null {
  const parts = resolveDateParts(date)
  if (!parts) {
    return null
  }

  const academicYearStart = parts.month > 9 || (parts.month === 9 && parts.day >= 20) ? parts.year : parts.year - 1
  return `${academicYearStart}/${academicYearStart + 1}`
}

function resolveMonthLabel(input: { language: StudyLanguageDto; date: Date }): string {
  if (input.language === 'ENGLISH') {
    return normalizePdfExportText(englishMonthFormatter.format(input.date))
  }

  return normalizePdfExportText(czechMonthFormatter.format(input.date))
}

function resolveSemesterLabel(input: { language: StudyLanguageDto; firstCommitteeDate: Date | null }): string {
  const dictionary = PDF_PUBLIC_EXPORT_DICTIONARY[input.language]
  const firstCommitteeDate = input.firstCommitteeDate
  if (!firstCommitteeDate) {
    return dictionary.semesterLabelByCode.fallback
  }

  const semesterCode = resolveSemesterCodeByDate(firstCommitteeDate)
  if (semesterCode === '—') {
    return dictionary.semesterLabelByCode.fallback
  }

  const academicYear = resolveAcademicYearForDate(firstCommitteeDate)
  if (!academicYear) {
    return dictionary.semesterLabelByCode.fallback
  }

  const monthLabel = resolveMonthLabel({
    language: input.language,
    date: firstCommitteeDate
  })
  if (monthLabel.length < 1) {
    return dictionary.semesterLabelByCode.fallback
  }

  return dictionary.semesterLabelByCode[semesterCode](academicYear, monthLabel)
}

function resolveTopMetaDayLabel(input: { language: StudyLanguageDto; committeeDate: string }): string {
  const parsedDate = tryParsePdfExportDate(input.committeeDate)
  if (!parsedDate) {
    return PDF_EXPORT_EMPTY_VALUE
  }

  if (input.language === 'ENGLISH') {
    const weekday = capitalizeFirstLetter(englishWeekdayFormatter.format(parsedDate), 'en-US')
    const dateLabel = englishLongDateFormatter.format(parsedDate)
    return `${weekday} ${dateLabel}`
  }

  const weekday = capitalizeFirstLetter(czechWeekdayFormatter.format(parsedDate), 'cs-CZ')
  const dateLabel = czechNumericDateFormatter.format(parsedDate)
  return `${weekday} ${dateLabel}`
}

function resolveDepartmentNameByLanguage(input: {
  language: StudyLanguageDto
  committee: ScheduleDraftCommittee
}): string {
  const specialization = resolveEditorSpecializationOptionForDepartment(
    input.committee.studyProgramType,
    input.committee.studyProgramName,
    input.committee.specializationCode
  )
  if (!specialization) {
    return PDF_EXPORT_EMPTY_VALUE
  }

  if (input.language === 'ENGLISH') {
    return normalizePdfExportTextOrFallback(specialization.departmentNameEn)
  }

  return normalizePdfExportTextOrFallback(specialization.departmentNameCs)
}

function resolveCommitteeMembersLines(input: {
  language: StudyLanguageDto
  committee: ScheduleDraftCommittee
}): string[] {
  const dictionary = PDF_PUBLIC_EXPORT_DICTIONARY[input.language]
  const chairName = normalizePdfExportText(input.committee.chairName)
  const viceChairName = normalizePdfExportText(input.committee.viceChairName)

  return [
    chairName.length > 0 ? `${chairName} – ${dictionary.memberRoleChair}` : PDF_EXPORT_EMPTY_VALUE,
    viceChairName.length > 0 ? `${viceChairName} – ${dictionary.memberRoleViceChair}` : PDF_EXPORT_EMPTY_VALUE,
    normalizePdfExportTextOrFallback(input.committee.member1Name),
    normalizePdfExportTextOrFallback(input.committee.member2Name),
    normalizePdfExportTextOrFallback(input.committee.member3Name)
  ]
}

function resolveInvigilatorsMembers(committee: ScheduleDraftCommittee): string[] {
  const members = collectUniquePdfExportValues(committee.invigilators.map((invigilator) => invigilator.name))
  return members.length > 0 ? members : [PDF_EXPORT_EMPTY_VALUE]
}

function resolvePauseLine(input: {
  language: StudyLanguageDto
  timelineEntry: Extract<CommitteeTimelineEntry, { kind: 'PAUSE' }>
}): string {
  const dictionary = PDF_PUBLIC_EXPORT_DICTIONARY[input.language]
  const fallbackPauseLabel =
    input.timelineEntry.item.pause.pauseType === 'LUNCH'
      ? dictionary.pause.defaultLunchLabel
      : dictionary.pause.defaultBreakLabel
  const baseLabel = normalizePdfExportText(input.timelineEntry.item.pause.label) || fallbackPauseLabel
  return dictionary.pause.formatLine(
    baseLabel,
    input.timelineEntry.item.pause.durationMinutes,
    dictionary.pause.durationUnit
  )
}

function buildSectionRows(input: {
  language: StudyLanguageDto
  committee: ScheduleDraftCommittee
}): PdfPublicSectionDto['rows'] {
  const dictionary = PDF_PUBLIC_EXPORT_DICTIONARY[input.language]

  return buildCommitteeTimelineEntries(input.committee).map((timelineEntry) => {
    if (timelineEntry.kind === 'PAUSE') {
      return {
        kind: 'PAUSE',
        pauseLine: resolvePauseLine({
          language: input.language,
          timelineEntry
        })
      }
    }

    const student = timelineEntry.item.student
    const preparationStartMinute = timelineEntry.startMinute - student.prepareMinutes

    return {
      kind: 'STUDENT',
      preparationStartTime: formatEditorMinuteLabel(preparationStartMinute),
      committeeExamRangeTime: `${formatEditorMinuteLabel(timelineEntry.startMinute)}–${formatEditorMinuteLabel(
        timelineEntry.endMinute
      )}`,
      studentName: resolvePdfStudentFullName({
        firstName: student.firstName,
        lastName: student.lastName,
        titlesBefore: student.titlesBefore,
        titlesAfter: student.titlesAfter
      }),
      specializationLabel: normalizePdfExportTextOrFallback(student.specializationCode),
      repeatLabel: dictionary.repeatTypeLabelByValue[student.repeatType],
      thesisTitle: resolvePdfThesisTitleByLanguage({
        thesisLanguage: student.thesisLanguage,
        thesisTitleLocal: student.thesisTitleLocal,
        thesisTitleEn: student.thesisTitleEn
      }),
      supervisorPrimaryLabel: normalizePdfExportText(student.supervisorName),
      supervisorAdditionalLabel: normalizePdfExportText(student.additionalSupervisorName),
      reviewerPrimaryLabel: normalizePdfExportText(student.reviewerName),
      reviewerAdditionalLabel: normalizePdfExportText(student.additionalReviewerName)
    }
  })
}

export function buildPdfPublicSections(input: BuildPdfPublicSectionsInput): PdfPublicSectionDto[] {
  const sortedCommittees = input.committees.slice().sort(compareCommitteesByTimeline)
  const firstCommitteeDate = tryParsePdfExportDate(sortedCommittees[0]?.date ?? '')

  return sortedCommittees.map((committee) => {
    const language = resolveExportLanguage(committee)
    const dictionary = PDF_PUBLIC_EXPORT_DICTIONARY[language]
    const committeeLabel = resolveCommitteeLabel(committee, input.fallbackCommitteeLabel)
    const departmentName = resolveDepartmentNameByLanguage({
      language,
      committee
    })

    return {
      committeeId: committee.localId,
      committeeDateIso: committee.date,
      committeeRoomValue: normalizePdfExportTextOrFallback(committee.room),
      language,
      topMetaDayLabel: resolveTopMetaDayLabel({
        language,
        committeeDate: committee.date
      }),
      topMetaRoomLine: dictionary.topMeta.roomLine(normalizePdfExportTextOrFallback(committee.room)),
      degreeTitle: dictionary.degreeTitleByStudyProgramType[committee.studyProgramType],
      semesterLabel: resolveSemesterLabel({
        language,
        firstCommitteeDate
      }),
      studyProgramLine: dictionary.studyProgramLineByType[committee.studyProgramType](
        normalizePdfExportTextOrFallback(committee.studyProgramName)
      ),
      committeeLine: dictionary.committeeLine(committeeLabel),
      departmentLine: dictionary.departmentLine(departmentName),
      secretaryLine: dictionary.secretaryLine(normalizePdfExportTextOrFallback(committee.secretaryName)),
      invigilatorsLineLabel: dictionary.invigilatorsLineLabel(
        normalizePdfExportTextOrFallback(committee.preparationRoom)
      ),
      invigilatorsMembers: resolveInvigilatorsMembers(committee),
      membersHeading: dictionary.membersHeading,
      membersLines: resolveCommitteeMembersLines({
        language,
        committee
      }),
      tablePreparationStartHeader: dictionary.table.preparationStart,
      tableCommitteeExamHeader: dictionary.table.committeeExam,
      tableStudentSpecializationHeader: dictionary.table.studentSpecialization,
      tableThesisTitleHeader: dictionary.table.thesisTitle,
      tableSupervisorReviewerHeader: dictionary.table.supervisorReviewer,
      rowsEmptyFallback: dictionary.table.emptyRowsFallback,
      rows: buildSectionRows({
        language,
        committee
      })
    }
  })
}

export function buildPdfPublicExportPayload(input: BuildPdfPublicExportPayloadInput): PostPdfPublicExportRequestDto {
  return {
    draftName: input.draftName,
    documentHeaderTitle: PDF_PUBLIC_EXPORT_DICTIONARY.CZECH.documentHeaderTitle,
    sections: buildPdfPublicSections({
      committees: input.committees,
      fallbackCommitteeLabel: input.fallbackCommitteeLabel
    })
  }
}

export function buildPdfPublicFileName(draftName: string, now: Date = new Date()): string {
  return buildPdfExportFileName(PDF_PUBLIC_FILE_PREFIX, draftName, now)
}
