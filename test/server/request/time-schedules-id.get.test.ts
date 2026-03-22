// @vitest-environment node

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { findUniqueMock, requireAuthenticatedUserMock } = vi.hoisted(() => {
  ;(globalThis as { defineEventHandler?: unknown }).defineEventHandler = <T>(handler: T): T => handler

  return {
    findUniqueMock: vi.fn(),
    requireAuthenticatedUserMock: vi.fn()
  }
})

vi.mock('#server/utils/db', () => {
  return {
    prisma: {
      timeSchedule: {
        findUnique: findUniqueMock
      }
    }
  }
})

vi.mock('#server/utils/require-auth', () => {
  return {
    requireAuthenticatedUser: requireAuthenticatedUserMock
  }
})

let handler: (event: { context: { params?: { id?: string } } }) => Promise<unknown>

describe('GET /api/time-schedules/:id', () => {
  beforeAll(async () => {
    const importedModule = await import('../../../server/api/time-schedules/[id].get')
    handler = importedModule.default
  })

  beforeEach(() => {
    findUniqueMock.mockReset()
    requireAuthenticatedUserMock.mockReset()
  })

  it('returns full time schedule graph for editor', async () => {
    findUniqueMock.mockResolvedValue({
      id: 'schedule-1',
      name: 'Seed MANUAL v1',
      type: 'MANUAL',
      createdAt: new Date('2026-03-22T12:00:00.000Z'),
      updatedAt: new Date('2026-03-22T13:00:00.000Z'),
      committees: [
        {
          id: 'committee-1',
          timeScheduleId: 'schedule-1',
          code: '1-NI-SI',
          sortOrder: 1,
          startMinute: 525,
          date: new Date('2026-06-10T00:00:00.000Z'),
          room: 'TH:A-1435',
          secretaryName: 'Sekretář 1',
          invigilators: ['Dozor A', 'Dozor B'],
          items: [
            {
              id: 'item-student-1',
              committeeId: 'committee-1',
              type: 'STUDENT',
              position: 0,
              student: {
                itemId: 'item-student-1',
                personalNumber: 'A12345',
                firstName: 'Jan',
                lastName: 'Novák',
                email: 'jan.novak@example.test',
                mobilePhone: '+420777123456',
                titlesBefore: 'Bc.',
                titlesAfter: null,
                specialization: 'Softwarové inženýrství',
                thesisTitleLocal: 'Lokální název',
                thesisTitleEn: 'English title',
                thesisLanguage: 'CZECH',
                supervisorName: 'Vedoucí',
                reviewerName: 'Oponent',
                repeatType: 'NONE',
                elsa: false,
                prepareMinutes: 45,
                examMinutes: 30
              },
              pause: null
            },
            {
              id: 'item-pause-1',
              committeeId: 'committee-1',
              type: 'PAUSE',
              position: 1,
              student: null,
              pause: {
                itemId: 'item-pause-1',
                label: 'Přestávka',
                durationMinutes: 20
              }
            }
          ]
        }
      ]
    })

    const response = await handler({ context: { params: { id: 'schedule-1' } } })

    expect(requireAuthenticatedUserMock).toHaveBeenCalledTimes(1)
    expect(findUniqueMock).toHaveBeenCalledTimes(1)
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: {
        id: 'schedule-1'
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
    expect(response).toEqual({
      id: 'schedule-1',
      name: 'Seed MANUAL v1',
      type: 'MANUAL',
      createdAt: '2026-03-22T12:00:00.000Z',
      updatedAt: '2026-03-22T13:00:00.000Z',
      committees: [
        {
          id: 'committee-1',
          timeScheduleId: 'schedule-1',
          code: '1-NI-SI',
          sortOrder: 1,
          startMinute: 525,
          date: '2026-06-10T00:00:00.000Z',
          room: 'TH:A-1435',
          secretaryName: 'Sekretář 1',
          invigilators: ['Dozor A', 'Dozor B'],
          items: [
            {
              id: 'item-student-1',
              committeeId: 'committee-1',
              type: 'STUDENT',
              position: 0,
              student: {
                itemId: 'item-student-1',
                personalNumber: 'A12345',
                firstName: 'Jan',
                lastName: 'Novák',
                email: 'jan.novak@example.test',
                mobilePhone: '+420777123456',
                titlesBefore: 'Bc.',
                titlesAfter: null,
                specialization: 'Softwarové inženýrství',
                thesisTitleLocal: 'Lokální název',
                thesisTitleEn: 'English title',
                thesisLanguage: 'CZECH',
                supervisorName: 'Vedoucí',
                reviewerName: 'Oponent',
                repeatType: 'NONE',
                elsa: false,
                prepareMinutes: 45,
                examMinutes: 30
              },
              pause: null
            },
            {
              id: 'item-pause-1',
              committeeId: 'committee-1',
              type: 'PAUSE',
              position: 1,
              student: null,
              pause: {
                itemId: 'item-pause-1',
                label: 'Přestávka',
                durationMinutes: 20
              }
            }
          ]
        }
      ]
    })
  })

  it('returns 404 when schedule does not exist', async () => {
    findUniqueMock.mockResolvedValue(null)

    await expect(handler({ context: { params: { id: 'missing' } } })).rejects.toMatchObject({
      statusCode: 404
    })
  })

  it('rejects when user is not authenticated', async () => {
    requireAuthenticatedUserMock.mockImplementation(() => {
      throw new Error('Unauthorized')
    })

    await expect(handler({ context: { params: { id: 'schedule-1' } } })).rejects.toThrow('Unauthorized')
    expect(findUniqueMock).not.toHaveBeenCalled()
  })
})
