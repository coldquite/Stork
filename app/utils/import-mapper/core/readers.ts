import { normalizeNullable, normalizeWhitespace } from '~/utils/import-mapper/core/normalize'
import { throwMappingError } from '~/utils/import-mapper/core/errors'
import type { SourceRow } from '~/utils/import-mapper/core/types'

export function readRequiredValue(source: SourceRow, column: string): string {
  const rawValue = source.row[column] ?? ''
  const normalized = normalizeWhitespace(rawValue)

  if (normalized.length === 0) {
    throwMappingError('MISSING_REQUIRED_VALUE', source, {
      column,
      context: {
        reason: 'required_value_is_empty'
      }
    })
  }

  return normalized
}

export function readOptionalValue(source: SourceRow, column: string): string | null {
  return normalizeNullable(source.row[column] ?? '')
}
