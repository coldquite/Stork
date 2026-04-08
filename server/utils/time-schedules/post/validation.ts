import { createError } from 'h3'
import { z } from 'zod'
import type { PostTimeScheduleRequestDto } from '#shared/types/time-schedules'

const studyLanguageSchema = z.enum(['CZECH', 'ENGLISH'])
const studyProgramTypeSchema = z.enum(['BACHELOR', 'MASTER'])
const thesisLanguageSchema = z.enum(['CZECH', 'ENGLISH', 'SLOVAK'])
const pauseTypeSchema = z.enum(['BREAK', 'LUNCH'])
const repeatTypeSchema = z.enum(['NONE', 'THESIS_DEFENSE', 'ORAL_EXAM', 'BOTH', 'UNKNOWN'])
const timeScheduleTypeSchema = z.enum(['MANUAL', 'AUTO'])

const nonEmptyTrimmedStringSchema = z.string().trim().min(1, {
  message: 'must have at least 1 non-whitespace character'
})

const dateStringSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'must be a valid ISO date string'
})

const studentItemSchema = z
  .object({
    firstName: nonEmptyTrimmedStringSchema,
    lastName: nonEmptyTrimmedStringSchema,
    email: z.string().nullable(),
    titlesBefore: z.string().nullable(),
    titlesAfter: z.string().nullable(),
    thesisTitleLocal: z.string(),
    thesisTitleEn: z.string(),
    thesisLanguage: thesisLanguageSchema,
    supervisorName: z.string(),
    reviewerName: z.string(),
    additionalSupervisorName: z.string().nullable(),
    additionalReviewerName: z.string().nullable(),
    studyProgramName: z.string(),
    studyProgramType: studyProgramTypeSchema,
    specializationName: z.string(),
    specializationCode: z.string(),
    studyLanguage: studyLanguageSchema,
    repeatType: repeatTypeSchema,
    prepareMinutes: z.number().int({
      message: 'must be an integer'
    }),
    examMinutes: z.number().int({
      message: 'must be an integer'
    })
  })
  .strict()

const pauseItemSchema = z
  .object({
    label: z.string(),
    pauseType: pauseTypeSchema,
    durationMinutes: z.number().int({
      message: 'must be an integer'
    })
  })
  .strict()

const committeeItemSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('STUDENT'),
      position: z.number().int({
        message: 'must be an integer'
      }),
      student: studentItemSchema,
      pause: z.null()
    })
    .strict(),
  z
    .object({
      type: z.literal('PAUSE'),
      position: z.number().int({
        message: 'must be an integer'
      }),
      student: z.null(),
      pause: pauseItemSchema
    })
    .strict()
])

const committeeSchema = z
  .object({
    name: z.string(),
    startMinute: z.number().int({
      message: 'must be an integer'
    }),
    date: dateStringSchema,
    room: z.string().nullable(),
    secretaryName: z.string().nullable(),
    invigilators: z.array(z.string()),
    language: studyLanguageSchema,
    studyProgramName: z.string(),
    studyProgramType: studyProgramTypeSchema,
    specializationName: z.string(),
    specializationCode: z.string(),
    defenseDepartmentCode: z.string().nullable(),
    defenseDepartmentName: z.string().nullable(),
    chairName: z.string(),
    viceChairName: z.string(),
    member1Name: z.string(),
    member2Name: z.string(),
    member3Name: z.string(),
    items: z.array(committeeItemSchema)
  })
  .strict()

const postTimeSchedulePayloadSchema = z
  .object({
    name: nonEmptyTrimmedStringSchema,
    type: timeScheduleTypeSchema,
    committees: z.array(committeeSchema)
  })
  .strict()

function formatIssuePath(path: readonly PropertyKey[]): string {
  if (path.length === 0) {
    return 'payload'
  }

  let result = 'payload'
  for (const segment of path) {
    if (typeof segment === 'number') {
      result += `[${segment}]`
      continue
    }

    if (typeof segment === 'symbol') {
      result += '.[symbol]'
      continue
    }

    result += `.${segment}`
  }

  return result
}

function invalidPayload(reason: string): never {
  throw createError({
    statusCode: 400,
    statusMessage: `Invalid time schedule payload: ${reason}`
  })
}

export function parsePostTimeSchedulePayload(payload: unknown): PostTimeScheduleRequestDto {
  const parseResult = postTimeSchedulePayloadSchema.safeParse(payload)

  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0]
    if (!firstIssue) {
      invalidPayload('unknown validation error')
    }

    invalidPayload(`${formatIssuePath(firstIssue.path)} ${firstIssue.message}`)
  }

  return parseResult.data as PostTimeScheduleRequestDto
}
