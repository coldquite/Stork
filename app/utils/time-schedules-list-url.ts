import type { TimeScheduleTypeDto } from '#shared/types/time-schedules'

/** Query params for GET /api/time-schedules (list). */
export interface TimeSchedulesListUrlQuery {
  page: number
  pageSize: number
  type?: TimeScheduleTypeDto
  /** Plain search string; URLSearchParams handles encoding. Whitespace-only is omitted. */
  search?: string
}

/**
 * Builds the relative URL for the time-schedules list endpoint so callers share one encoding/layout.
 */
export function buildTimeSchedulesListUrl(query: TimeSchedulesListUrlQuery): string {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('pageSize', String(query.pageSize))

  if (query.type !== undefined) {
    params.set('type', query.type)
  }

  const trimmedSearch = query.search?.trim()
  if (trimmedSearch !== undefined && trimmedSearch.length > 0) {
    params.set('search', trimmedSearch)
  }

  return `/api/time-schedules?${params.toString()}`
}
