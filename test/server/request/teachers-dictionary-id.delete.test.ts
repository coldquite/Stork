// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '#server/utils/db'
import { buildTeachersDictionaryLookupKey } from '#shared/utils/teachers-dictionary'
import { apiUrl, createAuthCookie } from './_helpers'

const DELETE_TEST_CANONICAL_NAME = 'Ing. Marek Suchánek Ph.D. et Ph.D.'
const DELETE_TEST_LOOKUP_KEY = buildTeachersDictionaryLookupKey(DELETE_TEST_CANONICAL_NAME)

async function cleanupTeachersDictionaryFixture(): Promise<void> {
  await prisma.teachersDictionary.deleteMany({
    where: {
      normalizedLookupKey: DELETE_TEST_LOOKUP_KEY
    }
  })
}

describe('DELETE /api/teachers-dictionary/:id (integration)', () => {
  beforeEach(async () => {
    await cleanupTeachersDictionaryFixture()
  })

  afterEach(async () => {
    await cleanupTeachersDictionaryFixture()
  })

  it('returns 401 without authentication cookie', async () => {
    const response = await fetch(apiUrl('/api/teachers-dictionary/non-existent-id'), {
      method: 'DELETE'
    })

    expect(response.status).toBe(401)
  })

  it('returns 404 for non-existent id', async () => {
    const response = await fetch(apiUrl('/api/teachers-dictionary/non-existent-id'), {
      method: 'DELETE',
      headers: {
        cookie: createAuthCookie()
      }
    })

    expect(response.status).toBe(404)
  })

  it('deletes existing teachers dictionary entry by id', async () => {
    const authCookie = createAuthCookie()
    const createdEntry = await prisma.teachersDictionary.create({
      data: {
        canonicalName: DELETE_TEST_CANONICAL_NAME,
        normalizedLookupKey: DELETE_TEST_LOOKUP_KEY,
        isCustom: false
      }
    })

    const deleteResponse = await fetch(apiUrl(`/api/teachers-dictionary/${encodeURIComponent(createdEntry.id)}`), {
      method: 'DELETE',
      headers: {
        cookie: authCookie
      }
    })

    expect(deleteResponse.status).toBe(204)
    expect(await deleteResponse.text()).toBe('')

    const deletedEntry = await prisma.teachersDictionary.findUnique({
      where: {
        id: createdEntry.id
      }
    })
    expect(deletedEntry).toBeNull()
  })
})
