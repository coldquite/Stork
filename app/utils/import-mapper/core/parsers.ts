import type { StudyLanguageDto, StudyProgramTypeDto, ThesisLanguageDto } from '#shared/types/time-schedules'
import { normalizeWhitespace } from '~/utils/import-mapper/core/normalize'

// Parses study program type from the first significant symbol.
export function parseStudyProgramType(value: string): StudyProgramTypeDto | null {
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

export function parseStudyLanguage(rawValue: string): StudyLanguageDto | null {
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

export function parseThesisLanguage(rawValue: string): ThesisLanguageDto | null {
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

// Parses a date from Czech format "DD.MM.YYYY" to ISO string in UTC midnight.
//
// Example: "23.06.2025" -> "2025-06-23T00:00:00.000Z"
// Invalid dates return null.
export function parseDateToIso(rawValue: string): string | null {
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
