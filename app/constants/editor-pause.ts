import type { PauseTypeDto } from '#shared/types/time-schedules'

export const EDITOR_PAUSE_MIN_DURATION_MINUTES = 1

export const EDITOR_PAUSE_DURATION_BY_TYPE: Record<PauseTypeDto, number> = {
  BREAK: 20,
  LUNCH: 60
}
