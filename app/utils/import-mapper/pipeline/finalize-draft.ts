import type { PostCommitteeDto, PostCommitteeItemDto } from '#shared/types/time-schedules'
import type { DraftScheduleSource } from '~/types/schedule-draft'
import { normalizeWhitespace } from '~/utils/import-mapper/core/normalize'
import type { MappedStudentPlacement } from '~/utils/import-mapper/core/types'

interface FinalizeDraftInput {
  scheduleName: string
  committees: PostCommitteeDto[]
  mappedStudents: MappedStudentPlacement[]
}

export function finalizeDraft(input: FinalizeDraftInput): DraftScheduleSource {
  const mappedStudentsByCommittee = new Map<string, MappedStudentPlacement[]>()
  for (const mappedStudent of input.mappedStudents) {
    const existingStudents = mappedStudentsByCommittee.get(mappedStudent.committeeName) ?? []
    existingStudents.push(mappedStudent)
    mappedStudentsByCommittee.set(mappedStudent.committeeName, existingStudents)
  }

  const committees = input.committees.map((committee) => {
    const sortedCommitteeStudents = (mappedStudentsByCommittee.get(committee.name) ?? [])
      .slice()
      .sort((left, right) => left.studentsCommitteesRowNumber - right.studentsCommitteesRowNumber)

    const items: PostCommitteeItemDto[] = sortedCommitteeStudents.map((entry, index) => ({
      type: 'STUDENT',
      position: index + 1,
      student: entry.student,
      pause: null
    }))

    return {
      ...committee,
      items
    }
  })

  return {
    name: normalizeWhitespace(input.scheduleName),
    type: 'MANUAL',
    committees
  }
}
