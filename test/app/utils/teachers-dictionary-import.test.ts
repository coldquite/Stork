import { describe, expect, it } from 'vitest'
import { parseTeachersDictionaryCsvText } from '~/utils/teachers-dictionary-import'

const REQUIRED_HEADERS = ['Příjmení', 'Jméno', 'Titul osoby (před jménem)', 'Titul osoby (za jménem)'] as const

function toCsvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

function createCsvContent(headers: readonly string[], rows: Array<Record<string, string>>): string {
  const rowsText = rows.map((row) => {
    return headers.map((header) => toCsvCell(row[header] ?? '')).join(';')
  })

  return [headers.map(toCsvCell).join(';'), ...rowsText].join('\n')
}

describe('teachers-dictionary import parser', () => {
  it('parses valid csv and builds canonical names in expected order', () => {
    const csv = createCsvContent(REQUIRED_HEADERS, [
      {
        Příjmení: '  Novák  ',
        Jméno: ' Jan ',
        'Titul osoby (před jménem)': '  Ing. ',
        'Titul osoby (za jménem)': ' Ph.D. '
      },
      {
        Příjmení: 'Svobodová',
        Jméno: 'Eva',
        'Titul osoby (před jménem)': '',
        'Titul osoby (za jménem)': ''
      }
    ])

    const result = parseTeachersDictionaryCsvText(csv)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected parse success')
    }

    expect(result.entries).toEqual([
      {
        canonicalName: 'Ing. Jan Novák Ph.D.',
        isCustom: false
      },
      {
        canonicalName: 'Eva Svobodová',
        isCustom: false
      }
    ])
  })

  it('supports UTF-8 BOM in the first header', () => {
    const csv = createCsvContent(
      [`\uFEFF${REQUIRED_HEADERS[0]}`, REQUIRED_HEADERS[1], REQUIRED_HEADERS[2], REQUIRED_HEADERS[3]],
      [
        {
          [`\uFEFF${REQUIRED_HEADERS[0]}`]: 'Novák',
          [REQUIRED_HEADERS[1]]: 'Jan',
          [REQUIRED_HEADERS[2]]: 'Ing.',
          [REQUIRED_HEADERS[3]]: 'Ph.D.'
        }
      ]
    )

    const result = parseTeachersDictionaryCsvText(csv)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected parse success')
    }

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0]?.canonicalName).toBe('Ing. Jan Novák Ph.D.')
  })

  it('returns missing_required_headers when any required header is absent', () => {
    const headers = REQUIRED_HEADERS.slice(0, -1)
    const csv = createCsvContent(headers, [
      {
        Příjmení: 'Novák',
        Jméno: 'Jan',
        'Titul osoby (před jménem)': 'Ing.'
      }
    ])

    const result = parseTeachersDictionaryCsvText(csv)

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected parse failure')
    }

    expect(result.reason).toBe('missing_required_headers')
    expect(result.details.missingHeaders).toEqual(['Titul osoby (za jménem)'])
  })

  it('returns empty_headers when csv does not contain a header row', () => {
    const result = parseTeachersDictionaryCsvText('\n\n')

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected parse failure')
    }

    expect(result.reason).toBe('empty_headers')
  })

  it('returns empty_rows when all rows normalize to empty canonical names', () => {
    const csv = createCsvContent(REQUIRED_HEADERS, [
      {
        Příjmení: '  ',
        Jméno: '',
        'Titul osoby (před jménem)': ' ',
        'Titul osoby (za jménem)': ''
      }
    ])

    const result = parseTeachersDictionaryCsvText(csv)

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected parse failure')
    }

    expect(result.reason).toBe('empty_rows')
  })

  it('returns parse_error for malformed csv content', () => {
    const malformedCsv =
      '"Příjmení";"Jméno";"Titul osoby (před jménem)";"Titul osoby (za jménem)"\n"Novák";"Jan";"Ing.";"Ph.D.'

    const result = parseTeachersDictionaryCsvText(malformedCsv)

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected parse failure')
    }

    expect(result.reason).toBe('parse_error')
    expect((result.details.parseErrors ?? []).length).toBeGreaterThan(0)
  })

  it('accepts recoverable row field-mismatch warnings from parser', () => {
    const headersLine = REQUIRED_HEADERS.map(toCsvCell).join(';')
    const fullRow = ['Novák', 'Jan', 'Ing.', 'Ph.D.'].map(toCsvCell).join(';')
    const shortRow = ['Svoboda', 'Petr'].map(toCsvCell).join(';')
    const csv = `${headersLine}\n${fullRow}\n${shortRow}`

    const result = parseTeachersDictionaryCsvText(csv)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected parse success')
    }

    expect(result.entries[0]?.canonicalName).toBe('Ing. Jan Novák Ph.D.')
    expect(result.entries.some((entry) => entry.canonicalName === 'Petr Svoboda')).toBe(true)
  })
})
