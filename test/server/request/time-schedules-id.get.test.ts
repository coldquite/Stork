// @vitest-environment node

import { describe, expect, it } from 'vitest'
import type { PostTimeScheduleResponseDto, TimeScheduleDto } from '#shared/types/time-schedules'
import { apiUrl, createAuthCookie, createUniqueSuffix } from './_helpers'

function createStudentDraft(suffix: string) {
  return {
    personalNumber: `A${suffix}`,
    firstName: 'Jan',
    lastName: 'Novák',
    titlesBefore: 'Bc.',
    titlesAfter: null,
    studyProgramName: `Study program ${suffix}`,
    studyProgramType: 'BACHELOR' as const,
    specializationName: 'Softwarové inženýrství',
    specializationCode: `SPEC-${suffix}`,
    defenseDepartmentCode: `KAT-${suffix}`,
    defenseDepartmentName: `Department ${suffix}`,
    studyLanguage: 'CZECH' as const,
    thesisSubmissionAt: '2026-06-10T08:30:00.000Z',
    thesisTitleLocal: `Lokální název ${suffix}`,
    thesisTitleEn: `English title ${suffix}`,
    thesisLanguage: 'CZECH' as const,
    supervisorName: 'Vedoucí',
    reviewerName: 'Oponent',
    additionalSupervisorName: null,
    additionalReviewerName: null,
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
          name: `2-NI-SI-${suffix}`,
          startMinute: 525,
          date: '2026-06-11T00:00:00.000Z',
          room: 'TH:A-1435',
          secretaryName: 'Sekretář 1',
          invigilators: ['Dozor A', 'Dozor B'],
          language: 'CZECH',
          studyProgramName: `Study program ${suffix}`,
          studyProgramType: 'BACHELOR',
          specializationName: `Specialization ${suffix}`,
          specializationCode: `SPEC-${suffix}`,
          defenseDepartmentCode: `KAT-${suffix}`,
          defenseDepartmentName: `Department ${suffix}`,
          chairName: 'Předseda',
          viceChairName: 'Místopředseda',
          member1Name: 'Člen 1',
          member2Name: 'Člen 2',
          member3Name: 'Člen 3',
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
        },
        {
          name: `1-NI-SI-${suffix}`,
          startMinute: 510,
          date: '2026-06-10T00:00:00.000Z',
          room: 'TH:A-1436',
          secretaryName: 'Sekretář 2',
          invigilators: ['Dozor C'],
          language: 'ENGLISH',
          studyProgramName: `Study program M ${suffix}`,
          studyProgramType: 'MASTER',
          specializationName: `Specialization M ${suffix}`,
          specializationCode: `SPEC-M-${suffix}`,
          defenseDepartmentCode: `KAT-M-${suffix}`,
          defenseDepartmentName: `Department M ${suffix}`,
          chairName: 'Chair',
          viceChairName: 'Vice chair',
          member1Name: 'Member 1',
          member2Name: 'Member 2',
          member3Name: 'Member 3',
          items: []
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
    expect(payload.committees).toHaveLength(2)

    const firstCommittee = payload.committees[0]
    const secondCommittee = payload.committees[1]
    expect(firstCommittee).toBeDefined()
    expect(secondCommittee).toBeDefined()
    if (!firstCommittee || !secondCommittee) {
      throw new Error('Expected both committees to be defined')
    }

    expect(firstCommittee.timeScheduleId).toBe(createdScheduleId)
    expect(firstCommittee.name).toMatch(/^1-NI-SI-/)
    expect(firstCommittee.startMinute).toBe(510)
    expect(firstCommittee.date).toBe('2026-06-10T00:00:00.000Z')
    expect(firstCommittee.language).toBe('ENGLISH')
    expect(firstCommittee.studyProgramType).toBe('MASTER')
    expect(firstCommittee.items).toHaveLength(0)

    expect(secondCommittee.timeScheduleId).toBe(createdScheduleId)
    expect(secondCommittee.name).toMatch(/^2-NI-SI-/)
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
      expect(studentItem.pause).toBeNull()
    }

    if (pauseItem && pauseItem.type === 'PAUSE') {
      expect(pauseItem.id.length).toBeGreaterThan(0)
      expect(pauseItem.committeeId).toBe(secondCommittee.id)
      expect(pauseItem.position).toBe(1)
      expect(pauseItem.student).toBeNull()
      expect(pauseItem.pause.label).toBe('Přestávka')
      expect(pauseItem.pause.durationMinutes).toBe(20)
    }
  })
})
