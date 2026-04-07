import type { StudyProgramTypeDto } from '#shared/types/time-schedules'

export const VALID_STUDY_PROGRAM_TYPES = ['BACHELOR', 'MASTER'] as const satisfies readonly StudyProgramTypeDto[]

export function isValidStudyProgramType(value: string): value is StudyProgramTypeDto {
  return (VALID_STUDY_PROGRAM_TYPES as readonly string[]).includes(value)
}

/** Normalizes values from USelectMenu (string or item object) to StudyProgramTypeDto. */
export function resolveStudyProgramTypeFromSelectValue(
  value: unknown,
  fallback: StudyProgramTypeDto
): StudyProgramTypeDto {
  if (typeof value === 'string' && isValidStudyProgramType(value)) {
    return value
  }

  if (typeof value === 'object' && value !== null && 'value' in value) {
    const studyProgramTypeValue = String((value as { value: unknown }).value)
    if (isValidStudyProgramType(studyProgramTypeValue)) {
      return studyProgramTypeValue
    }
  }

  return fallback
}
