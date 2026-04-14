import { createError } from 'h3'
import { z } from 'zod'
import type { PostTimeScheduleRequestDto } from '#shared/types/time-schedules'
import { formatZodIssuePath } from '#server/utils/validation/format-zod-issue-path'

const studyLanguageSchema = z.enum(['CZECH', 'ENGLISH'])
const studyProgramTypeSchema = z.enum(['BACHELOR', 'MASTER'])
const thesisLanguageSchema = z.enum(['CZECH', 'ENGLISH', 'SLOVAK'])
const pauseTypeSchema = z.enum(['BREAK', 'LUNCH'])
const repeatTypeSchema = z.enum(['NONE', 'THESIS_DEFENSE', 'ORAL_EXAM', 'BOTH', 'UNKNOWN'])
const timeScheduleTypeSchema = z.enum(['MANUAL', 'AUTO'])

const trimmedStringSchema = z.string().trim()

const nonEmptyTrimmedStringSchema = trimmedStringSchema.min(1, {
  message: 'must have at least 1 non-whitespace character'
})

const dateStringSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'must be a valid ISO date string'
})

const nonNegativeIntegerSchema = z
  .number()
  .int({
    message: 'must be an integer'
  })
  .min(0, {
    message: 'must be greater than or equal to 0'
  })

const positiveIntegerSchema = z
  .number()
  .int({
    message: 'must be an integer'
  })
  .gt(0, {
    message: 'must be greater than 0'
  })

const studentItemSchema = z
  .object({
    firstName: trimmedStringSchema,
    lastName: trimmedStringSchema,
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
    prepareMinutes: nonNegativeIntegerSchema,
    examMinutes: nonNegativeIntegerSchema
  })
  .strict()

const pauseItemSchema = z
  .object({
    label: z.string(),
    pauseType: pauseTypeSchema,
    durationMinutes: positiveIntegerSchema
  })
  .strict()

const committeeItemSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('STUDENT'),
      position: nonNegativeIntegerSchema,
      student: studentItemSchema,
      pause: z.null()
    })
    .strict(),
  z
    .object({
      type: z.literal('PAUSE'),
      position: nonNegativeIntegerSchema,
      student: z.null(),
      pause: pauseItemSchema
    })
    .strict()
])

const committeeSchema = z
  .object({
    name: z.string(),
    startMinute: nonNegativeIntegerSchema.max(1439, {
      message: 'must be less than or equal to 1439'
    }),
    date: dateStringSchema,
    room: z.string().nullable(),
    preparationRoom: z.string().nullable().optional().default(null),
    secretaryName: z.string().nullable(),
    invigilators: z.array(z.string()),
    language: studyLanguageSchema,
    studyProgramName: z.string(),
    studyProgramType: studyProgramTypeSchema,
    specializationName: z.string(),
    specializationCode: z.string(),
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

    invalidPayload(`${formatZodIssuePath(firstIssue.path)} ${firstIssue.message}`)
  }

  return parseResult.data as PostTimeScheduleRequestDto
}
