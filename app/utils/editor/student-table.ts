import { addMinutes, format, startOfDay, subMinutes } from 'date-fns'
import type { StudyLanguageDto } from '#shared/types/time-schedules'
import { STUDENT_EXAM_GAP_MINUTES } from '~/constants/editor-students-table'
import type { StudentRow } from '~/types/editor'
import type { ScheduleDraftCommittee, ScheduleDraftItem } from '~/types/schedule-draft'
import { isStudentItem } from '~/utils/editor/draft-committee'

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

export function buildStudentRowsForCommittee(committee: ScheduleDraftCommittee): StudentRow[] {
  const orderedItems = committee.items.slice().sort((left, right) => left.position - right.position)
  const rows: StudentRow[] = []
  let currentMinute = committee.startMinute

  for (const [index, item] of orderedItems.entries()) {
    if (!isStudentItem(item)) {
      currentMinute += item.pause.durationMinutes
      continue
    }

    const examStartMinute = currentMinute
    const examEndMinute = examStartMinute + item.student.examMinutes
    const nextItem = orderedItems[index + 1]

    rows.push({
      id: item.localId,
      prepareTime: formatPrepareTime(examStartMinute, item.student.prepareMinutes),
      examTime: `${formatMinuteOfDay(examStartMinute)} - ${formatMinuteOfDay(examEndMinute)}`,
      personalNumber: item.student.personalNumber?.trim() ?? '',
      titlesBefore: item.student.titlesBefore?.trim() ?? '',
      lastName: item.student.lastName,
      firstName: item.student.firstName,
      titlesAfter: item.student.titlesAfter?.trim() ?? '',
      specializationCode: item.student.specializationCode,
      thesisTitle: resolveThesisTitleByCommitteeLanguage(item, committee.language),
      thesisTitleLocal: resolveLocalThesisTitle(item),
      thesisTitleEn: resolveEnglishThesisTitle(item),
      supervisorName: item.student.supervisorName,
      reviewerName: item.student.reviewerName,
      repeatType: item.student.repeatType,
      prepareMinutes: item.student.prepareMinutes,
      examMinutes: item.student.examMinutes
    })

    currentMinute = examEndMinute
    if (nextItem && isStudentItem(nextItem)) {
      currentMinute += STUDENT_EXAM_GAP_MINUTES
    }
  }

  return rows
}
