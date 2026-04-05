import { describe, expect, it } from 'vitest'
import {
  isValidRepeatType,
  resolveRepeatType,
  resolveRepeatTypeFromSelectValue,
  VALID_REPEAT_TYPES
} from '~/utils/editor/repeat-type'

describe('repeat-type', () => {
  it('exposes all known repeat type literals', () => {
    expect(VALID_REPEAT_TYPES).toContain('NONE')
    expect(VALID_REPEAT_TYPES).toContain('THESIS_DEFENSE')
    expect(VALID_REPEAT_TYPES).toHaveLength(5)
  })

  it('isValidRepeatType narrows strings', () => {
    expect(isValidRepeatType('ORAL_EXAM')).toBe(true)
    expect(isValidRepeatType('INVALID')).toBe(false)
  })

  it('resolveRepeatType returns value when valid', () => {
    expect(resolveRepeatType('BOTH', 'NONE')).toBe('BOTH')
  })

  it('resolveRepeatType returns fallback when invalid', () => {
    expect(resolveRepeatType('INVALID' as 'NONE', 'UNKNOWN')).toBe('UNKNOWN')
  })

  it('resolveRepeatTypeFromSelectValue accepts string', () => {
    expect(resolveRepeatTypeFromSelectValue('THESIS_DEFENSE', 'NONE')).toBe('THESIS_DEFENSE')
  })

  it('resolveRepeatTypeFromSelectValue accepts menu item shape', () => {
    expect(resolveRepeatTypeFromSelectValue({ value: 'ORAL_EXAM', label: 'x' }, 'NONE')).toBe('ORAL_EXAM')
  })

  it('resolveRepeatTypeFromSelectValue returns fallback for unknown', () => {
    expect(resolveRepeatTypeFromSelectValue('BAD', 'UNKNOWN')).toBe('UNKNOWN')
    expect(resolveRepeatTypeFromSelectValue({ value: 'BAD' }, 'UNKNOWN')).toBe('UNKNOWN')
  })
})
