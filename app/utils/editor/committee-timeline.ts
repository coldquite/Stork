import { addMinutes, format, startOfDay } from 'date-fns'
import { STUDENT_EXAM_GAP_MINUTES } from '~/constants/editor-students-table'
import type { ScheduleDraftCommittee, ScheduleDraftItem } from '~/types/schedule-draft'

export type ScheduleDraftTimelineStudentItem = ScheduleDraftItem & {
  type: 'STUDENT'
  student: NonNullable<ScheduleDraftItem['student']>
}

export type ScheduleDraftTimelinePauseItem = ScheduleDraftItem & {
  type: 'PAUSE'
  pause: NonNullable<ScheduleDraftItem['pause']>
}

export type CommitteeTimelineEntry =
  | {
      kind: 'STUDENT'
      item: ScheduleDraftTimelineStudentItem
      startMinute: number
      endMinute: number
    }
  | {
      kind: 'PAUSE'
      item: ScheduleDraftTimelinePauseItem
      startMinute: number
      endMinute: number
    }

const REFERENCE_DAY_START = startOfDay(new Date(0))

function isTimelineStudentItem(item: ScheduleDraftItem): item is ScheduleDraftTimelineStudentItem {
  return item.type === 'STUDENT' && item.student !== null
}

function isTimelinePauseItem(item: ScheduleDraftItem): item is ScheduleDraftTimelinePauseItem {
  return item.type === 'PAUSE' && item.pause !== null
}

export function formatEditorMinuteLabel(minuteOfDay: number): string {
  const safeMinute = Number.isFinite(minuteOfDay) ? Math.trunc(minuteOfDay) : 0
  return format(addMinutes(REFERENCE_DAY_START, safeMinute), 'HH:mm')
}

export function buildCommitteeTimelineEntries(committee: ScheduleDraftCommittee): CommitteeTimelineEntry[] {
  const orderedItems = committee.items.slice().sort((left, right) => left.position - right.position)
  const timelineEntries: CommitteeTimelineEntry[] = []
  let currentMinute = committee.startMinute

  for (const [index, item] of orderedItems.entries()) {
    if (isTimelinePauseItem(item)) {
      const pauseStartMinute = currentMinute
      const pauseEndMinute = pauseStartMinute + item.pause.durationMinutes
      timelineEntries.push({
        kind: 'PAUSE',
        item,
        startMinute: pauseStartMinute,
        endMinute: pauseEndMinute
      })
      currentMinute = pauseEndMinute
      continue
    }

    if (!isTimelineStudentItem(item)) {
      continue
    }

    const examStartMinute = currentMinute
    const examEndMinute = examStartMinute + item.student.examMinutes
    timelineEntries.push({
      kind: 'STUDENT',
      item,
      startMinute: examStartMinute,
      endMinute: examEndMinute
    })

    currentMinute = examEndMinute
    const nextItem = orderedItems[index + 1]
    if (nextItem && isTimelineStudentItem(nextItem)) {
      currentMinute += STUDENT_EXAM_GAP_MINUTES
    }
  }

  return timelineEntries
}

export function resolveCommitteeTimelineRange(
  committee: ScheduleDraftCommittee
): { startMinute: number; endMinute: number } | null {
  const timelineEntries = buildCommitteeTimelineEntries(committee)
  const firstEntry = timelineEntries[0]
  const lastEntry = timelineEntries.at(-1)
  if (!firstEntry || !lastEntry) {
    return null
  }

  return {
    startMinute: firstEntry.startMinute,
    endMinute: lastEntry.endMinute
  }
}
