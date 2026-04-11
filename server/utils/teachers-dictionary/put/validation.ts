import { createError } from 'h3'
import { z } from 'zod'
import type { PutTeachersDictionaryBulkRequestDto } from '#shared/types/teachers-dictionary'
import { buildTeachersDictionaryLookupKey } from '#shared/utils/teachers-dictionary'
import { formatZodIssuePath } from '#server/utils/validation/format-zod-issue-path'

const nonEmptyTrimmedStringSchema = z.string().trim().min(1, {
  message: 'must have at least 1 non-whitespace character'
})

const upsertTeachersDictionaryEntrySchema = z.object({
  canonicalName: nonEmptyTrimmedStringSchema,
  isCustom: z.boolean().optional().default(false)
})

const putTeachersDictionaryBulkPayloadSchema = z
  .array(upsertTeachersDictionaryEntrySchema)
  .superRefine((entries, context) => {
    entries.forEach((entry, index) => {
      const normalizedLookupKey = buildTeachersDictionaryLookupKey(entry.canonicalName)
      if (normalizedLookupKey.length === 0) {
        context.addIssue({
          code: 'custom',
          path: [index, 'canonicalName'],
          message: 'must contain at least 1 token after lookup key normalization'
        })
      }
    })
  })

function invalidPayload(reason: string): never {
  throw createError({
    statusCode: 400,
    statusMessage: `Invalid teachers dictionary payload: ${reason}`
  })
}

export function parsePutTeachersDictionaryBulkPayload(payload: unknown): PutTeachersDictionaryBulkRequestDto {
  const parseResult = putTeachersDictionaryBulkPayloadSchema.safeParse(payload)

  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0]
    if (!firstIssue) {
      invalidPayload('unknown validation error')
    }

    invalidPayload(`${formatZodIssuePath(firstIssue.path)} ${firstIssue.message}`)
  }

  return parseResult.data as PutTeachersDictionaryBulkRequestDto
}
