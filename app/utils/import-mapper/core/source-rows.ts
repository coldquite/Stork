import type { ImportDataset } from '~/types/import'
import type { DatasetLevel, SourceDatasetKey, SourceRow } from '~/utils/import-mapper/core/types'

// Converts parsed CSV rows to source-aware rows with metadata used by validators and error reporting.
export function toSourceRows(
  dataset: ImportDataset,
  datasetKey: SourceDatasetKey,
  level: DatasetLevel | null
): SourceRow[] {
  return dataset.rows.map((row, index) => ({
    datasetKey,
    fileName: dataset.fileName,
    rowNumber: index + 2, // Unlike JS arrays, CSV lines are 1-based, plus one line for the header.
    level,
    row
  }))
}
