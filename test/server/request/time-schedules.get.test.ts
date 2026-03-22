// @vitest-environment node

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { queryRawMock, requireAuthenticatedUserMock } = vi.hoisted(() => {
  ;(globalThis as { defineEventHandler?: unknown }).defineEventHandler = <T>(handler: T): T => handler

  return {
    queryRawMock: vi.fn(),
    requireAuthenticatedUserMock: vi.fn()
  }
})

vi.mock('#server/utils/db', () => {
  return {
    prisma: {
      $queryRaw: queryRawMock
    }
  }
})

vi.mock('#server/utils/require-auth', () => {
  return {
    requireAuthenticatedUser: requireAuthenticatedUserMock
  }
})

let handler: (event: unknown) => Promise<unknown[]>

describe('GET /api/time-schedules', () => {
  beforeAll(async () => {
    const importedModule = await import('../../../server/api/time-schedules.get')
    handler = importedModule.default
  })

  beforeEach(() => {
    queryRawMock.mockReset()
    requireAuthenticatedUserMock.mockReset()
  })

  it('returns mapped schedules list with counts', async () => {
    queryRawMock.mockResolvedValue([
      {
        id: 'schedule-1',
        name: 'Seed MANUAL v1',
        updatedAt: new Date('2026-03-22T13:00:00.000Z'),
        committeesCount: 2,
        itemsCount: 24,
        studentsCount: 20,
        pausesCount: 4
      },
      {
        id: 'schedule-2',
        name: null,
        updatedAt: new Date('2026-03-21T09:30:00.000Z'),
        committeesCount: 1,
        itemsCount: 5,
        studentsCount: 4,
        pausesCount: 1
      }
    ])

    const event = {} as never
    const response = await handler(event)

    expect(requireAuthenticatedUserMock).toHaveBeenCalledTimes(1)
    expect(requireAuthenticatedUserMock).toHaveBeenCalledWith(event)
    expect(queryRawMock).toHaveBeenCalledTimes(1)
    expect(response).toEqual([
      {
        id: 'schedule-1',
        name: 'Seed MANUAL v1',
        updatedAt: '2026-03-22T13:00:00.000Z',
        counts: {
          committees: 2,
          items: 24,
          students: 20,
          pauses: 4
        }
      },
      {
        id: 'schedule-2',
        name: null,
        updatedAt: '2026-03-21T09:30:00.000Z',
        counts: {
          committees: 1,
          items: 5,
          students: 4,
          pauses: 1
        }
      }
    ])
  })

  it('returns an empty list when there are no schedules', async () => {
    queryRawMock.mockResolvedValue([])

    const response = await handler({} as never)

    expect(response).toEqual([])
  })

  it('rejects when user is not authenticated', async () => {
    requireAuthenticatedUserMock.mockImplementation(() => {
      throw new Error('Unauthorized')
    })

    await expect(handler({} as never)).rejects.toThrow('Unauthorized')
    expect(queryRawMock).not.toHaveBeenCalled()
  })
})
