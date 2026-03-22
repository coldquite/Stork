// @vitest-environment node

import { describe, expect, it } from 'vitest'
import type { PostTimeScheduleResponseDto, TimeScheduleDto } from '#shared/types/time-schedules'
import { apiUrl, createAuthCookie, createUniqueSuffix } from './_helpers'

function createPostPayload(suffix: string) {
  return {
    name: `Nový plán ${suffix}`,
    type: 'MANUAL',
    committees: [
      {
        code: `1-NI-SI-${suffix}`,
        sortOrder: 1,
        startMinute: 525,
        date: '2026-06-10T00:00:00.000Z',
        room: 'TH:A-1435',
        secretaryName: 'Sekretář 1',
        invigilators: ['Dozor A', 'Dozor B'],
        items: [
          {
            type: 'STUDENT' as const,
            position: 0,
            student: {
              personalNumber: `A${suffix}`,
              firstName: 'Jan',
              lastName: 'Novák',
              email: `jan.${suffix}@example.test`,
              mobilePhone: '+420777123456',
              titlesBefore: 'Bc.',
              titlesAfter: null,
              specialization: 'Softwarové inženýrství',
              thesisTitleLocal: `Lokální název ${suffix}`,
              thesisTitleEn: `English title ${suffix}`,
              thesisLanguage: 'CZECH' as const,
              supervisorName: 'Vedoucí',
              reviewerName: 'Oponent',
              repeatType: 'NONE' as const,
              elsa: false,
              prepareMinutes: 45,
              examMinutes: 30
            },
            pause: null
          },
          {
            type: 'PAUSE' as const,
            position: 1,
            student: null,
            pause: {
              label: 'Přestávka',
              durationMinutes: 20
            }
          }
        ]
      }
    ]
  }
}

describe('POST /api/time-schedules (integration)', () => {
  it('returns 401 without authentication cookie', async () => {
    const response = await fetch(apiUrl('/api/time-schedules'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(createPostPayload(createUniqueSuffix()))
    })

    expect(response.status).toBe(401)
  })

  it('creates schedule and returns metadata; created tree is retrievable via GET by id', async () => {
    const authCookie = createAuthCookie()
    const payloadSeed = createUniqueSuffix()
    const response = await fetch(apiUrl('/api/time-schedules'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: authCookie
      },
      body: JSON.stringify(createPostPayload(payloadSeed))
    })

    expect(response.status).toBe(201)
    const payload = (await response.json()) as PostTimeScheduleResponseDto

    expect(payload.id.length).toBeGreaterThan(0)
    expect(Number.isNaN(Date.parse(payload.createdAt))).toBe(false)
    expect(Number.isNaN(Date.parse(payload.updatedAt))).toBe(false)

    const getResponse = await fetch(apiUrl(`/api/time-schedules/${payload.id}`), {
      headers: {
        cookie: authCookie
      }
    })

    expect(getResponse.status).toBe(200)
    const persistedSchedule = (await getResponse.json()) as TimeScheduleDto

    expect(persistedSchedule.id).toBe(payload.id)
    expect(persistedSchedule.name).toBe(`Nový plán ${payloadSeed}`)
    expect(persistedSchedule.type).toBe('MANUAL')
    expect(persistedSchedule.committees).toHaveLength(1)

    const committee = persistedSchedule.committees[0]
    expect(committee.code).toBe(`1-NI-SI-${payloadSeed}`)
    expect(committee.items).toHaveLength(2)

    const studentItem = committee.items.find((item) => item.type === 'STUDENT')
    const pauseItem = committee.items.find((item) => item.type === 'PAUSE')

    expect(studentItem).toBeDefined()
    expect(pauseItem).toBeDefined()

    expect(studentItem!.id.length).toBeGreaterThan(0)
    expect(studentItem!.student).not.toBeNull()
    expect(studentItem!.student!.firstName).toBe('Jan')

    expect(pauseItem!.id.length).toBeGreaterThan(0)
    expect(pauseItem!.pause).not.toBeNull()
    expect(pauseItem!.pause!.label).toBe('Přestávka')
  })

  it('rejects request body with nested id fields', async () => {
    const suffix = createUniqueSuffix()
    const response = await fetch(apiUrl('/api/time-schedules'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: createAuthCookie()
      },
      body: JSON.stringify({
        ...createPostPayload(suffix),
        committees: [
          {
            ...createPostPayload(suffix).committees[0],
            id: 'committee-id-should-not-be-sent'
          }
        ]
      })
    })

    expect(response.status).toBe(400)
  })
})
