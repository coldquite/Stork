import { readBody } from 'h3'
import { requireAuthenticatedUser } from '#server/utils/require-auth'
import { upsertTeachersDictionaryEntries } from '#server/utils/teachers-dictionary/put/persistence'
import { parsePutTeachersDictionaryBulkPayload } from '#server/utils/teachers-dictionary/put/validation'
import type { PutTeachersDictionaryBulkResponseDto } from '#shared/types/teachers-dictionary'

export default defineEventHandler(async (event): Promise<PutTeachersDictionaryBulkResponseDto> => {
  requireAuthenticatedUser(event)

  const payload = parsePutTeachersDictionaryBulkPayload(await readBody<unknown>(event))

  return upsertTeachersDictionaryEntries(payload)
})
