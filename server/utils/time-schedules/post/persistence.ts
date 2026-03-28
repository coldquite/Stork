import { createError, isError } from 'h3'
import { Prisma } from '~~/prisma/generated/client/client'
import { prisma } from '#server/utils/db'
import { mapTimeScheduleCreateData } from '#server/utils/time-schedules/post/mapper'
import type { PostTimeScheduleRequestDto, PostTimeScheduleResponseDto } from '#shared/types/time-schedules'

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

export async function createTimeSchedule(payload: PostTimeScheduleRequestDto): Promise<PostTimeScheduleResponseDto> {
  try {
    const createdSchedule = await prisma.timeSchedule.create({
      data: mapTimeScheduleCreateData(payload),
      select: {
        id: true,
        createdAt: true
      }
    })

    return {
      id: createdSchedule.id,
      createdAt: createdSchedule.createdAt.toISOString()
    }
  } catch (error: unknown) {
    normalizeWriteError(error)
  }
}
