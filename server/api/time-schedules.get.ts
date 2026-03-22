import { prisma } from '#server/utils/db'
import { requireAuthenticatedUser } from '#server/utils/require-auth'

interface TimeScheduleListRow {
  id: string
  name: string | null
  updatedAt: Date
  committeesCount: number
  itemsCount: number
  studentsCount: number
  pausesCount: number
}

interface TimeScheduleListResponseItem {
  id: string
  name: string | null
  updatedAt: string
  counts: {
    committees: number
    items: number
    students: number
    pauses: number
  }
}

export default defineEventHandler(async (event): Promise<{ schedules: TimeScheduleListResponseItem[] }> => {
  requireAuthenticatedUser(event)

  const scheduleRows = await prisma.$queryRaw<TimeScheduleListRow[]>`
    SELECT ts.id,
           ts.name,
           ts."updatedAt",
           COUNT(DISTINCT c.id)::int AS "committeesCount",
           COUNT(ci.id)::int         AS "itemsCount",
           COUNT(si."itemId")::int   AS "studentsCount",
           COUNT(pi."itemId")::int   AS "pausesCount"
    FROM "TimeSchedule" ts
           LEFT JOIN "Committee" c ON c."timeScheduleId" = ts.id
           LEFT JOIN "CommitteeItem" ci ON ci."committeeId" = c.id
           LEFT JOIN "StudentItem" si ON si."itemId" = ci.id
           LEFT JOIN "PauseItem" pi ON pi."itemId" = ci.id
    GROUP BY ts.id, ts.name, ts."updatedAt"
    ORDER BY ts."updatedAt" DESC
  `

  return {
    schedules: scheduleRows.map((row) => ({
      id: row.id,
      name: row.name,
      updatedAt: row.updatedAt.toISOString(),
      counts: {
        committees: row.committeesCount,
        items: row.itemsCount,
        students: row.studentsCount,
        pauses: row.pausesCount
      }
    }))
  }
})
