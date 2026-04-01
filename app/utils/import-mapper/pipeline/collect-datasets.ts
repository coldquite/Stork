import type { ImportDataset, ImportPayload, ImportSzzType } from '~/types/import'
import { throwMappingError } from '~/utils/import-mapper/core/errors'
import { toSourceRows } from '~/utils/import-mapper/core/source-rows'
import type { DatasetLevel, SourceDatasetKey, StudentsDatasetsBundle } from '~/utils/import-mapper/core/types'

function resolveSingleLevelKey(szzType: Exclude<ImportSzzType, 'MIXED'>): DatasetLevel {
  return szzType === 'BACHELOR' ? 'bachelor' : 'master'
}

function requireDataset(
  dataset: ImportDataset | undefined,
  datasetKey: SourceDatasetKey,
  context: { level: DatasetLevel }
): ImportDataset {
  if (dataset) {
    return dataset
  }

  throwMappingError('MISSING_DATASET', null, {
    datasetKey,
    context: {
      datasetKey,
      level: context.level
    }
  })
}

/**
 * Normalizes uploaded student datasets into one consistent shape for mapping.
 *
 * The app supports two import modes:
 * - MIXED: requires bachelor + master datasets for both Students Stork and Students Committees
 * - Single-level: requires only the level selected by the user
 */
export function collectDatasets(payload: ImportPayload, szzType: ImportSzzType): StudentsDatasetsBundle {
  if (szzType === 'MIXED') {
    const studentsStorkBachelor = requireDataset(payload.studentsStork.bachelor, 'studentsStork', { level: 'bachelor' })
    const studentsStorkMaster = requireDataset(payload.studentsStork.master, 'studentsStork', { level: 'master' })
    const studentsCommitteesBachelor = requireDataset(payload.studentsCommittees.bachelor, 'studentsCommittees', {
      level: 'bachelor'
    })
    const studentsCommitteesMaster = requireDataset(payload.studentsCommittees.master, 'studentsCommittees', {
      level: 'master'
    })

    return {
      studentsStorkRows: [
        ...toSourceRows(studentsStorkBachelor, 'studentsStork', 'bachelor'),
        ...toSourceRows(studentsStorkMaster, 'studentsStork', 'master')
      ],
      studentsCommitteesRows: [
        ...toSourceRows(studentsCommitteesBachelor, 'studentsCommittees', 'bachelor'),
        ...toSourceRows(studentsCommitteesMaster, 'studentsCommittees', 'master')
      ]
    }
  }

  const level = resolveSingleLevelKey(szzType)
  const studentsStorkDataset = requireDataset(payload.studentsStork[level], 'studentsStork', { level })
  const studentsCommitteesDataset = requireDataset(payload.studentsCommittees[level], 'studentsCommittees', {
    level
  })

  return {
    studentsStorkRows: toSourceRows(studentsStorkDataset, 'studentsStork', level),
    studentsCommitteesRows: toSourceRows(studentsCommitteesDataset, 'studentsCommittees', level)
  }
}
