// @vitest-environment node

import { describe, expect, it } from 'vitest'
import type { PostTimeScheduleRequestDto } from '#shared/types/time-schedules'
import { mapTimeScheduleCreateData } from '#server/utils/time-schedules/post/mapper'
import { parsePostTimeSchedulePayload } from '#server/utils/time-schedules/post/validation'

function createPayload(): PostTimeScheduleRequestDto {
  return {
    name: ' Nový plán ',
    type: 'MANUAL',
    committees: [
      {
        name: '1-NI-SI-A',
        startMinute: 525,
        date: '2026-06-10T00:00:00.000Z',
        room: 'TH:A-1435',
        secretaryName: 'Sekretář 1',
        invigilators: ['Dozor A', 'Dozor B'],
        language: 'CZECH',
        studyProgramName: 'Study program A',
        studyProgramType: 'BACHELOR',
        specializationName: 'Specialization A',
        specializationCode: 'SPEC-A',
        defenseDepartmentCode: 'KAT-A',
        defenseDepartmentName: 'Department A',
        chairName: 'Předseda',
        viceChairName: 'Místopředseda',
        member1Name: 'Člen 1',
        member2Name: 'Člen 2',
        member3Name: 'Člen 3',
        items: [
          {
            type: 'STUDENT',
            position: 0,
            student: {
              firstName: 'Jan',
              lastName: 'Novák',
              email: 'jan.novak@fit.cvut.cz',
              titlesBefore: 'Bc.',
              titlesAfter: null,
              thesisTitleLocal: 'Lokální název',
              thesisTitleEn: 'English title',
              thesisLanguage: 'CZECH',
              supervisorName: 'Vedoucí',
              reviewerName: 'Oponent',
              additionalSupervisorName: null,
              additionalReviewerName: null,
              studyProgramName: 'Study program A',
              studyProgramType: 'BACHELOR',
              specializationName: 'Specialization A',
              specializationCode: 'SPEC-A',
              studyLanguage: 'CZECH',
              thesisSubmissionAt: '2026-06-10T23:30:00.000Z',
              repeatType: 'NONE',
              prepareMinutes: 45,
              examMinutes: 30
            },
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
  }
}

describe('time-schedules post contracts', () => {
  function getValidationStatusMessage(payload: unknown): string {
    try {
      parsePostTimeSchedulePayload(payload)
      return ''
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'statusMessage' in error) {
        return String(error.statusMessage)
      }

      if (error instanceof Error) {
        return error.message
      }

      return ''
    }
  }

  it('parses a valid payload and trims schedule name', () => {
    const parsed = parsePostTimeSchedulePayload(createPayload())

    expect(parsed.name).toBe('Nový plán')
    expect(parsed.type).toBe('MANUAL')
    expect(parsed.committees).toHaveLength(1)
  })

  it('trims student first and last names during parsing', () => {
    const payload = createPayload()
    const firstCommittee = payload.committees[0]
    if (!firstCommittee) {
      throw new Error('Expected committee in payload')
    }

    const firstItem = firstCommittee.items[0]
    if (!firstItem || firstItem.type !== 'STUDENT') {
      throw new Error('Expected first item to be STUDENT')
    }

    const parsed = parsePostTimeSchedulePayload({
      ...payload,
      committees: [
        {
          ...firstCommittee,
          items: [
            {
              ...firstItem,
              student: {
                ...firstItem.student,
                firstName: '  Jan  ',
                lastName: '  Novák  '
              }
            }
          ]
        }
      ]
    })

    const parsedStudent = parsed.committees[0]?.items[0]
    if (!parsedStudent || parsedStudent.type !== 'STUDENT') {
      throw new Error('Expected parsed student item')
    }

    expect(parsedStudent.student.firstName).toBe('Jan')
    expect(parsedStudent.student.lastName).toBe('Novák')
  })

  it('accepts student email without format validation', () => {
    const payload = createPayload()
    const firstCommittee = payload.committees[0]
    if (!firstCommittee) {
      throw new Error('Expected committee in payload')
    }

    const firstItem = firstCommittee.items[0]
    if (!firstItem || firstItem.type !== 'STUDENT') {
      throw new Error('Expected first item to be STUDENT')
    }

    const parsed = parsePostTimeSchedulePayload({
      ...payload,
      committees: [
        {
          ...firstCommittee,
          items: [
            {
              ...firstItem,
              student: {
                ...firstItem.student,
                email: 'totally-not-an-email-format'
              }
            }
          ]
        }
      ]
    })

    const parsedStudent = parsed.committees[0]?.items[0]
    if (!parsedStudent || parsedStudent.type !== 'STUDENT') {
      throw new Error('Expected parsed student item')
    }

    expect(parsedStudent.student.email).toBe('totally-not-an-email-format')
  })

  it('rejects payload with forbidden system fields', () => {
    const invalidPayload = {
      ...createPayload(),
      createdAt: '2026-01-01T00:00:00.000Z'
    }

    expect(() => parsePostTimeSchedulePayload(invalidPayload)).toThrowError(/Invalid time schedule payload/)
  })

  it('rejects payload with unknown nested keys and includes path in message', () => {
    const payload = createPayload()
    const firstCommittee = payload.committees[0]
    if (!firstCommittee) {
      throw new Error('Expected committee in payload')
    }

    const firstItem = firstCommittee.items[0]
    if (!firstItem || firstItem.type !== 'STUDENT') {
      throw new Error('Expected first item to be STUDENT')
    }

    const statusMessage = getValidationStatusMessage({
      ...payload,
      committees: [
        {
          ...firstCommittee,
          items: [
            {
              ...firstItem,
              student: {
                ...firstItem.student,
                unknownField: true
              }
            }
          ]
        }
      ]
    })

    expect(statusMessage).toContain('Invalid time schedule payload:')
    expect(statusMessage).toContain('payload.committees[0].items[0].student')
  })

  it('rejects thesisSubmissionAt without timezone offset', () => {
    const payload = createPayload()
    const firstCommittee = payload.committees[0]
    if (!firstCommittee) {
      throw new Error('Expected committee in payload')
    }

    const firstItem = firstCommittee.items[0]
    if (!firstItem || firstItem.type !== 'STUDENT') {
      throw new Error('Expected first item to be STUDENT')
    }

    const statusMessage = getValidationStatusMessage({
      ...payload,
      committees: [
        {
          ...firstCommittee,
          items: [
            {
              ...firstItem,
              student: {
                ...firstItem.student,
                thesisSubmissionAt: '2026-06-10T23:30:00'
              }
            }
          ]
        }
      ]
    })

    expect(statusMessage).toContain('Invalid time schedule payload:')
    expect(statusMessage).toContain('payload.committees[0].items[0].student.thesisSubmissionAt')
  })

  it('rejects non-integer minute fields', () => {
    const payload = createPayload()
    const firstCommittee = payload.committees[0]
    if (!firstCommittee) {
      throw new Error('Expected committee in payload')
    }

    const statusMessage = getValidationStatusMessage({
      ...payload,
      committees: [
        {
          ...firstCommittee,
          startMinute: 525.5
        }
      ]
    })

    expect(statusMessage).toContain('Invalid time schedule payload:')
    expect(statusMessage).toContain('payload.committees[0].startMinute')
    expect(statusMessage).toContain('must be an integer')
  })

  it('rejects student item when pause is not null', () => {
    const payload = createPayload()
    const firstCommittee = payload.committees[0]
    if (!firstCommittee) {
      throw new Error('Expected committee in payload')
    }

    const firstItem = firstCommittee.items[0]
    if (!firstItem || firstItem.type !== 'STUDENT') {
      throw new Error('Expected first item to be STUDENT')
    }

    const invalidPayload = {
      ...payload,
      committees: [
        {
          ...firstCommittee,
          items: [
            {
              ...firstItem,
              pause: {
                label: 'Wrong pause',
                durationMinutes: 1
              }
            }
          ]
        }
      ]
    }

    expect(() => parsePostTimeSchedulePayload(invalidPayload)).toThrowError(/Invalid time schedule payload/)
  })

  it('maps null thesisSubmissionAt to null in prisma create data', () => {
    const payload = createPayload()
    const firstCommittee = payload.committees[0]
    if (!firstCommittee) {
      throw new Error('Expected committee in payload')
    }

    const firstItem = firstCommittee.items[0]
    if (!firstItem || firstItem.type !== 'STUDENT') {
      throw new Error('Expected first item to be STUDENT')
    }

    const parsed = parsePostTimeSchedulePayload({
      ...payload,
      committees: [
        {
          ...firstCommittee,
          items: [
            {
              ...firstItem,
              student: {
                ...firstItem.student,
                thesisSubmissionAt: null
              }
            }
          ]
        }
      ]
    })
    const mapped = mapTimeScheduleCreateData(parsed)

    if (!mapped.committees || !Array.isArray(mapped.committees.create)) {
      throw new Error('Expected mapped committees.create array')
    }

    const firstMappedCommittee = mapped.committees.create[0]
    if (!firstMappedCommittee || !firstMappedCommittee.items || !Array.isArray(firstMappedCommittee.items.create)) {
      throw new Error('Expected mapped committee items array')
    }

    const firstMappedItem = firstMappedCommittee.items.create[0]
    if (!firstMappedItem || !firstMappedItem.student || !firstMappedItem.student.create) {
      throw new Error('Expected mapped student item')
    }

    expect(firstMappedItem.student.create.thesisSubmissionAt).toBeNull()
  })

  it('maps payload to prisma create data and normalizes thesisSubmissionAt to Prague day start', () => {
    const mapped = mapTimeScheduleCreateData(parsePostTimeSchedulePayload(createPayload()))
    if (!mapped.committees || !Array.isArray(mapped.committees.create)) {
      throw new Error('Expected mapped committees.create array')
    }

    const committeesCreate = mapped.committees.create as Array<{
      date: Date
      items: {
        create: Array<{
          student?: {
            create: {
              thesisSubmissionAt: Date | null
            }
          }
        }>
      }
    }>

    const firstCommittee = committeesCreate[0]
    expect(firstCommittee).toBeDefined()
    expect(firstCommittee?.date).toBeInstanceOf(Date)
    expect(firstCommittee?.date.toISOString()).toBe('2026-06-10T00:00:00.000Z')

    const firstItem = firstCommittee?.items.create[0]
    const thesisSubmissionAt = firstItem?.student?.create.thesisSubmissionAt

    expect(thesisSubmissionAt).toBeInstanceOf(Date)
    expect(thesisSubmissionAt?.toISOString()).toBe('2026-06-11T00:00:00.000Z')
  })
})
