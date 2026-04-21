import { isBefore, isValid, parseISO, startOfDay } from 'date-fns'
import { resolveEditorSpecializationOptionForDepartment } from '#shared/constants/editor'
import {
  EDITOR_CONSECUTIVE_STUDENTS_WITHOUT_PAUSE_ERROR_THRESHOLD,
  EDITOR_STUDENT_END_MINUTE_MAX,
  EDITOR_STUDENT_START_MINUTE_MIN
} from '~/constants/editor-validation-rules'
import type {
  EditorCommitteeValidationFieldKey,
  EditorCommitteeValidationIssue,
  EditorCommitteeValidationIssueCode,
  EditorCommitteeValidationRoomTimeOverlapConflict,
  EditorCommitteeValidationSection,
  EditorCommitteeValidationSectionGroup
} from '~/types/editor'
import type { ScheduleDraftCommittee } from '~/types/schedule-draft'
import { buildCommitteeTimelineEntries, resolveCommitteeTimelineRange } from '~/utils/editor/committee-timeline'

const MIN_START_MINUTE = 0
const MAX_START_MINUTE = 24 * 60 - 1

export const EDITOR_COMMITTEE_VALIDATION_SECTION_ORDER: EditorCommitteeValidationSection[] = [
  'BASICS',
  'STUDY',
  'MEMBERS',
  'INVIGILATORS'
]

function isBlankText(value: unknown): boolean {
  return typeof value !== 'string' || value.trim().length < 1
}

function buildIssueId(
  committeeId: string,
  fieldKey: EditorCommitteeValidationFieldKey,
  code: EditorCommitteeValidationIssueCode,
  suffix?: string
): string {
  return suffix ? `${committeeId}:${fieldKey}:${code}:${suffix}` : `${committeeId}:${fieldKey}:${code}`
}

function createIssue(
  committeeId: string,
  section: EditorCommitteeValidationSection,
  fieldKey: EditorCommitteeValidationFieldKey,
  code: EditorCommitteeValidationIssueCode,
  options: {
    suffix?: string
    invigilatorIndex?: number
    invigilatorLocalId?: string
    overlapRoom?: string
    overlapConflicts?: EditorCommitteeValidationRoomTimeOverlapConflict[]
  } = {}
): EditorCommitteeValidationIssue {
  return {
    issueId: buildIssueId(committeeId, fieldKey, code, options.suffix),
    committeeId,
    section,
    fieldKey,
    code,
    severity: 'error',
    invigilatorIndex: options.invigilatorIndex,
    invigilatorLocalId: options.invigilatorLocalId,
    overlapRoom: options.overlapRoom,
    overlapConflicts: options.overlapConflicts
  }
}

function appendRequiredIssue(
  issues: EditorCommitteeValidationIssue[],
  committeeId: string,
  section: EditorCommitteeValidationSection,
  fieldKey: EditorCommitteeValidationFieldKey
): void {
  issues.push(createIssue(committeeId, section, fieldKey, 'REQUIRED'))
}

function isStudyLanguageValid(language: unknown): boolean {
  return language === 'CZECH' || language === 'ENGLISH'
}

function isStudyProgramTypeValid(studyProgramType: unknown): boolean {
  return studyProgramType === 'BACHELOR' || studyProgramType === 'MASTER'
}

function collectBasicsIssues(committee: ScheduleDraftCommittee, issues: EditorCommitteeValidationIssue[]): void {
  if (isBlankText(committee.name)) {
    appendRequiredIssue(issues, committee.localId, 'BASICS', 'name')
  }

  if (!isStudyLanguageValid(committee.language)) {
    issues.push(createIssue(committee.localId, 'BASICS', 'language', 'INVALID_VALUE'))
  }

  if (isBlankText(committee.date)) {
    appendRequiredIssue(issues, committee.localId, 'BASICS', 'date')
  } else {
    const parsedDate = parseISO(committee.date)
    if (!isValid(parsedDate)) {
      issues.push(createIssue(committee.localId, 'BASICS', 'date', 'INVALID_DATE'))
    } else if (isBefore(startOfDay(parsedDate), startOfDay(new Date()))) {
      issues.push(createIssue(committee.localId, 'BASICS', 'date', 'DATE_IN_PAST'))
    }
  }

  if (
    !Number.isInteger(committee.startMinute) ||
    committee.startMinute < MIN_START_MINUTE ||
    committee.startMinute > MAX_START_MINUTE
  ) {
    issues.push(createIssue(committee.localId, 'BASICS', 'startMinute', 'INVALID_START_MINUTE'))
  }

  if (isBlankText(committee.room)) {
    appendRequiredIssue(issues, committee.localId, 'BASICS', 'room')
  }

  if (isBlankText(committee.secretaryName)) {
    appendRequiredIssue(issues, committee.localId, 'BASICS', 'secretary')
  }
}

function collectCommitteeTimelineIssues(
  committee: ScheduleDraftCommittee,
  issues: EditorCommitteeValidationIssue[]
): void {
  const timelineEntries = buildCommitteeTimelineEntries(committee)
  const hasValidStartMinute =
    Number.isInteger(committee.startMinute) &&
    committee.startMinute >= MIN_START_MINUTE &&
    committee.startMinute <= MAX_START_MINUTE

  if (
    hasValidStartMinute &&
    timelineEntries.some(
      (timelineEntry) => timelineEntry.kind === 'STUDENT' && timelineEntry.startMinute < EDITOR_STUDENT_START_MINUTE_MIN
    )
  ) {
    issues.push(createIssue(committee.localId, 'BASICS', 'startMinute', 'STUDENT_START_BEFORE_ALLOWED_TIME'))
  }

  if (
    hasValidStartMinute &&
    timelineEntries.some(
      (timelineEntry) => timelineEntry.kind === 'STUDENT' && timelineEntry.endMinute > EDITOR_STUDENT_END_MINUTE_MAX
    )
  ) {
    issues.push(createIssue(committee.localId, 'BASICS', 'startMinute', 'STUDENT_END_AFTER_ALLOWED_TIME'))
  }

  let consecutiveStudentsCount = 0
  for (const timelineEntry of timelineEntries) {
    if (timelineEntry.kind === 'STUDENT') {
      consecutiveStudentsCount += 1

      if (consecutiveStudentsCount >= EDITOR_CONSECUTIVE_STUDENTS_WITHOUT_PAUSE_ERROR_THRESHOLD) {
        issues.push(createIssue(committee.localId, 'BASICS', 'timeline', 'CONSECUTIVE_STUDENTS_WITHOUT_PAUSE'))
        return
      }

      continue
    }

    consecutiveStudentsCount = 0
  }
}

function collectStudyIssues(committee: ScheduleDraftCommittee, issues: EditorCommitteeValidationIssue[]): void {
  const hasValidStudyProgramType = isStudyProgramTypeValid(committee.studyProgramType)
  if (!hasValidStudyProgramType) {
    issues.push(createIssue(committee.localId, 'STUDY', 'studyProgramType', 'INVALID_VALUE'))
  }

  if (isBlankText(committee.studyProgramName)) {
    appendRequiredIssue(issues, committee.localId, 'STUDY', 'studyProgramName')
  }

  if (isBlankText(committee.specializationCode)) {
    appendRequiredIssue(issues, committee.localId, 'STUDY', 'specializationCode')
  }

  const hasStudyProgramName = !isBlankText(committee.studyProgramName)
  const hasSpecializationCode = !isBlankText(committee.specializationCode)
  if (!hasValidStudyProgramType || !hasStudyProgramName || !hasSpecializationCode) {
    return
  }

  const resolvedDepartment = resolveEditorSpecializationOptionForDepartment(
    committee.studyProgramType,
    committee.studyProgramName,
    committee.specializationCode
  )
  if (!resolvedDepartment) {
    issues.push(createIssue(committee.localId, 'STUDY', 'department', 'UNRESOLVED_DEPARTMENT'))
  }
}

function collectMembersIssues(committee: ScheduleDraftCommittee, issues: EditorCommitteeValidationIssue[]): void {
  if (isBlankText(committee.chairName)) {
    appendRequiredIssue(issues, committee.localId, 'MEMBERS', 'chair')
  }

  if (isBlankText(committee.viceChairName)) {
    appendRequiredIssue(issues, committee.localId, 'MEMBERS', 'viceChair')
  }

  if (isBlankText(committee.member1Name)) {
    appendRequiredIssue(issues, committee.localId, 'MEMBERS', 'member1')
  }

  if (isBlankText(committee.member2Name)) {
    appendRequiredIssue(issues, committee.localId, 'MEMBERS', 'member2')
  }

  if (isBlankText(committee.member3Name)) {
    appendRequiredIssue(issues, committee.localId, 'MEMBERS', 'member3')
  }
}

function collectInvigilatorsIssues(committee: ScheduleDraftCommittee, issues: EditorCommitteeValidationIssue[]): void {
  if (isBlankText(committee.preparationRoom)) {
    appendRequiredIssue(issues, committee.localId, 'INVIGILATORS', 'preparationRoom')
  }

  if (committee.invigilators.length < 1) {
    issues.push(createIssue(committee.localId, 'INVIGILATORS', 'invigilators', 'MIN_INVIGILATORS'))
    return
  }

  committee.invigilators.forEach((invigilator, index) => {
    if (!isBlankText(invigilator.name)) {
      return
    }

    issues.push(
      createIssue(committee.localId, 'INVIGILATORS', 'invigilatorName', 'REQUIRED', {
        suffix: invigilator.localId,
        invigilatorIndex: index,
        invigilatorLocalId: invigilator.localId
      })
    )
  })
}

interface CommitteeTimelineWindow {
  committeeId: string
  dayKey: number
  roomKey: string
  roomLabel: string
  startMinute: number
  endMinute: number
}

function normalizeRoomKey(room: string | null): string | null {
  if (typeof room !== 'string') {
    return null
  }

  const normalizedRoom = room.trim()
  if (normalizedRoom.length < 1) {
    return null
  }

  return normalizedRoom.toLocaleLowerCase('cs-CZ')
}

function resolveCommitteeTimelineWindow(committee: ScheduleDraftCommittee): CommitteeTimelineWindow | null {
  const roomKey = normalizeRoomKey(committee.room)
  if (!roomKey) {
    return null
  }

  const roomLabel = committee.room?.trim() ?? ''
  if (roomLabel.length < 1) {
    return null
  }

  if (
    !Number.isInteger(committee.startMinute) ||
    committee.startMinute < MIN_START_MINUTE ||
    committee.startMinute > MAX_START_MINUTE
  ) {
    return null
  }

  const parsedDate = parseISO(committee.date)
  if (!isValid(parsedDate)) {
    return null
  }

  const timelineRange = resolveCommitteeTimelineRange(committee)
  if (!timelineRange || timelineRange.endMinute <= timelineRange.startMinute) {
    return null
  }

  return {
    committeeId: committee.localId,
    dayKey: startOfDay(parsedDate).getTime(),
    roomKey,
    roomLabel,
    startMinute: timelineRange.startMinute,
    endMinute: timelineRange.endMinute
  }
}

function collectRoomTimelineOverlapIssues(
  draftCommittees: ScheduleDraftCommittee[],
  issues: EditorCommitteeValidationIssue[]
): void {
  const timelineWindows = draftCommittees.flatMap((committee) => {
    const window = resolveCommitteeTimelineWindow(committee)
    return window ? [window] : []
  })

  const windowsByRoomAndDay = new Map<string, CommitteeTimelineWindow[]>()
  const roomByCommitteeId = new Map<string, string>()

  for (const window of timelineWindows) {
    const groupKey = `${window.dayKey}|${window.roomKey}`
    const groupWindows = windowsByRoomAndDay.get(groupKey) ?? []
    groupWindows.push(window)
    windowsByRoomAndDay.set(groupKey, groupWindows)
    roomByCommitteeId.set(window.committeeId, window.roomLabel)
  }

  for (const groupWindows of windowsByRoomAndDay.values()) {
    const orderedWindows = groupWindows
      .slice()
      .sort(
        (left, right) =>
          left.startMinute - right.startMinute ||
          left.endMinute - right.endMinute ||
          left.committeeId.localeCompare(right.committeeId, 'cs')
      )

    for (let leftIndex = 0; leftIndex < orderedWindows.length; leftIndex += 1) {
      const leftWindow = orderedWindows[leftIndex]
      if (!leftWindow) {
        continue
      }

      for (let rightIndex = leftIndex + 1; rightIndex < orderedWindows.length; rightIndex += 1) {
        const rightWindow = orderedWindows[rightIndex]
        if (!rightWindow) {
          continue
        }

        if (rightWindow.startMinute >= leftWindow.endMinute) {
          break
        }

        const hasOverlap =
          leftWindow.startMinute < rightWindow.endMinute && rightWindow.startMinute < leftWindow.endMinute
        if (!hasOverlap) {
          continue
        }

        const overlapStartMinute = Math.max(leftWindow.startMinute, rightWindow.startMinute)
        const overlapEndMinute = Math.min(leftWindow.endMinute, rightWindow.endMinute)
        const leftConflict: EditorCommitteeValidationRoomTimeOverlapConflict = {
          committeeId: rightWindow.committeeId,
          overlapStartMinute,
          overlapEndMinute
        }
        const rightConflict: EditorCommitteeValidationRoomTimeOverlapConflict = {
          committeeId: leftWindow.committeeId,
          overlapStartMinute,
          overlapEndMinute
        }

        issues.push(
          createIssue(leftWindow.committeeId, 'BASICS', 'timeline', 'ROOM_TIME_OVERLAP', {
            suffix: `${rightWindow.committeeId}-${overlapStartMinute}-${overlapEndMinute}`,
            overlapRoom: roomByCommitteeId.get(leftWindow.committeeId),
            overlapConflicts: [leftConflict]
          })
        )
        issues.push(
          createIssue(rightWindow.committeeId, 'BASICS', 'timeline', 'ROOM_TIME_OVERLAP', {
            suffix: `${leftWindow.committeeId}-${overlapStartMinute}-${overlapEndMinute}`,
            overlapRoom: roomByCommitteeId.get(rightWindow.committeeId),
            overlapConflicts: [rightConflict]
          })
        )
      }
    }
  }
}

export function collectCommitteeValidationIssues(
  draftCommittees: ScheduleDraftCommittee[]
): EditorCommitteeValidationIssue[] {
  const issues: EditorCommitteeValidationIssue[] = []

  draftCommittees.forEach((committee) => {
    collectBasicsIssues(committee, issues)
    collectStudyIssues(committee, issues)
    collectMembersIssues(committee, issues)
    collectInvigilatorsIssues(committee, issues)
    collectCommitteeTimelineIssues(committee, issues)
  })
  collectRoomTimelineOverlapIssues(draftCommittees, issues)

  return issues
}

export function groupCommitteeValidationIssuesByCommitteeId(
  issues: EditorCommitteeValidationIssue[]
): Record<string, EditorCommitteeValidationIssue[]> {
  const groupedIssues: Record<string, EditorCommitteeValidationIssue[]> = {}

  issues.forEach((issue) => {
    const committeeIssues = groupedIssues[issue.committeeId] ?? []
    committeeIssues.push(issue)
    groupedIssues[issue.committeeId] = committeeIssues
  })

  return groupedIssues
}

export function countCommitteeValidationIssuesByCommitteeId(
  issuesByCommitteeId: Record<string, EditorCommitteeValidationIssue[]>
): Record<string, number> {
  const countByCommitteeId: Record<string, number> = {}

  Object.entries(issuesByCommitteeId).forEach(([committeeId, issues]) => {
    countByCommitteeId[committeeId] = issues.length
  })

  return countByCommitteeId
}

export function groupCommitteeValidationIssuesBySection(
  issues: EditorCommitteeValidationIssue[]
): EditorCommitteeValidationSectionGroup[] {
  const issuesBySection = new Map<EditorCommitteeValidationSection, EditorCommitteeValidationIssue[]>()

  issues.forEach((issue) => {
    const sectionIssues = issuesBySection.get(issue.section) ?? []
    sectionIssues.push(issue)
    issuesBySection.set(issue.section, sectionIssues)
  })

  return EDITOR_COMMITTEE_VALIDATION_SECTION_ORDER.flatMap((section) => {
    const sectionIssues = issuesBySection.get(section) ?? []
    if (sectionIssues.length < 1) {
      return []
    }

    return [{ section, issues: sectionIssues }]
  })
}
