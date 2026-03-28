import type { StudyProgramTypeDto } from '#shared/types/time-schedules'

export type ImportDatasetKey = 'studentsCap' | 'studentsCommittees' | 'committees'
export type ImportStudyLevel = StudyProgramTypeDto
export type ImportSzzType = ImportStudyLevel | 'MIXED'

export type ImportFieldKey =
  | 'studentsCapSingle'
  | 'studentsCommitteesSingle'
  | 'studentsCapBachelor'
  | 'studentsCapMaster'
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
  studentsCap: {
    bachelor?: ImportDataset
    master?: ImportDataset
  }
  studentsCommittees: {
    bachelor?: ImportDataset
    master?: ImportDataset
  }
}
