import { createError } from 'h3'
import { prisma } from '#server/utils/db'
import { requireAuthenticatedUser } from '#server/utils/require-auth'
import type { TimeScheduleDto } from '#shared/types/time-schedules'

export default defineEventHandler(async (event): Promise<TimeScheduleDto> => {
  requireAuthenticatedUser(event)

  const timeScheduleId = event.context.params!.id!

  const schedule = await prisma.timeSchedule.findUnique({
    where: {
      id: timeScheduleId
    },
    include: {
      committees: {
        orderBy: {
          sortOrder: 'asc'
        },
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
    updatedAt: schedule.updatedAt.toISOString(),
    committees: schedule.committees.map((committee) => ({
      id: committee.id,
      timeScheduleId: committee.timeScheduleId,
      code: committee.code,
      sortOrder: committee.sortOrder,
      startMinute: committee.startMinute,
      date: committee.date.toISOString(),
      room: committee.room,
      secretaryName: committee.secretaryName,
      invigilators: committee.invigilators,
      items: committee.items.map((item) => {
        if (item.type === 'STUDENT') {
          return {
            id: item.id,
            committeeId: item.committeeId,
            type: 'STUDENT',
            position: item.position,
            student: {
              itemId: item.student!.itemId,
              personalNumber: item.student!.personalNumber,
              firstName: item.student!.firstName,
              lastName: item.student!.lastName,
              email: item.student!.email,
              mobilePhone: item.student!.mobilePhone,
              titlesBefore: item.student!.titlesBefore,
              titlesAfter: item.student!.titlesAfter,
              specialization: item.student!.specialization,
              thesisTitleLocal: item.student!.thesisTitleLocal,
              thesisTitleEn: item.student!.thesisTitleEn,
              thesisLanguage: item.student!.thesisLanguage,
              supervisorName: item.student!.supervisorName,
              reviewerName: item.student!.reviewerName,
              repeatType: item.student!.repeatType,
              elsa: item.student!.elsa,
              prepareMinutes: item.student!.prepareMinutes,
              examMinutes: item.student!.examMinutes
            },
            pause: null
          }
        }

        return {
          id: item.id,
          committeeId: item.committeeId,
          type: 'PAUSE',
          position: item.position,
          student: null,
          pause: {
            itemId: item.pause!.itemId,
            label: item.pause!.label,
            durationMinutes: item.pause!.durationMinutes
          }
        }
      })
    }))
  }
})
