// @vitest-environment node

import { describe, expect, it } from 'vitest'
import type { PostTimeScheduleResponseDto, TimeScheduleDto } from '#shared/types/time-schedules'
import { apiUrl, createAuthCookie, createUniqueSuffix } from './_helpers'

function createStudentDraft(suffix: string) {
  return {
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
  }
}

async function createScheduleViaPost(authCookie: string): Promise<string> {
  const suffix = createUniqueSuffix()
  const createResponse = await fetch(apiUrl('/api/time-schedules'), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: authCookie
    },
    body: JSON.stringify({
      name: `Seed MANUAL v1 ${suffix}`,
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
              type: 'STUDENT',
              position: 0,
              student: createStudentDraft(`${suffix}-001`),
              pause: null
            },
            {
              type: 'PAUSE',
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
    })
  })

  expect(createResponse.status).toBe(201)
  const created = (await createResponse.json()) as PostTimeScheduleResponseDto
  return created.id
}

describe('GET /api/time-schedules/:id (integration)', () => {
  it('returns 401 without authentication cookie', async () => {
    const response = await fetch(apiUrl('/api/time-schedules/schedule-missing'))

    expect(response.status).toBe(401)
  })

  it('returns 404 when schedule does not exist', async () => {
    const response = await fetch(apiUrl(`/api/time-schedules/missing-${createUniqueSuffix()}`), {
      headers: {
        cookie: createAuthCookie()
      }
    })

    expect(response.status).toBe(404)
  })

  it('returns full schedule tree from database', async () => {
    const authCookie = createAuthCookie()
    const createdScheduleId = await createScheduleViaPost(authCookie)

    const response = await fetch(apiUrl(`/api/time-schedules/${createdScheduleId}`), {
      headers: {
        cookie: authCookie
      }
    })

    expect(response.status).toBe(200)

    const payload = (await response.json()) as TimeScheduleDto

    expect(payload.id).toBe(createdScheduleId)
    expect(payload.type).toBe('MANUAL')
    expect(payload.committees).toHaveLength(1)

    const committee = payload.committees[0]
    expect(committee).toBeDefined()
    if (!committee) {
      throw new Error('Expected first committee to be defined')
    }

    expect(committee.timeScheduleId).toBe(createdScheduleId)
    expect(committee.sortOrder).toBe(1)
    expect(committee.startMinute).toBe(525)
    expect(committee.date).toBe('2026-06-10T00:00:00.000Z')
    expect(committee.room).toBe('TH:A-1435')
    expect(committee.invigilators).toEqual(['Dozor A', 'Dozor B'])
    expect(committee.items).toHaveLength(2)

    const studentItem = committee.items.find((item) => item.type === 'STUDENT')
    const pauseItem = committee.items.find((item) => item.type === 'PAUSE')

    expect(studentItem).toBeDefined()
    expect(pauseItem).toBeDefined()

    if (studentItem && studentItem.type === 'STUDENT') {
      expect(studentItem.id.length).toBeGreaterThan(0)
      expect(studentItem.committeeId).toBe(committee.id)
      expect(studentItem.position).toBe(0)
      expect(studentItem.student.firstName).toBe('Jan')
      expect(studentItem.pause).toBeNull()
    }

    if (pauseItem && pauseItem.type === 'PAUSE') {
      expect(pauseItem.id.length).toBeGreaterThan(0)
      expect(pauseItem.committeeId).toBe(committee.id)
      expect(pauseItem.position).toBe(1)
      expect(pauseItem.student).toBeNull()
      expect(pauseItem.pause.label).toBe('Přestávka')
      expect(pauseItem.pause.durationMinutes).toBe(20)
    }
  })
})
