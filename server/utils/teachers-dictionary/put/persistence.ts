import { createError, isError } from 'h3'
import { Prisma } from '~~/prisma/generated/client/client'
import { prisma } from '#server/utils/db'
import type {
  PutTeachersDictionaryBulkRequestDto,
  PutTeachersDictionaryBulkResponseDto
} from '#shared/types/teachers-dictionary'
import { buildTeachersDictionaryLookupKey } from '#server/utils/teachers-dictionary/lookup-key'

function normalizeWriteError(error: unknown): never {
  if (isError(error)) {
    throw error
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid teachers dictionary payload'
    })
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid teachers dictionary payload'
    })
  }

  throw createError({
    statusCode: 500,
    statusMessage: 'Failed to upsert teachers dictionary entries'
  })
}

export async function upsertTeachersDictionaryEntries(
  entries: PutTeachersDictionaryBulkRequestDto
): Promise<PutTeachersDictionaryBulkResponseDto> {
  if (entries.length === 0) {
    return {
      processed: 0,
      created: 0,
      updated: 0
    }
  }

  try {
    const entriesWithLookupKey = entries.map((entry) => ({
      canonicalName: entry.canonicalName,
      isCustom: entry.isCustom,
      normalizedLookupKey: buildTeachersDictionaryLookupKey(entry.canonicalName)
    }))

    // Duplicate lookup keys inside one payload are allowed; the latest item wins.
    const effectiveEntriesByLookupKey = new Map(
      entriesWithLookupKey.map((entry) => [entry.normalizedLookupKey, entry] as const)
    )
    const effectiveEntries = Array.from(effectiveEntriesByLookupKey.values())

    const lookupKeys = effectiveEntries.map((entry) => entry.normalizedLookupKey)
    const existingEntries = await prisma.teachersDictionary.findMany({
      where: {
        normalizedLookupKey: {
          in: lookupKeys
        }
      },
      select: {
        normalizedLookupKey: true
      }
    })

    const existingLookupKeySet = new Set(existingEntries.map((entry) => entry.normalizedLookupKey))
    const updatedCount = effectiveEntries.filter((entry) => existingLookupKeySet.has(entry.normalizedLookupKey)).length
    const createdCount = effectiveEntries.length - updatedCount

    await prisma.$transaction(
      effectiveEntries.map((entry) => {
        return prisma.teachersDictionary.upsert({
          where: {
            normalizedLookupKey: entry.normalizedLookupKey
          },
          create: {
            canonicalName: entry.canonicalName,
            normalizedLookupKey: entry.normalizedLookupKey,
            isCustom: entry.isCustom
          },
          update: {
            canonicalName: entry.canonicalName,
            isCustom: entry.isCustom
          }
        })
      })
    )

    return {
      processed: effectiveEntries.length,
      created: createdCount,
      updated: updatedCount
    }
  } catch (error: unknown) {
    normalizeWriteError(error)
  }
}
