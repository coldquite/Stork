import type { ThesisLanguageDto } from '#shared/types/time-schedules'
import { buildCzechTimestampForFileName, sanitizeFileNamePart } from '~/utils/export/file-name'

export const PDF_EXPORT_EMPTY_VALUE = '—'

export function normalizePdfExportText(value: string | null | undefined): string {
  return value?.trim() ?? ''
}

export function normalizePdfExportTextOrFallback(
  value: string | null | undefined,
  fallback = PDF_EXPORT_EMPTY_VALUE
): string {
  const normalized = normalizePdfExportText(value)
  return normalized.length > 0 ? normalized : fallback
}

export function tryParsePdfExportDate(value: string): Date | null {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function resolvePdfStudentFullName(input: {
  firstName: string
  lastName: string
  titlesBefore: string | null
  titlesAfter: string | null
  fallback?: string
}): string {
  const fallback = input.fallback ?? PDF_EXPORT_EMPTY_VALUE
  const titlesBefore = normalizePdfExportText(input.titlesBefore)
  const firstName = normalizePdfExportText(input.firstName)
  const lastName = normalizePdfExportText(input.lastName)
  const titlesAfter = normalizePdfExportText(input.titlesAfter)
  const baseName = [firstName, lastName].filter((part) => part.length > 0).join(' ')
  const fullNamePrefix = [titlesBefore, baseName].filter((part) => part.length > 0).join(' ')

  if (titlesAfter.length > 0 && fullNamePrefix.length > 0) {
    return `${fullNamePrefix}, ${titlesAfter}`
  }

  if (fullNamePrefix.length > 0) {
    return fullNamePrefix
  }

  return titlesAfter.length > 0 ? titlesAfter : fallback
}

export function resolvePdfThesisTitleByLanguage(input: {
  thesisLanguage: ThesisLanguageDto
  thesisTitleLocal: string
  thesisTitleEn: string
  fallback?: string
}): string {
  const fallback = input.fallback ?? PDF_EXPORT_EMPTY_VALUE
  const localTitle = normalizePdfExportText(input.thesisTitleLocal)
  const englishTitle = normalizePdfExportText(input.thesisTitleEn)

  if (input.thesisLanguage === 'ENGLISH') {
    return englishTitle || localTitle || fallback
  }

  return localTitle || englishTitle || fallback
}

export function collectUniquePdfExportValues(values: Iterable<string | null | undefined>, locale = 'cs-CZ'): string[] {
  const uniqueValues: string[] = []
  const seenValuesLowerCase = new Set<string>()

  for (const value of values) {
    const normalizedValue = normalizePdfExportText(value)
    if (normalizedValue.length < 1) {
      continue
    }

    const deduplicationKey = normalizedValue.toLocaleLowerCase(locale)
    if (seenValuesLowerCase.has(deduplicationKey)) {
      continue
    }

    seenValuesLowerCase.add(deduplicationKey)
    uniqueValues.push(normalizedValue)
  }

  return uniqueValues
}

export function buildPdfExportFileName(prefix: string, draftName: string, now: Date = new Date()): string {
  const normalizedDraftName = sanitizeFileNamePart(draftName, 'Export')
  const timestamp = buildCzechTimestampForFileName(now)
  return `${prefix}_${normalizedDraftName}_${timestamp}.pdf`
}
