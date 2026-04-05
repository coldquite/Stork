import { format, isValid, parseISO } from 'date-fns'
import type { StudentRow } from '~/types/editor'
import type { ScheduleDraftCommittee, ScheduleDraftItem } from '~/types/schedule-draft'

export function isStudentItem(item: ScheduleDraftItem): item is ScheduleDraftItem & { type: 'STUDENT' } {
  return item.type === 'STUDENT' && item.student !== null
}

export function formatCommitteeDate(value: string): string {
  const parsed = parseISO(value)
  if (!isValid(parsed)) {
    return value
  }

  return format(parsed, 'dd.MM.yyyy')
}

export function resolveCommitteeLabel(committee: ScheduleDraftCommittee, fallbackLabel: string): string {
  const normalizedLabel = committee.name.trim()
  return normalizedLabel.length > 0 ? normalizedLabel : fallbackLabel
}

export function normalizeRequiredText(value: string): string {
  return value.trim()
}

export function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function resolveCommitteeDayTimestamp(committee: ScheduleDraftCommittee): number {
  const parsedDate = parseISO(committee.date)
  return isValid(parsedDate) ? parsedDate.getTime() : Number.POSITIVE_INFINITY
}

export function compareCommitteesByTimeline(left: ScheduleDraftCommittee, right: ScheduleDraftCommittee): number {
  const dayDiff = resolveCommitteeDayTimestamp(left) - resolveCommitteeDayTimestamp(right)
  if (dayDiff !== 0) {
    return dayDiff
  }

  const minuteDiff = left.startMinute - right.startMinute
  if (minuteDiff !== 0) {
    return minuteDiff
  }

  const nameDiff = left.name.localeCompare(right.name, 'cs')
  if (nameDiff !== 0) {
    return nameDiff
  }

  return left.localId.localeCompare(right.localId, 'cs')
}

export function toStudentRow(item: ScheduleDraftItem & { type: 'STUDENT' }): StudentRow {
  const fullName = [item.student.titlesBefore, item.student.firstName, item.student.lastName, item.student.titlesAfter]
    .filter((part) => (part ?? '').trim().length > 0)
    .join(' ')
    .trim()

  return {
    id: item.localId,
    fullName: fullName.length > 0 ? fullName : '-',
    personalNumber: item.student.personalNumber?.trim() || '-',
    specialization: item.student.specializationName.trim() || '-',
    thesisTitle: item.student.thesisTitleLocal.trim() || item.student.thesisTitleEn.trim() || '-'
  }
}

export interface EditorCommitteeListEntry {
  committee: ScheduleDraftCommittee
  label: string
  dateLabel: string
  studentsCount: number
}

export function buildEditorCommitteeListEntries(
  draftCommittees: ScheduleDraftCommittee[],
  fallbackLabel: string
): EditorCommitteeListEntry[] {
  return draftCommittees
    .slice()
    .sort(compareCommitteesByTimeline)
    .map((committee) => ({
      committee,
      label: resolveCommitteeLabel(committee, fallbackLabel),
      dateLabel: formatCommitteeDate(committee.date),
      studentsCount: committee.items.filter(isStudentItem).length
    }))
}

export function resolveLastCommitteeByTimeline(
  draftCommittees: ScheduleDraftCommittee[]
): ScheduleDraftCommittee | null {
  return draftCommittees.slice().sort(compareCommitteesByTimeline).at(-1) ?? null
}
