import { readBody, setResponseStatus } from 'h3'
import { requireAuthenticatedUser } from '#server/utils/require-auth'
import { createTimeSchedule } from '#server/utils/time-schedules/post/persistence'
import { parsePostTimeSchedulePayload } from '#server/utils/time-schedules/post/validation'
import type { PostTimeScheduleResponseDto } from '#shared/types/time-schedules'

export default defineEventHandler(async (event): Promise<PostTimeScheduleResponseDto> => {
  requireAuthenticatedUser(event)

  const payload = parsePostTimeSchedulePayload(await readBody<unknown>(event))
  const createdSchedule = await createTimeSchedule(payload)
  setResponseStatus(event, 201)

  return createdSchedule
})
