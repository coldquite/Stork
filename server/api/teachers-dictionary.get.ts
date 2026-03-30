import { createError, getQuery } from 'h3'
import { prisma } from '#server/utils/db'
import { requireAuthenticatedUser } from '#server/utils/require-auth'
import type { GetTeachersDictionaryResponseDto } from '#shared/types/teachers-dictionary'

function invalidQuery(reason: string): never {
  throw createError({
    statusCode: 400,
    statusMessage: `Invalid teachers dictionary query: ${reason}`
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

function parseNormalizedLookupKeyQuery(value: string | undefined): string | null {
  if (value === undefined) {
    return null
  }

  const normalizedValue = value.trim()
  if (normalizedValue.length === 0) {
    invalidQuery('normalizedLookupKey must have at least 1 non-whitespace character')
  }

  return normalizedValue
}

function parseIsCustomQuery(value: string | undefined): boolean | null {
  if (value === undefined) {
    return null
  }

  const normalizedValue = value.trim().toLowerCase()
  if (normalizedValue === 'true') {
    return true
  }

  if (normalizedValue === 'false') {
    return false
  }

  invalidQuery('isCustom must be "true" or "false"')
}

export default defineEventHandler(async (event): Promise<GetTeachersDictionaryResponseDto> => {
  requireAuthenticatedUser(event)

  const query = getQuery(event)
  const normalizedLookupKey = parseNormalizedLookupKeyQuery(
    parseSingleQueryValue(query.normalizedLookupKey, 'normalizedLookupKey')
  )
  const isCustom = parseIsCustomQuery(parseSingleQueryValue(query.isCustom, 'isCustom'))

  const where: {
    normalizedLookupKey?: string
    isCustom?: boolean
  } = {}

  if (normalizedLookupKey !== null) {
    where.normalizedLookupKey = normalizedLookupKey
  }

  if (isCustom !== null) {
    where.isCustom = isCustom
  }

  const entries = await prisma.teachersDictionary.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    orderBy: [{ normalizedLookupKey: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      canonicalName: true,
      normalizedLookupKey: true,
      isCustom: true
    }
  })

  return entries
})
