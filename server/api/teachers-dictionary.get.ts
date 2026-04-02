import { createError, getQuery } from 'h3'
import { prisma } from '#server/utils/db'
import { requireAuthenticatedUser } from '#server/utils/require-auth'
import type {
  GetTeachersDictionaryMetadataResponseDto,
  GetTeachersDictionaryResponseDto
} from '#shared/types/teachers-dictionary'

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

function parseIsCustomQuery(value: string | undefined): boolean | null {
  return parseBooleanQuery(value, 'isCustom')
}

function parseMetadataOnlyQuery(value: string | undefined): boolean | null {
  return parseBooleanQuery(value, 'metadataOnly')
}

function parseBooleanQuery(value: string | undefined, key: string): boolean | null {
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

  invalidQuery(`${key} must be "true" or "false"`)
}

export default defineEventHandler(
  async (event): Promise<GetTeachersDictionaryResponseDto | GetTeachersDictionaryMetadataResponseDto> => {
    requireAuthenticatedUser(event)

    const query = getQuery(event)
    const isCustom = parseIsCustomQuery(parseSingleQueryValue(query.isCustom, 'isCustom'))
    const metadataOnly = parseMetadataOnlyQuery(parseSingleQueryValue(query.metadataOnly, 'metadataOnly'))

    const where: {
      isCustom?: boolean
    } = {}

    if (isCustom !== null) {
      where.isCustom = isCustom
    }

    if (metadataOnly === true) {
      const [count, aggregate] = await prisma.$transaction([
        prisma.teachersDictionary.count({
          where: Object.keys(where).length > 0 ? where : undefined
        }),
        prisma.teachersDictionary.aggregate({
          where: Object.keys(where).length > 0 ? where : undefined,
          _max: {
            updatedAt: true
          }
        })
      ])

      return {
        count,
        lastUpdatedAt: aggregate._max.updatedAt?.toISOString() ?? null
      }
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
  }
)
