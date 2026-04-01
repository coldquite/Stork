// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '#server/utils/db'
import { apiUrl, createAuthCookie } from './_helpers'

const TEST_NAME_PREFIX = '__IT_TIME_SCHEDULE_ID_DELETE__'

async function cleanupFixture(): Promise<void> {
  await prisma.timeSchedule.deleteMany({
    where: {
      name: {
        startsWith: TEST_NAME_PREFIX
      }
    }
  })
}

async function createScheduleFixture(type: 'MANUAL' | 'AUTO'): Promise<string> {
  const createdSchedule = await prisma.timeSchedule.create({
    data: {
      name: `${TEST_NAME_PREFIX} ${type}`,
      type,
      committees: {
        create: []
      }
    },
    select: {
      id: true
    }
  })

  return createdSchedule.id
}

describe('DELETE /api/time-schedules/:id (integration)', () => {
  beforeEach(async () => {
    await cleanupFixture()
  })

  afterEach(async () => {
    await cleanupFixture()
  })

  it('returns 401 without authentication cookie', async () => {
    const response = await fetch(apiUrl('/api/time-schedules/non-existent-id'), {
      method: 'DELETE'
    })

    expect(response.status).toBe(401)
  })

  it('returns 404 for non-existent id', async () => {
    const response = await fetch(apiUrl('/api/time-schedules/non-existent-id'), {
      method: 'DELETE',
      headers: {
        cookie: createAuthCookie()
      }
    })

    expect(response.status).toBe(404)
  })

  it('deletes existing manual schedule by id', async () => {
    const scheduleId = await createScheduleFixture('MANUAL')

    const response = await fetch(apiUrl(`/api/time-schedules/${encodeURIComponent(scheduleId)}`), {
      method: 'DELETE',
      headers: {
        cookie: createAuthCookie()
      }
    })

    expect(response.status).toBe(204)
    expect(await response.text()).toBe('')

    const deletedSchedule = await prisma.timeSchedule.findUnique({
      where: {
        id: scheduleId
      }
    })

    expect(deletedSchedule).toBeNull()
  })

  it('deletes existing auto schedule by id (no type restriction at endpoint level)', async () => {
    const scheduleId = await createScheduleFixture('AUTO')

    const response = await fetch(apiUrl(`/api/time-schedules/${encodeURIComponent(scheduleId)}`), {
      method: 'DELETE',
      headers: {
        cookie: createAuthCookie()
      }
    })

    expect(response.status).toBe(204)

    const deletedSchedule = await prisma.timeSchedule.findUnique({
      where: {
        id: scheduleId
      }
    })

    expect(deletedSchedule).toBeNull()
  })
})
