import { describe, expect, it } from 'vitest'
import {
  buildEditorHourOptions,
  buildEditorMinuteOptions,
  buildStartMinuteFromHourAndSteppedMinute,
  clampStartMinute,
  EDITOR_START_TIME_MINUTE_STEP,
  formatStartMinuteLabelStepped,
  MAX_START_MINUTE,
  MIN_START_MINUTE,
  normalizeMinuteToStep,
  splitStartMinute
} from '~/utils/editor/start-minute-time'

describe('start-minute-time', () => {
  it('clampStartMinute enforces domain', () => {
    expect(clampStartMinute(-10)).toBe(MIN_START_MINUTE)
    expect(clampStartMinute(2000)).toBe(MAX_START_MINUTE)
  })

  it('normalizeMinuteToStep snaps to five-minute grid', () => {
    expect(normalizeMinuteToStep(7, EDITOR_START_TIME_MINUTE_STEP)).toBe(5)
    expect(normalizeMinuteToStep(8, EDITOR_START_TIME_MINUTE_STEP)).toBe(10)
    expect(normalizeMinuteToStep(59, EDITOR_START_TIME_MINUTE_STEP)).toBe(55)
  })

  it('splitStartMinute normalizes minutes to editor step', () => {
    expect(splitStartMinute(527)).toEqual({ hour: 8, minute: 45 })
    expect(splitStartMinute(525)).toEqual({ hour: 8, minute: 45 })
  })

  it('formatStartMinuteLabelStepped matches split parts', () => {
    expect(formatStartMinuteLabelStepped(527)).toBe('08:45')
    expect(formatStartMinuteLabelStepped(undefined)).toBe('—')
  })

  it('buildStartMinuteFromHourAndSteppedMinute composes clamped value', () => {
    expect(buildStartMinuteFromHourAndSteppedMinute(8, 45)).toBe(525)
  })

  it('buildEditorHourOptions and buildEditorMinuteOptions', () => {
    expect(buildEditorHourOptions()).toHaveLength(24)
    expect(buildEditorMinuteOptions(5)).toHaveLength(12)
  })
})
