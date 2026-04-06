import { describe, expect, it } from 'vitest'
import {
  isValidThesisLanguage,
  resolveThesisLanguage,
  resolveThesisLanguageFromSelectValue,
  VALID_THESIS_LANGUAGES
} from '~/utils/editor/thesis-language'

describe('thesis-language', () => {
  it('exposes all known thesis language literals', () => {
    expect(VALID_THESIS_LANGUAGES).toContain('CZECH')
    expect(VALID_THESIS_LANGUAGES).toContain('ENGLISH')
    expect(VALID_THESIS_LANGUAGES).toContain('SLOVAK')
    expect(VALID_THESIS_LANGUAGES).toHaveLength(3)
  })

  it('isValidThesisLanguage narrows strings', () => {
    expect(isValidThesisLanguage('ENGLISH')).toBe(true)
    expect(isValidThesisLanguage('INVALID')).toBe(false)
  })

  it('resolveThesisLanguage returns value when valid', () => {
    expect(resolveThesisLanguage('SLOVAK', 'CZECH')).toBe('SLOVAK')
  })

  it('resolveThesisLanguage returns fallback when invalid', () => {
    expect(resolveThesisLanguage('INVALID' as 'CZECH', 'ENGLISH')).toBe('ENGLISH')
  })

  it('resolveThesisLanguageFromSelectValue accepts string', () => {
    expect(resolveThesisLanguageFromSelectValue('ENGLISH', 'CZECH')).toBe('ENGLISH')
  })

  it('resolveThesisLanguageFromSelectValue accepts menu item shape', () => {
    expect(resolveThesisLanguageFromSelectValue({ value: 'SLOVAK', label: 'x' }, 'CZECH')).toBe('SLOVAK')
  })

  it('resolveThesisLanguageFromSelectValue returns fallback for unknown', () => {
    expect(resolveThesisLanguageFromSelectValue('BAD', 'ENGLISH')).toBe('ENGLISH')
    expect(resolveThesisLanguageFromSelectValue({ value: 'BAD' }, 'ENGLISH')).toBe('ENGLISH')
  })
})
