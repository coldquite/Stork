import { createError, getQuery } from 'h3'
import { Prisma } from '~~/prisma/generated/client/client'
import { prisma } from '#server/utils/db'
import { requireAuthenticatedUser } from '#server/utils/require-auth'
import type { TimeScheduleListItemDto, TimeScheduleTypeDto } from '#shared/types/time-schedules'

interface TimeScheduleListRow {
  id: string
  name: string
  type: TimeScheduleTypeDto
  createdAt: Date
  committeesCount: number
  itemsCount: number
  studentsCount: number
  pausesCount: number
}

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20
const TIME_SCHEDULE_TYPES: ReadonlySet<TimeScheduleTypeDto> = new Set(['MANUAL', 'AUTO'])

function invalidQuery(reason: string): never {
  throw createError({
    statusCode: 400,
    statusMessage: `Invalid time schedules query: ${reason}`
  })
}

function parseSingleQueryValue(value: unknown, key: string): string | undefined {
  if (value === undefined) {
    return undefined
  }

  if (Array.isArray(value)) {
    invalidQuery(`${key} must be provided only once`)
  }

  if (typeof value !== 'string') {
    invalidQuery(`${key} must be a string`)
  }

  return value
}

function parsePositiveIntegerQuery(value: string | undefined, key: string, defaultValue: number): number {
  if (value === undefined) {
    return defaultValue
  }

  if (!/^\d+$/.test(value)) {
    invalidQuery(`${key} must be a positive integer`)
  }

  const parsedValue = Number.parseInt(value, 10)

  if (!Number.isSafeInteger(parsedValue) || parsedValue < 1) {
    invalidQuery(`${key} must be a positive integer`)
  }

  return parsedValue
}

function parseTypeQuery(value: string | undefined): TimeScheduleTypeDto | null {
  if (value === undefined) {
    return null
  }

  if (!TIME_SCHEDULE_TYPES.has(value as TimeScheduleTypeDto)) {
    invalidQuery('type has unsupported value')
  }

  return value as TimeScheduleTypeDto
}

function parseSearchQuery(value: string | undefined): string | null {
  if (value === undefined) {
    return null
  }

  const normalizedValue = value.trim()
  if (normalizedValue.length === 0) {
    return null
  }

  return normalizedValue
}

function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

export default defineEventHandler(async (event): Promise<TimeScheduleListItemDto[]> => {
  requireAuthenticatedUser(event)

  const query = getQuery(event)
  const page = parsePositiveIntegerQuery(parseSingleQueryValue(query.page, 'page'), 'page', DEFAULT_PAGE)
  const pageSize = parsePositiveIntegerQuery(
    parseSingleQueryValue(query.pageSize, 'pageSize'),
    'pageSize',
    DEFAULT_PAGE_SIZE
  )
  const type = parseTypeQuery(parseSingleQueryValue(query.type, 'type'))
  const search = parseSearchQuery(parseSingleQueryValue(query.search, 'search'))

  const offset = (page - 1) * pageSize
  const likePattern = search ? `%${escapeLikePattern(search)}%` : null
  const whereClause = type
    ? likePattern
      ? Prisma.sql`WHERE ts."type" = ${type}::"TimeScheduleType" AND ts."name" ILIKE ${likePattern} ESCAPE '\\'`
      : Prisma.sql`WHERE ts."type" = ${type}::"TimeScheduleType"`
    : likePattern
      ? Prisma.sql`WHERE ts."name" ILIKE ${likePattern} ESCAPE '\\'`
      : Prisma.empty

  const scheduleRows = await prisma.$queryRaw<TimeScheduleListRow[]>(Prisma.sql`
    SELECT ts.id,
           ts.name,
           ts."type",
           ts."createdAt",
           COUNT(DISTINCT c.id)::int AS "committeesCount",
           COUNT(ci.id)::int         AS "itemsCount",
           COUNT(si."itemId")::int   AS "studentsCount",
           COUNT(pi."itemId")::int   AS "pausesCount"
    FROM "TimeSchedule" ts
           LEFT JOIN "Committee" c ON c."timeScheduleId" = ts.id
           LEFT JOIN "CommitteeItem" ci ON ci."committeeId" = c.id
           LEFT JOIN "StudentItem" si ON si."itemId" = ci.id
           LEFT JOIN "PauseItem" pi ON pi."itemId" = ci.id
    ${whereClause}
    GROUP BY ts.id, ts.name, ts."type", ts."createdAt"
    ORDER BY ts."createdAt" DESC, ts.id DESC
    LIMIT ${pageSize}
    OFFSET ${offset}
  `)

  return scheduleRows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    createdAt: row.createdAt.toISOString(),
    counts: {
      committees: row.committeesCount,
      items: row.itemsCount,
      students: row.studentsCount,
      pauses: row.pausesCount
    }
  }))
})
