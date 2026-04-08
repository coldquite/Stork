// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '#server/utils/db'
import type { TimeScheduleDto } from '#shared/types/time-schedules'
import { apiUrl, createAuthCookie } from './_helpers'

const TEST_NAME_PREFIX = '__IT_TIME_SCHEDULE_ID_GET__'
const FIXTURE_SCHEDULE_NAME = `${TEST_NAME_PREFIX} Fixture`

function createStudentDraft() {
  return {
    firstName: 'Jan',
    lastName: 'Novák',
    email: 'jan.novak@fit.cvut.cz',
    titlesBefore: 'Bc.',
    titlesAfter: null,
    studyProgramName: 'Study program fixture',
    studyProgramType: 'BACHELOR' as const,
    specializationName: 'Softwarové inženýrství',
    specializationCode: 'SPEC-ID-GET-001',
    studyLanguage: 'CZECH' as const,
    thesisTitleLocal: 'Lokální název',
    thesisTitleEn: 'English title',
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

async function createScheduleFixtureInDb(): Promise<string> {
  const studentDraft = createStudentDraft()

  const created = await prisma.timeSchedule.create({
    data: {
      name: FIXTURE_SCHEDULE_NAME,
      type: 'MANUAL',
      committees: {
        create: [
          {
            name: '2-NI-SI',
            startMinute: 525,
            date: new Date('2026-06-11T00:00:00.000Z'),
            room: 'TH:A-1435',
            secretaryName: 'Sekretář 1',
            invigilators: ['Dozor A', 'Dozor B'],
            language: 'CZECH',
            studyProgramName: 'Study program B',
            studyProgramType: 'BACHELOR',
            specializationName: 'Specialization B',
            specializationCode: 'SPEC-B',
            defenseDepartmentCode: 'KAT-B',
            defenseDepartmentName: 'Department B',
            chairName: 'Předseda',
            viceChairName: 'Místopředseda',
            member1Name: 'Člen 1',
            member2Name: 'Člen 2',
            member3Name: 'Člen 3',
            items: {
              create: [
                {
                  type: 'STUDENT',
                  position: 0,
                  student: {
                    create: {
                      firstName: studentDraft.firstName,
                      lastName: studentDraft.lastName,
                      email: studentDraft.email,
                      titlesBefore: studentDraft.titlesBefore,
                      titlesAfter: studentDraft.titlesAfter,
                      thesisTitleLocal: studentDraft.thesisTitleLocal,
                      thesisTitleEn: studentDraft.thesisTitleEn,
                      thesisLanguage: studentDraft.thesisLanguage,
                      supervisorName: studentDraft.supervisorName,
                      reviewerName: studentDraft.reviewerName,
                      additionalSupervisorName: studentDraft.additionalSupervisorName,
                      additionalReviewerName: studentDraft.additionalReviewerName,
                      studyProgramName: studentDraft.studyProgramName,
                      studyProgramType: studentDraft.studyProgramType,
                      specializationName: studentDraft.specializationName,
                      specializationCode: studentDraft.specializationCode,
                      studyLanguage: studentDraft.studyLanguage,
                      repeatType: studentDraft.repeatType,
                      prepareMinutes: studentDraft.prepareMinutes,
                      examMinutes: studentDraft.examMinutes
                    }
                  }
                },
                {
                  type: 'PAUSE',
                  position: 1,
                  pause: {
                    create: {
                      label: 'Přestávka',
                      pauseType: 'BREAK',
                      durationMinutes: 20
                    }
                  }
                }
              ]
            }
          },
          {
            name: '1-NI-SI',
            startMinute: 510,
            date: new Date('2026-06-10T00:00:00.000Z'),
            room: 'TH:A-1436',
            secretaryName: 'Sekretář 2',
            invigilators: ['Dozor C'],
            language: 'ENGLISH',
            studyProgramName: 'Study program A',
            studyProgramType: 'MASTER',
            specializationName: 'Specialization A',
            specializationCode: 'SPEC-A',
            defenseDepartmentCode: 'KAT-A',
            defenseDepartmentName: 'Department A',
            chairName: 'Chair',
            viceChairName: 'Vice chair',
            member1Name: 'Member 1',
            member2Name: 'Member 2',
            member3Name: 'Member 3',
            items: {
              create: []
            }
          }
        ]
      }
    },
    select: {
      id: true
    }
  })

  return created.id
}

async function cleanupFixture(): Promise<void> {
  await prisma.timeSchedule.deleteMany({
    where: {
      name: {
        startsWith: TEST_NAME_PREFIX
      }
    }
  })
}

describe('GET /api/time-schedules/:id (integration)', () => {
  beforeEach(async () => {
    await cleanupFixture()
  })

  afterEach(async () => {
    await cleanupFixture()
  })

  it('returns 401 without authentication cookie', async () => {
    const response = await fetch(apiUrl('/api/time-schedules/schedule-missing'))

    expect(response.status).toBe(401)
  })

  it('returns 404 when schedule does not exist', async () => {
    const response = await fetch(apiUrl('/api/time-schedules/missing-schedule-id'), {
      headers: {
        cookie: createAuthCookie()
      }
    })

    expect(response.status).toBe(404)
  })

  it('returns full schedule tree from database', async () => {
    const authCookie = createAuthCookie()
    const createdScheduleId = await createScheduleFixtureInDb()

    const response = await fetch(apiUrl(`/api/time-schedules/${createdScheduleId}`), {
      headers: {
        cookie: authCookie
      }
    })

    expect(response.status).toBe(200)

    const payload = (await response.json()) as TimeScheduleDto

    expect(payload.id).toBe(createdScheduleId)
    expect(payload.name).toBe(FIXTURE_SCHEDULE_NAME)
    expect(payload.type).toBe('MANUAL')
    expect(payload.committees).toHaveLength(2)

    const firstCommittee = payload.committees[0]
    const secondCommittee = payload.committees[1]
    expect(firstCommittee).toBeDefined()
    expect(secondCommittee).toBeDefined()
    if (!firstCommittee || !secondCommittee) {
      throw new Error('Expected both committees to be defined')
    }

    expect(firstCommittee.timeScheduleId).toBe(createdScheduleId)
    expect(firstCommittee.name).toBe('1-NI-SI')
    expect(firstCommittee.startMinute).toBe(510)
    expect(firstCommittee.date).toBe('2026-06-10T00:00:00.000Z')
    expect(firstCommittee.language).toBe('ENGLISH')
    expect(firstCommittee.studyProgramType).toBe('MASTER')
    expect(firstCommittee.items).toHaveLength(0)

    expect(secondCommittee.timeScheduleId).toBe(createdScheduleId)
    expect(secondCommittee.name).toBe('2-NI-SI')
    expect(secondCommittee.startMinute).toBe(525)
    expect(secondCommittee.date).toBe('2026-06-11T00:00:00.000Z')
    expect(secondCommittee.room).toBe('TH:A-1435')
    expect(secondCommittee.invigilators).toEqual(['Dozor A', 'Dozor B'])
    expect(secondCommittee.language).toBe('CZECH')
    expect(secondCommittee.studyProgramType).toBe('BACHELOR')
    expect(secondCommittee.items).toHaveLength(2)

    const studentItem = secondCommittee.items.find((item) => item.type === 'STUDENT')
    const pauseItem = secondCommittee.items.find((item) => item.type === 'PAUSE')

    expect(studentItem).toBeDefined()
    expect(pauseItem).toBeDefined()

    if (studentItem && studentItem.type === 'STUDENT') {
      expect(studentItem.id.length).toBeGreaterThan(0)
      expect(studentItem.committeeId).toBe(secondCommittee.id)
      expect(studentItem.position).toBe(0)
      expect(studentItem.student.firstName).toBe('Jan')
      expect(studentItem.student.email).toBe('jan.novak@fit.cvut.cz')
      expect(studentItem.pause).toBeNull()
    }

    if (pauseItem && pauseItem.type === 'PAUSE') {
      expect(pauseItem.id.length).toBeGreaterThan(0)
      expect(pauseItem.committeeId).toBe(secondCommittee.id)
      expect(pauseItem.position).toBe(1)
      expect(pauseItem.student).toBeNull()
      expect(pauseItem.pause.label).toBe('Přestávka')
      expect(pauseItem.pause.pauseType).toBe('BREAK')
      expect(pauseItem.pause.durationMinutes).toBe(20)
    }
  })
})
