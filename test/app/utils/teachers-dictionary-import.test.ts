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
        Příjmení: '  Testov  ',
        Jméno: ' Alex ',
        'Titul osoby (před jménem)': '  Ing. ',
        'Titul osoby (za jménem)': ' Ph.D. '
      },
      {
        Příjmení: 'Modelova',
        Jméno: 'Dana',
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
        canonicalName: 'Ing. Alex Testov, Ph.D.',
        isCustom: false
      },
      {
        canonicalName: 'Dana Modelova',
        isCustom: false
      }
    ])
  })

  it('supports UTF-8 BOM in the first header', () => {
    const csv = createCsvContent(
      [`\uFEFF${REQUIRED_HEADERS[0]}`, REQUIRED_HEADERS[1], REQUIRED_HEADERS[2], REQUIRED_HEADERS[3]],
      [
        {
          [`\uFEFF${REQUIRED_HEADERS[0]}`]: 'Testov',
          [REQUIRED_HEADERS[1]]: 'Alex',
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
    expect(result.entries[0]?.canonicalName).toBe('Ing. Alex Testov, Ph.D.')
  })

  it('returns missing_required_headers when any required header is absent', () => {
    const headers = REQUIRED_HEADERS.slice(0, -1)
    const csv = createCsvContent(headers, [
      {
        Příjmení: 'Testov',
        Jméno: 'Alex',
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
        'Titul osoby (před jménem)': 'Ing.',
        'Titul osoby (za jménem)': 'Ph.D.'
      }
    ])

    const result = parseTeachersDictionaryCsvText(csv)

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected parse failure')
    }

    expect(result.reason).toBe('empty_rows')
  })

  it('skips rows that contain only titles without first and last names', () => {
    const csv = createCsvContent(REQUIRED_HEADERS, [
      {
        Příjmení: '',
        Jméno: '',
        'Titul osoby (před jménem)': 'doc.',
        'Titul osoby (za jménem)': 'Ph.D.'
      },
      {
        Příjmení: 'Ukazka',
        Jméno: 'Karel',
        'Titul osoby (před jménem)': '',
        'Titul osoby (za jménem)': 'Ph.D.'
      }
    ])

    const result = parseTeachersDictionaryCsvText(csv)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected parse success')
    }

    expect(result.entries).toEqual([
      {
        canonicalName: 'Karel Ukazka, Ph.D.',
        isCustom: false
      }
    ])
  })

  it('returns parse_error for malformed csv content', () => {
    const malformedCsv =
      '"Příjmení";"Jméno";"Titul osoby (před jménem)";"Titul osoby (za jménem)"\n"Testov";"Alex";"Ing.";"Ph.D.'

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
    const fullRow = ['Testov', 'Alex', 'Ing.', 'Ph.D.'].map(toCsvCell).join(';')
    const shortRow = ['Ukazka', 'Karel'].map(toCsvCell).join(';')
    const csv = `${headersLine}\n${fullRow}\n${shortRow}`

    const result = parseTeachersDictionaryCsvText(csv)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected parse success')
    }

    expect(result.entries[0]?.canonicalName).toBe('Ing. Alex Testov, Ph.D.')
    expect(result.entries.some((entry) => entry.canonicalName === 'Karel Ukazka')).toBe(true)
  })
})
