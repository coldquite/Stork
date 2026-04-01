import type { StudyProgramTypeDto } from '#shared/types/time-schedules'

export type ImportDatasetKey = 'studentsStork' | 'studentsCommittees' | 'committees'
export type ImportStudyLevel = StudyProgramTypeDto
export type ImportSzzType = ImportStudyLevel | 'MIXED'

export type ImportFieldKey =
  | 'studentsStorkSingle'
  | 'studentsCommitteesSingle'
  | 'studentsStorkBachelor'
  | 'studentsStorkMaster'
  | 'studentsCommitteesBachelor'
  | 'studentsCommitteesMaster'
  | 'committees'

export type ImportCsvRow = Record<string, string>

export interface ImportDataset {
  fileName: string
  headers: string[]
  rows: ImportCsvRow[]
}

export interface ImportPayload {
  committees: ImportDataset
  studentsStork: {
    bachelor?: ImportDataset
    master?: ImportDataset
  }
  studentsCommittees: {
    bachelor?: ImportDataset
    master?: ImportDataset
  }
}
