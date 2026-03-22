import { createError, isError, readBody, setResponseStatus } from 'h3'
import { Prisma } from '~~/prisma/generated/client/client'
import { prisma } from '#server/utils/db'
import { requireAuthenticatedUser } from '#server/utils/require-auth'
import type {
  PostCommitteeDto,
  PostCommitteeItemDto,
  PostTimeScheduleRequestDto,
  PostTimeScheduleResponseDto
} from '#shared/types/time-schedules'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasForbiddenIdFields(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) => hasForbiddenIdFields(entry))
  }

  if (!isRecord(value)) {
    return false
  }

  if ('id' in value || 'timeScheduleId' in value || 'committeeId' in value || 'itemId' in value) {
    return true
  }

  return Object.values(value).some((entry) => hasForbiddenIdFields(entry))
}

function parsePostTimeSchedulePayload(payload: unknown): PostTimeScheduleRequestDto {
  if (!isRecord(payload) || !Array.isArray(payload.committees) || !('type' in payload)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid time schedule payload'
    })
  }

  if ('createdAt' in payload || 'updatedAt' in payload) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Timestamps must not be sent in request body'
    })
  }

  if (hasForbiddenIdFields(payload)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Id fields must not be sent in request body'
    })
  }

  return payload as unknown as PostTimeScheduleRequestDto
}

function mapItemCreateData(item: PostCommitteeItemDto): Prisma.CommitteeItemCreateWithoutCommitteeInput {
  if (item.type === 'STUDENT') {
    return {
      type: 'STUDENT',
      position: item.position,
      student: {
        create: {
          personalNumber: item.student.personalNumber,
          firstName: item.student.firstName,
          lastName: item.student.lastName,
          email: item.student.email,
          mobilePhone: item.student.mobilePhone,
          titlesBefore: item.student.titlesBefore,
          titlesAfter: item.student.titlesAfter,
          specialization: item.student.specialization,
          thesisTitleLocal: item.student.thesisTitleLocal,
          thesisTitleEn: item.student.thesisTitleEn,
          thesisLanguage: item.student.thesisLanguage,
          supervisorName: item.student.supervisorName,
          reviewerName: item.student.reviewerName,
          repeatType: item.student.repeatType,
          elsa: item.student.elsa,
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
    code: committee.code,
    sortOrder: committee.sortOrder,
    startMinute: committee.startMinute,
    date: new Date(committee.date),
    room: committee.room,
    secretaryName: committee.secretaryName,
    invigilators: committee.invigilators,
    items: {
      create: committee.items.map((item) => mapItemCreateData(item))
    }
  }
}

function normalizeWriteError(error: unknown): never {
  if (isError(error)) {
    throw error
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid time schedule payload'
    })
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Payload conflicts with existing unique constraints'
      })
    }

    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid time schedule payload'
    })
  }

  throw createError({
    statusCode: 500,
    statusMessage: 'Failed to create time schedule'
  })
}

export default defineEventHandler(async (event): Promise<PostTimeScheduleResponseDto> => {
  requireAuthenticatedUser(event)

  const payload = parsePostTimeSchedulePayload(await readBody<unknown>(event))

  try {
    const createdSchedule = await prisma.timeSchedule.create({
      data: {
        name: payload.name,
        type: payload.type,
        committees: {
          create: payload.committees.map((committee) => mapCommitteeCreateData(committee))
        }
      },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true
      }
    })

    setResponseStatus(event, 201)

    return {
      id: createdSchedule.id,
      createdAt: createdSchedule.createdAt.toISOString(),
      updatedAt: createdSchedule.updatedAt.toISOString()
    }
  } catch (error: unknown) {
    normalizeWriteError(error)
  }
})
