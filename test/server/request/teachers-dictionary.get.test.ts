// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type {
  GetTeachersDictionaryMetadataResponseDto,
  GetTeachersDictionaryResponseDto
} from '#shared/types/teachers-dictionary'
import { buildTeachersDictionaryLookupKey } from '#shared/utils/teachers-dictionary'
import { prisma } from '#server/utils/db'
import { apiUrl, createAuthCookie } from './_helpers'

type UpsertEntry = {
  canonicalName: string
  isCustom?: boolean
}

const CUSTOM_CANONICAL_NAME = 'doc. Ing. Alena Nováková Ph.D.'
const SECOND_CUSTOM_CANONICAL_NAME = 'RNDr. Jana Králová Ph.D.'
const NON_CUSTOM_CANONICAL_NAME = 'Ing. Petr Svoboda CSc.'

const CUSTOM_LOOKUP_KEY = buildTeachersDictionaryLookupKey(CUSTOM_CANONICAL_NAME)
const SECOND_CUSTOM_LOOKUP_KEY = buildTeachersDictionaryLookupKey(SECOND_CUSTOM_CANONICAL_NAME)
const NON_CUSTOM_LOOKUP_KEY = buildTeachersDictionaryLookupKey(NON_CUSTOM_CANONICAL_NAME)

const CLEANUP_KEYS = Array.from(new Set([CUSTOM_LOOKUP_KEY, SECOND_CUSTOM_LOOKUP_KEY, NON_CUSTOM_LOOKUP_KEY]))

async function getTeachersDictionary(
  query: Record<string, string | undefined> = {},
  authCookie?: string
): Promise<Response> {
  const url = new URL(apiUrl('/api/teachers-dictionary'))
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      url.searchParams.set(key, value)
    }
  }

  const headers: Record<string, string> = {}
  if (authCookie) {
    headers.cookie = authCookie
  }

  return fetch(url.toString(), {
    method: 'GET',
    headers
  })
}

async function getTeachersDictionaryWithRawQuery(rawQuery: string, authCookie?: string): Promise<Response> {
  const headers: Record<string, string> = {}
  if (authCookie) {
    headers.cookie = authCookie
  }

  return fetch(apiUrl(`/api/teachers-dictionary${rawQuery}`), {
    method: 'GET',
    headers
  })
}

async function cleanupTeachersDictionaryFixture(): Promise<void> {
  await prisma.teachersDictionary.deleteMany({
    where: {
      normalizedLookupKey: {
        in: CLEANUP_KEYS
      }
    }
  })
}

async function seedTeachersDictionaryFixture(): Promise<void> {
  const payload: UpsertEntry[] = [
    {
      canonicalName: CUSTOM_CANONICAL_NAME,
      isCustom: true
    },
    {
      canonicalName: SECOND_CUSTOM_CANONICAL_NAME,
      isCustom: true
    },
    {
      canonicalName: NON_CUSTOM_CANONICAL_NAME,
      isCustom: false
    }
  ]

  await prisma.teachersDictionary.createMany({
    data: payload.map((entry) => ({
      canonicalName: entry.canonicalName,
      normalizedLookupKey: buildTeachersDictionaryLookupKey(entry.canonicalName),
      isCustom: entry.isCustom ?? false
    }))
  })
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { statusMessage?: string; message?: string }
    return payload.statusMessage ?? payload.message ?? ''
  } catch {
    return ''
  }
}

function expectMetadataLastUpdatedAtShape(
  metadata: GetTeachersDictionaryMetadataResponseDto,
  expectedCount: number
): void {
  if (expectedCount === 0) {
    expect(metadata.lastUpdatedAt).toBeNull()
    return
  }

  expect(metadata.lastUpdatedAt).not.toBeNull()
  expect(Number.isNaN(new Date(metadata.lastUpdatedAt ?? '').getTime())).toBe(false)
}

describe('GET /api/teachers-dictionary (integration)', () => {
  beforeEach(async () => {
    await cleanupTeachersDictionaryFixture()
  })

  afterEach(async () => {
    await cleanupTeachersDictionaryFixture()
  })

  it('returns 401 without authentication cookie', async () => {
    const response = await getTeachersDictionary()

    expect(response.status).toBe(401)
  })

  it('returns seeded entries without filters', async () => {
    const authCookie = createAuthCookie()
    await seedTeachersDictionaryFixture()

    const response = await getTeachersDictionary({}, authCookie)
    expect(response.status).toBe(200)

    const entries = (await response.json()) as GetTeachersDictionaryResponseDto
    const entriesByLookupKey = new Map(entries.map((entry) => [entry.normalizedLookupKey, entry] as const))

    const customEntry = entriesByLookupKey.get(CUSTOM_LOOKUP_KEY)
    expect(customEntry?.canonicalName).toBe(CUSTOM_CANONICAL_NAME)
    expect(customEntry?.isCustom).toBe(true)

    const secondCustomEntry = entriesByLookupKey.get(SECOND_CUSTOM_LOOKUP_KEY)
    expect(secondCustomEntry?.canonicalName).toBe(SECOND_CUSTOM_CANONICAL_NAME)
    expect(secondCustomEntry?.isCustom).toBe(true)

    const nonCustomEntry = entriesByLookupKey.get(NON_CUSTOM_LOOKUP_KEY)
    expect(nonCustomEntry?.canonicalName).toBe(NON_CUSTOM_CANONICAL_NAME)
    expect(nonCustomEntry?.isCustom).toBe(false)
  })

  it('filters entries by isCustom=true', async () => {
    const authCookie = createAuthCookie()
    await seedTeachersDictionaryFixture()

    const response = await getTeachersDictionary({ isCustom: 'true' }, authCookie)
    expect(response.status).toBe(200)

    const entries = (await response.json()) as GetTeachersDictionaryResponseDto
    expect(entries.every((entry) => entry.isCustom)).toBe(true)
    const lookupKeys = new Set(entries.map((entry) => entry.normalizedLookupKey))
    expect(lookupKeys.has(CUSTOM_LOOKUP_KEY)).toBe(true)
    expect(lookupKeys.has(SECOND_CUSTOM_LOOKUP_KEY)).toBe(true)
    expect(lookupKeys.has(NON_CUSTOM_LOOKUP_KEY)).toBe(false)
  })

  it('filters entries by isCustom=false', async () => {
    const authCookie = createAuthCookie()
    await seedTeachersDictionaryFixture()

    const response = await getTeachersDictionary({ isCustom: 'false' }, authCookie)
    expect(response.status).toBe(200)

    const entries = (await response.json()) as GetTeachersDictionaryResponseDto
    expect(entries.every((entry) => !entry.isCustom)).toBe(true)
    const lookupKeys = new Set(entries.map((entry) => entry.normalizedLookupKey))
    expect(lookupKeys.has(NON_CUSTOM_LOOKUP_KEY)).toBe(true)
    expect(lookupKeys.has(CUSTOM_LOOKUP_KEY)).toBe(false)
    expect(lookupKeys.has(SECOND_CUSTOM_LOOKUP_KEY)).toBe(false)
  })

  it('accepts case-insensitive isCustom query values with surrounding whitespace', async () => {
    const authCookie = createAuthCookie()
    await seedTeachersDictionaryFixture()

    const response = await getTeachersDictionary({ isCustom: ' TRUE ' }, authCookie)
    expect(response.status).toBe(200)

    const entries = (await response.json()) as GetTeachersDictionaryResponseDto
    expect(entries.length).toBeGreaterThan(0)
    expect(entries.every((entry) => entry.isCustom)).toBe(true)
  })

  it('returns metadata for non-custom entries when metadataOnly=true', async () => {
    const authCookie = createAuthCookie()
    await seedTeachersDictionaryFixture()

    const metadataResponse = await getTeachersDictionary(
      {
        isCustom: 'false',
        metadataOnly: 'true'
      },
      authCookie
    )

    expect(metadataResponse.status).toBe(200)
    const metadata = (await metadataResponse.json()) as GetTeachersDictionaryMetadataResponseDto

    const entriesResponse = await getTeachersDictionary({ isCustom: 'false' }, authCookie)
    expect(entriesResponse.status).toBe(200)
    const entries = (await entriesResponse.json()) as GetTeachersDictionaryResponseDto

    expect(entries.some((entry) => entry.normalizedLookupKey === NON_CUSTOM_LOOKUP_KEY)).toBe(true)
    expect(metadata.count).toBe(entries.length)
    expectMetadataLastUpdatedAtShape(metadata, metadata.count)
  })

  it('returns metadata consistent with unfiltered entries when metadataOnly=true', async () => {
    const authCookie = createAuthCookie()

    const metadataResponse = await getTeachersDictionary(
      {
        metadataOnly: 'true'
      },
      authCookie
    )

    expect(metadataResponse.status).toBe(200)
    const metadata = (await metadataResponse.json()) as GetTeachersDictionaryMetadataResponseDto

    const entriesResponse = await getTeachersDictionary({}, authCookie)
    expect(entriesResponse.status).toBe(200)
    const entries = (await entriesResponse.json()) as GetTeachersDictionaryResponseDto

    expect(metadata.count).toBe(entries.length)
    expectMetadataLastUpdatedAtShape(metadata, metadata.count)
  })

  it('returns 400 for invalid isCustom value', async () => {
    const response = await getTeachersDictionary({ isCustom: 'yes' }, createAuthCookie())

    expect(response.status).toBe(400)
    const statusMessage = await readErrorMessage(response)
    expect(statusMessage).toContain('Invalid teachers dictionary query')
    expect(statusMessage).toContain('isCustom')
    expect(statusMessage).toContain('"true" or "false"')
  })

  it('returns 400 for invalid metadataOnly value', async () => {
    const response = await getTeachersDictionary({ metadataOnly: 'yes' }, createAuthCookie())

    expect(response.status).toBe(400)
    const statusMessage = await readErrorMessage(response)
    expect(statusMessage).toContain('Invalid teachers dictionary query')
    expect(statusMessage).toContain('metadataOnly')
    expect(statusMessage).toContain('"true" or "false"')
  })

  it('returns 400 when isCustom query parameter is repeated', async () => {
    const response = await getTeachersDictionaryWithRawQuery('?isCustom=true&isCustom=false', createAuthCookie())

    expect(response.status).toBe(400)
    const statusMessage = await readErrorMessage(response)
    expect(statusMessage).toContain('Invalid teachers dictionary query')
    expect(statusMessage).toContain('isCustom must be provided only once')
  })

  it('returns 400 when metadataOnly query parameter is repeated', async () => {
    const response = await getTeachersDictionaryWithRawQuery(
      '?metadataOnly=true&metadataOnly=false',
      createAuthCookie()
    )

    expect(response.status).toBe(400)
    const statusMessage = await readErrorMessage(response)
    expect(statusMessage).toContain('Invalid teachers dictionary query')
    expect(statusMessage).toContain('metadataOnly must be provided only once')
  })
})
