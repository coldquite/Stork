import type { ScheduleAutoSavePolicy } from '~/types/schedule-draft'

export const DEFAULT_SCHEDULE_AUTOSAVE_POLICY: Readonly<ScheduleAutoSavePolicy> = Object.freeze({
  enabled: true,
  debounceMs: 45_000,
  minIntervalMs: 300_000,
  retryAfterErrorMs: 60_000
})

export const DEFAULT_NEW_SCHEDULE_NAME_PREFIX = 'Nový plán '
