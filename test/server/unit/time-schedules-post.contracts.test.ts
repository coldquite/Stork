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
        preparationRoom: 'TH:A-1520',
        secretaryName: 'Sekretář 1',
        invigilators: ['Dozor A', 'Dozor B'],
        language: 'CZECH',
        studyProgramName: 'Study program A',
        studyProgramType: 'BACHELOR',
        specializationName: 'Specialization A',
        specializationCode: 'SPEC-A',
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
              pauseType: 'BREAK',
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

  it('defaults missing preparation room to null', () => {
    const payload = createPayload()
    const [firstCommittee, ...otherCommittees] = payload.committees
    if (!firstCommittee) {
      throw new Error('Expected committee in payload')
    }

    const parsed = parsePostTimeSchedulePayload({
      ...payload,
      committees: [{ ...firstCommittee, preparationRoom: undefined }, ...otherCommittees]
    })

    expect(parsed.committees[0]?.preparationRoom).toBeNull()
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

  it('allows empty student first and last names after trim', () => {
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
                firstName: '   ',
                lastName: '   '
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

    expect(parsedStudent.student.firstName).toBe('')
    expect(parsedStudent.student.lastName).toBe('')
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

  it('accepts zero-valued student minute fields', () => {
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
                prepareMinutes: 0,
                examMinutes: 0
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

    expect(parsedStudent.student.prepareMinutes).toBe(0)
    expect(parsedStudent.student.examMinutes).toBe(0)
  })

  it.each([
    {
      name: 'student prepareMinutes is negative',
      expectedIssueFragment: 'payload.committees[0].items[0].student.prepareMinutes',
      mutateStudent: (
        student: Extract<PostTimeScheduleRequestDto['committees'][number]['items'][number], { type: 'STUDENT' }>
      ) => ({
        ...student,
        student: {
          ...student.student,
          prepareMinutes: -1
        }
      })
    },
    {
      name: 'student examMinutes is negative',
      expectedIssueFragment: 'payload.committees[0].items[0].student.examMinutes',
      mutateStudent: (
        student: Extract<PostTimeScheduleRequestDto['committees'][number]['items'][number], { type: 'STUDENT' }>
      ) => ({
        ...student,
        student: {
          ...student.student,
          examMinutes: -1
        }
      })
    }
  ])('rejects payload when $name', ({ expectedIssueFragment, mutateStudent }) => {
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
          items: [mutateStudent(firstItem)]
        }
      ]
    })

    expect(statusMessage).toContain('Invalid time schedule payload:')
    expect(statusMessage).toContain(expectedIssueFragment)
    expect(statusMessage).toContain('greater than or equal to 0')
  })

  it('rejects pause item when durationMinutes is zero', () => {
    const payload = createPayload()
    const firstCommittee = payload.committees[0]
    if (!firstCommittee) {
      throw new Error('Expected committee in payload')
    }

    const pauseItem = firstCommittee.items[1]
    if (!pauseItem || pauseItem.type !== 'PAUSE') {
      throw new Error('Expected second item to be PAUSE')
    }

    const statusMessage = getValidationStatusMessage({
      ...payload,
      committees: [
        {
          ...firstCommittee,
          items: [
            {
              ...pauseItem,
              pause: {
                ...pauseItem.pause,
                durationMinutes: 0
              }
            }
          ]
        }
      ]
    })

    expect(statusMessage).toContain('Invalid time schedule payload:')
    expect(statusMessage).toContain('payload.committees[0].items[0].pause.durationMinutes')
    expect(statusMessage).toContain('greater than 0')
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
                pauseType: 'BREAK',
                durationMinutes: 1
              }
            }
          ]
        }
      ]
    }

    expect(() => parsePostTimeSchedulePayload(invalidPayload)).toThrowError(/Invalid time schedule payload/)
  })

  it('rejects pause item when pauseType is missing', () => {
    const payload = createPayload()
    const firstCommittee = payload.committees[0]
    if (!firstCommittee) {
      throw new Error('Expected committee in payload')
    }

    const pauseItem = firstCommittee.items[1]
    if (!pauseItem || pauseItem.type !== 'PAUSE') {
      throw new Error('Expected second item to be PAUSE')
    }

    const statusMessage = getValidationStatusMessage({
      ...payload,
      committees: [
        {
          ...firstCommittee,
          items: [
            {
              ...pauseItem,
              pause: {
                label: pauseItem.pause.label,
                durationMinutes: pauseItem.pause.durationMinutes
              }
            }
          ]
        }
      ]
    })

    expect(statusMessage).toContain('Invalid time schedule payload:')
    expect(statusMessage).toContain('payload.committees[0].items[0].pause.pauseType')
  })

  it('rejects pause item when pauseType has invalid value', () => {
    const payload = createPayload()
    const firstCommittee = payload.committees[0]
    if (!firstCommittee) {
      throw new Error('Expected committee in payload')
    }

    const pauseItem = firstCommittee.items[1]
    if (!pauseItem || pauseItem.type !== 'PAUSE') {
      throw new Error('Expected second item to be PAUSE')
    }

    const statusMessage = getValidationStatusMessage({
      ...payload,
      committees: [
        {
          ...firstCommittee,
          items: [
            {
              ...pauseItem,
              pause: {
                ...pauseItem.pause,
                pauseType: 'COFFEE'
              }
            }
          ]
        }
      ]
    })

    expect(statusMessage).toContain('Invalid time schedule payload:')
    expect(statusMessage).toContain('payload.committees[0].items[0].pause.pauseType')
  })

  it('maps payload to prisma create data and parses committee date', () => {
    const mapped = mapTimeScheduleCreateData(parsePostTimeSchedulePayload(createPayload()))
    if (!mapped.committees || !Array.isArray(mapped.committees.create)) {
      throw new Error('Expected mapped committees.create array')
    }

    const firstCommittee = mapped.committees.create[0]
    expect(firstCommittee).toBeDefined()
    const committeeDate = firstCommittee?.date
    expect(committeeDate).toBeInstanceOf(Date)
    if (!(committeeDate instanceof Date)) {
      throw new Error('Expected committee date to be a Date instance')
    }

    expect(committeeDate.toISOString()).toBe('2026-06-10T00:00:00.000Z')
    expect(firstCommittee?.preparationRoom).toBe('TH:A-1520')
  })
})
