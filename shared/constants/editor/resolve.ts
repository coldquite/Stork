import type { StudyLanguageDto, StudyProgramTypeDto } from '../../types/time-schedules'
import { EDITOR_STUDY_PROGRAM_NAME_OPTIONS_BY_TYPE } from './study-program-names'
import { EDITOR_SPECIALIZATION_OPTIONS_BY_TYPE_AND_STUDY_PROGRAM_NAME } from './specialization-table'
import type { EditorSpecializationOption } from './types'

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
