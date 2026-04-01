import { describe, expect, it } from 'vitest'
import { mapImportPayloadToDraftSource } from '~/utils/import-mapper'
import type { ImportPayload } from '~/types/import'

function createCommitteesRow(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    'Název komise': '242-BI, 5-BI-PI.21',
    'Název studijního programu': 'Informatika',
    'Název oboru/specializace': 'Softwarové inženýrství 2021',
    Správce: 'Bc. Sekretářka',
    Kat: 'KSI',
    Datum: '23.06.2025',
    Místo: 'TH:A-1435',
    ...overrides
  }
}

function createStudentsCommitteesRow(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    'Jméno studenta': 'Jan',
    'Příjmení studenta': 'Novák',
    'Email adresa': 'jan.novak@fit.cvut.cz',
    'Jazyk výuky': 'CZ',
    'Komise - název': '242-BI, 5-BI-PI.21',
    'Osobní číslo': 'A24B0001P',
    'VŠKP-typ A: Anglický název práce': 'Smart Scheduler',
    'VŠKP-typ A: Český název práce': 'Chytrý plánovač',
    'VŠKP-typ A: Jazyk práce': 'CZ',
    'VŠKP-typ A: Vedoucí práce 1': 'Ing. Vedoucí',
    'VŠKP-typ A: Vedoucí práce 2': '',
    'VŠKP-typ A: Oponent práce 1': 'Ing. Oponent',
    'VŠKP-typ A: Oponent práce 2': '',
    'Komise - předseda': 'doc. Předseda',
    'Komise - místopředseda': 'doc. Místopředseda',
    'Komise - člen 1': 'Člen 1',
    'Komise - člen 2': 'Člen 2',
    'Komise - člen 3': 'Člen 3',
    'VŠKP-typ A: Katedra obhajoby - kod': 'KSI',
    'VŠKP-typ A: Katedra obhajoby - název': 'Katedra softwarového inženýrství',
    'Obor/spec - kód': 'BI-SI.21',
    'Obor/spec - název': 'Softwarové inženýrství 2021',
    'St. program - kód': 'BI',
    'St. program - název': 'Informatika',
    'St. program - typ': 'B',
    'VŠKP-typ A: Datum obhajoby': '',
    'Předmět 1 - 1.term. datum': '',
    'Předmět 1 - 2.term. datum': '',
    ...overrides
  }
}

function createStudentsCapRow(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    Příjmení: 'Novák',
    Jméno: 'Jan',
    Titul: 'Bc.',
    'titul za': '',
    'Kód studijního plánu': 'BI-SI.21',
    'VŠKP-typ A: Název práce': 'Chytrý plánovač',
    'VŠKP-typ A: Vedoucí práce 1': 'Ing. Vedoucí',
    'VŠKP-typ A: Oponent práce 1': 'Ing. Oponent',
    'VŠKP-typ A: Datum obhajoby': '',
    'Email studenta': 'jan.novak@fit.cvut.cz',
    'Studijní program (název)': 'Informatika',
    'Obor/spec - název': 'Softwarové inženýrství 2021',
    'Studijní plán (název)': 'Bc. Informatika',
    'Katedra studenta (název)': 'Katedra softwarového inženýrství',
    'Katedra studenta (kód)': 'KSI',
    'VŠKP-typ A: jazyk práce': 'CZ',
    'VŠKP-typ A: Překlad názvu práce': 'Smart Scheduler',
    'VŠKP-typ A: Termín odevzdání práce': '23.06.2025',
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
    studentsCap: {
      bachelor: {
        fileName: 'studenti-cap-bc.csv',
        headers: [],
        rows: [createStudentsCapRow()]
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

    expect(mappedFirstItem.student.studyLanguage).toBe('CZECH')
  })

  it('preprocesses students-committees academic names before matching and mapping', () => {
    const payload = createValidPayload()
    payload.studentsCap.bachelor!.rows[0] = createStudentsCapRow({
      'VŠKP-typ A: Vedoucí práce 1': 'Ing. Matej Hulák',
      'VŠKP-typ A: Oponent práce 1': 'Ing. Pavel Oponent'
    })
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'VŠKP-typ A: Vedoucí práce 1': 'Hulák Matej, Ing.',
      'VŠKP-typ A: Vedoucí práce 2': 'Skrbek Miroslav, Ing., Ph.D.',
      'VŠKP-typ A: Oponent práce 1': 'Oponent Pavel, Ing.',
      'VŠKP-typ A: Oponent práce 2': 'Oponent Druhý, Mgr., Ph.D.',
      'Komise - předseda': 'Předseda Petr, doc.',
      'Komise - místopředseda': 'Místopředseda Martin, Ing., Ph.D.',
      'Komise - člen 1': 'Člen Alice, Mgr.',
      'Komise - člen 2': 'Člen Bob, Ing.',
      'Komise - člen 3': 'Člen Carol, Ph.D.'
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

    const mappedCommittee = result.draft.committees[0]
    if (!mappedCommittee) {
      throw new Error('Expected mapped committee')
    }

    expect(mappedCommittee.chairName).toBe('doc. Petr Předseda')
    expect(mappedCommittee.viceChairName).toBe('Ing. Martin Místopředseda, Ph.D.')
    expect(mappedCommittee.member1Name).toBe('Mgr. Alice Člen')
    expect(mappedCommittee.member2Name).toBe('Ing. Bob Člen')
    expect(mappedCommittee.member3Name).toBe('Carol Člen, Ph.D.')

    const mappedFirstItem = mappedCommittee.items[0]
    if (!mappedFirstItem || mappedFirstItem.type !== 'STUDENT') {
      throw new Error('Expected mapped student item')
    }

    expect(mappedFirstItem.student.supervisorName).toBe('Ing. Matej Hulák')
    expect(mappedFirstItem.student.reviewerName).toBe('Ing. Pavel Oponent')
    expect(mappedFirstItem.student.additionalSupervisorName).toBe('Ing. Miroslav Skrbek, Ph.D.')
    expect(mappedFirstItem.student.additionalReviewerName).toBe('Mgr. Druhý Oponent, Ph.D.')
  })

  it('matches supervisor names when CAP omits comma before post-nominal title', () => {
    const payload = createValidPayload()
    payload.studentsCap.bachelor!.rows[0] = createStudentsCapRow({
      'VŠKP-typ A: Vedoucí práce 1': 'Ing. Michal Valenta Ph.D.',
      'VŠKP-typ A: Oponent práce 1': 'Ing. Pavel Oponent'
    })
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'VŠKP-typ A: Vedoucí práce 1': 'Valenta Michal, Ing., Ph.D',
      'VŠKP-typ A: Oponent práce 1': 'Oponent Pavel, Ing.'
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

    expect(mappedFirstItem.student.supervisorName).toBe('Ing. Michal Valenta, Ph.D.')
  })

  it('matches reviewer names when CAP uses comma after "et" between post-nominal titles', () => {
    const payload = createValidPayload()
    payload.studentsCap.bachelor!.rows[0] = createStudentsCapRow({
      'VŠKP-typ A: Oponent práce 1': 'Ing. Marek Suchánek Ph.D. et, Ph.D.'
    })
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'VŠKP-typ A: Oponent práce 1': 'Suchánek Marek, Ing., Ph.D. et Ph.D.'
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

    expect(mappedFirstItem.student.reviewerName).toBe('Ing. Marek Suchánek, Ph.D. et Ph.D.')
  })

  it('matches reviewer names when M.A. appears after name in CAP and after comma in studenti-komise', () => {
    const payload = createValidPayload()
    payload.studentsCap.bachelor!.rows[0] = createStudentsCapRow({
      'VŠKP-typ A: Oponent práce 1': 'Milan Kolar M.A.'
    })
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'VŠKP-typ A: Oponent práce 1': 'Kolar Milan, M.A.'
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

    expect(mappedFirstItem.student.reviewerName).toBe('Milan Kolar, M.A.')
  })

  it('matches reviewer names with reordered multi-part surname tokens', () => {
    const payload = createValidPayload()
    payload.studentsCap.bachelor!.rows[0] = createStudentsCapRow({
      'VŠKP-typ A: Oponent práce 1': 'Dr. rer. nat. Rodrigo Augusto Da Silva Alves'
    })
    payload.studentsCommittees.bachelor!.rows[0] = createStudentsCommitteesRow({
      'VŠKP-typ A: Oponent práce 1': 'Silva Alves Rodrigo Augusto Da, Dr. rer. nat.'
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

    expect(mappedFirstItem.student.reviewerName).toBe('Dr. rer. nat. Rodrigo Augusto Da Silva Alves')
  })

  it('does not fail when defense department code and name are empty in studenti-komise', () => {
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

    expect(result.draft.committees[0]?.defenseDepartmentCode).toBe('KSI')
    expect(result.draft.committees[0]?.defenseDepartmentName).toBe('')
  })

  it('returns MISSING_DATASET with correct datasetKey when required file is missing', () => {
    const payload = createValidPayload()
    payload.studentsCap.bachelor = undefined

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
    expect(result.error.datasetKey).toBe('studentsCap')
    expect(result.error.context.level).toBe('bachelor')
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

  it('fails when one studenti-CAP row matches multiple studenti-komise rows', () => {
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
    payload.studentsCap.bachelor!.rows[0] = createStudentsCapRow({
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
    payload.studentsCap.bachelor!.rows[0] = createStudentsCapRow({
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
    payload.studentsCap.bachelor!.rows[0] = createStudentsCapRow({
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
    payload.studentsCap.bachelor!.rows[0] = createStudentsCapRow({
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

  it('ignores trailing dot and version digits in specializationCode comparison', () => {
    const payload = createValidPayload()
    payload.studentsCap.bachelor!.rows[0] = createStudentsCapRow({
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
    payload.studentsCap.bachelor!.rows[0] = createStudentsCapRow({
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
    payload.studentsCap.master = {
      fileName: 'studenti-cap-mgr.csv',
      headers: [],
      rows: [
        createStudentsCapRow({
          Jméno: 'Eva',
          Příjmení: 'Svobodová',
          'Email studenta': 'eva.svobodova@fit.cvut.cz',
          'Studijní plán (název)': 'Mgr. Informatika'
        })
      ]
    }
    payload.studentsCommittees.master = {
      fileName: 'studenti-komise-mgr.csv',
      headers: [],
      rows: [
        createStudentsCommitteesRow({
          'Jméno studenta': 'Eva',
          'Příjmení studenta': 'Svobodová',
          'Email adresa': 'eva.svobodova@fit.cvut.cz',
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
  })
})
