import { resolveEditorSpecializationOptionByCode, resolveEditorStudyProgramNameOptions } from '#shared/constants/editor'
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
