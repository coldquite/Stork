import { addMinutes, format, startOfDay, subMinutes } from 'date-fns'
import type { StudyLanguageDto } from '#shared/types/time-schedules'
import { STUDENT_EXAM_GAP_MINUTES } from '~/constants/editor-students-table'
import type { EditorPauseTableRow, EditorStudentTableRow, EditorTableRow } from '~/types/editor'
import type { ScheduleDraftCommittee, ScheduleDraftItem } from '~/types/schedule-draft'
import { isPauseItem, isStudentItem } from '~/utils/editor/draft-committee'

const REFERENCE_DAY_START = startOfDay(new Date(0))

function formatMinuteOfDay(minuteOfDay: number): string {
  return format(addMinutes(REFERENCE_DAY_START, minuteOfDay), 'HH:mm')
}

function formatPrepareTime(examStartMinute: number, prepareMinutes: number): string {
  return format(subMinutes(addMinutes(REFERENCE_DAY_START, examStartMinute), prepareMinutes), 'HH:mm')
}

function resolveThesisTitleByCommitteeLanguage(
  student: ScheduleDraftItem & { type: 'STUDENT' },
  committeeLanguage: StudyLanguageDto
): string {
  const localTitle = resolveLocalThesisTitle(student)
  const englishTitle = resolveEnglishThesisTitle(student)

  if (committeeLanguage === 'ENGLISH') {
    return englishTitle || localTitle
  }

  return localTitle || englishTitle
}

function resolveLocalThesisTitle(student: ScheduleDraftItem & { type: 'STUDENT' }): string {
  const localTitle = student.student.thesisTitleLocal.trim()
  const englishTitle = student.student.thesisTitleEn.trim()
  return localTitle || englishTitle
}

function resolveEnglishThesisTitle(student: ScheduleDraftItem & { type: 'STUDENT' }): string {
  const localTitle = student.student.thesisTitleLocal.trim()
  const englishTitle = student.student.thesisTitleEn.trim()
  return englishTitle || localTitle
}

function buildStudentRow(
  item: ScheduleDraftItem & { type: 'STUDENT' },
  committeeLanguage: StudyLanguageDto,
  examStartMinute: number,
  examEndMinute: number,
  studentOrder: number
): EditorStudentTableRow {
  return {
    kind: 'STUDENT',
    id: item.localId,
    studentOrder,
    prepareTime: formatPrepareTime(examStartMinute, item.student.prepareMinutes),
    examTime: `${formatMinuteOfDay(examStartMinute)} - ${formatMinuteOfDay(examEndMinute)}`,
    titlesBefore: item.student.titlesBefore?.trim() ?? '',
    lastName: item.student.lastName,
    firstName: item.student.firstName,
    email: item.student.email?.trim() ?? '',
    titlesAfter: item.student.titlesAfter?.trim() ?? '',
    studyLanguage: item.student.studyLanguage,
    studyProgramType: item.student.studyProgramType,
    studyProgramName: item.student.studyProgramName,
    specializationCode: item.student.specializationCode,
    thesisTitle: resolveThesisTitleByCommitteeLanguage(item, committeeLanguage),
    thesisTitleLocal: resolveLocalThesisTitle(item),
    thesisTitleEn: resolveEnglishThesisTitle(item),
    thesisLanguage: item.student.thesisLanguage,
    supervisorName: item.student.supervisorName,
    additionalSupervisorName: item.student.additionalSupervisorName?.trim() ?? '',
    reviewerName: item.student.reviewerName,
    additionalReviewerName: item.student.additionalReviewerName?.trim() ?? '',
    repeatType: item.student.repeatType,
    prepareMinutes: item.student.prepareMinutes,
    examMinutes: item.student.examMinutes
  }
}

function buildPauseRow(
  item: ScheduleDraftItem & { type: 'PAUSE' },
  pauseStartMinute: number,
  pauseEndMinute: number
): EditorPauseTableRow {
  const startTime = formatMinuteOfDay(pauseStartMinute)
  const endTime = formatMinuteOfDay(pauseEndMinute)

  return {
    kind: 'PAUSE',
    id: item.localId,
    label: item.pause.label,
    pauseType: item.pause.pauseType,
    durationMinutes: item.pause.durationMinutes,
    startTime,
    endTime,
    rangeLabel: `${startTime} - ${endTime}`
  }
}

export function buildEditorTableRowsForCommittee(committee: ScheduleDraftCommittee): EditorTableRow[] {
  const orderedItems = committee.items.slice().sort((left, right) => left.position - right.position)
  const rows: EditorTableRow[] = []
  let currentMinute = committee.startMinute
  let studentOrder = 0

  for (const [index, item] of orderedItems.entries()) {
    if (isPauseItem(item)) {
      const pauseStartMinute = currentMinute
      const pauseEndMinute = pauseStartMinute + item.pause.durationMinutes
      rows.push(buildPauseRow(item, pauseStartMinute, pauseEndMinute))
      currentMinute += item.pause.durationMinutes
      continue
    }

    if (!isStudentItem(item)) {
      continue
    }

    studentOrder += 1
    const examStartMinute = currentMinute
    const examEndMinute = examStartMinute + item.student.examMinutes
    const nextItem = orderedItems[index + 1]

    rows.push(buildStudentRow(item, committee.language, examStartMinute, examEndMinute, studentOrder))

    currentMinute = examEndMinute
    if (nextItem && isStudentItem(nextItem)) {
      currentMinute += STUDENT_EXAM_GAP_MINUTES
    }
  }

  return rows
}

export function buildStudentRowsForCommittee(committee: ScheduleDraftCommittee): EditorStudentTableRow[] {
  return buildEditorTableRowsForCommittee(committee).filter(
    (row): row is EditorStudentTableRow => row.kind === 'STUDENT'
  )
}
