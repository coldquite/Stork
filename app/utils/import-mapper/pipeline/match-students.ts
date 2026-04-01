import { throwMappingError } from '~/utils/import-mapper/core/errors'
import { normalizeCompareValue } from '~/utils/import-mapper/core/normalize'
import { readRequiredValue } from '~/utils/import-mapper/core/readers'
import type { MatchedStudentRows, SourceRow } from '~/utils/import-mapper/core/types'

function buildStudentMatchKeyByStudentsStork(row: SourceRow): string {
  const email = normalizeCompareValue(readRequiredValue(row, 'Email studenta'))
  const firstName = normalizeCompareValue(readRequiredValue(row, 'Jméno'))
  const lastName = normalizeCompareValue(readRequiredValue(row, 'Příjmení'))

  return `${email}|${firstName}|${lastName}`
}

function buildStudentMatchKeyByStudentsCommittees(row: SourceRow): string {
  const email = normalizeCompareValue(readRequiredValue(row, 'Email adresa'))
  const firstName = normalizeCompareValue(readRequiredValue(row, 'Jméno studenta'))
  const lastName = normalizeCompareValue(readRequiredValue(row, 'Příjmení studenta'))

  return `${email}|${firstName}|${lastName}`
}

export function matchStudents(
  studentsStorkRows: SourceRow[],
  studentsCommitteesRows: SourceRow[]
): MatchedStudentRows[] {
  const studentsRowsByKey = new Map<string, SourceRow[]>()
  for (const studentsRow of studentsCommitteesRows) {
    const key = buildStudentMatchKeyByStudentsCommittees(studentsRow)
    const existingRows = studentsRowsByKey.get(key) ?? []
    existingRows.push(studentsRow)
    studentsRowsByKey.set(key, existingRows)
  }

  const usedStudentsCommitteesRows = new Set<SourceRow>()
  const matchedRows: MatchedStudentRows[] = []

  for (const studentsStorkRow of studentsStorkRows) {
    const key = buildStudentMatchKeyByStudentsStork(studentsStorkRow)
    const matches = studentsRowsByKey.get(key) ?? []

    if (matches.length === 0) {
      throwMappingError('STUDENT_MATCH_NOT_FOUND', studentsStorkRow, {
        context: {
          matchingKey: key
        }
      })
    }

    if (matches.length > 1) {
      throwMappingError('STUDENT_MATCH_AMBIGUOUS', studentsStorkRow, {
        context: {
          matchingKey: key,
          matches: matches.length
        }
      })
    }

    const studentsCommitteesRow = matches[0]
    if (!studentsCommitteesRow) {
      continue
    }

    if (usedStudentsCommitteesRows.has(studentsCommitteesRow)) {
      throwMappingError('STUDENT_MATCH_AMBIGUOUS', studentsStorkRow, {
        context: {
          matchingKey: key,
          reason: 'students_committees_row_reused'
        }
      })
    }
    usedStudentsCommitteesRows.add(studentsCommitteesRow)

    matchedRows.push({
      studentsStorkRow,
      studentsCommitteesRow
    })
  }

  for (const studentsCommitteesRow of studentsCommitteesRows) {
    if (usedStudentsCommitteesRows.has(studentsCommitteesRow)) {
      continue
    }

    throwMappingError('STUDENT_MATCH_NOT_FOUND', studentsCommitteesRow, {
      context: {
        reason: 'students_committees_row_without_matching_students_cap'
      }
    })
  }

  return matchedRows
}
