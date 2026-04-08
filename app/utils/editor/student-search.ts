import { isStudentItem, normalizeOptionalText, normalizeRequiredText } from '~/utils/editor/draft-committee'
import type { ScheduleDraftCommittee } from '~/types/schedule-draft'

const WHITESPACE_PATTERN = /\s+/g
const DIACRITICS_PATTERN = /[\u0300-\u036f]/g
const SEARCH_LOCALE = 'cs-CZ'

export interface EditorStudentSearchIndexEntry {
  studentId: string
  committeeId: string
  committeeLabel: string
  committeeDateLabel: string
  orderNumber: number
  fullName: string
  email: string
  searchValue: string
}

export function normalizeStudentSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(DIACRITICS_PATTERN, '')
    .toLocaleLowerCase(SEARCH_LOCALE)
    .replace(WHITESPACE_PATTERN, ' ')
    .trim()
}

export function buildStudentSearchIndexEntries(
  committee: ScheduleDraftCommittee,
  committeeLabel: string,
  committeeDateLabel: string
): EditorStudentSearchIndexEntry[] {
  const orderedItems = committee.items.slice().sort((left, right) => left.position - right.position)
  let studentOrderNumber = 0

  return orderedItems.flatMap((item) => {
    if (!isStudentItem(item)) {
      return []
    }

    studentOrderNumber += 1

    const firstName = normalizeRequiredText(item.student.firstName)
    const lastName = normalizeRequiredText(item.student.lastName)
    const fullName = `${firstName} ${lastName}`.trim()
    const email = normalizeOptionalText(item.student.email) ?? ''
    const searchValue = normalizeStudentSearchText(
      [firstName, lastName, fullName, `${lastName} ${firstName}`, email].join(' ')
    )

    return [
      {
        studentId: item.localId,
        committeeId: committee.localId,
        committeeLabel,
        committeeDateLabel,
        orderNumber: studentOrderNumber,
        fullName,
        email,
        searchValue
      }
    ]
  })
}
