import { describe, expect, it } from 'vitest'
import {
  buildPdfExportFileName,
  collectUniquePdfExportValues,
  normalizePdfExportText,
  normalizePdfExportTextOrFallback,
  PDF_EXPORT_EMPTY_VALUE,
  resolvePdfStudentFullName,
  resolvePdfThesisTitleByLanguage,
  tryParsePdfExportDate
} from '~/utils/export/pdf-export-shared'

describe('pdf-export-shared', () => {
  it('normalizes text and applies fallback when value is blank', () => {
    expect(normalizePdfExportText('  abc  ')).toBe('abc')
    expect(normalizePdfExportTextOrFallback('   ')).toBe(PDF_EXPORT_EMPTY_VALUE)
    expect(normalizePdfExportTextOrFallback(null, 'N/A')).toBe('N/A')
  })

  it('parses ISO dates and returns null for invalid values', () => {
    expect(tryParsePdfExportDate('2025-06-23T00:00:00.000Z')).toBeInstanceOf(Date)
    expect(tryParsePdfExportDate('invalid-date')).toBeNull()
  })

  it('resolves student full name with titles and fallbacks', () => {
    expect(
      resolvePdfStudentFullName({
        firstName: 'David',
        lastName: 'Ampapa',
        titlesBefore: 'Bc.',
        titlesAfter: 'DiS.'
      })
    ).toBe('Bc. David Ampapa, DiS.')

    expect(
      resolvePdfStudentFullName({
        firstName: '',
        lastName: '',
        titlesBefore: null,
        titlesAfter: 'Ph.D.'
      })
    ).toBe('Ph.D.')

    expect(
      resolvePdfStudentFullName({
        firstName: '',
        lastName: '',
        titlesBefore: null,
        titlesAfter: null
      })
    ).toBe(PDF_EXPORT_EMPTY_VALUE)
  })

  it('resolves thesis title based on thesis language with fallback', () => {
    expect(
      resolvePdfThesisTitleByLanguage({
        thesisLanguage: 'ENGLISH',
        thesisTitleLocal: 'Lokální',
        thesisTitleEn: 'English'
      })
    ).toBe('English')

    expect(
      resolvePdfThesisTitleByLanguage({
        thesisLanguage: 'CZECH',
        thesisTitleLocal: '',
        thesisTitleEn: 'English'
      })
    ).toBe('English')

    expect(
      resolvePdfThesisTitleByLanguage({
        thesisLanguage: 'CZECH',
        thesisTitleLocal: '',
        thesisTitleEn: ''
      })
    ).toBe(PDF_EXPORT_EMPTY_VALUE)
  })

  it('deduplicates values case-insensitively and keeps insertion order', () => {
    const values = collectUniquePdfExportValues(['Jan Novák', '  ', 'jan novák', 'Petr Svoboda', null, 'PETR SVOBODA'])
    expect(values).toEqual(['Jan Novák', 'Petr Svoboda'])
  })

  it('builds file name with prefix, sanitized draft name and timestamp', () => {
    const fixedNow = new Date('2026-04-11T10:20:30.000Z')
    const fileName = buildPdfExportFileName('Dozor', 'Název plánu', fixedNow)
    expect(fileName).toBe('Dozor_Název plánu_11.04.2026_12-20-30.pdf')
  })
})
