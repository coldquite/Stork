/** Minutes since midnight; matches DB check `Committee_startMinute_range_chk`. */
export const MIN_START_MINUTE = 0
export const MAX_START_MINUTE = 24 * 60 - 1

export function clampStartMinute(value: number): number {
  return Math.min(Math.max(Math.trunc(value), MIN_START_MINUTE), MAX_START_MINUTE)
}

/** Minute step for editor start-time selects (matches previous wheel / InputTime UX). */
export const EDITOR_START_TIME_MINUTE_STEP = 5

export interface EditorTimeSelectOption {
  value: number
  label: string
}

/**
 * Snaps a minute-of-hour to the nearest valid slot for the given step (e.g. 0, 5, …, 55 for step 5).
 */
export function normalizeMinuteToStep(minute: number, step: number): number {
  if (!Number.isFinite(minute)) {
    return 0
  }

  const s = Math.floor(step)
  if (s < 1 || s > 60 || 60 % s !== 0) {
    return Math.min(Math.max(Math.trunc(minute), 0), 59)
  }

  const rounded = Math.round(minute / s) * s
  const maxMinute = 60 - s
  return Math.min(Math.max(rounded, 0), maxMinute)
}

export function splitStartMinute(startMinuteRaw: number | undefined | null): { hour: number; minute: number } {
  if (typeof startMinuteRaw !== 'number' || !Number.isInteger(startMinuteRaw)) {
    return { hour: 0, minute: 0 }
  }

  const safe = clampStartMinute(startMinuteRaw)
  const hour = Math.floor(safe / 60)
  const minute = normalizeMinuteToStep(safe % 60, EDITOR_START_TIME_MINUTE_STEP)
  return { hour, minute }
}

/** Fixed-width 24h `HH:mm` for the editor trigger; minute snapped to {@link EDITOR_START_TIME_MINUTE_STEP}. */
export function formatStartMinuteLabelStepped(startMinuteRaw: number | undefined | null): string {
  if (typeof startMinuteRaw !== 'number' || !Number.isInteger(startMinuteRaw)) {
    return '—'
  }

  const { hour, minute } = splitStartMinute(startMinuteRaw)
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function buildStartMinuteFromHourAndSteppedMinute(hour: number, steppedMinute: number): number {
  const h = Math.min(Math.max(Math.trunc(hour), 0), 23)
  const m = normalizeMinuteToStep(steppedMinute, EDITOR_START_TIME_MINUTE_STEP)
  return clampStartMinute(h * 60 + m)
}

export function buildEditorHourOptions(): EditorTimeSelectOption[] {
  return Array.from({ length: 24 }, (_, hour) => ({
    value: hour,
    label: String(hour).padStart(2, '0')
  }))
}

export function buildEditorMinuteOptions(step: number = EDITOR_START_TIME_MINUTE_STEP): EditorTimeSelectOption[] {
  const s = Math.floor(step)
  if (s < 1 || s > 60 || 60 % s !== 0) {
    return []
  }

  const options: EditorTimeSelectOption[] = []
  for (let minute = 0; minute < 60; minute += s) {
    options.push({
      value: minute,
      label: String(minute).padStart(2, '0')
    })
  }
  return options
}
