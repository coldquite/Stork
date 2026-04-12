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
import { buildCzechTimestampForFileName, CZECH_TIME_ZONE, sanitizeFileNamePart } from '~/utils/export/file-name'

interface BuildPdfPublicSectionsInput {
  committees: ScheduleDraftCommittee[]
  fallbackCommitteeLabel: string
}

interface BuildPdfPublicExportPayloadInput extends BuildPdfPublicSectionsInput {
  draftName: string
}

type SemesterCode = 'summerJune' | 'summerAugust' | 'winterFebruary' | 'fallback'

const FALLBACK_EMPTY_VALUE = '—'
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

const datePartsFormatter = new Intl.DateTimeFormat('en-CA', {
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

function capitalizeFirstLetter(value: string, locale: 'cs-CZ' | 'en-US'): string {
  if (value.length < 1) {
    return value
  }

  return `${value[0]?.toLocaleUpperCase(locale) ?? ''}${value.slice(1)}`
}

function resolveExportLanguage(committee: ScheduleDraftCommittee): StudyLanguageDto {
  return committee.language
}

function tryParseDate(value: string): Date | null {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
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
    return 'fallback'
  }

  if (parts.month === 6 && parts.day >= 1 && parts.day <= 30) {
    return 'summerJune'
  }

  if ((parts.month === 8 && parts.day >= 15) || (parts.month === 9 && parts.day <= 5)) {
    return 'summerAugust'
  }

  if ((parts.month === 1 && parts.day >= 28) || (parts.month === 2 && parts.day <= 28)) {
    return 'winterFebruary'
  }

  return 'fallback'
}

function resolveAcademicYearForDate(date: Date): string | null {
  const parts = resolveDateParts(date)
  if (!parts) {
    return null
  }

  return `${parts.year - 1}/${parts.year}`
}

function resolveSemesterLabel(input: { language: StudyLanguageDto; firstCommitteeDate: Date | null }): string {
  const dictionary = PDF_PUBLIC_EXPORT_DICTIONARY[input.language]
  const firstCommitteeDate = input.firstCommitteeDate
  if (!firstCommitteeDate) {
    return dictionary.semesterLabelByCode.fallback
  }

  const semesterCode = resolveSemesterCodeByDate(firstCommitteeDate)
  if (semesterCode === 'fallback') {
    return dictionary.semesterLabelByCode.fallback
  }

  const academicYear = resolveAcademicYearForDate(firstCommitteeDate)
  if (!academicYear) {
    return dictionary.semesterLabelByCode.fallback
  }

  return dictionary.semesterLabelByCode[semesterCode](academicYear)
}

function resolveTopMetaDayLabel(input: { language: StudyLanguageDto; committeeDate: string }): string {
  const parsedDate = tryParseDate(input.committeeDate)
  if (!parsedDate) {
    return FALLBACK_EMPTY_VALUE
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
    return FALLBACK_EMPTY_VALUE
  }

  if (input.language === 'ENGLISH') {
    return normalizeTextOrFallback(specialization.departmentNameEn)
  }

  return normalizeTextOrFallback(specialization.departmentNameCs)
}

function resolveCommitteeMembersLines(input: {
  language: StudyLanguageDto
  committee: ScheduleDraftCommittee
}): string[] {
  const dictionary = PDF_PUBLIC_EXPORT_DICTIONARY[input.language]
  const chairName = normalizeText(input.committee.chairName)
  const viceChairName = normalizeText(input.committee.viceChairName)

  return [
    chairName.length > 0 ? `${chairName} - ${dictionary.memberRoleChair}` : FALLBACK_EMPTY_VALUE,
    viceChairName.length > 0 ? `${viceChairName} - ${dictionary.memberRoleViceChair}` : FALLBACK_EMPTY_VALUE,
    normalizeTextOrFallback(input.committee.member1Name),
    normalizeTextOrFallback(input.committee.member2Name),
    normalizeTextOrFallback(input.committee.member3Name)
  ]
}

function resolveInvigilatorsLabel(committee: ScheduleDraftCommittee): string {
  const names = committee.invigilators
    .map((invigilator) => normalizeText(invigilator.name))
    .filter((name) => name.length > 0)

  return names.length > 0 ? names.join(', ') : FALLBACK_EMPTY_VALUE
}

function resolveStudentName(input: { firstName: string; lastName: string }): string {
  const firstName = normalizeText(input.firstName)
  const lastName = normalizeText(input.lastName)
  const fullName = [lastName, firstName].filter((value) => value.length > 0).join(' ')
  return fullName.length > 0 ? fullName : FALLBACK_EMPTY_VALUE
}

function resolveThesisTitleByLanguage(input: {
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

function resolveTeacherCellLine(primaryName: string, additionalName: string | null): string {
  const primary = normalizeText(primaryName)
  const additional = normalizeText(additionalName)

  if (primary.length < 1 && additional.length < 1) {
    return FALLBACK_EMPTY_VALUE
  }

  if (primary.length > 0 && additional.length > 0) {
    return `${primary}; ${additional}`
  }

  return primary || additional
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
  const baseLabel = normalizeText(input.timelineEntry.item.pause.label) || fallbackPauseLabel
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
      committeeExamRangeTime: `${formatEditorMinuteLabel(timelineEntry.startMinute)} - ${formatEditorMinuteLabel(
        timelineEntry.endMinute
      )}`,
      studentName: resolveStudentName({
        firstName: student.firstName,
        lastName: student.lastName
      }),
      specializationLabel: normalizeTextOrFallback(student.specializationCode),
      thesisTitle: resolveThesisTitleByLanguage({
        thesisLanguage: student.thesisLanguage,
        thesisTitleLocal: student.thesisTitleLocal,
        thesisTitleEn: student.thesisTitleEn
      }),
      supervisorLabel: resolveTeacherCellLine(student.supervisorName, student.additionalSupervisorName),
      reviewerLabel: resolveTeacherCellLine(student.reviewerName, student.additionalReviewerName)
    }
  })
}

export function buildPdfPublicSections(input: BuildPdfPublicSectionsInput): PdfPublicSectionDto[] {
  const sortedCommittees = input.committees.slice().sort(compareCommitteesByTimeline)
  const firstCommitteeDate = tryParseDate(sortedCommittees[0]?.date ?? '')

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
      language,
      topMetaDayLabel: resolveTopMetaDayLabel({
        language,
        committeeDate: committee.date
      }),
      topMetaRoomLine: dictionary.topMeta.roomLine(normalizeTextOrFallback(committee.room)),
      degreeTitle: dictionary.degreeTitleByStudyProgramType[committee.studyProgramType],
      semesterLabel: resolveSemesterLabel({
        language,
        firstCommitteeDate
      }),
      studyProgramLine: dictionary.studyProgramLineByType[committee.studyProgramType](
        normalizeTextOrFallback(committee.studyProgramName)
      ),
      committeeLine: dictionary.committeeLine(committeeLabel),
      departmentLine: dictionary.departmentLine(departmentName),
      secretaryLine: dictionary.secretaryLine(normalizeTextOrFallback(committee.secretaryName)),
      invigilatorsLine: dictionary.invigilatorsLine(
        normalizeTextOrFallback(committee.preparationRoom),
        resolveInvigilatorsLabel(committee)
      ),
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
  const normalizedDraftName = sanitizeFileNamePart(draftName, 'Export')
  const timestamp = buildCzechTimestampForFileName(now)
  return `${PDF_PUBLIC_FILE_PREFIX}_${normalizedDraftName}_${timestamp}.pdf`
}
