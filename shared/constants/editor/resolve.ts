import type { StudyLanguageDto, StudyProgramTypeDto } from '../../types/time-schedules'
import { EDITOR_STUDY_PROGRAM_NAME_OPTIONS_BY_TYPE } from './study-program-names'
import { EDITOR_SPECIALIZATION_OPTIONS_BY_TYPE_AND_STUDY_PROGRAM_NAME } from './specialization-table'
import type { EditorSpecializationOption } from './types'
import {
  normalizeSpecializationCodeForDepartmentLookup,
  normalizeSpecializationCodeWithVersion
} from '../../utils/specialization-code'

/** Specialization options for the selected study program, or empty when the form context is incomplete. */
export function resolveEditorSpecializationOptions(
  studyProgramType: StudyProgramTypeDto | null | undefined,
  studyProgramName: string
): EditorSpecializationOption[] {
  if (!studyProgramType || studyProgramName.length === 0) {
    return []
  }

  return EDITOR_SPECIALIZATION_OPTIONS_BY_TYPE_AND_STUDY_PROGRAM_NAME[studyProgramType][studyProgramName] ?? []
}

/** Study program names allowed for the given degree type and language. */
export function resolveEditorStudyProgramNameOptions(
  studyProgramType: StudyProgramTypeDto | null | undefined,
  studyLanguage: StudyLanguageDto | null | undefined
): string[] {
  if (!studyProgramType || !studyLanguage) {
    return []
  }

  return EDITOR_STUDY_PROGRAM_NAME_OPTIONS_BY_TYPE[studyProgramType][studyLanguage]
}

/** Finds a specialization by code in the current program context, or null if not listed there. */
export function resolveEditorSpecializationOptionByCode(
  studyProgramType: StudyProgramTypeDto | null | undefined,
  studyProgramName: string,
  specializationCode: string
): EditorSpecializationOption | null {
  const options = resolveEditorSpecializationOptions(studyProgramType, studyProgramName)
  return options.find((option) => option.specializationCode === specializationCode) ?? null
}

/**
 * Normalizes specialization code for department lookup.
 * Example:
 *   - BI-SI21 => BI-SI
 *   - BI-SI.2027 => BI-SI
 */
export function normalizeEditorSpecializationCodeForDepartmentLookup(value: string): string {
  return normalizeSpecializationCodeForDepartmentLookup(value)
}

const EDITOR_SPECIALIZATION_OPTIONS_BY_CODE = (() => {
  const optionsByCode = new Map<string, EditorSpecializationOption>()

  for (const optionsByProgramName of Object.values(EDITOR_SPECIALIZATION_OPTIONS_BY_TYPE_AND_STUDY_PROGRAM_NAME)) {
    for (const options of Object.values(optionsByProgramName)) {
      for (const option of options) {
        const normalizedOptionCode = normalizeEditorSpecializationCodeForDepartmentLookup(option.specializationCode)
        if (!optionsByCode.has(normalizedOptionCode)) {
          optionsByCode.set(normalizedOptionCode, option)
        }
      }
    }
  }

  return optionsByCode
})()

const EDITOR_STUDY_PROGRAM_TYPE_BY_NORMALIZED_SPECIALIZATION_CODE = (() => {
  const studyProgramTypeByCode = new Map<string, StudyProgramTypeDto>()

  const entries = Object.entries(EDITOR_SPECIALIZATION_OPTIONS_BY_TYPE_AND_STUDY_PROGRAM_NAME) as Array<
    [StudyProgramTypeDto, Record<string, EditorSpecializationOption[]>]
  >
  for (const [studyProgramType, optionsByProgramName] of entries) {
    for (const options of Object.values(optionsByProgramName)) {
      for (const option of options) {
        const normalizedOptionCode = normalizeEditorSpecializationCodeForDepartmentLookup(option.specializationCode)
        if (!studyProgramTypeByCode.has(normalizedOptionCode)) {
          studyProgramTypeByCode.set(normalizedOptionCode, studyProgramType)
        }
      }
    }
  }

  return studyProgramTypeByCode
})()

/**
 * Resolves study-program type by specialization code.
 * Supports both regular and ISP (individual) specialization codes.
 */
export function resolveEditorStudyProgramTypeBySpecializationCode(
  specializationCode: string
): StudyProgramTypeDto | null {
  const normalizedSpecializationCode = normalizeEditorSpecializationCodeForDepartmentLookup(specializationCode)
  if (normalizedSpecializationCode.length < 1) {
    return null
  }

  return EDITOR_STUDY_PROGRAM_TYPE_BY_NORMALIZED_SPECIALIZATION_CODE.get(normalizedSpecializationCode) ?? null
}

/**
 * Resolves specialization option by code in the selected study profile context, then globally as fallback.
 */
export function resolveEditorSpecializationOptionForDepartment(
  studyProgramType: StudyProgramTypeDto | null | undefined,
  studyProgramName: string,
  specializationCode: string
): EditorSpecializationOption | null {
  const exactSpecializationCode = normalizeSpecializationCodeWithVersion(specializationCode)
  const normalizedSpecializationCode = normalizeEditorSpecializationCodeForDepartmentLookup(specializationCode)
  if (normalizedSpecializationCode.length < 1) {
    return null
  }

  const specializationInCurrentProgramExact = resolveEditorSpecializationOptionByCode(
    studyProgramType,
    studyProgramName,
    exactSpecializationCode
  )
  if (specializationInCurrentProgramExact) {
    return specializationInCurrentProgramExact
  }

  const specializationInCurrentProgramNormalized = resolveEditorSpecializationOptions(
    studyProgramType,
    studyProgramName
  ).find((option) => {
    return (
      normalizeEditorSpecializationCodeForDepartmentLookup(option.specializationCode) === normalizedSpecializationCode
    )
  })
  if (specializationInCurrentProgramNormalized) {
    return specializationInCurrentProgramNormalized
  }

  return EDITOR_SPECIALIZATION_OPTIONS_BY_CODE.get(normalizedSpecializationCode) ?? null
}
