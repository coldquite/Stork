// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { buildTeachersDictionaryLookupKey } from '#shared/utils/teachers-dictionary'

const MAREK_SUCHANEK_KEY = 'et ing marek phd phd suchánek'
const MAREK_SUCHANEK_NO_ET_KEY = 'ing marek phd suchánek'
const RODRIGO_ALVES_KEY = 'alves augusto da dr nat rer rodrigo silva'

describe('teachers dictionary lookup key builder', () => {
  describe('base behavior', () => {
    it('produces the same key for Ph.D. and PhD variants', () => {
      const dotted = buildTeachersDictionaryLookupKey('Ing. Marek Suchánek Ph.D. et Ph.D.')
      const plain = buildTeachersDictionaryLookupKey('Ing Marek Suchánek PhD et PhD')

      expect(dotted).toBe(plain)
      expect(dotted).toBe(MAREK_SUCHANEK_KEY)
    })

    it('produces the same key for different token orders', () => {
      const surnameFirst = buildTeachersDictionaryLookupKey('Suchánek Marek Ing. Ph.D. et Ph.D.')
      const givenNameFirst = buildTeachersDictionaryLookupKey('Ing. Marek Suchánek Ph.D. et Ph.D.')

      expect(surnameFirst).toBe(givenNameFirst)
      expect(surnameFirst).toBe(MAREK_SUCHANEK_KEY)
    })

    it('keeps duplicate tokens in the final key', () => {
      const withDuplicateToken = buildTeachersDictionaryLookupKey('PhD et PhD')
      const withoutDuplicateToken = buildTeachersDictionaryLookupKey('PhD et')

      expect(withDuplicateToken).toBe('et phd phd')
      expect(withoutDuplicateToken).toBe('et phd')
      expect(withDuplicateToken).not.toBe(withoutDuplicateToken)
    })
  })

  describe('whitespace normalization', () => {
    it('normalizes tabs, new lines, carriage returns and multiple spaces', () => {
      const mixedWhitespace = buildTeachersDictionaryLookupKey(' Ing.\tMarek\nSuchánek\r\nPh.D.   et  Ph.D. ')

      expect(mixedWhitespace).toBe(MAREK_SUCHANEK_KEY)
    })

    it('normalizes NBSP and narrow NBSP to standard spaces', () => {
      const withNonBreakingSpaces = buildTeachersDictionaryLookupKey('Ing.\u00A0Marek\u202FSuchánek Ph.D.')

      expect(withNonBreakingSpaces).toBe(MAREK_SUCHANEK_NO_ET_KEY)
    })

    it('returns empty key for empty and whitespace-only values', () => {
      expect(buildTeachersDictionaryLookupKey('')).toBe('')
      expect(buildTeachersDictionaryLookupKey('   \t \n  ')).toBe('')
    })
  })

  describe('punctuation handling', () => {
    it('removes dots globally and replaces commas globally', () => {
      const withPunctuation = buildTeachersDictionaryLookupKey('Ing., Marek, Suchánek, Ph.D., et, Ph.D.')

      expect(withPunctuation).toBe(MAREK_SUCHANEK_KEY)
    })

    it('treats configured punctuation as separators without token gluing', () => {
      const punctuated = buildTeachersDictionaryLookupKey('Ing.;Marek:(Suchánek)[Ph.D.]')

      expect(punctuated).toBe(MAREK_SUCHANEK_NO_ET_KEY)
    })

    it('returns empty key when input contains only configured punctuation', () => {
      const key = buildTeachersDictionaryLookupKey(' . , ; : ( ) [ ] { } " \' ` ')

      expect(key).toBe('')
    })

    it('keeps characters that are not configured as punctuation separators', () => {
      const key = buildTeachersDictionaryLookupKey('Anna-Marie Novák/Král')

      expect(key).toBe('anna-marie novák/král')
    })
  })

  describe('unicode and locale behavior', () => {
    it('applies NFKC normalization before tokenization', () => {
      const fullWidth = buildTeachersDictionaryLookupKey('Ｉｎｇ． Ｍａｒｅｋ Ｓｕｃｈáｎｅｋ Ｐｈ．Ｄ．')

      expect(fullWidth).toBe(MAREK_SUCHANEK_NO_ET_KEY)
    })

    it('lowercases tokens using Czech locale', () => {
      const uppercase = buildTeachersDictionaryLookupKey('ČEŇEK ŽLUŤOUČKÝ KŮŇ')

      expect(uppercase).toBe('čeňek kůň žluťoučký')
    })

    it('produces equal result for equivalent composed and decomposed unicode forms', () => {
      const composed = buildTeachersDictionaryLookupKey('Suchánek')
      const decomposed = buildTeachersDictionaryLookupKey('Sucha\u0301nek')

      expect(decomposed).toBe(composed)
      expect(composed).toBe('suchánek')
    })
  })

  describe('determinism', () => {
    it('is idempotent when called on already normalized output', () => {
      const firstPass = buildTeachersDictionaryLookupKey('Ing. Marek Suchánek Ph.D. et Ph.D.')
      const secondPass = buildTeachersDictionaryLookupKey(firstPass)

      expect(secondPass).toBe(firstPass)
      expect(secondPass).toBe(MAREK_SUCHANEK_KEY)
    })

    it('sorts deterministically for larger multi-token names', () => {
      const sourceA = buildTeachersDictionaryLookupKey('Da Silva Alves Rodrigo Augusto, Dr. rer. nat.')
      const sourceB = buildTeachersDictionaryLookupKey('Dr. rer. nat. Rodrigo Augusto da Silva Alves')

      expect(sourceA).toBe(sourceB)
      expect(sourceA).toBe(RODRIGO_ALVES_KEY)
    })
  })
})
