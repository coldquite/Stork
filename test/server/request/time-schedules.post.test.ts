// @vitest-environment node

import { describe, expect, it } from 'vitest'
import type {
  PostTimeScheduleRequestDto,
  PostTimeScheduleResponseDto,
  TimeScheduleDto
} from '#shared/types/time-schedules'
import { apiUrl, createAuthCookie, createUniqueSuffix } from './_helpers'

function createPostPayload(suffix: string): PostTimeScheduleRequestDto {
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

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { statusMessage?: string; message?: string }
    return payload.statusMessage ?? payload.message ?? ''
  } catch {
    return ''
  }
}

describe('POST /api/time-schedules (integration)', () => {
  it('returns 401 without authentication cookie', async () => {
    const response = await postTimeSchedule(createPostPayload(createUniqueSuffix()))

    expect(response.status).toBe(401)
  })

  it('creates schedule and returns metadata; created tree is retrievable via GET by id', async () => {
    const authCookie = createAuthCookie()
    const payloadSeed = createUniqueSuffix()
    const response = await postTimeSchedule(createPostPayload(payloadSeed), authCookie)

    expect(response.status).toBe(201)
    const payload = (await response.json()) as PostTimeScheduleResponseDto

    expect(payload.id.length).toBeGreaterThan(0)
    expect(Number.isNaN(Date.parse(payload.createdAt))).toBe(false)

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

    const committee = persistedSchedule.committees[0] as TimeScheduleDto['committees'][number]

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

  it('keeps provided schedule name for AUTO payloads', async () => {
    const authCookie = createAuthCookie()
    const payloadSeed = createUniqueSuffix()
    const providedName = `User Provided Name ${payloadSeed}`
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

    const getResponse = await fetch(apiUrl(`/api/time-schedules/${payload.id}`), {
      headers: {
        cookie: authCookie
      }
    })

    expect(getResponse.status).toBe(200)
    const persistedSchedule = (await getResponse.json()) as TimeScheduleDto

    expect(persistedSchedule.type).toBe('AUTO')
    expect(persistedSchedule.name).toBe(providedName)
  })

  it('returns 409 on unique-constraint conflict from database', async () => {
    const suffix = createUniqueSuffix()
    const payload = createPostPayload(suffix)
    const firstCommittee = payload.committees[0] as PostCommitteeDraft

    payload.committees = [
      firstCommittee,
      {
        ...firstCommittee,
        code: firstCommittee.code,
        sortOrder: firstCommittee.sortOrder + 1
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
      name: 'student elsa has invalid type',
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
                    elsa: 'false'
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
    const suffix = createUniqueSuffix()
    const payload = createPostPayload(suffix)
    const invalidPayload = mutate(payload)

    const response = await postTimeSchedule(invalidPayload, createAuthCookie())
    const statusMessage = await readErrorMessage(response)

    expect(response.status).toBe(400)
    expect(statusMessage).toContain('Invalid time schedule payload')
  })
})
