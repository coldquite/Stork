import type { PostCommitteeDto, PostStudentItemDto } from '#shared/types/time-schedules'
import type { ImportCsvRow } from '~/types/import'

export type DatasetLevel = 'bachelor' | 'master'
export type SourceDatasetKey = 'studentsStork' | 'studentsCommittees' | 'committees'

export interface SourceRow {
  datasetKey: SourceDatasetKey
  fileName: string
  rowNumber: number
  level: DatasetLevel | null
  row: ImportCsvRow
}

export interface StudentsDatasetsBundle {
  studentsStorkRows: SourceRow[]
  studentsCommitteesRows: SourceRow[]
}

export interface CommitteesMappingResult {
  committees: PostCommitteeDto[]
  committeesByName: Map<string, PostCommitteeDto>
}

export interface MatchedStudentRows {
  studentsStorkRow: SourceRow
  studentsCommitteesRow: SourceRow
}

export interface MappedStudentPlacement {
  committeeName: string
  studentsCommitteesRowNumber: number
  student: PostStudentItemDto
}

export interface FieldEqualityCheckInput {
  source: SourceRow
  column: string
  value: string | null
}
