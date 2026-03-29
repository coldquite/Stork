// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '#server/utils/db'
import type { PutTeachersDictionaryBulkResponseDto } from '#shared/types/teachers-dictionary'
import { buildTeachersDictionaryLookupKey } from '#shared/utils/teachers-dictionary'
import { apiUrl, createAuthCookie } from './_helpers'

type UpsertEntry = {
  canonicalName: string
  isCustom?: boolean
}

const MAREK_CANONICAL_NAME = 'Ing. Marek Suchánek Ph.D. et Ph.D.'
const MAREK_CANONICAL_NAME_SAME_KEY = 'Marek Suchánek Ing, Ph.D. et Ph.D.'
const RODRIGO_CANONICAL_NAME = 'Dr. rer. nat. Rodrigo Augusto da Silva Alves'
const DEFAULT_CUSTOM_FLAG_CANONICAL_NAME = '  prof.  RNDr. Eva   Nováková, Ph.D.  '
const VALID_NAME_FOR_REJECTION_TEST = 'doc. Jan Novotný Ph.D.'
const PUNCTUATION_ONLY_CANONICAL_NAME = ' . , ; : ( ) [ ] " \' ` '

const MAREK_LOOKUP_KEY = buildTeachersDictionaryLookupKey(MAREK_CANONICAL_NAME)
const RODRIGO_LOOKUP_KEY = buildTeachersDictionaryLookupKey(RODRIGO_CANONICAL_NAME)
const DEFAULT_CUSTOM_FLAG_LOOKUP_KEY = buildTeachersDictionaryLookupKey(DEFAULT_CUSTOM_FLAG_CANONICAL_NAME)
const VALID_NAME_FOR_REJECTION_LOOKUP_KEY = buildTeachersDictionaryLookupKey(VALID_NAME_FOR_REJECTION_TEST)

const CLEANUP_KEYS = Array.from(
  new Set([MAREK_LOOKUP_KEY, RODRIGO_LOOKUP_KEY, DEFAULT_CUSTOM_FLAG_LOOKUP_KEY, VALID_NAME_FOR_REJECTION_LOOKUP_KEY])
)

async function putTeachersDictionaryBulk(payload: unknown, authCookie?: string): Promise<Response> {
  const headers: Record<string, string> = {
    'content-type': 'application/json'
  }

  if (authCookie) {
    headers.cookie = authCookie
  }

  return fetch(apiUrl('/api/teachers-dictionary/bulk'), {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload)
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

async function findEntryByLookupKey(lookupKey: string) {
  return prisma.teachersDictionary.findUnique({
    where: {
      normalizedLookupKey: lookupKey
    }
  })
}

async function countEntriesByLookupKey(lookupKey: string): Promise<number> {
  return prisma.teachersDictionary.count({
    where: {
      normalizedLookupKey: lookupKey
    }
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

describe('PUT /api/teachers-dictionary/bulk (integration)', () => {
  beforeEach(async () => {
    await cleanupTeachersDictionaryFixture()
  })

  afterEach(async () => {
    await cleanupTeachersDictionaryFixture()
  })

  it('returns 401 without authentication cookie', async () => {
    const response = await putTeachersDictionaryBulk([
      {
        canonicalName: ` ${MAREK_CANONICAL_NAME} `
      }
    ])

    expect(response.status).toBe(401)
  })

  it('returns 400 for non-array payload and writes nothing', async () => {
    const authCookie = createAuthCookie()
    const response = await putTeachersDictionaryBulk(
      {
        canonicalName: VALID_NAME_FOR_REJECTION_TEST,
        isCustom: false
      },
      authCookie
    )

    expect(response.status).toBe(400)
    const statusMessage = await readErrorMessage(response)
    expect(statusMessage).toContain('Invalid teachers dictionary payload')
    expect(statusMessage).toContain('payload')

    expect(await countEntriesByLookupKey(VALID_NAME_FOR_REJECTION_LOOKUP_KEY)).toBe(0)
  })

  it('accepts empty payload as no-op and returns zero counters', async () => {
    const response = await putTeachersDictionaryBulk([], createAuthCookie())

    expect(response.status).toBe(200)
    const result = (await response.json()) as PutTeachersDictionaryBulkResponseDto
    expect(result).toEqual({
      processed: 0,
      created: 0,
      updated: 0
    })
  })

  it('creates new records in bulk', async () => {
    const payload: UpsertEntry[] = [
      {
        canonicalName: MAREK_CANONICAL_NAME,
        isCustom: false
      },
      {
        canonicalName: RODRIGO_CANONICAL_NAME,
        isCustom: true
      }
    ]

    const response = await putTeachersDictionaryBulk(payload, createAuthCookie())

    expect(response.status).toBe(200)
    const result = (await response.json()) as PutTeachersDictionaryBulkResponseDto

    expect(result).toEqual({
      processed: 2,
      created: 2,
      updated: 0
    })

    const marekEntry = await findEntryByLookupKey(MAREK_LOOKUP_KEY)
    expect(marekEntry).toMatchObject({
      canonicalName: MAREK_CANONICAL_NAME,
      normalizedLookupKey: MAREK_LOOKUP_KEY,
      isCustom: false
    })

    const rodrigoEntry = await findEntryByLookupKey(RODRIGO_LOOKUP_KEY)
    expect(rodrigoEntry).toMatchObject({
      canonicalName: RODRIGO_CANONICAL_NAME,
      normalizedLookupKey: RODRIGO_LOOKUP_KEY,
      isCustom: true
    })
  })

  it('defaults isCustom to false and ignores unknown keys', async () => {
    const authCookie = createAuthCookie()
    const response = await putTeachersDictionaryBulk(
      [
        {
          canonicalName: DEFAULT_CUSTOM_FLAG_CANONICAL_NAME,
          extra: 'ignored-by-schema'
        }
      ],
      authCookie
    )

    expect(response.status).toBe(200)
    const result = (await response.json()) as PutTeachersDictionaryBulkResponseDto
    expect(result).toEqual({
      processed: 1,
      created: 1,
      updated: 0
    })

    const entry = await findEntryByLookupKey(DEFAULT_CUSTOM_FLAG_LOOKUP_KEY)
    expect(entry).toMatchObject({
      canonicalName: DEFAULT_CUSTOM_FLAG_CANONICAL_NAME.trim(),
      normalizedLookupKey: DEFAULT_CUSTOM_FLAG_LOOKUP_KEY,
      isCustom: false
    })
  })

  it('overwrites existing key and reports updated counters', async () => {
    const authCookie = createAuthCookie()

    const firstPayload: UpsertEntry[] = [
      {
        canonicalName: MAREK_CANONICAL_NAME,
        isCustom: false
      }
    ]
    const firstResponse = await putTeachersDictionaryBulk(firstPayload, authCookie)
    expect(firstResponse.status).toBe(200)
    const firstResult = (await firstResponse.json()) as PutTeachersDictionaryBulkResponseDto
    expect(firstResult).toEqual({
      processed: 1,
      created: 1,
      updated: 0
    })
    const firstStoredMarekEntry = await findEntryByLookupKey(MAREK_LOOKUP_KEY)
    expect(firstStoredMarekEntry).toBeTruthy()

    const secondPayload: UpsertEntry[] = [
      {
        canonicalName: MAREK_CANONICAL_NAME_SAME_KEY,
        isCustom: true
      }
    ]

    const secondResponse = await putTeachersDictionaryBulk(secondPayload, authCookie)
    expect(secondResponse.status).toBe(200)
    const secondResult = (await secondResponse.json()) as PutTeachersDictionaryBulkResponseDto

    expect(secondResult).toEqual({
      processed: 1,
      created: 0,
      updated: 1
    })

    const secondStoredMarekEntry = await findEntryByLookupKey(MAREK_LOOKUP_KEY)
    expect(secondStoredMarekEntry).toBeTruthy()
    expect(secondStoredMarekEntry?.id).toBe(firstStoredMarekEntry?.id)
    expect(secondStoredMarekEntry).toMatchObject({
      canonicalName: MAREK_CANONICAL_NAME_SAME_KEY,
      normalizedLookupKey: MAREK_LOOKUP_KEY,
      isCustom: true
    })
  })

  it('returns mixed created and updated counters for one existing and one new key', async () => {
    const authCookie = createAuthCookie()

    const createMarekResponse = await putTeachersDictionaryBulk(
      [
        {
          canonicalName: MAREK_CANONICAL_NAME,
          isCustom: false
        }
      ],
      authCookie
    )
    expect(createMarekResponse.status).toBe(200)

    const secondResponse = await putTeachersDictionaryBulk(
      [
        {
          canonicalName: MAREK_CANONICAL_NAME_SAME_KEY,
          isCustom: true
        },
        {
          canonicalName: RODRIGO_CANONICAL_NAME,
          isCustom: false
        }
      ],
      authCookie
    )

    expect(secondResponse.status).toBe(200)
    const secondResult = (await secondResponse.json()) as PutTeachersDictionaryBulkResponseDto
    expect(secondResult).toEqual({
      processed: 2,
      created: 1,
      updated: 1
    })

    const marekEntry = await findEntryByLookupKey(MAREK_LOOKUP_KEY)
    expect(marekEntry).toMatchObject({
      canonicalName: MAREK_CANONICAL_NAME_SAME_KEY,
      normalizedLookupKey: MAREK_LOOKUP_KEY,
      isCustom: true
    })

    const rodrigoEntry = await findEntryByLookupKey(RODRIGO_LOOKUP_KEY)
    expect(rodrigoEntry).toMatchObject({
      canonicalName: RODRIGO_CANONICAL_NAME,
      normalizedLookupKey: RODRIGO_LOOKUP_KEY,
      isCustom: false
    })
  })

  it('returns all-updated counters when payload is sent repeatedly', async () => {
    const authCookie = createAuthCookie()
    const payload: UpsertEntry[] = [
      {
        canonicalName: MAREK_CANONICAL_NAME,
        isCustom: false
      },
      {
        canonicalName: RODRIGO_CANONICAL_NAME,
        isCustom: true
      }
    ]

    const firstResponse = await putTeachersDictionaryBulk(payload, authCookie)
    expect(firstResponse.status).toBe(200)
    expect((await firstResponse.json()) as PutTeachersDictionaryBulkResponseDto).toEqual({
      processed: 2,
      created: 2,
      updated: 0
    })

    const secondResponse = await putTeachersDictionaryBulk(payload, authCookie)
    expect(secondResponse.status).toBe(200)
    expect((await secondResponse.json()) as PutTeachersDictionaryBulkResponseDto).toEqual({
      processed: 2,
      created: 0,
      updated: 2
    })
  })

  it('allows duplicate lookup keys in one payload and applies last value', async () => {
    const authCookie = createAuthCookie()
    const response = await putTeachersDictionaryBulk(
      [
        {
          canonicalName: MAREK_CANONICAL_NAME,
          isCustom: false
        },
        {
          canonicalName: MAREK_CANONICAL_NAME_SAME_KEY,
          isCustom: true
        }
      ],
      authCookie
    )

    expect(response.status).toBe(200)
    const result = (await response.json()) as PutTeachersDictionaryBulkResponseDto
    expect(result).toEqual({
      processed: 1,
      created: 1,
      updated: 0
    })

    const entry = await findEntryByLookupKey(MAREK_LOOKUP_KEY)
    expect(entry).toMatchObject({
      canonicalName: MAREK_CANONICAL_NAME_SAME_KEY,
      normalizedLookupKey: MAREK_LOOKUP_KEY,
      isCustom: true
    })
  })

  it('returns 400 when canonicalName normalizes to empty lookup key and writes nothing', async () => {
    const authCookie = createAuthCookie()
    const response = await putTeachersDictionaryBulk(
      [
        {
          canonicalName: VALID_NAME_FOR_REJECTION_TEST,
          isCustom: false
        },
        {
          canonicalName: PUNCTUATION_ONLY_CANONICAL_NAME,
          isCustom: true
        }
      ],
      authCookie
    )

    expect(response.status).toBe(400)
    const statusMessage = await readErrorMessage(response)
    expect(statusMessage).toContain('Invalid teachers dictionary payload')
    expect(statusMessage).toContain('canonicalName')
    expect(statusMessage).toContain('at least 1 token')

    expect(await countEntriesByLookupKey(VALID_NAME_FOR_REJECTION_LOOKUP_KEY)).toBe(0)
  })

  it('returns 400 when canonicalName is blank and writes nothing', async () => {
    const authCookie = createAuthCookie()
    const response = await putTeachersDictionaryBulk(
      [
        {
          canonicalName: VALID_NAME_FOR_REJECTION_TEST,
          isCustom: false
        },
        {
          canonicalName: '   ',
          isCustom: true
        }
      ],
      authCookie
    )

    expect(response.status).toBe(400)
    const statusMessage = await readErrorMessage(response)
    expect(statusMessage).toContain('Invalid teachers dictionary payload')
    expect(statusMessage).toContain('canonicalName')
    expect(statusMessage).toContain('at least 1 non-whitespace')

    expect(await countEntriesByLookupKey(VALID_NAME_FOR_REJECTION_LOOKUP_KEY)).toBe(0)
  })

  it('returns 400 when canonicalName is missing and writes nothing', async () => {
    const authCookie = createAuthCookie()
    const response = await putTeachersDictionaryBulk(
      [
        {
          isCustom: false
        }
      ],
      authCookie
    )

    expect(response.status).toBe(400)
    const statusMessage = await readErrorMessage(response)
    expect(statusMessage).toContain('Invalid teachers dictionary payload')
    expect(statusMessage).toContain('canonicalName')

    expect(await countEntriesByLookupKey(MAREK_LOOKUP_KEY)).toBe(0)
    expect(await countEntriesByLookupKey(RODRIGO_LOOKUP_KEY)).toBe(0)
  })

  it('returns 400 when payload item is not an object', async () => {
    const response = await putTeachersDictionaryBulk(['not-an-object'], createAuthCookie())

    expect(response.status).toBe(400)
    const statusMessage = await readErrorMessage(response)
    expect(statusMessage).toContain('Invalid teachers dictionary payload')
    expect(statusMessage).toContain('payload[0]')
  })

  it('returns 400 when isCustom has invalid type and writes nothing', async () => {
    const authCookie = createAuthCookie()
    const response = await putTeachersDictionaryBulk(
      [
        {
          canonicalName: VALID_NAME_FOR_REJECTION_TEST,
          isCustom: 'true'
        }
      ],
      authCookie
    )

    expect(response.status).toBe(400)
    const statusMessage = await readErrorMessage(response)
    expect(statusMessage).toContain('Invalid teachers dictionary payload')
    expect(statusMessage).toContain('isCustom')

    expect(await countEntriesByLookupKey(VALID_NAME_FOR_REJECTION_LOOKUP_KEY)).toBe(0)
  })
})
