import type { StudyProgramTypeDto } from '../../types/time-schedules'

export interface EditorSpecializationOption {
  specializationCode: string
  specializationName: string
  departmentCode: string | null
  departmentNameCs: string | null
  departmentNameEn: string | null
}

export type EditorSpecializationOptionsByTypeAndStudyProgramName = Record<
  StudyProgramTypeDto,
  Record<string, EditorSpecializationOption[]>
>
