// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '#server/utils/db'
import type {
  PostCommitteeItemDto,
  PostTimeScheduleRequestDto,
  TimeScheduleListItemDto
} from '#shared/types/time-schedules'
import { apiUrl, createAuthCookie } from './_helpers'

const TEST_NAME_PREFIX = '__IT_TIME_SCHEDULE_GET__'

function buildScheduleName(name: string): string {
  return `${TEST_NAME_PREFIX} ${name}`
}

function createStudentDraft(index: string) {
  return {
    firstName: 'Andrii',
    lastName: 'Pihal',
    email: `andrii.${index}@fit.cvut.cz`,
    titlesBefore: 'Bc.',
    titlesAfter: null,
    studyProgramName: `Study program ${index}`,
    studyProgramType: 'BACHELOR' as const,
    specializationName: 'Softwarové inženýrství',
    specializationCode: `SP-${index}`,
    studyLanguage: 'CZECH' as const,
    thesisTitleLocal: `Lokální název ${index}`,
    thesisTitleEn: `English title ${index}`,
    thesisLanguage: 'CZECH' as const,
    supervisorName: 'Vedoucí',
    reviewerName: 'Oponent',
    additionalSupervisorName: null,
    additionalReviewerName: null,
    repeatType: 'NONE' as const,
    prepareMinutes: 45,
    examMinutes: 30
  }
}

function mapCommitteeItemToCreateData(item: PostCommitteeItemDto) {
  if (item.type === 'STUDENT') {
    return {
      type: 'STUDENT' as const,
      position: item.position,
      student: {
        create: {
          firstName: item.student.firstName,
          lastName: item.student.lastName,
          email: item.student.email,
          titlesBefore: item.student.titlesBefore,
          titlesAfter: item.student.titlesAfter,
          thesisTitleLocal: item.student.thesisTitleLocal,
          thesisTitleEn: item.student.thesisTitleEn,
          thesisLanguage: item.student.thesisLanguage,
          supervisorName: item.student.supervisorName,
          reviewerName: item.student.reviewerName,
          additionalSupervisorName: item.student.additionalSupervisorName,
          additionalReviewerName: item.student.additionalReviewerName,
          studyProgramName: item.student.studyProgramName,
          studyProgramType: item.student.studyProgramType,
          specializationName: item.student.specializationName,
          specializationCode: item.student.specializationCode,
          studyLanguage: item.student.studyLanguage,
          repeatType: item.student.repeatType,
          prepareMinutes: item.student.prepareMinutes,
          examMinutes: item.student.examMinutes
        }
      }
    }
  }

  return {
    type: 'PAUSE' as const,
    position: item.position,
    pause: {
      create: {
        label: item.pause.label,
        durationMinutes: item.pause.durationMinutes
      }
    }
  }
}

async function createScheduleInDb(payload: PostTimeScheduleRequestDto): Promise<string> {
  const createdSchedule = await prisma.timeSchedule.create({
    data: {
      name: payload.name,
      type: payload.type,
      committees: {
        create: payload.committees.map((committee) => ({
          name: committee.name,
          startMinute: committee.startMinute,
          date: new Date(committee.date),
          room: committee.room,
          secretaryName: committee.secretaryName,
          invigilators: committee.invigilators,
          language: committee.language,
          studyProgramName: committee.studyProgramName,
          studyProgramType: committee.studyProgramType,
          specializationName: committee.specializationName,
          specializationCode: committee.specializationCode,
          defenseDepartmentCode: committee.defenseDepartmentCode,
          defenseDepartmentName: committee.defenseDepartmentName,
          chairName: committee.chairName,
          viceChairName: committee.viceChairName,
          member1Name: committee.member1Name,
          member2Name: committee.member2Name,
          member3Name: committee.member3Name,
          items: {
            create: committee.items.map((item) => mapCommitteeItemToCreateData(item))
          }
        }))
      }
    },
    select: {
      id: true
    }
  })

  return createdSchedule.id
}

async function cleanupTimeSchedulesFixture(): Promise<void> {
  await prisma.timeSchedule.deleteMany({
    where: {
      name: {
        startsWith: TEST_NAME_PREFIX
      }
    }
  })
}

describe('GET /api/time-schedules (integration)', () => {
  beforeEach(async () => {
    await cleanupTimeSchedulesFixture()
  })

  afterEach(async () => {
    await cleanupTimeSchedulesFixture()
  })

  it('returns 401 without authentication cookie', async () => {
    const fixtureId = await createScheduleInDb({
      name: buildScheduleName('Unauthorized fixture'),
      type: 'MANUAL',
      committees: []
    })

    const response = await fetch(apiUrl('/api/time-schedules'))
    const persistedFixture = await prisma.timeSchedule.findUnique({
      where: {
        id: fixtureId
      },
      select: {
        id: true
      }
    })

    expect(response.status).toBe(401)
    expect(persistedFixture?.id).toBe(fixtureId)
  })

  it('returns schedules with aggregated counts from database', async () => {
    const authCookie = createAuthCookie()

    const scheduleAName = buildScheduleName('Schedule A')
    const scheduleBName = buildScheduleName('Schedule B')

    const scheduleAId = await createScheduleInDb({
      name: scheduleAName,
      type: 'MANUAL',
      committees: [
        {
          name: 'A1',
          startMinute: 525,
          date: '2026-06-10T00:00:00.000Z',
          room: 'TH:A-1435',
          secretaryName: 'Sekretář A1',
          invigilators: ['Dozor A1'],
          language: 'CZECH',
          studyProgramName: 'Study A1',
          studyProgramType: 'BACHELOR',
          specializationName: 'Specialization A1',
          specializationCode: 'SP-A1',
          defenseDepartmentCode: 'KAT-A1',
          defenseDepartmentName: 'Department A1',
          chairName: 'Předseda A1',
          viceChairName: 'Místopředseda A1',
          member1Name: 'Člen A1-1',
          member2Name: 'Člen A1-2',
          member3Name: 'Člen A1-3',
          items: [
            {
              type: 'STUDENT',
              position: 0,
              student: createStudentDraft('GET-A-001'),
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
          name: 'A2',
          startMinute: 600,
          date: '2026-06-11T00:00:00.000Z',
          room: 'TH:A-1280',
          secretaryName: 'Sekretář A2',
          invigilators: ['Dozor A2'],
          language: 'ENGLISH',
          studyProgramName: 'Study A2',
          studyProgramType: 'MASTER',
          specializationName: 'Specialization A2',
          specializationCode: 'SP-A2',
          defenseDepartmentCode: 'KAT-A2',
          defenseDepartmentName: 'Department A2',
          chairName: 'Chair A2',
          viceChairName: 'Vice chair A2',
          member1Name: 'Member A2-1',
          member2Name: 'Member A2-2',
          member3Name: 'Member A2-3',
          items: [
            {
              type: 'STUDENT',
              position: 0,
              student: createStudentDraft('GET-A-002'),
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
    })

    const scheduleBId = await createScheduleInDb({
      name: scheduleBName,
      type: 'AUTO',
      committees: [
        {
          name: 'B1',
          startMinute: 540,
          date: '2026-06-12T00:00:00.000Z',
          room: null,
          secretaryName: null,
          invigilators: [],
          language: 'CZECH',
          studyProgramName: 'Study B1',
          studyProgramType: 'BACHELOR',
          specializationName: 'Specialization B1',
          specializationCode: 'SP-B1',
          defenseDepartmentCode: 'KAT-B1',
          defenseDepartmentName: 'Department B1',
          chairName: 'Předseda B1',
          viceChairName: 'Místopředseda B1',
          member1Name: 'Člen B1-1',
          member2Name: 'Člen B1-2',
          member3Name: 'Člen B1-3',
          items: [
            {
              type: 'STUDENT',
              position: 0,
              student: createStudentDraft('GET-B-001'),
              pause: null
            }
          ]
        }
      ]
    })

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
      name: scheduleAName,
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
      name: scheduleBName,
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
    const pagedNamePrefix = buildScheduleName('Paged')

    const createdIds = await Promise.all([
      createScheduleInDb({
        name: `${pagedNamePrefix} Schedule 1`,
        type: 'MANUAL',
        committees: []
      }),
      createScheduleInDb({
        name: `${pagedNamePrefix} Schedule 2`,
        type: 'MANUAL',
        committees: []
      }),
      createScheduleInDb({
        name: `${pagedNamePrefix} Schedule 3`,
        type: 'MANUAL',
        committees: []
      })
    ])

    const encodedSearch = encodeURIComponent(pagedNamePrefix)
    const allManualResponse = await fetch(
      apiUrl(`/api/time-schedules?type=MANUAL&search=${encodedSearch}&page=1&pageSize=100`),
      {
        headers: { cookie: authCookie }
      }
    )

    expect(allManualResponse.status).toBe(200)
    const allManual = (await allManualResponse.json()) as TimeScheduleListItemDto[]
    const allManualIds = allManual.map((schedule) => schedule.id)

    expect(allManualIds).toEqual(expect.arrayContaining(createdIds))

    const pageOneResponse = await fetch(
      apiUrl(`/api/time-schedules?type=MANUAL&search=${encodedSearch}&page=1&pageSize=2`),
      {
        headers: { cookie: authCookie }
      }
    )
    const pageTwoResponse = await fetch(
      apiUrl(`/api/time-schedules?type=MANUAL&search=${encodedSearch}&page=2&pageSize=2`),
      {
        headers: { cookie: authCookie }
      }
    )

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

    const manualScheduleId = await createScheduleInDb({
      name: buildScheduleName('Manual Filter Schedule'),
      type: 'MANUAL',
      committees: []
    })

    const autoScheduleId = await createScheduleInDb({
      name: buildScheduleName('Auto Filter Schedule'),
      type: 'AUTO',
      committees: []
    })

    const encodedPrefix = encodeURIComponent(TEST_NAME_PREFIX)
    const manualResponse = await fetch(
      apiUrl(`/api/time-schedules?type=MANUAL&search=${encodedPrefix}&page=1&pageSize=100`),
      {
        headers: { cookie: authCookie }
      }
    )
    const autoResponse = await fetch(
      apiUrl(`/api/time-schedules?type=AUTO&search=${encodedPrefix}&page=1&pageSize=100`),
      {
        headers: { cookie: authCookie }
      }
    )

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

  it('supports optional searching by schedule name', async () => {
    const authCookie = createAuthCookie()

    const matchingScheduleId = await createScheduleInDb({
      name: buildScheduleName('Searchable Schedule Alpha'),
      type: 'MANUAL',
      committees: []
    })

    const nonMatchingScheduleId = await createScheduleInDb({
      name: buildScheduleName('Different Schedule'),
      type: 'MANUAL',
      committees: []
    })

    const response = await fetch(apiUrl('/api/time-schedules?search=alpha&page=1&pageSize=100'), {
      headers: { cookie: authCookie }
    })

    expect(response.status).toBe(200)

    const payload = (await response.json()) as TimeScheduleListItemDto[]
    const returnedIds = payload.map((schedule) => schedule.id)

    expect(returnedIds).toContain(matchingScheduleId)
    expect(returnedIds).not.toContain(nonMatchingScheduleId)
  })

  it.each([
    '/api/time-schedules?page=0',
    '/api/time-schedules?page=-1',
    '/api/time-schedules?page=abc',
    '/api/time-schedules?pageSize=0',
    '/api/time-schedules?type=INVALID',
    '/api/time-schedules?page=1&page=2',
    '/api/time-schedules?search=a&search=b'
  ])('returns 400 for invalid query: %s', async (path) => {
    const response = await fetch(apiUrl(path), {
      headers: {
        cookie: createAuthCookie()
      }
    })

    expect(response.status).toBe(400)
  })
})
