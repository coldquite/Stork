import { createError, isError, readBody, setResponseStatus } from 'h3'
import { Prisma } from '~~/prisma/generated/client/client'
import { prisma } from '#server/utils/db'
import { requireAuthenticatedUser } from '#server/utils/require-auth'
import type {
  PostCommitteeDto,
  PostCommitteeItemDto,
  PostPauseItemDto,
  PostStudentItemDto,
  PostTimeScheduleRequestDto,
  PostTimeScheduleResponseDto,
  RepeatTypeDto,
  StudyLanguageDto,
  StudyProgramTypeDto,
  ThesisLanguageDto,
  TimeScheduleTypeDto
} from '#shared/types/time-schedules'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const FORBIDDEN_SYSTEM_FIELDS = new Set(['id', 'timeScheduleId', 'committeeId', 'itemId', 'createdAt'])
const TIME_SCHEDULE_TYPES: ReadonlySet<TimeScheduleTypeDto> = new Set(['MANUAL', 'AUTO'])
const COMMITTEE_ITEM_TYPES: ReadonlySet<'STUDENT' | 'PAUSE'> = new Set(['STUDENT', 'PAUSE'])
const STUDY_LANGUAGES: ReadonlySet<StudyLanguageDto> = new Set(['CZECH', 'ENGLISH'])
const STUDY_PROGRAM_TYPES: ReadonlySet<StudyProgramTypeDto> = new Set(['BACHELOR', 'MASTER'])
const THESIS_LANGUAGES: ReadonlySet<ThesisLanguageDto> = new Set(['CZECH', 'ENGLISH', 'SLOVAK'])
const REPEAT_TYPES: ReadonlySet<RepeatTypeDto> = new Set(['NONE', 'THESIS_DEFENSE', 'ORAL_EXAM', 'BOTH', 'UNKNOWN'])
const ISO_DATE_TIME_WITH_TIMEZONE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/
const PRAGUE_DATE_FORMATTER = new Intl.DateTimeFormat('en', {
  timeZone: 'Europe/Prague',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

function invalidPayload(reason: string): never {
  throw createError({
    statusCode: 400,
    statusMessage: `Invalid time schedule payload: ${reason}`
  })
}

function assertRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) {
    invalidPayload(`${path} must be an object`)
  }

  return value
}

function assertNoUnknownKeys(value: Record<string, unknown>, allowedKeys: readonly string[], path: string): void {
  const allowed = new Set(allowedKeys)

  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      invalidPayload(`${path}.${key} is not allowed`)
    }
  }
}

function assertNoForbiddenSystemFields(value: unknown, path: string): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      assertNoForbiddenSystemFields(item, `${path}[${index}]`)
    })
    return
  }

  if (!isRecord(value)) {
    return
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (FORBIDDEN_SYSTEM_FIELDS.has(key)) {
      invalidPayload(`${path}.${key} must not be sent`)
    }

    assertNoForbiddenSystemFields(nestedValue, `${path}.${key}`)
  }
}

function parseString(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    invalidPayload(`${path} must be a string`)
  }

  return value
}

function parseTrimmedNonEmptyString(value: unknown, path: string): string {
  const parsedValue = parseString(value, path).trim()

  if (parsedValue.length < 1) {
    invalidPayload(`${path} must have at least 1 non-whitespace character`)
  }

  return parsedValue
}

function parseNullableString(value: unknown, path: string): string | null {
  if (value === null) {
    return null
  }

  if (typeof value !== 'string') {
    invalidPayload(`${path} must be a string or null`)
  }

  return value
}

function parseBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') {
    invalidPayload(`${path} must be a boolean`)
  }

  return value
}

function parseInteger(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    invalidPayload(`${path} must be an integer`)
  }

  return value
}

function parseStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) {
    invalidPayload(`${path} must be an array`)
  }

  return value.map((entry, index) => parseString(entry, `${path}[${index}]`))
}

function parseEnumValue<T extends string>(value: unknown, allowedValues: ReadonlySet<T>, path: string): T {
  if (typeof value !== 'string' || !allowedValues.has(value as T)) {
    invalidPayload(`${path} has unsupported value`)
  }

  return value as T
}

function parseDateString(value: unknown, path: string): string {
  const dateString = parseString(value, path)

  if (Number.isNaN(Date.parse(dateString))) {
    invalidPayload(`${path} must be a valid ISO date string`)
  }

  return dateString
}

function parseIsoDateTimeString(value: unknown, path: string): string {
  const dateString = parseString(value, path)

  if (!ISO_DATE_TIME_WITH_TIMEZONE_PATTERN.test(dateString)) {
    invalidPayload(`${path} must be a valid ISO datetime with timezone`)
  }

  if (Number.isNaN(Date.parse(dateString))) {
    invalidPayload(`${path} must be a valid ISO datetime`)
  }

  return dateString
}

function parseNullableIsoDateTimeString(value: unknown, path: string): string | null {
  if (value === null) {
    return null
  }

  return parseIsoDateTimeString(value, path)
}

function parseDatePart(parts: Intl.DateTimeFormatPart[], type: 'year' | 'month' | 'day'): number {
  const part = parts.find((entry) => entry.type === type)?.value

  if (!part) {
    invalidPayload(`thesisSubmissionAt normalization failed for missing "${type}"`)
  }

  const parsedValue = Number.parseInt(part, 10)
  if (!Number.isSafeInteger(parsedValue)) {
    invalidPayload(`thesisSubmissionAt normalization failed for invalid "${type}"`)
  }

  return parsedValue
}

function normalizeDateTimeToPragueDayStart(value: string): Date {
  const parsedDate = new Date(value)
  const dateParts = PRAGUE_DATE_FORMATTER.formatToParts(parsedDate)
  const year = parseDatePart(dateParts, 'year')
  const month = parseDatePart(dateParts, 'month')
  const day = parseDatePart(dateParts, 'day')

  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
}

function parseArray<T>(value: unknown, path: string, parser: (item: unknown, path: string) => T): T[] {
  if (!Array.isArray(value)) {
    invalidPayload(`${path} must be an array`)
  }

  return value.map((entry, index) => parser(entry, `${path}[${index}]`))
}

function parseStudentItem(value: unknown, path: string): PostStudentItemDto {
  const record = assertRecord(value, path)
  assertNoUnknownKeys(
    record,
    [
      'personalNumber',
      'firstName',
      'lastName',
      'titlesBefore',
      'titlesAfter',
      'thesisTitleLocal',
      'thesisTitleEn',
      'thesisLanguage',
      'supervisorName',
      'reviewerName',
      'additionalSupervisorName',
      'additionalReviewerName',
      'studyProgramName',
      'studyProgramType',
      'specializationName',
      'specializationCode',
      'defenseDepartmentCode',
      'defenseDepartmentName',
      'studyLanguage',
      'thesisSubmissionAt',
      'repeatType',
      'elsa',
      'prepareMinutes',
      'examMinutes'
    ],
    path
  )

  return {
    personalNumber: parseNullableString(record.personalNumber, `${path}.personalNumber`),
    firstName: parseTrimmedNonEmptyString(record.firstName, `${path}.firstName`),
    lastName: parseTrimmedNonEmptyString(record.lastName, `${path}.lastName`),
    titlesBefore: parseNullableString(record.titlesBefore, `${path}.titlesBefore`),
    titlesAfter: parseNullableString(record.titlesAfter, `${path}.titlesAfter`),
    thesisTitleLocal: parseString(record.thesisTitleLocal, `${path}.thesisTitleLocal`),
    thesisTitleEn: parseString(record.thesisTitleEn, `${path}.thesisTitleEn`),
    thesisLanguage: parseEnumValue(record.thesisLanguage, THESIS_LANGUAGES, `${path}.thesisLanguage`),
    supervisorName: parseString(record.supervisorName, `${path}.supervisorName`),
    reviewerName: parseString(record.reviewerName, `${path}.reviewerName`),
    additionalSupervisorName: parseNullableString(record.additionalSupervisorName, `${path}.additionalSupervisorName`),
    additionalReviewerName: parseNullableString(record.additionalReviewerName, `${path}.additionalReviewerName`),
    studyProgramName: parseString(record.studyProgramName, `${path}.studyProgramName`),
    studyProgramType: parseEnumValue(record.studyProgramType, STUDY_PROGRAM_TYPES, `${path}.studyProgramType`),
    specializationName: parseString(record.specializationName, `${path}.specializationName`),
    specializationCode: parseString(record.specializationCode, `${path}.specializationCode`),
    defenseDepartmentCode: parseString(record.defenseDepartmentCode, `${path}.defenseDepartmentCode`),
    defenseDepartmentName: parseString(record.defenseDepartmentName, `${path}.defenseDepartmentName`),
    studyLanguage: parseEnumValue(record.studyLanguage, STUDY_LANGUAGES, `${path}.studyLanguage`),
    thesisSubmissionAt: parseNullableIsoDateTimeString(record.thesisSubmissionAt, `${path}.thesisSubmissionAt`),
    repeatType: parseEnumValue(record.repeatType, REPEAT_TYPES, `${path}.repeatType`),
    elsa: parseBoolean(record.elsa, `${path}.elsa`),
    prepareMinutes: parseInteger(record.prepareMinutes, `${path}.prepareMinutes`),
    examMinutes: parseInteger(record.examMinutes, `${path}.examMinutes`)
  }
}

function parsePauseItem(value: unknown, path: string): PostPauseItemDto {
  const record = assertRecord(value, path)
  assertNoUnknownKeys(record, ['label', 'durationMinutes'], path)

  return {
    label: parseString(record.label, `${path}.label`),
    durationMinutes: parseInteger(record.durationMinutes, `${path}.durationMinutes`)
  }
}

function parseCommitteeItem(value: unknown, path: string): PostCommitteeItemDto {
  const record = assertRecord(value, path)
  assertNoUnknownKeys(record, ['type', 'position', 'student', 'pause'], path)

  const type = parseEnumValue(record.type, COMMITTEE_ITEM_TYPES, `${path}.type`)
  const position = parseInteger(record.position, `${path}.position`)

  if (type === 'STUDENT') {
    if (record.pause !== null) {
      invalidPayload(`${path}.pause must be null for STUDENT item`)
    }

    return {
      type: 'STUDENT',
      position,
      student: parseStudentItem(record.student, `${path}.student`),
      pause: null
    }
  }

  if (record.student !== null) {
    invalidPayload(`${path}.student must be null for PAUSE item`)
  }

  return {
    type: 'PAUSE',
    position,
    student: null,
    pause: parsePauseItem(record.pause, `${path}.pause`)
  }
}

function parseCommittee(value: unknown, path: string): PostCommitteeDto {
  const record = assertRecord(value, path)
  assertNoUnknownKeys(
    record,
    [
      'name',
      'startMinute',
      'date',
      'room',
      'secretaryName',
      'invigilators',
      'language',
      'studyProgramName',
      'studyProgramType',
      'specializationName',
      'specializationCode',
      'defenseDepartmentCode',
      'defenseDepartmentName',
      'chairName',
      'viceChairName',
      'member1Name',
      'member2Name',
      'member3Name',
      'items'
    ],
    path
  )

  return {
    name: parseString(record.name, `${path}.name`),
    startMinute: parseInteger(record.startMinute, `${path}.startMinute`),
    date: parseDateString(record.date, `${path}.date`),
    room: parseNullableString(record.room, `${path}.room`),
    secretaryName: parseNullableString(record.secretaryName, `${path}.secretaryName`),
    invigilators: parseStringArray(record.invigilators, `${path}.invigilators`),
    language: parseEnumValue(record.language, STUDY_LANGUAGES, `${path}.language`),
    studyProgramName: parseString(record.studyProgramName, `${path}.studyProgramName`),
    studyProgramType: parseEnumValue(record.studyProgramType, STUDY_PROGRAM_TYPES, `${path}.studyProgramType`),
    specializationName: parseString(record.specializationName, `${path}.specializationName`),
    specializationCode: parseString(record.specializationCode, `${path}.specializationCode`),
    defenseDepartmentCode: parseString(record.defenseDepartmentCode, `${path}.defenseDepartmentCode`),
    defenseDepartmentName: parseString(record.defenseDepartmentName, `${path}.defenseDepartmentName`),
    chairName: parseString(record.chairName, `${path}.chairName`),
    viceChairName: parseString(record.viceChairName, `${path}.viceChairName`),
    member1Name: parseString(record.member1Name, `${path}.member1Name`),
    member2Name: parseString(record.member2Name, `${path}.member2Name`),
    member3Name: parseString(record.member3Name, `${path}.member3Name`),
    items: parseArray(record.items, `${path}.items`, parseCommitteeItem)
  }
}

function parsePostTimeSchedulePayload(payload: unknown): PostTimeScheduleRequestDto {
  assertNoForbiddenSystemFields(payload, 'payload')
  const record = assertRecord(payload, 'payload')
  assertNoUnknownKeys(record, ['name', 'type', 'committees'], 'payload')

  return {
    name: parseTrimmedNonEmptyString(record.name, 'payload.name'),
    type: parseEnumValue(record.type, TIME_SCHEDULE_TYPES, 'payload.type'),
    committees: parseArray(record.committees, 'payload.committees', parseCommittee)
  }
}

function mapItemCreateData(item: PostCommitteeItemDto): Prisma.CommitteeItemCreateWithoutCommitteeInput {
  if (item.type === 'STUDENT') {
    return {
      type: 'STUDENT',
      position: item.position,
      student: {
        create: {
          personalNumber: item.student.personalNumber,
          firstName: item.student.firstName,
          lastName: item.student.lastName,
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
          defenseDepartmentCode: item.student.defenseDepartmentCode,
          defenseDepartmentName: item.student.defenseDepartmentName,
          studyLanguage: item.student.studyLanguage,
          thesisSubmissionAt:
            item.student.thesisSubmissionAt !== null
              ? normalizeDateTimeToPragueDayStart(item.student.thesisSubmissionAt)
              : null,
          repeatType: item.student.repeatType,
          elsa: item.student.elsa,
          prepareMinutes: item.student.prepareMinutes,
          examMinutes: item.student.examMinutes
        }
      }
    }
  }

  return {
    type: 'PAUSE',
    position: item.position,
    pause: {
      create: {
        label: item.pause.label,
        durationMinutes: item.pause.durationMinutes
      }
    }
  }
}

function mapCommitteeCreateData(committee: PostCommitteeDto): Prisma.CommitteeCreateWithoutTimeScheduleInput {
  return {
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
      create: committee.items.map((item) => mapItemCreateData(item))
    }
  }
}

function normalizeWriteError(error: unknown): never {
  if (isError(error)) {
    throw error
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid time schedule payload'
    })
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Payload conflicts with existing unique constraints'
      })
    }

    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid time schedule payload'
    })
  }

  throw createError({
    statusCode: 500,
    statusMessage: 'Failed to create time schedule'
  })
}

export default defineEventHandler(async (event): Promise<PostTimeScheduleResponseDto> => {
  requireAuthenticatedUser(event)

  const payload = parsePostTimeSchedulePayload(await readBody<unknown>(event))

  try {
    const createdSchedule = await prisma.timeSchedule.create({
      data: {
        name: payload.name,
        type: payload.type,
        committees: {
          create: payload.committees.map((committee) => mapCommitteeCreateData(committee))
        }
      },
      select: {
        id: true,
        createdAt: true
      }
    })

    setResponseStatus(event, 201)

    return {
      id: createdSchedule.id,
      createdAt: createdSchedule.createdAt.toISOString()
    }
  } catch (error: unknown) {
    normalizeWriteError(error)
  }
})
