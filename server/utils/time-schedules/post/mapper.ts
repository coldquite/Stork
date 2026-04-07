import type { Prisma } from '~~/prisma/generated/client/client'
import type { PostCommitteeDto, PostCommitteeItemDto, PostTimeScheduleRequestDto } from '#shared/types/time-schedules'

const PRAGUE_DATE_FORMATTER = new Intl.DateTimeFormat('en', {
  timeZone: 'Europe/Prague',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

function parseDatePart(parts: Intl.DateTimeFormatPart[], type: 'year' | 'month' | 'day'): number {
  const part = parts.find((entry) => entry.type === type)?.value

  if (!part) {
    throw new Error(`thesisSubmissionAt normalization failed for missing "${type}"`)
  }

  const parsedValue = Number.parseInt(part, 10)
  if (!Number.isSafeInteger(parsedValue)) {
    throw new Error(`thesisSubmissionAt normalization failed for invalid "${type}"`)
  }

  return parsedValue
}

function normalizeDateTimeToPragueDayStart(value: string): Date {
  const parsedDate = new Date(value)
  const dateParts = PRAGUE_DATE_FORMATTER.formatToParts(parsedDate)
  const year = parseDatePart(dateParts, 'year')
  const month = parseDatePart(dateParts, 'month')
  const day = parseDatePart(dateParts, 'day')

  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
}

function mapItemCreateData(item: PostCommitteeItemDto): Prisma.CommitteeItemCreateWithoutCommitteeInput {
  if (item.type === 'STUDENT') {
    return {
      type: 'STUDENT',
      position: item.position,
      student: {
        create: {
          firstName: item.student.firstName,
          lastName: item.student.lastName,
          titlesBefore: item.student.titlesBefore,
          titlesAfter: item.student.titlesAfter,
          thesisTitleLocal: item.student.thesisTitleLocal,
          thesisTitleEn: item.student.thesisTitleEn,
          thesisLanguage: item.student.thesisLanguage,
          supervisorName: item.student.supervisorName,
          reviewerName: item.student.reviewerName,
          additionalSupervisorName: item.student.additionalSupervisorName,
          additionalReviewerName: item.student.additionalReviewerName,
          studyProgramName: item.student.studyProgramName,
          studyProgramType: item.student.studyProgramType,
          specializationName: item.student.specializationName,
          specializationCode: item.student.specializationCode,
          studyLanguage: item.student.studyLanguage,
          thesisSubmissionAt:
            item.student.thesisSubmissionAt !== null
              ? normalizeDateTimeToPragueDayStart(item.student.thesisSubmissionAt)
              : null,
          repeatType: item.student.repeatType,
          prepareMinutes: item.student.prepareMinutes,
          examMinutes: item.student.examMinutes
        }
      }
    }
  }

  return {
    type: 'PAUSE',
    position: item.position,
    pause: {
      create: {
        label: item.pause.label,
        durationMinutes: item.pause.durationMinutes
      }
    }
  }
}

function mapCommitteeCreateData(committee: PostCommitteeDto): Prisma.CommitteeCreateWithoutTimeScheduleInput {
  return {
    name: committee.name,
    startMinute: committee.startMinute,
    date: new Date(committee.date),
    room: committee.room,
    secretaryName: committee.secretaryName,
    invigilators: committee.invigilators,
    language: committee.language,
    studyProgramName: committee.studyProgramName,
    studyProgramType: committee.studyProgramType,
    specializationName: committee.specializationName,
    specializationCode: committee.specializationCode,
    defenseDepartmentCode: committee.defenseDepartmentCode,
    defenseDepartmentName: committee.defenseDepartmentName,
    chairName: committee.chairName,
    viceChairName: committee.viceChairName,
    member1Name: committee.member1Name,
    member2Name: committee.member2Name,
    member3Name: committee.member3Name,
    items: {
      create: committee.items.map((item) => mapItemCreateData(item))
    }
  }
}

export function mapTimeScheduleCreateData(payload: PostTimeScheduleRequestDto): Prisma.TimeScheduleCreateInput {
  return {
    name: payload.name,
    type: payload.type,
    committees: {
      create: payload.committees.map((committee) => mapCommitteeCreateData(committee))
    }
  }
}
