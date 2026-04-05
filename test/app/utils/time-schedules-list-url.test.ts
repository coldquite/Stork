import { describe, expect, it } from 'vitest'
import { buildTimeSchedulesListUrl } from '~/utils/time-schedules-list-url'

describe('buildTimeSchedulesListUrl', () => {
  it('builds minimal list URL (recent schedules style)', () => {
    expect(buildTimeSchedulesListUrl({ page: 1, pageSize: 7 })).toBe('/api/time-schedules?page=1&pageSize=7')
  })

  it('includes type and search for browse style', () => {
    const url = buildTimeSchedulesListUrl({
      page: 2,
      pageSize: 20,
      type: 'MANUAL',
      search: 'exam'
    })
    expect(url).toContain('page=2')
    expect(url).toContain('pageSize=20')
    expect(url).toContain('type=MANUAL')
    expect(url).toContain('search=')
    expect(url).toMatch(/search=exam/)
  })

  it('omits empty or whitespace-only search', () => {
    expect(buildTimeSchedulesListUrl({ page: 1, pageSize: 20, type: 'AUTO', search: '' })).not.toContain('search=')
    expect(buildTimeSchedulesListUrl({ page: 1, pageSize: 20, type: 'AUTO', search: '   ' })).not.toContain('search=')
  })

  it('encodes special characters in search', () => {
    const url = buildTimeSchedulesListUrl({
      page: 1,
      pageSize: 20,
      type: 'MANUAL',
      search: 'a&b=c'
    })
    expect(url).not.toContain('a&b=c')
    expect(url).toContain('search=')
  })
})
