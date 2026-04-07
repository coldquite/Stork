import type { StudyLanguageDto } from '#shared/types/time-schedules'

export const VALID_STUDY_LANGUAGES = ['CZECH', 'ENGLISH'] as const satisfies readonly StudyLanguageDto[]

export function isValidStudyLanguage(value: string): value is StudyLanguageDto {
  return (VALID_STUDY_LANGUAGES as readonly string[]).includes(value)
}

/** Normalizes values from USelectMenu (string or item object) to StudyLanguageDto. */
export function resolveStudyLanguageFromSelectValue(value: unknown, fallback: StudyLanguageDto): StudyLanguageDto {
  if (typeof value === 'string' && isValidStudyLanguage(value)) {
    return value
  }

  if (typeof value === 'object' && value !== null && 'value' in value) {
    const studyLanguageValue = String((value as { value: unknown }).value)
    if (isValidStudyLanguage(studyLanguageValue)) {
      return studyLanguageValue
    }
  }

  return fallback
}
