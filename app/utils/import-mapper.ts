import type { MapImportPayloadToDraftInput, MapImportPayloadToDraftResult } from '~/types/import-mapper'
import { ImportMappingFailure } from '~/utils/import-mapper/core/errors'
import { collectDatasets } from '~/utils/import-mapper/pipeline/collect-datasets'
import { finalizeDraft } from '~/utils/import-mapper/pipeline/finalize-draft'
import { mapCommittees } from '~/utils/import-mapper/pipeline/map-committees'
import { mapStudent } from '~/utils/import-mapper/pipeline/map-student'
import { matchStudents } from '~/utils/import-mapper/pipeline/match-students'

export function mapImportPayloadToDraftSource(input: MapImportPayloadToDraftInput): MapImportPayloadToDraftResult {
  try {
    const datasets = collectDatasets(input.payload, input.szzType)
    const committeesMapping = mapCommittees(input.szzType, input.payload.committees, datasets.studentsCommitteesRows)
    const matchedStudents = matchStudents(datasets.studentsStorkRows, datasets.studentsCommitteesRows)
    const mappedStudents = matchedStudents.map((matchedRows) =>
      mapStudent({
        szzType: input.szzType,
        committeesByName: committeesMapping.committeesByName,
        matchedRows
      })
    )

    const draft = finalizeDraft({
      scheduleName: input.scheduleName,
      committees: committeesMapping.committees,
      mappedStudents
    })

    return {
      ok: true,
      draft
    }
  } catch (error: unknown) {
    if (error instanceof ImportMappingFailure) {
      return {
        ok: false,
        error: error.mappingError
      }
    }

    throw error
  }
}
