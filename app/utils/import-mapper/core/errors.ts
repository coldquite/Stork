import type { ImportMappingError, ImportMappingErrorCode } from '~/types/import-mapper'
import type { SourceRow } from '~/utils/import-mapper/core/types'

export class ImportMappingFailure extends Error {
  readonly mappingError: ImportMappingError

  constructor(mappingError: ImportMappingError) {
    super(mappingError.code)
    this.mappingError = mappingError
    this.name = 'ImportMappingFailure'
  }
}

/**
 * Throws a normalized mapping failure with source-aware metadata.
 * Every emitted error has a safe default dataset key and context object.
 */
export function throwMappingError(
  code: ImportMappingErrorCode,
  source: Pick<SourceRow, 'datasetKey' | 'fileName' | 'rowNumber'> | null,
  options: {
    datasetKey?: ImportMappingError['datasetKey']
    column?: string | null
    context?: Record<string, string | number | boolean | null>
  } = {}
): never {
  throw new ImportMappingFailure({
    code,
    datasetKey: options.datasetKey ?? source?.datasetKey ?? 'committees',
    fileName: source?.fileName ?? null,
    rowNumber: source?.rowNumber ?? null,
    column: options.column ?? null,
    context: options.context ?? {}
  })
}
