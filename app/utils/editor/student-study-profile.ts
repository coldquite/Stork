import {
  resolveEditorSpecializationOptionByCode,
  resolveEditorSpecializationOptions,
  resolveEditorStudyProgramNameOptions,
  type EditorSpecializationOption
} from '#shared/constants/editor'
import type { StudyLanguageDto, StudyProgramTypeDto } from '#shared/types/time-schedules'
import { normalizeRequiredText } from '~/utils/editor/draft-committee'

export interface StudentStudyProfileFields {
  studyLanguage: StudyLanguageDto
  studyProgramType: StudyProgramTypeDto
  studyProgramName: string
  specializationCode: string
}

function clearSpecialization(fields: StudentStudyProfileFields): StudentStudyProfileFields {
  return {
    ...fields,
    specializationCode: ''
  }
}

function isStudyProgramNameAllowed(
  studyProgramType: StudyProgramTypeDto,
  studyLanguage: StudyLanguageDto,
  studyProgramName: string
): boolean {
  const allowedStudyProgramNames = resolveEditorStudyProgramNameOptions(studyProgramType, studyLanguage)
  return allowedStudyProgramNames.includes(studyProgramName)
}

export function resolveStudyProgramNameOptionsForStudyProfile(
  studyProgramType: StudyProgramTypeDto,
  studyLanguage: StudyLanguageDto,
  currentStudyProgramName: string
): string[] {
  const baseOptions = resolveEditorStudyProgramNameOptions(studyProgramType, studyLanguage)
  const normalizedProgramName = normalizeRequiredText(currentStudyProgramName)
  if (normalizedProgramName.length < 1 || baseOptions.includes(normalizedProgramName)) {
    return baseOptions
  }

  return [normalizedProgramName, ...baseOptions]
}

export function resolveSpecializationOptionsForStudyProfile(
  studyProgramType: StudyProgramTypeDto,
  studyProgramName: string,
  currentSpecializationCode: string
): EditorSpecializationOption[] {
  const baseOptions = resolveEditorSpecializationOptions(studyProgramType, studyProgramName)
  const normalizedCode = normalizeRequiredText(currentSpecializationCode)
  if (normalizedCode.length < 1) {
    return baseOptions
  }

  const hasCodeInOptions = baseOptions.some((option) => option.specializationCode === normalizedCode)
  if (hasCodeInOptions) {
    return baseOptions
  }

  return [
    {
      specializationCode: normalizedCode,
      specializationName: normalizedCode,
      departmentCode: null,
      departmentNameCs: null,
      departmentNameEn: null
    },
    ...baseOptions
  ]
}

export function applyStudyLanguageChange(
  fields: StudentStudyProfileFields,
  nextStudyLanguage: StudyLanguageDto
): StudentStudyProfileFields {
  const nextFields = { ...fields, studyLanguage: nextStudyLanguage }
  if (
    nextFields.studyProgramName.length < 1 ||
    isStudyProgramNameAllowed(nextFields.studyProgramType, nextFields.studyLanguage, nextFields.studyProgramName)
  ) {
    return nextFields
  }

  return clearSpecialization({
    ...nextFields,
    studyProgramName: ''
  })
}

export function applyStudyProgramTypeChange(
  fields: StudentStudyProfileFields,
  nextStudyProgramType: StudyProgramTypeDto
): StudentStudyProfileFields {
  const hasStudyProgramTypeChanged = fields.studyProgramType !== nextStudyProgramType
  const nextFields = { ...fields, studyProgramType: nextStudyProgramType }
  const nextWithSpecializationReset = hasStudyProgramTypeChanged ? clearSpecialization(nextFields) : nextFields

  if (
    nextWithSpecializationReset.studyProgramName.length < 1 ||
    isStudyProgramNameAllowed(
      nextWithSpecializationReset.studyProgramType,
      nextWithSpecializationReset.studyLanguage,
      nextWithSpecializationReset.studyProgramName
    )
  ) {
    return nextWithSpecializationReset
  }

  return {
    ...nextWithSpecializationReset,
    studyProgramName: ''
  }
}

export function applyStudyProgramNameChange(
  fields: StudentStudyProfileFields,
  nextStudyProgramName: string
): StudentStudyProfileFields {
  const normalizedStudyProgramName = normalizeRequiredText(nextStudyProgramName)
  if (
    normalizedStudyProgramName.length > 0 &&
    !isStudyProgramNameAllowed(fields.studyProgramType, fields.studyLanguage, normalizedStudyProgramName)
  ) {
    return fields
  }

  if (fields.studyProgramName === normalizedStudyProgramName) {
    return fields
  }

  return clearSpecialization({
    ...fields,
    studyProgramName: normalizedStudyProgramName
  })
}

export function applySpecializationCodeChange(
  fields: StudentStudyProfileFields,
  nextSpecializationCode: string
): StudentStudyProfileFields {
  const normalizedSpecializationCode = normalizeRequiredText(nextSpecializationCode)
  if (normalizedSpecializationCode.length < 1) {
    return clearSpecialization(fields)
  }

  return {
    ...fields,
    specializationCode: normalizedSpecializationCode
  }
}

export function resolveSpecializationNameForStudyProfile(
  studyProgramType: StudyProgramTypeDto,
  studyProgramName: string,
  specializationCode: string
): string {
  const normalizedSpecializationCode = normalizeRequiredText(specializationCode)
  if (normalizedSpecializationCode.length < 1) {
    return ''
  }

  const specializationOption = resolveEditorSpecializationOptionByCode(
    studyProgramType,
    studyProgramName,
    normalizedSpecializationCode
  )
  return specializationOption?.specializationName ?? normalizedSpecializationCode
}
