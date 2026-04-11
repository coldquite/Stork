import { describe, expect, it } from 'vitest'
import type { GetTeachersDictionaryResponseDto } from '#shared/types/teachers-dictionary'
import { buildTeachersDictionaryLookupKey } from '#shared/utils/teachers-dictionary'
import type { ImportPayload } from '~/types/import'
import {
  cloneImportPayload,
  createTeachersDictionaryLookupMap,
  prepareImportPayloadForMapping
} from '~/utils/import-teachers-dictionary'

function createImportPayload(): ImportPayload {
  return {
    committees: {
      fileName: 'komise.csv',
      headers: ['Název komise'],
      rows: [{ 'Název komise': '242-BI, 5-BI-PI.21' }]
    },
    studentsStork: {
      bachelor: {
        fileName: 'students-stork-bc.csv',
        headers: [],
        rows: [
          {
            'VŠKP-typ A: Vedoucí práce 1': '  Ing. Alex Test  ',
            'VŠKP-typ A: Vedoucí práce 2': '',
            'VŠKP-typ A: Oponent práce 1': 'Mgr. Dana Testova Ph.D.',
            'VŠKP-typ A: Oponent práce 2': ''
          },
          {
            'VŠKP-typ A: Vedoucí práce 1': 'Test Alex, Ing.',
            'VŠKP-typ A: Vedoucí práce 2': '',
            'VŠKP-typ A: Oponent práce 1': '   ',
            'VŠKP-typ A: Oponent práce 2': ''
          }
        ]
      },
      master: {
        fileName: 'students-stork-mgr.csv',
        headers: [],
        rows: [
          {
            'VŠKP-typ A: Vedoucí práce 1': 'doc. Petra Testova',
            'VŠKP-typ A: Vedoucí práce 2': '',
            'VŠKP-typ A: Oponent práce 1': '',
            'VŠKP-typ A: Oponent práce 2': 'Ing. Roman Test'
          }
        ]
      }
    },
    studentsCommittees: {
      bachelor: {
        fileName: 'students-committees-bc.csv',
        headers: [],
        rows: [
          {
            'VŠKP-typ A: Vedoucí práce 1': 'Test Alex, Ing.',
            'VŠKP-typ A: Vedoucí práce 2': 'Neznamy Test, Ing.',
            'VŠKP-typ A: Oponent práce 1': 'Testova Dana, Mgr., Ph.D.',
            'VŠKP-typ A: Oponent práce 2': '',
            'Komise - předseda': 'Predseda Test, doc.',
            'Komise - místopředseda': '',
            'Komise - člen 1': 'Neznamy Test, Ing.',
            'Komise - člen 2': '',
            'Komise - člen 3': ''
          }
        ]
      },
      master: {
        fileName: 'students-committees-mgr.csv',
        headers: [],
        rows: [
          {
            'VŠKP-typ A: Vedoucí práce 1': 'Testova Petra, doc.',
            'VŠKP-typ A: Vedoucí práce 2': '',
            'VŠKP-typ A: Oponent práce 1': '',
            'VŠKP-typ A: Oponent práce 2': 'Test Roman, Ing.',
            'Komise - předseda': '',
            'Komise - místopředseda': '',
            'Komise - člen 1': '',
            'Komise - člen 2': '',
            'Komise - člen 3': ''
          }
        ]
      }
    }
  }
}

function createDictionaryEntries(canonicalNames: string[]): GetTeachersDictionaryResponseDto {
  return canonicalNames.map((canonicalName, index) => ({
    id: `entry-${index + 1}`,
    canonicalName,
    normalizedLookupKey: buildTeachersDictionaryLookupKey(canonicalName),
    isCustom: true
  }))
}

describe('import-teachers-dictionary utils', () => {
  it('cloneImportPayload performs a deep clone and keeps original payload unchanged', () => {
    const payload = createImportPayload()
    const clonedPayload = cloneImportPayload(payload)

    clonedPayload.committees.rows[0]!['Název komise'] = 'changed'
    clonedPayload.studentsStork.bachelor!.rows[0]!['VŠKP-typ A: Vedoucí práce 1'] = 'changed'
    clonedPayload.studentsCommittees.bachelor!.rows[0]!['Komise - předseda'] = 'changed'

    expect(payload.committees.rows[0]!['Název komise']).toBe('242-BI, 5-BI-PI.21')
    expect(payload.studentsStork.bachelor!.rows[0]!['VŠKP-typ A: Vedoucí práce 1']).toBe('  Ing. Alex Test  ')
    expect(payload.studentsCommittees.bachelor!.rows[0]!['Komise - předseda']).toBe('Predseda Test, doc.')
  })

  it('normalizes Students Stork teacher fields during prepare step even without dictionary matches', () => {
    const payload = createImportPayload()

    const result = prepareImportPayloadForMapping(payload, new Map())

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected unresolved payload')
    }

    expect(result.unresolvedEntries).toHaveLength(6)
    expect(result.unresolvedEntries.map((entry) => entry.lookupKey)).toEqual(
      expect.arrayContaining([
        buildTeachersDictionaryLookupKey('Ing. Alex Test'),
        buildTeachersDictionaryLookupKey('Mgr. Dana Testova Ph.D.'),
        buildTeachersDictionaryLookupKey('doc. Petra Testova'),
        buildTeachersDictionaryLookupKey('Ing. Roman Test'),
        buildTeachersDictionaryLookupKey('Neznamy Test, Ing.'),
        buildTeachersDictionaryLookupKey('Predseda Test, doc.')
      ])
    )
    expect(payload.studentsStork.bachelor!.rows[0]!['VŠKP-typ A: Vedoucí práce 1']).toBe('Ing. Alex Test')
    expect(payload.studentsStork.bachelor!.rows[1]!['VŠKP-typ A: Oponent práce 1']).toBe('')
    expect(payload.studentsStork.master!.rows[0]!['VŠKP-typ A: Oponent práce 2']).toBe('Ing. Roman Test')
  })

  it('createTeachersDictionaryLookupMap ignores invalid rows and keeps last canonical value for duplicate lookup keys', () => {
    const duplicateLookupKey = buildTeachersDictionaryLookupKey('Ing. Alex Test')
    const dictionaryEntries: GetTeachersDictionaryResponseDto = [
      {
        id: '1',
        canonicalName: '   ',
        normalizedLookupKey: duplicateLookupKey,
        isCustom: false
      },
      {
        id: '2',
        canonicalName: 'Ing. Alex Test',
        normalizedLookupKey: duplicateLookupKey,
        isCustom: false
      },
      {
        id: '3',
        canonicalName: 'Ing. Alex Test Ph.D.',
        normalizedLookupKey: duplicateLookupKey,
        isCustom: true
      },
      {
        id: '4',
        canonicalName: 'doc. Petra Testova',
        normalizedLookupKey: '   ',
        isCustom: false
      }
    ]

    const dictionaryLookupMap = createTeachersDictionaryLookupMap(dictionaryEntries)

    expect(dictionaryLookupMap.get(duplicateLookupKey)).toBe('Ing. Alex Test Ph.D.')
    expect(dictionaryLookupMap.size).toBe(1)
  })

  it('prepareImportPayloadForMapping resolves known names, normalizes unknown names and returns unique missing entries', () => {
    const payload = createImportPayload()
    const dictionaryLookupMap = createTeachersDictionaryLookupMap(
      createDictionaryEntries(['Ing. Alex Test', 'Mgr. Dana Testova Ph.D.', 'doc. Petra Testova', 'Ing. Roman Test'])
    )

    const result = prepareImportPayloadForMapping(payload, dictionaryLookupMap)

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected unresolved payload')
    }

    const missingLookupKeys = result.unresolvedEntries.map((entry) => entry.lookupKey)

    expect(result.unresolvedEntries).toHaveLength(2)
    expect(missingLookupKeys).toContain(buildTeachersDictionaryLookupKey('Neznamy Test, Ing.'))
    expect(missingLookupKeys).toContain(buildTeachersDictionaryLookupKey('Predseda Test, doc.'))

    expect(payload.studentsCommittees.bachelor!.rows[0]!['VŠKP-typ A: Vedoucí práce 1']).toBe('Ing. Alex Test')
    expect(payload.studentsCommittees.bachelor!.rows[0]!['VŠKP-typ A: Oponent práce 1']).toBe('Mgr. Dana Testova Ph.D.')
    expect(payload.studentsCommittees.master!.rows[0]!['VŠKP-typ A: Vedoucí práce 1']).toBe('doc. Petra Testova')
    expect(payload.studentsCommittees.master!.rows[0]!['VŠKP-typ A: Oponent práce 2']).toBe('Ing. Roman Test')

    // Same unresolved person appears in two columns, should be reported only once.
    const unresolvedNeznamy = result.unresolvedEntries.filter((entry) => {
      return entry.lookupKey === buildTeachersDictionaryLookupKey('Neznamy Test, Ing.')
    })
    expect(unresolvedNeznamy).toHaveLength(1)
    expect(unresolvedNeznamy[0]?.sourceValue).toBe('Neznamy Test, Ing.')
  })

  it('prepareImportPayloadForMapping resolves all target columns when dictionary contains all needed canonical names', () => {
    const payload = createImportPayload()

    const dictionaryEntries = [
      ...createDictionaryEntries([
        'Ing. Alex Test',
        'Mgr. Dana Testova Ph.D.',
        'doc. Petra Testova',
        'Ing. Roman Test'
      ]),
      ...createDictionaryEntries(['Neznamy Test Ing.', 'doc. Test Predseda'])
    ]

    const dictionaryLookupMap = createTeachersDictionaryLookupMap(dictionaryEntries)
    const result = prepareImportPayloadForMapping(payload, dictionaryLookupMap)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected prepared payload')
    }
    expect(result.preparedPayload.studentsCommittees.bachelor!.rows[0]!['Komise - předseda']).toBe('doc. Test Predseda')
    expect(payload.studentsCommittees.bachelor!.rows[0]!['VŠKP-typ A: Vedoucí práce 2']).toBe('Neznamy Test Ing.')
    expect(payload.studentsCommittees.bachelor!.rows[0]!['Komise - člen 1']).toBe('Neznamy Test Ing.')
    expect(payload.studentsCommittees.bachelor!.rows[0]!['Komise - předseda']).toBe('doc. Test Predseda')
  })
})
