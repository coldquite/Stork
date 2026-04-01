// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '#server/utils/db'
import type { PostTimeScheduleRequestDto, PostTimeScheduleResponseDto } from '#shared/types/time-schedules'
import { apiUrl, createAuthCookie } from './_helpers'

const TEST_NAME_PREFIX = '__IT_TIME_SCHEDULE_POST__'

function createPostPayload(nameSuffix: string): PostTimeScheduleRequestDto {
  return {
    name: `${TEST_NAME_PREFIX} Nový plán ${nameSuffix}`,
    type: 'MANUAL',
    committees: [
      {
        name: `1-NI-SI-${nameSuffix}`,
        startMinute: 525,
        date: '2026-06-10T00:00:00.000Z',
        room: 'TH:A-1435',
        secretaryName: 'Sekretář 1',
        invigilators: ['Dozor A', 'Dozor B'],
        language: 'CZECH',
        studyProgramName: `Study program ${nameSuffix}`,
        studyProgramType: 'BACHELOR',
        specializationName: `Specialization ${nameSuffix}`,
        specializationCode: `SPEC-${nameSuffix}`,
        defenseDepartmentCode: `KAT-${nameSuffix}`,
        defenseDepartmentName: `Department ${nameSuffix}`,
        chairName: 'Předseda',
        viceChairName: 'Místopředseda',
        member1Name: 'Člen 1',
        member2Name: 'Člen 2',
        member3Name: 'Člen 3',
        items: [
          {
            type: 'STUDENT' as const,
            position: 0,
            student: {
              personalNumber: `A${nameSuffix}`,
              firstName: 'Jan',
              lastName: 'Novák',
              titlesBefore: 'Bc.',
              titlesAfter: null,
              thesisTitleLocal: `Lokální název ${nameSuffix}`,
              thesisTitleEn: `English title ${nameSuffix}`,
              thesisLanguage: 'CZECH' as const,
              supervisorName: 'Vedoucí',
              reviewerName: 'Oponent',
              additionalSupervisorName: null,
              additionalReviewerName: null,
              studyProgramName: `Study program ${nameSuffix}`,
              studyProgramType: 'BACHELOR' as const,
              specializationName: `Specialization ${nameSuffix}`,
              specializationCode: `SPEC-${nameSuffix}`,
              defenseDepartmentCode: `KAT-${nameSuffix}`,
              defenseDepartmentName: `Department ${nameSuffix}`,
              studyLanguage: 'CZECH' as const,
              thesisSubmissionAt: '2026-06-10T12:15:00.000Z',
              repeatType: 'NONE' as const,
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

type PostCommitteeDraft = PostTimeScheduleRequestDto['committees'][number]
type PostCommitteeItemDraft = PostCommitteeDraft['items'][number]

async function postTimeSchedule(payload: unknown, authCookie?: string): Promise<Response> {
  const headers: Record<string, string> = {
    'content-type': 'application/json'
  }

  if (authCookie) {
    headers.cookie = authCookie
  }

  return fetch(apiUrl('/api/time-schedules'), {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  })
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

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { statusMessage?: string; message?: string }
    return payload.statusMessage ?? payload.message ?? ''
  } catch {
    return ''
  }
}

describe('POST /api/time-schedules (integration)', () => {
  beforeEach(async () => {
    await cleanupFixture()
  })

  afterEach(async () => {
    await cleanupFixture()
  })

  it('returns 401 without authentication cookie', async () => {
    const response = await postTimeSchedule(createPostPayload('UNAUTH'))

    expect(response.status).toBe(401)
  })

  it('creates schedule and returns metadata; persisted tree is stored in database', async () => {
    const authCookie = createAuthCookie()
    const payloadSeed = 'PRIMARY'
    const response = await postTimeSchedule(createPostPayload(payloadSeed), authCookie)

    expect(response.status).toBe(201)
    const payload = (await response.json()) as PostTimeScheduleResponseDto

    expect(payload.id.length).toBeGreaterThan(0)
    expect(Number.isNaN(Date.parse(payload.createdAt))).toBe(false)

    const persistedSchedule = await prisma.timeSchedule.findUnique({
      where: {
        id: payload.id
      },
      include: {
        committees: {
          orderBy: [{ date: 'asc' }, { startMinute: 'asc' }, { id: 'asc' }],
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

    expect(persistedSchedule).toBeTruthy()
    if (!persistedSchedule) {
      throw new Error('Expected persisted schedule in database')
    }

    expect(persistedSchedule.id).toBe(payload.id)
    expect(persistedSchedule.name).toBe(`${TEST_NAME_PREFIX} Nový plán ${payloadSeed}`)
    expect(persistedSchedule.type).toBe('MANUAL')
    expect(persistedSchedule.committees).toHaveLength(1)

    const committee = persistedSchedule.committees[0]
    expect(committee).toBeDefined()
    if (!committee) {
      throw new Error('Expected persisted committee in database')
    }

    expect(committee.name).toBe(`1-NI-SI-${payloadSeed}`)
    expect(committee.language).toBe('CZECH')
    expect(committee.items).toHaveLength(2)

    const studentItem = committee.items.find((item) => item.type === 'STUDENT')
    const pauseItem = committee.items.find((item) => item.type === 'PAUSE')

    expect(studentItem).toBeDefined()
    expect(pauseItem).toBeDefined()

    expect(studentItem?.id.length).toBeGreaterThan(0)
    expect(studentItem?.student).not.toBeNull()
    expect(studentItem?.student?.firstName).toBe('Jan')
    expect(studentItem?.student?.thesisSubmissionAt?.toISOString()).toBe('2026-06-10T00:00:00.000Z')

    expect(pauseItem?.id.length).toBeGreaterThan(0)
    expect(pauseItem?.pause).not.toBeNull()
    expect(pauseItem?.pause?.label).toBe('Přestávka')
  })

  it('keeps provided schedule name for AUTO payloads', async () => {
    const authCookie = createAuthCookie()
    const payloadSeed = 'AUTO'
    const providedName = `${TEST_NAME_PREFIX} User Provided Name ${payloadSeed}`
    const response = await postTimeSchedule(
      {
        ...createPostPayload(payloadSeed),
        name: providedName,
        type: 'AUTO'
      },
      authCookie
    )

    expect(response.status).toBe(201)
    const payload = (await response.json()) as PostTimeScheduleResponseDto

    const persistedSchedule = await prisma.timeSchedule.findUnique({
      where: {
        id: payload.id
      },
      select: {
        name: true,
        type: true
      }
    })

    expect(persistedSchedule).toMatchObject({
      type: 'AUTO',
      name: providedName
    })
  })

  it('returns 409 on unique-constraint conflict from database', async () => {
    const payload = createPostPayload('CONFLICT')
    const firstCommittee = payload.committees[0] as PostCommitteeDraft

    payload.committees = [
      firstCommittee,
      {
        ...firstCommittee,
        startMinute: firstCommittee.startMinute + 30
      }
    ]

    const response = await postTimeSchedule(payload, createAuthCookie())
    const statusMessage = await readErrorMessage(response)

    expect(response.status).toBe(409)
    expect(statusMessage).toContain('unique constraints')
  })

  it.each([
    {
      name: 'payload is not an object',
      mutate: () => null
    },
    {
      name: 'payload has unknown top-level key',
      mutate: (payload: PostTimeScheduleRequestDto) => ({ ...payload, unknownTopLevel: true })
    },
    {
      name: 'payload contains forbidden createdAt',
      mutate: (payload: PostTimeScheduleRequestDto) => ({ ...payload, createdAt: '2026-01-01T00:00:00.000Z' })
    },
    {
      name: 'payload contains forbidden nested itemId',
      mutate: (payload: PostTimeScheduleRequestDto) => {
        const firstCommittee = payload.committees[0] as PostCommitteeDraft
        const pauseItem = firstCommittee.items[1] as Extract<PostCommitteeItemDraft, { type: 'PAUSE' }>

        return {
          ...payload,
          committees: [
            {
              ...firstCommittee,
              items: [
                {
                  ...pauseItem,
                  pause: {
                    ...pauseItem.pause,
                    itemId: 'forbidden'
                  }
                }
              ]
            }
          ]
        }
      }
    },
    {
      name: 'name has invalid type',
      mutate: (payload: PostTimeScheduleRequestDto) => ({ ...payload, name: 123 })
    },
    {
      name: 'name is null',
      mutate: (payload: PostTimeScheduleRequestDto) => ({ ...payload, name: null })
    },
    {
      name: 'name is empty string',
      mutate: (payload: PostTimeScheduleRequestDto) => ({ ...payload, name: '' })
    },
    {
      name: 'name contains only whitespace',
      mutate: (payload: PostTimeScheduleRequestDto) => ({ ...payload, name: '   ' })
    },
    {
      name: 'type has unsupported enum value',
      mutate: (payload: PostTimeScheduleRequestDto) => ({ ...payload, type: 'INVALID_TYPE' })
    },
    {
      name: 'committees is not an array',
      mutate: (payload: PostTimeScheduleRequestDto) => ({ ...payload, committees: {} })
    },
    {
      name: 'committee has unknown key',
      mutate: (payload: PostTimeScheduleRequestDto) => {
        const firstCommittee = payload.committees[0] as PostCommitteeDraft

        return {
          ...payload,
          committees: [{ ...firstCommittee, unknownCommitteeField: true }]
        }
      }
    },
    {
      name: 'committee date is invalid',
      mutate: (payload: PostTimeScheduleRequestDto) => {
        const firstCommittee = payload.committees[0] as PostCommitteeDraft

        return {
          ...payload,
          committees: [{ ...firstCommittee, date: 'not-a-date' }]
        }
      }
    },
    {
      name: 'committee room has invalid type',
      mutate: (payload: PostTimeScheduleRequestDto) => {
        const firstCommittee = payload.committees[0] as PostCommitteeDraft

        return {
          ...payload,
          committees: [{ ...firstCommittee, room: 10 }]
        }
      }
    },
    {
      name: 'committee invigilators is not an array',
      mutate: (payload: PostTimeScheduleRequestDto) => {
        const firstCommittee = payload.committees[0] as PostCommitteeDraft

        return {
          ...payload,
          committees: [{ ...firstCommittee, invigilators: 'not-array' }]
        }
      }
    },
    {
      name: 'committee invigilator entry is not a string',
      mutate: (payload: PostTimeScheduleRequestDto) => {
        const firstCommittee = payload.committees[0] as PostCommitteeDraft

        return {
          ...payload,
          committees: [{ ...firstCommittee, invigilators: ['Dozor A', 123] }]
        }
      }
    },
    {
      name: 'committee items is not an array',
      mutate: (payload: PostTimeScheduleRequestDto) => {
        const firstCommittee = payload.committees[0] as PostCommitteeDraft

        return {
          ...payload,
          committees: [{ ...firstCommittee, items: {} }]
        }
      }
    },
    {
      name: 'committee item has unknown key',
      mutate: (payload: PostTimeScheduleRequestDto) => {
        const firstCommittee = payload.committees[0] as PostCommitteeDraft
        const firstItem = firstCommittee.items[0] as PostCommitteeItemDraft

        return {
          ...payload,
          committees: [
            {
              ...firstCommittee,
              items: [{ ...firstItem, unknownItemField: true }]
            }
          ]
        }
      }
    },
    {
      name: 'committee item type is invalid',
      mutate: (payload: PostTimeScheduleRequestDto) => {
        const firstCommittee = payload.committees[0] as PostCommitteeDraft
        const firstItem = firstCommittee.items[0] as PostCommitteeItemDraft

        return {
          ...payload,
          committees: [
            {
              ...firstCommittee,
              items: [{ ...firstItem, type: 'INVALID_ITEM_TYPE' }]
            }
          ]
        }
      }
    },
    {
      name: 'committee item position is not integer',
      mutate: (payload: PostTimeScheduleRequestDto) => {
        const firstCommittee = payload.committees[0] as PostCommitteeDraft
        const firstItem = firstCommittee.items[0] as PostCommitteeItemDraft

        return {
          ...payload,
          committees: [
            {
              ...firstCommittee,
              items: [{ ...firstItem, position: 1.5 }]
            }
          ]
        }
      }
    },
    {
      name: 'student item pause must be null',
      mutate: (payload: PostTimeScheduleRequestDto) => {
        const firstCommittee = payload.committees[0] as PostCommitteeDraft
        const studentItem = firstCommittee.items[0] as Extract<PostCommitteeItemDraft, { type: 'STUDENT' }>

        return {
          ...payload,
          committees: [
            {
              ...firstCommittee,
              items: [
                {
                  ...studentItem,
                  pause: {
                    label: 'Wrong pause',
                    durationMinutes: 1
                  }
                }
              ]
            }
          ]
        }
      }
    },
    {
      name: 'pause item student must be null',
      mutate: (payload: PostTimeScheduleRequestDto) => {
        const firstCommittee = payload.committees[0] as PostCommitteeDraft
        const pauseItem = firstCommittee.items[1] as Extract<PostCommitteeItemDraft, { type: 'PAUSE' }>
        const studentItem = firstCommittee.items[0] as Extract<PostCommitteeItemDraft, { type: 'STUDENT' }>

        return {
          ...payload,
          committees: [
            {
              ...firstCommittee,
              items: [
                {
                  ...pauseItem,
                  student: {
                    ...studentItem.student
                  }
                }
              ]
            }
          ]
        }
      }
    },
    {
      name: 'student thesisLanguage has invalid enum value',
      mutate: (payload: PostTimeScheduleRequestDto) => {
        const firstCommittee = payload.committees[0] as PostCommitteeDraft
        const studentItem = firstCommittee.items[0] as Extract<PostCommitteeItemDraft, { type: 'STUDENT' }>

        return {
          ...payload,
          committees: [
            {
              ...firstCommittee,
              items: [
                {
                  ...studentItem,
                  student: {
                    ...studentItem.student,
                    thesisLanguage: 'GERMAN'
                  }
                }
              ]
            }
          ]
        }
      }
    },
    {
      name: 'student repeatType has invalid enum value',
      mutate: (payload: PostTimeScheduleRequestDto) => {
        const firstCommittee = payload.committees[0] as PostCommitteeDraft
        const studentItem = firstCommittee.items[0] as Extract<PostCommitteeItemDraft, { type: 'STUDENT' }>

        return {
          ...payload,
          committees: [
            {
              ...firstCommittee,
              items: [
                {
                  ...studentItem,
                  student: {
                    ...studentItem.student,
                    repeatType: 'INVALID_REPEAT'
                  }
                }
              ]
            }
          ]
        }
      }
    },
    {
      name: 'student prepareMinutes is not integer',
      mutate: (payload: PostTimeScheduleRequestDto) => {
        const firstCommittee = payload.committees[0] as PostCommitteeDraft
        const studentItem = firstCommittee.items[0] as Extract<PostCommitteeItemDraft, { type: 'STUDENT' }>

        return {
          ...payload,
          committees: [
            {
              ...firstCommittee,
              items: [
                {
                  ...studentItem,
                  student: {
                    ...studentItem.student,
                    prepareMinutes: 30.5
                  }
                }
              ]
            }
          ]
        }
      }
    },
    {
      name: 'pause durationMinutes is not integer',
      mutate: (payload: PostTimeScheduleRequestDto) => {
        const firstCommittee = payload.committees[0] as PostCommitteeDraft
        const pauseItem = firstCommittee.items[1] as Extract<PostCommitteeItemDraft, { type: 'PAUSE' }>

        return {
          ...payload,
          committees: [
            {
              ...firstCommittee,
              items: [
                {
                  ...pauseItem,
                  pause: {
                    ...pauseItem.pause,
                    durationMinutes: '20'
                  }
                }
              ]
            }
          ]
        }
      }
    }
  ])('returns 400 when $name', async ({ mutate }) => {
    const payload = createPostPayload('INVALID')
    const invalidPayload = mutate(payload)

    const response = await postTimeSchedule(invalidPayload, createAuthCookie())
    const statusMessage = await readErrorMessage(response)

    expect(response.status).toBe(400)
    expect(statusMessage).toContain('Invalid time schedule payload')
  })
})
