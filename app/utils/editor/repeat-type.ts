import type { RepeatTypeDto } from '#shared/types/time-schedules'

export const VALID_REPEAT_TYPES = [
  'NONE',
  'THESIS_DEFENSE',
  'ORAL_EXAM',
  'BOTH'
] as const satisfies readonly RepeatTypeDto[]

export function isValidRepeatType(value: string): value is RepeatTypeDto {
  return (VALID_REPEAT_TYPES as readonly string[]).includes(value)
}

export function resolveRepeatType(value: RepeatTypeDto, fallback: RepeatTypeDto): RepeatTypeDto {
  return VALID_REPEAT_TYPES.includes(value) ? value : fallback
}

/** Normalizes values from USelectMenu (string or item object) to RepeatTypeDto. */
export function resolveRepeatTypeFromSelectValue(value: unknown, fallback: RepeatTypeDto): RepeatTypeDto {
  if (typeof value === 'string' && isValidRepeatType(value)) {
    return value
  }

  if (typeof value === 'object' && value !== null && 'value' in value) {
    const repeatTypeValue = String((value as { value: unknown }).value)
    if (isValidRepeatType(repeatTypeValue)) {
      return repeatTypeValue
    }
  }

  return fallback
}
