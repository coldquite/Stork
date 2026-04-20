import { format, isValid, parseISO } from 'date-fns'
import type { CommitteeSidebarItem } from '~/types/editor'
import type { ScheduleDraftCommittee, ScheduleDraftItem } from '~/types/schedule-draft'
import { formatEditorMinuteLabel, resolveCommitteeTimelineRange } from '~/utils/editor/committee-timeline'

export function isStudentItem(item: ScheduleDraftItem): item is ScheduleDraftItem & { type: 'STUDENT' } {
  return item.type === 'STUDENT' && item.student !== null
}

export function isPauseItem(item: ScheduleDraftItem): item is ScheduleDraftItem & { type: 'PAUSE' } {
  return item.type === 'PAUSE' && item.pause !== null
}

export function resolveNextCommitteeItemPosition(committee: ScheduleDraftCommittee): number {
  const maxPosition = committee.items.reduce((max, item) => Math.max(max, item.position), 0)
  return maxPosition + 1
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

export function assignCommitteePreparationRoom(
  committee: ScheduleDraftCommittee,
  nextPreparationRoom: string | null | undefined
): void {
  committee.preparationRoom = normalizeOptionalText(nextPreparationRoom)
}

function resolveCommitteeRoomLabel(committee: ScheduleDraftCommittee): string {
  const normalizedRoom = committee.room?.trim() ?? ''
  return normalizedRoom.length > 0 ? normalizedRoom : '—'
}

function resolveCommitteeTimelineLabels(committee: ScheduleDraftCommittee): {
  timelineStartLabel: string
  timelineEndLabel: string
} {
  const timelineRange = resolveCommitteeTimelineRange(committee)
  if (!timelineRange) {
    return {
      timelineStartLabel: '—',
      timelineEndLabel: '—'
    }
  }

  return {
    timelineStartLabel: formatEditorMinuteLabel(timelineRange.startMinute),
    timelineEndLabel: formatEditorMinuteLabel(timelineRange.endMinute)
  }
}

function resolveCommitteeDayTimestamp(committee: ScheduleDraftCommittee): number {
  const parsedDate = parseISO(committee.date)
  return isValid(parsedDate) ? parsedDate.getTime() : Number.POSITIVE_INFINITY
}

const COMMITTEE_PREFIX_SEPARATOR_PATTERN = /^[-_.),:;/\\\s]+/u

function parseCommitteeSortKey(name: string): {
  normalizedName: string
  numericPrefix: number | null
  suffixWithoutPrefix: string
} {
  const normalizedName = name.trim()
  const matchedPrefix = normalizedName.match(/^(\d+)/u)
  if (!matchedPrefix) {
    return {
      normalizedName,
      numericPrefix: null,
      suffixWithoutPrefix: normalizedName
    }
  }

  const numericPrefix = Number.parseInt(matchedPrefix[1] ?? '', 10)
  const rawSuffix = normalizedName.slice((matchedPrefix[1] ?? '').length)
  const suffixWithoutPrefix = rawSuffix.replace(COMMITTEE_PREFIX_SEPARATOR_PATTERN, '')

  return {
    normalizedName,
    numericPrefix: Number.isFinite(numericPrefix) ? numericPrefix : null,
    suffixWithoutPrefix
  }
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

  const leftSortKey = parseCommitteeSortKey(left.name)
  const rightSortKey = parseCommitteeSortKey(right.name)

  if (leftSortKey.numericPrefix !== null && rightSortKey.numericPrefix !== null) {
    const numericPrefixDiff = leftSortKey.numericPrefix - rightSortKey.numericPrefix
    if (numericPrefixDiff !== 0) {
      return numericPrefixDiff
    }

    const suffixDiff = leftSortKey.suffixWithoutPrefix.localeCompare(rightSortKey.suffixWithoutPrefix, 'cs')
    if (suffixDiff !== 0) {
      return suffixDiff
    }
  } else if (leftSortKey.numericPrefix !== null || rightSortKey.numericPrefix !== null) {
    return leftSortKey.numericPrefix === null ? 1 : -1
  }

  const nameDiff = leftSortKey.normalizedName.localeCompare(rightSortKey.normalizedName, 'cs')
  if (nameDiff !== 0) {
    return nameDiff
  }

  return left.localId.localeCompare(right.localId, 'cs')
}

export interface EditorCommitteeListEntry {
  committee: ScheduleDraftCommittee
  label: string
  dateLabel: string
  studentsCount: number
  roomLabel: string
  timelineStartLabel: string
  timelineEndLabel: string
}

export function buildEditorCommitteeListEntries(
  draftCommittees: ScheduleDraftCommittee[],
  fallbackLabel: string
): EditorCommitteeListEntry[] {
  return draftCommittees
    .slice()
    .sort(compareCommitteesByTimeline)
    .map((committee) => {
      const timelineLabels = resolveCommitteeTimelineLabels(committee)

      return {
        committee,
        label: resolveCommitteeLabel(committee, fallbackLabel),
        dateLabel: formatCommitteeDate(committee.date),
        studentsCount: committee.items.filter(isStudentItem).length,
        roomLabel: resolveCommitteeRoomLabel(committee),
        timelineStartLabel: timelineLabels.timelineStartLabel,
        timelineEndLabel: timelineLabels.timelineEndLabel
      }
    })
}

export function buildEditorCommitteeSidebarItems(
  draftCommittees: ScheduleDraftCommittee[],
  fallbackLabel: string
): CommitteeSidebarItem[] {
  const entries = buildEditorCommitteeListEntries(draftCommittees, fallbackLabel)
  const sidebarItems: CommitteeSidebarItem[] = []
  let lastDateLabel: string | null = null

  for (const entry of entries) {
    if (entry.dateLabel !== lastDateLabel) {
      sidebarItems.push({
        kind: 'day-bookmark',
        id: `day-${entry.dateLabel}`,
        dayLabel: entry.dateLabel
      })
      lastDateLabel = entry.dateLabel
    }

    sidebarItems.push({
      kind: 'committee',
      label: entry.label,
      value: entry.committee.localId,
      studentsCount: entry.studentsCount,
      roomLabel: entry.roomLabel,
      timelineStartLabel: entry.timelineStartLabel,
      timelineEndLabel: entry.timelineEndLabel
    })
  }

  return sidebarItems
}

export function resolveLastCommitteeByTimeline(
  draftCommittees: ScheduleDraftCommittee[]
): ScheduleDraftCommittee | null {
  return draftCommittees.slice().sort(compareCommitteesByTimeline).at(-1) ?? null
}
