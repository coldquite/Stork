import { describe, expect, it, vi } from 'vitest'
import type { GetTeachersDictionaryResponseDto } from '#shared/types/teachers-dictionary'
import { buildTeachersDictionaryLookupKey } from '#shared/utils/teachers-dictionary'
import { mapImportPayloadToDraftSource as mapPreparedImportPayloadToDraftSource } from '~/utils/import-mapper'
import type { ImportPayload, ImportSzzType, PreparedImportPayload } from '~/types/import'
import {
  cloneImportPayload,
  createTeachersDictionaryLookupMap,
  prepareImportPayloadForMapping
} from '~/utils/import-teachers-dictionary'

function mapImportPayloadToDraftSource(input: {
  scheduleName: string
  szzType: ImportSzzType
  payload: ImportPayload
}) {
  return mapPreparedImportPayloadToDraftSource({
    ...input,
    payload: input.payload as PreparedImportPayload
  })
}

function createCommitteesRow(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    'Název komise': '242-BI, 5-BI-PI.21',
    'Název studijního programu': 'Informatika',
    'Název oboru/specializace': 'Softwarové inženýrství 2021',
    Správce: 'Bc. Sekretářka',
    Kat: '13139',
    Datum: '23.06.2025',
    Místo: 'TH:A-1435',
    ...overrides
  }
}

function createStudentsCommitteesRow(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    'Jméno studenta': 'Alex',
    'Příjmení studenta': 'Testovací',
    'Email adresa': 'alex.testovaci@fit.cvut.cz',
    'Jazyk výuky': 'CZ',
    'Komise - název': '242-BI, 5-BI-PI.21',
    'VŠKP-typ A: Anglický název práce': 'Smart Scheduler',
    'VŠKP-typ A: Český název práce': 'Chytrý plánovač',
    'VŠKP-typ A: Jazyk práce': 'CZ',
    'VŠKP-typ A: Vedoucí práce 1': 'Ing. Test Vedoucí',
    'VŠKP-typ A: Vedoucí práce 2': '',
    'VŠKP-typ A: Oponent práce 1': 'Ing. Test Oponent',
    'VŠKP-typ A: Oponent práce 2': '',
    'Komise - předseda': 'doc. Test Předseda',
    'Komise - místopředseda': 'Ing. Test Místopředseda Ph.D.',
    'Komise - člen 1': 'Mgr. Test Člen A',
    'Komise - člen 2': 'Ing. Test Člen B',
    'Komise - člen 3': 'Test Člen C Ph.D.',
    'VŠKP-typ A: Katedra obhajoby - kod': '13139',
    'VŠKP-typ A: Katedra obhajoby - název': 'Katedra informatiky',
    'Obor/spec - kód': 'BI-SI.21',
    'Obor/spec - název': 'Softwarové inženýrství 2021',
    'St. program - kód': 'B0613A140017',
    'St. program - název': 'Informatika',
    'St. program - typ': 'B',
    'VŠKP-typ A: Datum obhajoby': '',
    'Předmět 1 - 1.term. datum': '',
    'Předmět 1 - 1.term. hodnocení': '',
    'Předmět 1 - 2.term. datum': '',
    ...overrides
  }
}

function createStudentsStorkRow(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    Příjmení: 'Testovací',
    Jméno: 'Alex',
    Titul: 'Bc.',
    'titul za': '',
    'Kód studijního plánu': 'BI-SI.21',
    'VŠKP-typ A: Název práce': 'Chytrý plánovač',
    'VŠKP-typ A: Vedoucí práce 1': 'Ing. Test Vedoucí',
    'VŠKP-typ A: Oponent práce 1': 'Ing. Test Oponent',
    'VŠKP-typ A: Datum obhajoby': '',
    'Email studenta': 'alex.testovaci@fit.cvut.cz',
    'Studijní program (název)': 'Informatika',
    'Obor/spec - název': 'Softwarové inženýrství 2021',
    'Studijní plán (název)': 'Bc. Informatika',
    'VŠKP-typ A: jazyk práce': 'CZ',
    'VŠKP-typ A: Překlad názvu práce': 'Smart Scheduler',
    ...overrides
  }
}

function createValidPayload(): ImportPayload {
  return {
    committees: {
      fileName: 'komise.csv',
      headers: [],
      rows: [createCommitteesRow()]
    },
    studentsStork: {
      bachelor: {
        fileName: 'studenti-stork-bc.csv',
        headers: [],
        rows: [createStudentsStorkRow()]
      }
    },
    studentsCommittees: {
      bachelor: {
        fileName: 'studenti-komise-bc.csv',
        headers: [],
        rows: [createStudentsCommitteesRow()]
      }
    }
  }
}

function createValidMasterPayload(
  overrides: {
    studentsStork?: Partial<Record<string, string>>
    studentsCommittees?: Partial<Record<string, string>>
    committees?: Partial<Record<string, string>>
  } = {}
): ImportPayload {
  return {
    committees: {
      fileName: 'komise.csv',
      headers: [],
      rows: [
        createCommitteesRow({
          'Název komise': '242-MI, 6-MI-PI.22',
          ...overrides.committees
        })
      ]
    },
    studentsStork: {
      master: {
        fileName: 'studenti-stork-mgr.csv',
        headers: [],
        rows: [
          createStudentsStorkRow({
            Jméno: 'Dana',
            Příjmení: 'Modelová',
            'Email studenta': 'dana.modelova@fit.cvut.cz',
            'Studijní plán (název)': 'Mgr. Informatika',
            ...overrides.studentsStork
          })
        ]
      }
    },
    studentsCommittees: {
      master: {
        fileName: 'studenti-komise-mgr.csv',
        headers: [],
        rows: [
          createStudentsCommitteesRow({
            'Jméno studenta': 'Dana',
            'Příjmení studenta': 'Modelová',
            'Email adresa': 'dana.modelova@fit.cvut.cz',
            'Komise - název': '242-MI, 6-MI-PI.22',
            'St. program - typ': 'M',
            'St. program - kód': 'MI',
            ...overrides.studentsCommittees
          })
        ]
      }
    }
  }
}

function toTeachersDictionaryEntries(canonicalNames: string[]): GetTeachersDictionaryResponseDto {
  return canonicalNames.map((canonicalName, index) => ({
    id: `entry-${index + 1}`,
    canonicalName,
    normalizedLookupKey: buildTeachersDictionaryLookupKey(canonicalName),
    isCustom: true
  }))
}

function mapImportPayloadWithTeachersDictionary(options: {
  scheduleName: string
  szzType: 'BACHELOR' | 'MASTER' | 'MIXED'
  payload: ImportPayload
  dictionaryCanonicalNames?: string[]
}) {
  const defaultCommitteeTeacherNames = [
    'Bc. Sekretářka',
    'doc. Test Předseda',
    'Ing. Test Místopředseda Ph.D.',
    'Mgr. Test Člen A',
    'Ing. Test Člen B',
    'Test Člen C Ph.D.'
  ]
  const defaultStudentTeacherNames = [
    'Ing. Test Vedoucí',
    'Ing. Test Oponent',
    'Ing. Alex Vzor',
    'Ing. Boris Vzor Ph.D.',
    'Ing. Cyril Oponent',
    'Mgr. Dana Druha Ph.D.',
    'Ing. Emil Ukazka Ph.D.',
    'Ing. Filip Model Ph.D. et, Ph.D.',
    'Gabriel Priklad M.A.',
    'Dr. rer. nat. Helena Nova Silva'
  ]
  const preparedPayload = cloneImportPayload(options.payload)

  const dictionaryEntries = toTeachersDictionaryEntries([
    ...defaultCommitteeTeacherNames,
    ...defaultStudentTeacherNames,
    ...(options.dictionaryCanonicalNames ?? [])
  ])

  const dictionaryByLookupKey = createTeachersDictionaryLookupMap(dictionaryEntries)
  const prepareResult = prepareImportPayloadForMapping(preparedPayload, dictionaryByLookupKey)
  expect(prepareResult.ok).toBe(true)
  if (!prepareResult.ok) {
    throw new Error('Expected prepared payload')
  }

  return mapImportPayloadToDraftSource({
    scheduleName: options.scheduleName,
    szzType: options.szzType,
    payload: prepareResult.preparedPayload
  })
}

describe('mapImportPayloadToDraftSource', () => {
  it('maps valid bachelor import payload to manual draft source', () => {
    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload: createValidPayload()
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected mapping success')
    }

    expect(result.draft.type).toBe('MANUAL')
    expect(result.draft.name).toBe('SZZ červen 2025')
    expect(result.draft.committees).toHaveLength(1)
    expect(result.draft.committees[0]?.name).toBe('5-BI-PI.21')
    expect(result.draft.committees[0]?.date).toBe('2025-06-23T00:00:00.000Z')
    expect(result.draft.committees[0]?.studyProgramType).toBe('BACHELOR')
    expect(result.draft.committees[0]?.items).toHaveLength(1)
    expect(result.draft.committees[0]?.items[0]?.position).toBe(1)
    const mappedFirstItem = result.draft.committees[0]?.items[0]
    if (!mappedFirstItem || mappedFirstItem.type !== 'STUDENT') {
      throw new Error('Expected mapped student item')
    }

    expect(mappedFirstItem.student.email).toBe('alex.testovaci@fit.cvut.cz')
    expect(mappedFirstItem.student.studyLanguage).toBe('CZECH')
    expect(mappedFirstItem.student.repeatType).toBe('NONE')
    expect(mappedFirstItem.student.prepareMinutes).toBe(45)
    expect(mappedFirstItem.student.examMinutes).toBe(30)
  })

  it('does not depend on students-stork defense date column', () => {
    const payload = createValidPayload()
    payload.studentsStork.bachelor!.rows[0] = createStudentsStorkRow({
      'VŠKP-typ A: Datum obhajoby': 'not-a-date'
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected mapping success')
    }
  })

  it('normalizes thesis title double hyphen to en dash during import', () => {
    const payload = createValidPayload()
    payload.studentsStork.bachelor!.rows[0] = createStudentsStorkRow({
      'VŠKP-typ A: Název práce': 'Návrh -- implementace systému',
      'VŠKP-typ A: Překlad názvu práce': 'Design -- implementation of a system'
    })
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'VŠKP-typ A: Český název práce': 'Návrh – implementace systému',
      'VŠKP-typ A: Anglický název práce': 'Design – implementation of a system'
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected mapping success')
    }

    const mappedFirstItem = result.draft.committees[0]?.items[0]
    if (!mappedFirstItem || mappedFirstItem.type !== 'STUDENT') {
      throw new Error('Expected mapped student item')
    }

    expect(mappedFirstItem.student.thesisTitleLocal).toBe('Návrh – implementace systému')
    expect(mappedFirstItem.student.thesisTitleEn).toBe('Design – implementation of a system')
  })

  it('sets repeatType to BOTH when first-term grade is F and thesis defense date is empty', () => {
    const payload = createValidPayload()
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'VŠKP-typ A: Datum obhajoby': '',
      'Předmět 1 - 1.term. datum': '12.01.2025',
      'Předmět 1 - 1.term. hodnocení': 'F',
      'Předmět 1 - 2.term. datum': ''
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected mapping success')
    }

    const mappedFirstItem = result.draft.committees[0]?.items[0]
    if (!mappedFirstItem || mappedFirstItem.type !== 'STUDENT') {
      throw new Error('Expected mapped student item')
    }

    expect(mappedFirstItem.student.repeatType).toBe('BOTH')
    expect(mappedFirstItem.student.prepareMinutes).toBe(45)
    expect(mappedFirstItem.student.examMinutes).toBe(30)
  })

  it('sets repeatType to ORAL_EXAM when first-term grade is F and thesis defense date exists', () => {
    const payload = createValidPayload()
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'VŠKP-typ A: Datum obhajoby': '11.02.2025',
      'Předmět 1 - 1.term. datum': '12.01.2025',
      'Předmět 1 - 1.term. hodnocení': 'F',
      'Předmět 1 - 2.term. datum': ''
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected mapping success')
    }

    const mappedFirstItem = result.draft.committees[0]?.items[0]
    if (!mappedFirstItem || mappedFirstItem.type !== 'STUDENT') {
      throw new Error('Expected mapped student item')
    }

    expect(mappedFirstItem.student.repeatType).toBe('ORAL_EXAM')
    expect(mappedFirstItem.student.prepareMinutes).toBe(45)
    expect(mappedFirstItem.student.examMinutes).toBe(15)
  })

  it('sets repeatType to THESIS_DEFENSE when first-term grade is A-E and thesis defense date is empty', () => {
    const payload = createValidPayload()
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'VŠKP-typ A: Datum obhajoby': '',
      'Předmět 1 - 1.term. datum': '12.01.2025',
      'Předmět 1 - 1.term. hodnocení': 'E',
      'Předmět 1 - 2.term. datum': ''
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected mapping success')
    }

    const mappedFirstItem = result.draft.committees[0]?.items[0]
    if (!mappedFirstItem || mappedFirstItem.type !== 'STUDENT') {
      throw new Error('Expected mapped student item')
    }

    expect(mappedFirstItem.student.repeatType).toBe('THESIS_DEFENSE')
    expect(mappedFirstItem.student.prepareMinutes).toBe(0)
    expect(mappedFirstItem.student.examMinutes).toBe(15)
  })

  it('fails when first-term grade is outside A-F range', () => {
    const payload = createValidPayload()
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'Předmět 1 - 1.term. datum': '12.01.2025',
      'Předmět 1 - 1.term. hodnocení': 'FX'
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected mapping failure')
    }

    expect(result.error.code).toBe('INVALID_FIRST_TERM_GRADE')
    expect(result.error.column).toBe('Předmět 1 - 1.term. hodnocení')
  })

  it('fails when first-term grade is lowercase', () => {
    const payload = createValidPayload()
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'Předmět 1 - 1.term. datum': '12.01.2025',
      'Předmět 1 - 1.term. hodnocení': 'a'
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected mapping failure')
    }

    expect(result.error.code).toBe('INVALID_FIRST_TERM_GRADE')
    expect(result.error.column).toBe('Předmět 1 - 1.term. hodnocení')
  })

  it('fails when first-term date exists but first-term grade is empty', () => {
    const payload = createValidPayload()
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'Předmět 1 - 1.term. datum': '12.01.2025',
      'Předmět 1 - 1.term. hodnocení': ''
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected mapping failure')
    }

    expect(result.error.code).toBe('INVALID_FIRST_TERM_RESULT_STATE')
    expect(result.error.column).toBe('Předmět 1 - 1.term. hodnocení')
    expect(result.error.context.reason).toBe('first_term_date_without_grade')
  })

  it('fails when first-term grade exists but first-term date is empty', () => {
    const payload = createValidPayload()
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'Předmět 1 - 1.term. datum': '',
      'Předmět 1 - 1.term. hodnocení': 'A'
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected mapping failure')
    }

    expect(result.error.code).toBe('INVALID_FIRST_TERM_RESULT_STATE')
    expect(result.error.column).toBe('Předmět 1 - 1.term. datum')
    expect(result.error.context.reason).toBe('first_term_grade_without_date')
  })

  it('allows empty first-term grade', () => {
    const payload = createValidPayload()
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'Předmět 1 - 1.term. hodnocení': ''
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected mapping success')
    }
  })

  it('uses master default slot duration for first attempt (repeatType NONE)', () => {
    const payload = createValidMasterPayload({
      studentsCommittees: {
        'VŠKP-typ A: Datum obhajoby': '',
        'Předmět 1 - 1.term. datum': '',
        'Předmět 1 - 2.term. datum': ''
      }
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'MASTER',
      payload
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected mapping success')
    }

    const mappedFirstItem = result.draft.committees[0]?.items[0]
    if (!mappedFirstItem || mappedFirstItem.type !== 'STUDENT') {
      throw new Error('Expected mapped student item')
    }

    expect(mappedFirstItem.student.repeatType).toBe('NONE')
    expect(mappedFirstItem.student.prepareMinutes).toBe(45)
    expect(mappedFirstItem.student.examMinutes).toBe(35)
  })

  it('uses master oral-only duration when repeatType is ORAL_EXAM', () => {
    const payload = createValidMasterPayload({
      studentsCommittees: {
        'VŠKP-typ A: Datum obhajoby': '11.02.2025',
        'Předmět 1 - 1.term. datum': '12.01.2025',
        'Předmět 1 - 1.term. hodnocení': 'F',
        'Předmět 1 - 2.term. datum': ''
      }
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'MASTER',
      payload
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected mapping success')
    }

    const mappedFirstItem = result.draft.committees[0]?.items[0]
    if (!mappedFirstItem || mappedFirstItem.type !== 'STUDENT') {
      throw new Error('Expected mapped student item')
    }

    expect(mappedFirstItem.student.repeatType).toBe('ORAL_EXAM')
    expect(mappedFirstItem.student.prepareMinutes).toBe(45)
    expect(mappedFirstItem.student.examMinutes).toBe(15)
  })

  it('uses master first-or-both duration when repeatType is BOTH', () => {
    const payload = createValidMasterPayload({
      studentsCommittees: {
        'VŠKP-typ A: Datum obhajoby': '',
        'Předmět 1 - 1.term. datum': '12.01.2025',
        'Předmět 1 - 1.term. hodnocení': 'F',
        'Předmět 1 - 2.term. datum': ''
      }
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'MASTER',
      payload
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected mapping success')
    }

    const mappedFirstItem = result.draft.committees[0]?.items[0]
    if (!mappedFirstItem || mappedFirstItem.type !== 'STUDENT') {
      throw new Error('Expected mapped student item')
    }

    expect(mappedFirstItem.student.repeatType).toBe('BOTH')
    expect(mappedFirstItem.student.prepareMinutes).toBe(45)
    expect(mappedFirstItem.student.examMinutes).toBe(35)
  })

  it('uses master thesis-only duration when repeatType is THESIS_DEFENSE', () => {
    const payload = createValidMasterPayload({
      studentsCommittees: {
        'VŠKP-typ A: Datum obhajoby': '',
        'Předmět 1 - 1.term. datum': '12.01.2025',
        'Předmět 1 - 1.term. hodnocení': 'B',
        'Předmět 1 - 2.term. datum': ''
      }
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'MASTER',
      payload
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected mapping success')
    }

    const mappedFirstItem = result.draft.committees[0]?.items[0]
    if (!mappedFirstItem || mappedFirstItem.type !== 'STUDENT') {
      throw new Error('Expected mapped student item')
    }

    expect(mappedFirstItem.student.repeatType).toBe('THESIS_DEFENSE')
    expect(mappedFirstItem.student.prepareMinutes).toBe(0)
    expect(mappedFirstItem.student.examMinutes).toBe(20)
  })

  it('fails when thesis defense date exists but first-term grade is empty', () => {
    const payload = createValidPayload()
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'VŠKP-typ A: Datum obhajoby': '11.02.2025',
      'Předmět 1 - 1.term. datum': '',
      'Předmět 1 - 1.term. hodnocení': '',
      'Předmět 1 - 2.term. datum': ''
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected mapping failure')
    }

    expect(result.error.code).toBe('INVALID_REPEAT_TYPE_STATE')
    expect(result.error.column).toBe('VŠKP-typ A: Datum obhajoby')
    expect(result.error.context.reason).toBe('defense_date_without_first_term_grade')
  })

  it('fails when first-term grade is A-E and thesis defense date exists', () => {
    const payload = createValidPayload()
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'VŠKP-typ A: Datum obhajoby': '11.02.2025',
      'Předmět 1 - 1.term. datum': '12.01.2025',
      'Předmět 1 - 1.term. hodnocení': 'A',
      'Předmět 1 - 2.term. datum': ''
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected mapping failure')
    }

    expect(result.error.code).toBe('INVALID_REPEAT_TYPE_STATE')
    expect(result.error.column).toBe('VŠKP-typ A: Datum obhajoby')
    expect(result.error.context.reason).toBe('first_term_passed_and_defense_exists')
  })

  it('fails when second-term date exists because student has no remaining SZZ attempt', () => {
    const payload = createValidPayload()
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'VŠKP-typ A: Datum obhajoby': '',
      'Předmět 1 - 1.term. datum': '12.01.2025',
      'Předmět 1 - 1.term. hodnocení': 'A',
      'Předmět 1 - 2.term. datum': '23.02.2025'
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected mapping failure')
    }

    expect(result.error.code).toBe('STUDENT_REPEAT_NOT_ALLOWED')
    expect(result.error.column).toBe('Předmět 1 - 2.term. datum')
    expect(result.error.context.reason).toBe('second_term_attempt_already_exists')
  })

  it('fails when students-committees teacher names are not pre-resolved by teachers dictionary', () => {
    const payload = createValidPayload()
    payload.studentsStork.bachelor!.rows[0] = createStudentsStorkRow({
      'VŠKP-typ A: Vedoucí práce 1': 'Ing. Alex Vzor'
    })
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'VŠKP-typ A: Vedoucí práce 1': 'Vzor Alex, Ing.'
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected mapping failure')
    }

    expect(result.error.code).toBe('STUDENT_VALUE_MISMATCH')
    expect(result.error.column).toBe('VŠKP-typ A: Vedoucí práce 1')
    expect(result.error.context.leftDataset).toBe('studentsStork')
    expect(result.error.context.rightDataset).toBe('studentsCommittees')
    expect(result.error.context.leftFileName).toBe('studenti-stork-bc.csv')
    expect(result.error.context.rightFileName).toBe('studenti-komise-bc.csv')
  })

  it('maps teacher fields when students-committees names are pre-resolved by teachers dictionary', () => {
    const payload = createValidPayload()
    payload.studentsStork.bachelor!.rows[0] = createStudentsStorkRow({
      'VŠKP-typ A: Vedoucí práce 1': 'Ing. Alex Vzor',
      'VŠKP-typ A: Vedoucí práce 2': 'Ing. Boris Vzor Ph.D.',
      'VŠKP-typ A: Oponent práce 1': 'Ing. Cyril Oponent',
      'VŠKP-typ A: Oponent práce 2': 'Mgr. Dana Druha Ph.D.'
    })
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'VŠKP-typ A: Vedoucí práce 1': 'Vzor Alex, Ing.',
      'VŠKP-typ A: Vedoucí práce 2': 'Vzor Boris, Ing., Ph.D.',
      'VŠKP-typ A: Oponent práce 1': 'Oponent Cyril, Ing.',
      'VŠKP-typ A: Oponent práce 2': 'Druha Dana, Mgr., Ph.D.',
      'Komise - předseda': 'Předseda Test, doc.',
      'Komise - místopředseda': 'Místopředseda Test, Ing., Ph.D.',
      'Komise - člen 1': 'Člen Test A, Mgr.',
      'Komise - člen 2': 'Člen Test B, Ing.',
      'Komise - člen 3': 'Člen Test C, Ph.D.'
    })

    const result = mapImportPayloadWithTeachersDictionary({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload,
      dictionaryCanonicalNames: [
        'doc. Test Předseda',
        'Ing. Test Místopředseda Ph.D.',
        'Mgr. Test Člen A',
        'Ing. Test Člen B',
        'Test Člen C Ph.D.'
      ]
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected mapping success')
    }

    const mappedCommittee = result.draft.committees[0]
    if (!mappedCommittee) {
      throw new Error('Expected mapped committee')
    }

    expect(mappedCommittee.chairName).toBe('doc. Test Předseda')
    expect(mappedCommittee.viceChairName).toBe('Ing. Test Místopředseda Ph.D.')
    expect(mappedCommittee.member1Name).toBe('Mgr. Test Člen A')
    expect(mappedCommittee.member2Name).toBe('Ing. Test Člen B')
    expect(mappedCommittee.member3Name).toBe('Test Člen C Ph.D.')

    const mappedFirstItem = mappedCommittee.items[0]
    if (!mappedFirstItem || mappedFirstItem.type !== 'STUDENT') {
      throw new Error('Expected mapped student item')
    }

    expect(mappedFirstItem.student.supervisorName).toBe('Ing. Alex Vzor')
    expect(mappedFirstItem.student.reviewerName).toBe('Ing. Cyril Oponent')
    expect(mappedFirstItem.student.additionalSupervisorName).toBe('Ing. Boris Vzor Ph.D.')
    expect(mappedFirstItem.student.additionalReviewerName).toBe('Mgr. Dana Druha Ph.D.')
  })

  it('matches supervisor names after dictionary resolution by lookup key', () => {
    const payload = createValidPayload()
    payload.studentsStork.bachelor!.rows[0] = createStudentsStorkRow({
      'VŠKP-typ A: Vedoucí práce 1': 'Ing. Emil Ukazka Ph.D.',
      'VŠKP-typ A: Oponent práce 1': 'Ing. Cyril Oponent'
    })
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'VŠKP-typ A: Vedoucí práce 1': 'Ukazka Emil, Ing., Ph.D',
      'VŠKP-typ A: Oponent práce 1': 'Oponent Cyril, Ing.'
    })

    const result = mapImportPayloadWithTeachersDictionary({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected mapping success')
    }

    const mappedFirstItem = result.draft.committees[0]?.items[0]
    if (!mappedFirstItem || mappedFirstItem.type !== 'STUDENT') {
      throw new Error('Expected mapped student item')
    }

    expect(mappedFirstItem.student.supervisorName).toBe('Ing. Emil Ukazka Ph.D.')
  })

  it('matches reviewer names with punctuation differences after dictionary resolution', () => {
    const payload = createValidPayload()
    payload.studentsStork.bachelor!.rows[0] = createStudentsStorkRow({
      'VŠKP-typ A: Oponent práce 1': 'Ing. Filip Model Ph.D. et, Ph.D.'
    })
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'VŠKP-typ A: Oponent práce 1': 'Model Filip, Ing., Ph.D. et Ph.D.'
    })

    const result = mapImportPayloadWithTeachersDictionary({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected mapping success')
    }

    const mappedFirstItem = result.draft.committees[0]?.items[0]
    if (!mappedFirstItem || mappedFirstItem.type !== 'STUDENT') {
      throw new Error('Expected mapped student item')
    }

    expect(mappedFirstItem.student.reviewerName).toBe('Ing. Filip Model Ph.D. et, Ph.D.')
  })

  it('matches reviewer names when source order differs but lookup key is the same', () => {
    const payload = createValidPayload()
    payload.studentsStork.bachelor!.rows[0] = createStudentsStorkRow({
      'VŠKP-typ A: Oponent práce 1': 'Gabriel Priklad M.A.'
    })
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'VŠKP-typ A: Oponent práce 1': 'Priklad Gabriel, M.A.'
    })

    const result = mapImportPayloadWithTeachersDictionary({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected mapping success')
    }

    const mappedFirstItem = result.draft.committees[0]?.items[0]
    if (!mappedFirstItem || mappedFirstItem.type !== 'STUDENT') {
      throw new Error('Expected mapped student item')
    }

    expect(mappedFirstItem.student.reviewerName).toBe('Gabriel Priklad M.A.')
  })

  it('matches reviewer names with reordered multi-part surname tokens after dictionary resolution', () => {
    const payload = createValidPayload()
    payload.studentsStork.bachelor!.rows[0] = createStudentsStorkRow({
      'VŠKP-typ A: Oponent práce 1': 'Dr. rer. nat. Helena Nova Silva'
    })
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'VŠKP-typ A: Oponent práce 1': 'Silva Nova Helena, Dr. rer. nat.'
    })

    const result = mapImportPayloadWithTeachersDictionary({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected mapping success')
    }

    const mappedFirstItem = result.draft.committees[0]?.items[0]
    if (!mappedFirstItem || mappedFirstItem.type !== 'STUDENT') {
      throw new Error('Expected mapped student item')
    }

    expect(mappedFirstItem.student.reviewerName).toBe('Dr. rer. nat. Helena Nova Silva')
  })

  it('does not fail when legacy defense department columns are empty in studenti-komise', () => {
    const payload = createValidPayload()
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'VŠKP-typ A: Katedra obhajoby - kod': '',
      'VŠKP-typ A: Katedra obhajoby - název': ''
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected mapping success')
    }

    expect(result.draft.committees[0]?.specializationCode).toBe('BI-SI.21')
    expect(result.draft.committees[0]).not.toHaveProperty('defenseDepartmentCode')
    expect(result.draft.committees[0]).not.toHaveProperty('defenseDepartmentName')
  })

  it('does not require legacy committee Kat column for successful mapping', () => {
    const payload = createValidPayload()
    payload.committees.rows[0] = createCommitteesRow({
      Kat: ''
    })
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'VŠKP-typ A: Katedra obhajoby - kod': '',
      'VŠKP-typ A: Katedra obhajoby - název': ''
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected mapping success')
    }

    expect(result.draft.committees[0]?.specializationCode).toBe('BI-SI.21')
  })

  it('ignores legacy defense department columns and uses specialization code mapping only', () => {
    const payload = createValidPayload()
    payload.committees.rows[0] = createCommitteesRow({
      Kat: '18102'
    })
    payload.studentsStork.bachelor!.rows[0] = createStudentsStorkRow({
      'Kód studijního plánu': 'BI-UI.21'
    })
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'VŠKP-typ A: Katedra obhajoby - kod': '18104',
      'VŠKP-typ A: Katedra obhajoby - název': '',
      'Obor/spec - kód': 'BI-UI21'
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected mapping success')
    }

    expect(result.draft.committees[0]?.specializationCode).toBe('BI-UI.21')
    expect(result.draft.committees[0]).not.toHaveProperty('defenseDepartmentCode')
    expect(result.draft.committees[0]).not.toHaveProperty('defenseDepartmentName')
  })

  it('returns MISSING_DATASET with correct datasetKey when required file is missing', () => {
    const payload = createValidPayload()
    payload.studentsStork.bachelor = undefined

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected mapping failure')
    }

    expect(result.error.code).toBe('MISSING_DATASET')
    expect(result.error.datasetKey).toBe('studentsStork')
    expect(result.error.context.level).toBe('bachelor')
  })

  it('fails with MISSING_REQUIRED_VALUE when a required field is empty', () => {
    const payload = createValidPayload()
    payload.committees.rows[0] = createCommitteesRow({
      'Název studijního programu': '   '
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected mapping failure')
    }

    expect(result.error.code).toBe('MISSING_REQUIRED_VALUE')
    expect(result.error.datasetKey).toBe('committees')
    expect(result.error.column).toBe('Název studijního programu')
    expect(result.error.context.reason).toBe('required_value_is_empty')
  })

  it('fails with INVALID_COMMITTEE_NAME when committee name is blank after preprocessing', () => {
    const payload = createValidPayload()
    payload.committees.rows[0] = createCommitteesRow({
      'Název komise': '   '
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected mapping failure')
    }

    expect(result.error.code).toBe('INVALID_COMMITTEE_NAME')
    expect(result.error.datasetKey).toBe('committees')
    expect(result.error.column).toBe('Název komise')
  })

  it('fails with COMMITTEE_NOT_FOUND_IN_COMMITTEES when students-committees contains an unknown committee', () => {
    const payload = createValidPayload()
    payload.studentsCommittees.bachelor!.rows.push(
      createStudentsCommitteesRow({
        'Jméno studenta': 'Petr',
        'Příjmení studenta': 'Svoboda',
        'Email adresa': 'petr.svoboda@fit.cvut.cz',
        'Komise - název': '242-BI, 9-BI-PI.99'
      })
    )

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected mapping failure')
    }

    expect(result.error.code).toBe('COMMITTEE_NOT_FOUND_IN_COMMITTEES')
    expect(result.error.datasetKey).toBe('studentsCommittees')
    expect(result.error.column).toBe('Komise - název')
    expect(result.error.context.committeeName).toBe('9-BI-PI.99')
  })

  it('fails with COMMITTEE_GROUP_INCONSISTENT when one committee group has conflicting invariant fields', () => {
    const payload = createValidPayload()
    payload.studentsCommittees.bachelor!.rows.push(
      createStudentsCommitteesRow({
        'Jméno studenta': 'Petr',
        'Příjmení studenta': 'Svoboda',
        'Email adresa': 'petr.svoboda@fit.cvut.cz',
        'Komise - člen 2': 'Jiný člen'
      })
    )

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected mapping failure')
    }

    expect(result.error.code).toBe('COMMITTEE_GROUP_INCONSISTENT')
    expect(result.error.datasetKey).toBe('studentsCommittees')
    expect(result.error.column).toBe('Komise - člen 2')
    expect(result.error.context.committeeName).toBe('5-BI-PI.21')
  })

  it('fails with COMMITTEE_FIELD_MISMATCH when committee and students rows disagree in mapped fields', () => {
    const payload = createValidPayload()
    payload.committees.rows[0] = createCommitteesRow({
      'Název studijního programu': 'Kybernetika'
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected mapping failure')
    }

    expect(result.error.code).toBe('COMMITTEE_FIELD_MISMATCH')
    expect(result.error.datasetKey).toBe('committees')
    expect(result.error.column).toBe('Název studijního programu')
    expect(result.error.context.leftDataset).toBe('studentsCommittees')
    expect(result.error.context.rightDataset).toBe('committees')
    expect(result.error.context.leftFileName).toBe('studenti-komise-bc.csv')
    expect(result.error.context.rightFileName).toBe('komise.csv')
    expect(result.error.context.leftColumn).toBe('St. program - název')
    expect(result.error.context.rightColumn).toBe('Název studijního programu')
  })

  it('fails with COMMITTEE_SZZ_TYPE_MISMATCH when imported study type differs from selected SZZ type', () => {
    const payload = createValidPayload()
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'St. program - typ': 'M'
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected mapping failure')
    }

    expect(result.error.code).toBe('COMMITTEE_SZZ_TYPE_MISMATCH')
    expect(result.error.datasetKey).toBe('studentsCommittees')
    expect(result.error.column).toBe('St. program - typ')
    expect(result.error.context.detectedType).toBe('MASTER')
    expect(result.error.context.selectedType).toBe('BACHELOR')
  })

  it('fails with INVALID_COMMITTEE_DATE when committee date cannot be parsed', () => {
    const payload = createValidPayload()
    payload.committees.rows[0] = createCommitteesRow({
      Datum: '2025-06-23'
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected mapping failure')
    }

    expect(result.error.code).toBe('INVALID_COMMITTEE_DATE')
    expect(result.error.datasetKey).toBe('committees')
    expect(result.error.column).toBe('Datum')
  })

  it('fails with INVALID_STUDY_PROGRAM_TYPE when study type symbol is unsupported', () => {
    const payload = createValidPayload()
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'St. program - typ': 'X'
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected mapping failure')
    }

    expect(result.error.code).toBe('INVALID_STUDY_PROGRAM_TYPE')
    expect(result.error.datasetKey).toBe('studentsCommittees')
    expect(result.error.column).toBe('St. program - typ')
    expect(result.error.context.rawValue).toBe('X')
  })

  it('fails with STUDENT_COMMITTEE_NOT_FOUND when target committee lookup unexpectedly misses', () => {
    const payload = createValidPayload()
    const originalMapGet = Map.prototype.get
    const mapGetSpy = vi.spyOn(Map.prototype, 'get').mockImplementation(function (this: Map<unknown, unknown>, key) {
      const value = originalMapGet.call(this, key)

      if (key === '5-BI-PI.21' && value && typeof value === 'object' && 'items' in (value as Record<string, unknown>)) {
        return undefined
      }

      return value
    })

    try {
      const result = mapImportPayloadToDraftSource({
        scheduleName: 'SZZ červen 2025',
        szzType: 'BACHELOR',
        payload
      })

      expect(result.ok).toBe(false)
      if (result.ok) {
        throw new Error('Expected mapping failure')
      }

      expect(result.error.code).toBe('STUDENT_COMMITTEE_NOT_FOUND')
      expect(result.error.datasetKey).toBe('studentsCommittees')
      expect(result.error.column).toBe('Komise - název')
      expect(result.error.context.committeeName).toBe('5-BI-PI.21')
    } finally {
      mapGetSpy.mockRestore()
    }
  })

  it('fails when committee name is duplicated in committees dataset', () => {
    const payload = createValidPayload()
    payload.committees.rows.push(createCommitteesRow())

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected mapping failure')
    }

    expect(result.error.code).toBe('DUPLICATE_COMMITTEE_NAME')
    expect(result.error.datasetKey).toBe('committees')
  })

  it('fails when committee from committees file is missing in students-committees file', () => {
    const payload = createValidPayload()
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'Komise - název': '242-BI, 9-BI-PI.99'
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected mapping failure')
    }

    expect(result.error.code).toBe('COMMITTEE_NOT_FOUND_IN_STUDENTS')
  })

  it('fails when one studenti-Stork row matches multiple studenti-komise rows', () => {
    const payload = createValidPayload()
    payload.committees.rows.push(
      createCommitteesRow({
        'Název komise': '242-BI, 6-BI-PI.22'
      })
    )
    payload.studentsCommittees.bachelor!.rows.push(
      createStudentsCommitteesRow({
        'Komise - název': '242-BI, 6-BI-PI.22'
      })
    )

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected mapping failure')
    }

    expect(result.error.code).toBe('STUDENT_MATCH_AMBIGUOUS')
  })

  it('fails when mapped student and mapped committee do not share specializationCode', () => {
    const payload = createValidPayload()
    payload.studentsStork.bachelor!.rows[0] = createStudentsStorkRow({
      'Kód studijního plánu': 'BI-XX.21'
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected mapping failure')
    }

    expect(result.error.code).toBe('STUDENT_COMMITTEE_MISMATCH')
    expect(result.error.context.field).toBe('specializationCode')
  })

  it('normalizes specializationCode by adding dot before trailing digits', () => {
    const payload = createValidPayload()
    payload.studentsStork.bachelor!.rows[0] = createStudentsStorkRow({
      'Kód studijního plánu': 'BI-IB.21'
    })
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'Obor/spec - kód': 'BI-IB21'
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected mapping success')
    }

    expect(result.draft.committees[0]?.specializationCode).toBe('BI-IB.21')
    const mappedFirstItem = result.draft.committees[0]?.items[0]
    if (!mappedFirstItem || mappedFirstItem.type !== 'STUDENT') {
      throw new Error('Expected mapped student item')
    }

    expect(mappedFirstItem.student.specializationCode).toBe('BI-IB.21')
  })

  it('allows specializationCode when committee value is a prefix of student value', () => {
    const payload = createValidPayload()
    payload.studentsStork.bachelor!.rows[0] = createStudentsStorkRow({
      'Kód studijního plánu': 'NI-ZI.2020'
    })
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'Obor/spec - kód': 'NI-ZI'
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected mapping success')
    }

    expect(result.draft.committees[0]?.specializationCode).toBe('NI-ZI')
    const mappedFirstItem = result.draft.committees[0]?.items[0]
    if (!mappedFirstItem || mappedFirstItem.type !== 'STUDENT') {
      throw new Error('Expected mapped student item')
    }

    expect(mappedFirstItem.student.specializationCode).toBe('NI-ZI.2020')
  })

  it('normalizes K- to - in specializationCode comparison only', () => {
    const payload = createValidPayload()
    payload.studentsStork.bachelor!.rows[0] = createStudentsStorkRow({
      'Kód studijního plánu': 'BIK-SI.21'
    })
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'Obor/spec - kód': 'BI-SI.21'
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected mapping success')
    }

    expect(result.draft.committees[0]?.specializationCode).toBe('BI-SI.21')
    const mappedFirstItem = result.draft.committees[0]?.items[0]
    if (!mappedFirstItem || mappedFirstItem.type !== 'STUDENT') {
      throw new Error('Expected mapped student item')
    }

    expect(mappedFirstItem.student.specializationCode).toBe('BIK-SI.21')
  })

  it('maps ISP specialization through non-individual committee code and preserves original student code', () => {
    const payload = createValidPayload()
    payload.committees.rows[0] = createCommitteesRow({
      'Název oboru/specializace': 'Počítačové sítě a Internet 2021'
    })
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'Obor/spec - název': 'Počítačové sítě a Internet 2021',
      'Obor/spec - kód': 'BI-PS.21'
    })
    payload.studentsStork.bachelor!.rows[0] = createStudentsStorkRow({
      'Obor/spec - název': 'Počítačové sítě a Internet 2021',
      'Studijní plán (název)': 'Počítačové sítě a Internet - ISP 515623',
      'Kód studijního plánu': 'BI-PS-ISP-515623'
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected mapping success')
    }

    expect(result.draft.committees[0]?.specializationCode).toBe('BI-PS.21')
    const mappedFirstItem = result.draft.committees[0]?.items[0]
    if (!mappedFirstItem || mappedFirstItem.type !== 'STUDENT') {
      throw new Error('Expected mapped student item')
    }

    expect(mappedFirstItem.student.studyProgramType).toBe('BACHELOR')
    expect(mappedFirstItem.student.specializationCode).toBe('BI-PS-ISP-515623')
  })

  it('ignores trailing dot and version digits in specializationCode comparison', () => {
    const payload = createValidPayload()
    payload.studentsStork.bachelor!.rows[0] = createStudentsStorkRow({
      'Kód studijního plánu': 'BI-PG.24'
    })
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'Obor/spec - kód': 'BI-PG.21'
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected mapping success')
    }

    expect(result.draft.committees[0]?.specializationCode).toBe('BI-PG.21')
    const mappedFirstItem = result.draft.committees[0]?.items[0]
    if (!mappedFirstItem || mappedFirstItem.type !== 'STUDENT') {
      throw new Error('Expected mapped student item')
    }

    expect(mappedFirstItem.student.specializationCode).toBe('BI-PG.24')
  })

  it('allows SLOVAK only for thesis language', () => {
    const payload = createValidPayload()
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'Jazyk výuky': 'CZ',
      'VŠKP-typ A: Jazyk práce': 'SL'
    })
    payload.studentsStork.bachelor!.rows[0] = createStudentsStorkRow({
      'VŠKP-typ A: jazyk práce': 'SL'
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected mapping success')
    }

    expect(result.draft.committees[0]?.language).toBe('CZECH')
    const mappedFirstItem = result.draft.committees[0]?.items[0]
    if (!mappedFirstItem || mappedFirstItem.type !== 'STUDENT') {
      throw new Error('Expected mapped student item')
    }

    expect(mappedFirstItem.student.studyLanguage).toBe('CZECH')
    expect(mappedFirstItem.student.thesisLanguage).toBe('SLOVAK')
  })

  it('fails when Slovak appears in study language field', () => {
    const payload = createValidPayload()
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'Jazyk výuky': 'SL'
    })

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'BACHELOR',
      payload
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected mapping failure')
    }

    expect(result.error.code).toBe('INVALID_LANGUAGE')
    expect(result.error.column).toBe('Jazyk výuky')
  })

  it('does not enforce szzType equality check when selected type is MIXED', () => {
    const payload = createValidPayload()
    payload.committees.rows.push(
      createCommitteesRow({
        'Název komise': '242-MI, 6-MI-PI.22'
      })
    )
    payload.studentsStork.master = {
      fileName: 'studenti-stork-mgr.csv',
      headers: [],
      rows: [
        createStudentsStorkRow({
          Jméno: 'Dana',
          Příjmení: 'Modelová',
          'Email studenta': 'dana.modelova@fit.cvut.cz',
          'Studijní plán (název)': 'Mgr. Informatika'
        })
      ]
    }
    payload.studentsCommittees.master = {
      fileName: 'studenti-komise-mgr.csv',
      headers: [],
      rows: [
        createStudentsCommitteesRow({
          'Jméno studenta': 'Dana',
          'Příjmení studenta': 'Modelová',
          'Email adresa': 'dana.modelova@fit.cvut.cz',
          'Komise - název': '242-MI, 6-MI-PI.22',
          'St. program - typ': 'M',
          'St. program - kód': 'MI'
        })
      ]
    }

    const result = mapImportPayloadToDraftSource({
      scheduleName: 'SZZ červen 2025',
      szzType: 'MIXED',
      payload
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected mapping success for MIXED mode')
    }

    expect(result.draft.committees).toHaveLength(2)

    const committeesByName = new Map(result.draft.committees.map((committee) => [committee.name, committee] as const))
    const bachelorCommittee = committeesByName.get('5-BI-PI.21')
    const masterCommittee = committeesByName.get('6-MI-PI.22')

    expect(bachelorCommittee).toBeDefined()
    expect(masterCommittee).toBeDefined()
    if (!bachelorCommittee || !masterCommittee) {
      throw new Error('Expected both bachelor and master committees in mapped draft')
    }

    expect(bachelorCommittee.studyProgramType).toBe('BACHELOR')
    expect(masterCommittee.studyProgramType).toBe('MASTER')
    expect(bachelorCommittee.items).toHaveLength(1)
    expect(masterCommittee.items).toHaveLength(1)

    const bachelorItem = bachelorCommittee.items[0]
    const masterItem = masterCommittee.items[0]
    expect(bachelorItem).toBeDefined()
    expect(masterItem).toBeDefined()
    if (!bachelorItem || !masterItem || bachelorItem.type !== 'STUDENT' || masterItem.type !== 'STUDENT') {
      throw new Error('Expected mapped student items for both committees')
    }

    expect(bachelorItem.student.firstName).toBe('Alex')
    expect(bachelorItem.student.lastName).toBe('Testovací')
    expect(bachelorItem.student.studyProgramType).toBe('BACHELOR')
    expect(masterItem.student.firstName).toBe('Dana')
    expect(masterItem.student.lastName).toBe('Modelová')
    expect(masterItem.student.studyProgramType).toBe('MASTER')
  })
})
