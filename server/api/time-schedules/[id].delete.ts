import { createError, setResponseStatus } from 'h3'
import { Prisma } from '~~/prisma/generated/client/client'
import { prisma } from '#server/utils/db'
import { requireAuthenticatedUser } from '#server/utils/require-auth'

export default defineEventHandler(async (event): Promise<void> => {
  requireAuthenticatedUser(event)

  try {
    await prisma.timeSchedule.delete({
      where: {
        id: event.context.params!.id
      },
      select: {
        id: true
      }
    })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw createError({
        statusCode: 404,
        statusMessage: 'Time schedule not found'
      })
    }

    throw error
  }

  setResponseStatus(event, 204)
})
