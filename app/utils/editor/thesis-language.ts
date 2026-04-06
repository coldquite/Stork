import type { ThesisLanguageDto } from '#shared/types/time-schedules'

export const VALID_THESIS_LANGUAGES = ['CZECH', 'ENGLISH', 'SLOVAK'] as const satisfies readonly ThesisLanguageDto[]

export function isValidThesisLanguage(value: string): value is ThesisLanguageDto {
  return (VALID_THESIS_LANGUAGES as readonly string[]).includes(value)
}

export function resolveThesisLanguage(value: ThesisLanguageDto, fallback: ThesisLanguageDto): ThesisLanguageDto {
  return VALID_THESIS_LANGUAGES.includes(value) ? value : fallback
}

/** Normalizes values from USelectMenu (string or item object) to ThesisLanguageDto. */
export function resolveThesisLanguageFromSelectValue(value: unknown, fallback: ThesisLanguageDto): ThesisLanguageDto {
  if (typeof value === 'string' && isValidThesisLanguage(value)) {
    return value
  }

  if (typeof value === 'object' && value !== null && 'value' in value) {
    const thesisLanguageValue = String((value as { value: unknown }).value)
    if (isValidThesisLanguage(thesisLanguageValue)) {
      return thesisLanguageValue
    }
  }

  return fallback
}
