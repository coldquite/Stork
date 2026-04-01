import type { DraftScheduleSource } from '~/types/schedule-draft'
import type { ImportDatasetKey, ImportPayload, ImportSzzType } from '~/types/import'

export type ImportMappingErrorCode =
  | 'MISSING_DATASET'
  | 'MISSING_REQUIRED_VALUE'
  | 'INVALID_COMMITTEE_NAME'
  | 'DUPLICATE_COMMITTEE_NAME'
  | 'COMMITTEE_NOT_FOUND_IN_STUDENTS'
  | 'COMMITTEE_NOT_FOUND_IN_COMMITTEES'
  | 'COMMITTEE_GROUP_INCONSISTENT'
  | 'COMMITTEE_FIELD_MISMATCH'
  | 'COMMITTEE_SZZ_TYPE_MISMATCH'
  | 'INVALID_COMMITTEE_DATE'
  | 'INVALID_STUDY_PROGRAM_TYPE'
  | 'INVALID_LANGUAGE'
  | 'STUDENT_MATCH_NOT_FOUND'
  | 'STUDENT_MATCH_AMBIGUOUS'
  | 'STUDENT_COMMITTEE_NOT_FOUND'
  | 'STUDENT_VALUE_MISMATCH'
  | 'INVALID_THESIS_SUBMISSION_DATE'
  | 'STUDENT_COMMITTEE_MISMATCH'
  | 'TEACHERS_DICTIONARY_REQUEST_FAILED'

export interface ImportMappingError {
  code: ImportMappingErrorCode
  datasetKey: ImportDatasetKey
  fileName: string | null
  rowNumber: number | null
  column: string | null
  context: Record<string, string | number | boolean | null>
}

export interface MapImportPayloadToDraftInput {
  scheduleName: string
  szzType: ImportSzzType
  payload: ImportPayload
}

export type MapImportPayloadToDraftResult =
  | {
      ok: true
      draft: DraftScheduleSource
    }
  | {
      ok: false
      error: ImportMappingError
    }
