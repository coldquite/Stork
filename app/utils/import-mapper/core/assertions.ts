import { COMMITTEE_CONSISTENCY_CHECK_COLUMNS } from '~/utils/import-mapper/core/constants'
import type { ImportMappingErrorCode } from '~/types/import-mapper'
import { throwMappingError } from '~/utils/import-mapper/core/errors'
import {
  normalizeCompareValue,
  normalizeSpecializationCode,
  normalizeSpecializationCodeForComparison,
  normalizeWhitespace
} from '~/utils/import-mapper/core/normalize'
import type { FieldEqualityCheckInput, SourceRow } from '~/utils/import-mapper/core/types'

/**
 * For a single committee ensures that all rows from the `studentsCommittees`
 * dataset are internally consistent for invariant committee columns.
 */
export function assertCommitteeGroupConsistency(committeeRows: SourceRow[], committeeName: string): void {
  const baseRow = committeeRows[0]
  if (!baseRow) {
    return
  }

  for (const column of COMMITTEE_CONSISTENCY_CHECK_COLUMNS) {
    const expectedRaw = baseRow.row[column] ?? ''
    const expected =
      column === 'Obor/spec - kód'
        ? normalizeSpecializationCodeForComparison(normalizeSpecializationCode(expectedRaw))
        : normalizeWhitespace(expectedRaw)

    for (const currentRow of committeeRows) {
      const currentRaw = currentRow.row[column] ?? ''
      const current =
        column === 'Obor/spec - kód'
          ? normalizeSpecializationCodeForComparison(normalizeSpecializationCode(currentRaw))
          : normalizeWhitespace(currentRaw)

      if (current === expected) {
        continue
      }

      throwMappingError('COMMITTEE_GROUP_INCONSISTENT', currentRow, {
        column,
        context: {
          committeeName,
          referenceRow: baseRow.rowNumber,
          expectedValue: expected,
          actualValue: current
        }
      })
    }
  }
}

export function assertFieldEquality(
  committeeName: string,
  left: FieldEqualityCheckInput,
  right: FieldEqualityCheckInput,
  errorCode: Extract<
    ImportMappingErrorCode,
    'COMMITTEE_FIELD_MISMATCH' | 'STUDENT_VALUE_MISMATCH'
  > = 'STUDENT_VALUE_MISMATCH'
): void {
  const leftValue = normalizeWhitespace(left.value ?? '')
  const rightValue = normalizeWhitespace(right.value ?? '')

  if (normalizeCompareValue(leftValue) === normalizeCompareValue(rightValue)) {
    return
  }

  throwMappingError(errorCode, right.source, {
    column: right.column,
    context: {
      committeeName,
      leftColumn: left.column,
      rightColumn: right.column,
      leftValue,
      rightValue
    }
  })
}
