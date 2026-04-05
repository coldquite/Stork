/**
 * FIT schedule editor catalogs (study programs, specializations, departments) and resolvers.
 * Split: raw rows (`specialization-raw`), static lists (`study-program-names`, `departments`), build (`specialization-table`), API (`resolve`).
 */

export { EDITOR_DRAFT_NAME_MAX_LENGTH, DEFAULT_COMMITTEE_START_MINUTE } from './limits'

export { EDITOR_DEPARTMENTS_BY_CODE, resolveEditorDepartmentNameByCode, type EditorDepartmentCode } from './departments'

export { EDITOR_STUDY_PROGRAM_NAME_OPTIONS_BY_TYPE } from './study-program-names'

export type { EditorSpecializationOption, EditorSpecializationOptionsByTypeAndStudyProgramName } from './types'

export { EDITOR_SPECIALIZATION_OPTIONS_BY_TYPE_AND_STUDY_PROGRAM_NAME } from './specialization-table'

export type { EditorSpecializationRawRow } from './specialization-raw'
export { EDITOR_SPECIALIZATION_RAW } from './specialization-raw'

export {
  resolveEditorSpecializationOptions,
  resolveEditorStudyProgramNameOptions,
  resolveEditorSpecializationOptionByCode
} from './resolve'
