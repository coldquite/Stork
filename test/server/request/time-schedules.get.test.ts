// @vitest-environment node

import { describe, expect, it } from 'vitest'
import type { PostTimeScheduleResponseDto, TimeScheduleListItemDto } from '#shared/types/time-schedules'
import { apiUrl, createAuthCookie, createUniqueSuffix } from './_helpers'

function createStudentDraft(suffix: string) {
  return {
    personalNumber: `A${suffix}`,
    firstName: 'Andrii',
    lastName: 'Pihal',
    email: `dumb_email.${suffix}@example.test`,
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

async function createScheduleViaPost(payload: unknown, authCookie: string): Promise<string> {
  const createResponse = await fetch(apiUrl('/api/time-schedules'), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: authCookie
    },
    body: JSON.stringify(payload)
  })

  expect(createResponse.status).toBe(201)
  const created = (await createResponse.json()) as PostTimeScheduleResponseDto
  return created.id
}

describe('GET /api/time-schedules (integration)', () => {
  it('returns 401 without authentication cookie', async () => {
    const response = await fetch(apiUrl('/api/time-schedules'))

    expect(response.status).toBe(401)
  })

  it('returns schedules with aggregated counts from database', async () => {
    const authCookie = createAuthCookie()

    const suffixA = createUniqueSuffix()
    const suffixB = createUniqueSuffix()

    const scheduleAId = await createScheduleViaPost(
      {
        name: `Schedule A ${suffixA}`,
        type: 'MANUAL',
        committees: [
          {
            code: `A1-${suffixA}`,
            sortOrder: 1,
            startMinute: 525,
            date: '2026-06-10T00:00:00.000Z',
            room: 'TH:A-1435',
            secretaryName: 'Sekretář A1',
            invigilators: ['Dozor A1'],
            items: [
              {
                type: 'STUDENT',
                position: 0,
                student: createStudentDraft(`${suffixA}-001`),
                pause: null
              },
              {
                type: 'PAUSE',
                position: 1,
                student: null,
                pause: {
                  label: 'Přestávka A1',
                  durationMinutes: 20
                }
              }
            ]
          },
          {
            code: `A2-${suffixA}`,
            sortOrder: 2,
            startMinute: 600,
            date: '2026-06-11T00:00:00.000Z',
            room: 'TH:A-1280',
            secretaryName: 'Sekretář A2',
            invigilators: ['Dozor A2'],
            items: [
              {
                type: 'STUDENT',
                position: 0,
                student: createStudentDraft(`${suffixA}-002`),
                pause: null
              },
              {
                type: 'PAUSE',
                position: 1,
                student: null,
                pause: {
                  label: 'Přestávka A2',
                  durationMinutes: 15
                }
              }
            ]
          }
        ]
      },
      authCookie
    )

    const scheduleBId = await createScheduleViaPost(
      {
        name: `Schedule B ${suffixB}`,
        type: 'AUTO',
        committees: [
          {
            code: `B1-${suffixB}`,
            sortOrder: 1,
            startMinute: 540,
            date: '2026-06-12T00:00:00.000Z',
            room: null,
            secretaryName: null,
            invigilators: [],
            items: [
              {
                type: 'STUDENT',
                position: 0,
                student: createStudentDraft(`${suffixB}-001`),
                pause: null
              }
            ]
          }
        ]
      },
      authCookie
    )

    const response = await fetch(apiUrl('/api/time-schedules'), {
      headers: {
        cookie: authCookie
      }
    })

    expect(response.status).toBe(200)

    const payload = (await response.json()) as TimeScheduleListItemDto[]
    const rowA = payload.find((row) => row.id === scheduleAId)
    const rowB = payload.find((row) => row.id === scheduleBId)

    expect(rowA).toMatchObject({
      id: scheduleAId,
      name: `Schedule A ${suffixA}`,
      type: 'MANUAL',
      counts: {
        committees: 2,
        items: 4,
        students: 2,
        pauses: 2
      }
    })
    expect(rowB).toMatchObject({
      id: scheduleBId,
      name: `Schedule B ${suffixB}`,
      type: 'AUTO',
      counts: {
        committees: 1,
        items: 1,
        students: 1,
        pauses: 0
      }
    })
  })

  it('supports pagination via page and pageSize query parameters', async () => {
    const authCookie = createAuthCookie()
    const suffix = createUniqueSuffix()

    const createdIds = await Promise.all([
      createScheduleViaPost(
        {
          name: `Paged Schedule 1 ${suffix}`,
          type: 'MANUAL',
          committees: []
        },
        authCookie
      ),
      createScheduleViaPost(
        {
          name: `Paged Schedule 2 ${suffix}`,
          type: 'MANUAL',
          committees: []
        },
        authCookie
      ),
      createScheduleViaPost(
        {
          name: `Paged Schedule 3 ${suffix}`,
          type: 'MANUAL',
          committees: []
        },
        authCookie
      )
    ])

    const allManualResponse = await fetch(apiUrl('/api/time-schedules?type=MANUAL&page=1&pageSize=100'), {
      headers: { cookie: authCookie }
    })

    expect(allManualResponse.status).toBe(200)
    const allManual = (await allManualResponse.json()) as TimeScheduleListItemDto[]
    const allManualIds = allManual.map((schedule) => schedule.id)

    expect(allManualIds).toEqual(expect.arrayContaining(createdIds))

    const pageOneResponse = await fetch(apiUrl('/api/time-schedules?type=MANUAL&page=1&pageSize=2'), {
      headers: { cookie: authCookie }
    })
    const pageTwoResponse = await fetch(apiUrl('/api/time-schedules?type=MANUAL&page=2&pageSize=2'), {
      headers: { cookie: authCookie }
    })

    expect(pageOneResponse.status).toBe(200)
    expect(pageTwoResponse.status).toBe(200)

    const pageOne = (await pageOneResponse.json()) as TimeScheduleListItemDto[]
    const pageTwo = (await pageTwoResponse.json()) as TimeScheduleListItemDto[]

    const pageOneIds = pageOne.map((schedule) => schedule.id)
    const pageTwoIds = pageTwo.map((schedule) => schedule.id)

    expect(pageOneIds).toEqual(allManualIds.slice(0, 2))
    expect(pageTwoIds).toEqual(allManualIds.slice(2, 4))
  })

  it('supports optional filtering by schedule type', async () => {
    const authCookie = createAuthCookie()
    const suffix = createUniqueSuffix()

    const manualScheduleId = await createScheduleViaPost(
      {
        name: `Manual Filter Schedule ${suffix}`,
        type: 'MANUAL',
        committees: []
      },
      authCookie
    )

    const autoScheduleId = await createScheduleViaPost(
      {
        name: `Auto Filter Schedule ${suffix}`,
        type: 'AUTO',
        committees: []
      },
      authCookie
    )

    const manualResponse = await fetch(apiUrl('/api/time-schedules?type=MANUAL&page=1&pageSize=100'), {
      headers: { cookie: authCookie }
    })
    const autoResponse = await fetch(apiUrl('/api/time-schedules?type=AUTO&page=1&pageSize=100'), {
      headers: { cookie: authCookie }
    })

    expect(manualResponse.status).toBe(200)
    expect(autoResponse.status).toBe(200)

    const manualPayload = (await manualResponse.json()) as TimeScheduleListItemDto[]
    const autoPayload = (await autoResponse.json()) as TimeScheduleListItemDto[]

    const manualIds = manualPayload.map((schedule) => schedule.id)
    const autoIds = autoPayload.map((schedule) => schedule.id)

    expect(manualIds).toContain(manualScheduleId)
    expect(manualIds).not.toContain(autoScheduleId)

    expect(autoIds).toContain(autoScheduleId)
    expect(autoIds).not.toContain(manualScheduleId)
  })

  it.each([
    '/api/time-schedules?page=0',
    '/api/time-schedules?page=-1',
    '/api/time-schedules?page=abc',
    '/api/time-schedules?pageSize=0',
    '/api/time-schedules?type=INVALID',
    '/api/time-schedules?page=1&page=2'
  ])('returns 400 for invalid query: %s', async (path) => {
    const response = await fetch(apiUrl(path), {
      headers: {
        cookie: createAuthCookie()
      }
    })

    expect(response.status).toBe(400)
  })
})
