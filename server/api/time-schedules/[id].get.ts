import { createError } from 'h3'
import { prisma } from '#server/utils/db'
import { requireAuthenticatedUser } from '#server/utils/require-auth'
import type { TimeScheduleDto } from '#shared/types/time-schedules'

function invalidStoredScheduleData(reason: string): never {
  throw createError({
    statusCode: 500,
    statusMessage: `Invalid stored schedule data: ${reason}`
  })
}

async function getTimeScheduleWithTree(scheduleId: string) {
  return prisma.timeSchedule.findUnique({
    where: {
      id: scheduleId
    },
    include: {
      committees: {
        orderBy: [{ date: 'asc' }, { startMinute: 'asc' }, { id: 'asc' }],
        include: {
          items: {
            orderBy: {
              position: 'asc'
            },
            include: {
              student: true,
              pause: true
            }
          }
        }
      }
    }
  })
}

type LoadedTimeSchedule = NonNullable<Awaited<ReturnType<typeof getTimeScheduleWithTree>>>
type LoadedCommittee = LoadedTimeSchedule['committees'][number]
type LoadedCommitteeItem = LoadedCommittee['items'][number]

function mapCommitteeItemToDto(item: LoadedCommitteeItem): TimeScheduleDto['committees'][number]['items'][number] {
  if (item.type === 'STUDENT') {
    if (!item.student) {
      invalidStoredScheduleData(`item ${item.id} is STUDENT but student relation is missing`)
    }

    if (item.pause !== null) {
      invalidStoredScheduleData(`item ${item.id} is STUDENT but pause relation is present`)
    }

    return {
      id: item.id,
      committeeId: item.committeeId,
      type: 'STUDENT' as const,
      position: item.position,
      student: {
        itemId: item.student.itemId,
        firstName: item.student.firstName,
        lastName: item.student.lastName,
        email: item.student.email,
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
        repeatType: item.student.repeatType,
        prepareMinutes: item.student.prepareMinutes,
        examMinutes: item.student.examMinutes
      },
      pause: null
    }
  }

  if (!item.pause) {
    invalidStoredScheduleData(`item ${item.id} is PAUSE but pause relation is missing`)
  }

  if (item.student !== null) {
    invalidStoredScheduleData(`item ${item.id} is PAUSE but student relation is present`)
  }

  return {
    id: item.id,
    committeeId: item.committeeId,
    type: 'PAUSE' as const,
    position: item.position,
    student: null,
    pause: {
      itemId: item.pause.itemId,
      label: item.pause.label,
      pauseType: item.pause.pauseType,
      durationMinutes: item.pause.durationMinutes
    }
  }
}

function mapCommitteeToDto(committee: LoadedCommittee): TimeScheduleDto['committees'][number] {
  return {
    id: committee.id,
    timeScheduleId: committee.timeScheduleId,
    name: committee.name,
    startMinute: committee.startMinute,
    date: committee.date.toISOString(),
    room: committee.room,
    preparationRoom: committee.preparationRoom,
    secretaryName: committee.secretaryName,
    invigilators: committee.invigilators,
    language: committee.language,
    studyProgramName: committee.studyProgramName,
    studyProgramType: committee.studyProgramType,
    specializationName: committee.specializationName,
    specializationCode: committee.specializationCode,
    chairName: committee.chairName,
    viceChairName: committee.viceChairName,
    member1Name: committee.member1Name,
    member2Name: committee.member2Name,
    member3Name: committee.member3Name,
    items: committee.items.map((item) => mapCommitteeItemToDto(item))
  }
}

export default defineEventHandler(async (event): Promise<TimeScheduleDto> => {
  requireAuthenticatedUser(event)

  const timeScheduleId = event.context.params?.id
  if (!timeScheduleId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing time schedule id'
    })
  }

  const schedule = await getTimeScheduleWithTree(timeScheduleId)

  if (!schedule) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Time schedule not found'
    })
  }

  return {
    id: schedule.id,
    name: schedule.name,
    type: schedule.type,
    createdAt: schedule.createdAt.toISOString(),
    committees: schedule.committees.map((committee) => mapCommitteeToDto(committee))
  }
})
