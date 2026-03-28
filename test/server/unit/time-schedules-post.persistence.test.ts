// @vitest-environment node

import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Prisma } from '~~/prisma/generated/client/client'
import type { PostTimeScheduleRequestDto } from '#shared/types/time-schedules'
import { createTimeSchedule } from '#server/utils/time-schedules/post/persistence'

const { prismaCreateMock, mapTimeScheduleCreateDataMock } = vi.hoisted(() => ({
  prismaCreateMock: vi.fn(),
  mapTimeScheduleCreateDataMock: vi.fn()
}))

vi.mock('#server/utils/db', () => ({
  prisma: {
    timeSchedule: {
      create: prismaCreateMock
    }
  }
}))

vi.mock('#server/utils/time-schedules/post/mapper', () => ({
  mapTimeScheduleCreateData: mapTimeScheduleCreateDataMock
}))

function createPayload(): PostTimeScheduleRequestDto {
  return {
    name: 'Nový plán',
    type: 'MANUAL',
    committees: []
  }
}

function createPrismaKnownRequestError(code: string): Prisma.PrismaClientKnownRequestError {
  const error = Object.create(Prisma.PrismaClientKnownRequestError.prototype) as Prisma.PrismaClientKnownRequestError
  Object.assign(error, {
    name: 'PrismaClientKnownRequestError',
    code,
    message: `Prisma known error: ${code}`
  })
  return error
}

function createPrismaValidationError(): Prisma.PrismaClientValidationError {
  const error = Object.create(Prisma.PrismaClientValidationError.prototype) as Prisma.PrismaClientValidationError
  Object.assign(error, {
    name: 'PrismaClientValidationError',
    message: 'Prisma validation error'
  })
  return error
}

describe('time-schedules post persistence', () => {
  beforeEach(() => {
    prismaCreateMock.mockReset()
    mapTimeScheduleCreateDataMock.mockReset()
  })

  it('creates schedule and returns response metadata', async () => {
    const payload = createPayload()
    const mappedData = { name: payload.name, type: payload.type, committees: { create: [] } }
    const createdAt = new Date('2026-06-10T08:00:00.000Z')

    mapTimeScheduleCreateDataMock.mockReturnValueOnce(mappedData)
    prismaCreateMock.mockResolvedValueOnce({
      id: 'schedule-1',
      createdAt
    })

    const response = await createTimeSchedule(payload)

    expect(mapTimeScheduleCreateDataMock).toHaveBeenCalledWith(payload)
    expect(prismaCreateMock).toHaveBeenCalledWith({
      data: mappedData,
      select: {
        id: true,
        createdAt: true
      }
    })
    expect(response).toEqual({
      id: 'schedule-1',
      createdAt: createdAt.toISOString()
    })
  })

  it('rethrows h3 errors unchanged', async () => {
    const h3Error = createError({
      statusCode: 418,
      statusMessage: 'teapot'
    })

    mapTimeScheduleCreateDataMock.mockReturnValueOnce({ name: 'X', type: 'MANUAL', committees: { create: [] } })
    prismaCreateMock.mockRejectedValueOnce(h3Error)

    await expect(createTimeSchedule(createPayload())).rejects.toMatchObject({
      statusCode: 418,
      statusMessage: 'teapot'
    })
  })

  it('maps Prisma validation error to 400', async () => {
    mapTimeScheduleCreateDataMock.mockReturnValueOnce({ name: 'X', type: 'MANUAL', committees: { create: [] } })
    prismaCreateMock.mockRejectedValueOnce(createPrismaValidationError())

    await expect(createTimeSchedule(createPayload())).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Invalid time schedule payload'
    })
  })

  it('maps Prisma P2002 conflict to 409', async () => {
    mapTimeScheduleCreateDataMock.mockReturnValueOnce({ name: 'X', type: 'MANUAL', committees: { create: [] } })
    prismaCreateMock.mockRejectedValueOnce(createPrismaKnownRequestError('P2002'))

    await expect(createTimeSchedule(createPayload())).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'Payload conflicts with existing unique constraints'
    })
  })

  it('maps non-P2002 Prisma known errors to 400', async () => {
    mapTimeScheduleCreateDataMock.mockReturnValueOnce({ name: 'X', type: 'MANUAL', committees: { create: [] } })
    prismaCreateMock.mockRejectedValueOnce(createPrismaKnownRequestError('P2003'))

    await expect(createTimeSchedule(createPayload())).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Invalid time schedule payload'
    })
  })

  it('maps unknown errors to 500', async () => {
    mapTimeScheduleCreateDataMock.mockReturnValueOnce({ name: 'X', type: 'MANUAL', committees: { create: [] } })
    prismaCreateMock.mockRejectedValueOnce(new Error('Unexpected DB failure'))

    await expect(createTimeSchedule(createPayload())).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Failed to create time schedule'
    })
  })
})
