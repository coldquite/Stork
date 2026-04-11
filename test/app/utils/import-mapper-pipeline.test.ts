import { describe, expect, it } from 'vitest'
import type { ImportPayload } from '~/types/import'
import { ImportMappingFailure } from '~/utils/import-mapper/core/errors'
import { collectDatasets } from '~/utils/import-mapper/pipeline/collect-datasets'
import { finalizeDraft } from '~/utils/import-mapper/pipeline/finalize-draft'
import { mapCommittees } from '~/utils/import-mapper/pipeline/map-committees'
import { mapStudent } from '~/utils/import-mapper/pipeline/map-student'
import { matchStudents } from '~/utils/import-mapper/pipeline/match-students'

function createPipelinePayload(): ImportPayload {
  return {
    committees: {
      fileName: 'komise.csv',
      headers: [],
      rows: [
        {
          'Název komise': '242-BI, 5-BI-PI.21',
          'Název studijního programu': 'Informatika',
          'Název oboru/specializace': 'Počítačové inženýrství',
          Kat: '13139',
          Datum: '23.06.2026',
          Místo: 'TH:A-1435',
          Správce: 'Ing. Sekretář'
        }
      ]
    },
    studentsStork: {
      bachelor: {
        fileName: 'students-stork-bc.csv',
        headers: [],
        rows: [
          {
            'Email studenta': 'jan.student@fit.cvut.cz',
            Jméno: 'Jan',
            Příjmení: 'Student',
            Titul: '',
            'titul za': '',
            'Studijní plán (název)': 'Bc. Informatika',
            'Studijní program (název)': 'Informatika',
            'Obor/spec - název': 'Počítačové inženýrství',
            'Kód studijního plánu': 'BI-PI.21',
            'VŠKP-typ A: Název práce': 'Návrh systému',
            'VŠKP-typ A: Překlad názvu práce': 'System Design',
            'VŠKP-typ A: jazyk práce': 'CZ',
            'VŠKP-typ A: Vedoucí práce 1': 'Ing. Vedoucí',
            'VŠKP-typ A: Vedoucí práce 2': '',
            'VŠKP-typ A: Oponent práce 1': 'Ing. Oponent',
            'VŠKP-typ A: Oponent práce 2': ''
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
            'Komise - název': '5-BI-PI.21',
            'St. program - název': 'Informatika',
            'St. program - typ': 'B',
            'Obor/spec - název': 'Počítačové inženýrství',
            'Obor/spec - kód': 'BI-PI.21',
            'Jazyk výuky': 'CZ',
            'VŠKP-typ A: Katedra obhajoby - kod': '13139',
            'VŠKP-typ A: Katedra obhajoby - název': 'Katedra software engineeringu',
            'Komise - předseda': 'Doc. Předseda',
            'Komise - místopředseda': 'Ing. Místopředseda',
            'Komise - člen 1': 'Ing. Člen 1',
            'Komise - člen 2': 'Ing. Člen 2',
            'Komise - člen 3': 'Ing. Člen 3',
            'Email adresa': 'jan.student@fit.cvut.cz',
            'Jméno studenta': 'Jan',
            'Příjmení studenta': 'Student',
            'VŠKP-typ A: Český název práce': 'Návrh systému',
            'VŠKP-typ A: Anglický název práce': 'System Design',
            'VŠKP-typ A: Jazyk práce': 'CZ',
            'VŠKP-typ A: Vedoucí práce 1': 'Ing. Vedoucí',
            'VŠKP-typ A: Vedoucí práce 2': '',
            'VŠKP-typ A: Oponent práce 1': 'Ing. Oponent',
            'VŠKP-typ A: Oponent práce 2': '',
            'VŠKP-typ A: Datum obhajoby': '',
            'Předmět 1 - 1.term. datum': '',
            'Předmět 1 - 1.term. hodnocení': '',
            'Předmět 1 - 2.term. datum': ''
          }
        ]
      }
    }
  }
}

describe('import mapper pipeline modules', () => {
  it('collectDatasets throws MISSING_DATASET when required input file is absent', () => {
    const payload = createPipelinePayload()
    delete payload.studentsCommittees.bachelor

    try {
      collectDatasets(payload, 'BACHELOR')
      throw new Error('Expected mapping failure')
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ImportMappingFailure)
      const mappingError = (error as ImportMappingFailure).mappingError
      expect(mappingError.code).toBe('MISSING_DATASET')
      expect(mappingError.datasetKey).toBe('studentsCommittees')
    }
  })

  it('maps one-student import end-to-end through pipeline steps', () => {
    const payload = createPipelinePayload()
    const datasets = collectDatasets(payload, 'BACHELOR')
    const committeesMapping = mapCommittees('BACHELOR', payload.committees, datasets.studentsCommitteesRows)
    const matchedStudents = matchStudents(datasets.studentsStorkRows, datasets.studentsCommitteesRows)
    const mappedStudents = matchedStudents.map((matchedRows) =>
      mapStudent({
        szzType: 'BACHELOR',
        committeesByName: committeesMapping.committeesByName,
        matchedRows
      })
    )
    const draft = finalizeDraft({
      scheduleName: '  SZZ červen 2026  ',
      committees: committeesMapping.committees,
      mappedStudents
    })

    expect(draft.name).toBe('SZZ červen 2026')
    expect(draft.committees).toHaveLength(1)
    expect(draft.committees[0]?.name).toBe('5-BI-PI.21')
    expect(draft.committees[0]?.items).toHaveLength(1)

    const student = draft.committees[0]?.items[0]?.student
    expect(student?.email).toBe('jan.student@fit.cvut.cz')
    expect(student?.firstName).toBe('Jan')
    expect(student?.lastName).toBe('Student')
    expect(student?.studyProgramType).toBe('BACHELOR')
    expect(student?.repeatType).toBe('NONE')
    expect(student?.prepareMinutes).toBe(45)
    expect(student?.examMinutes).toBe(30)
  })

  it('mapCommittees ignores legacy defense department columns and still maps committee', () => {
    const payload = createPipelinePayload()
    payload.committees.rows[0] = {
      ...payload.committees.rows[0],
      Kat: ''
    }
    payload.studentsCommittees.bachelor!.rows[0] = {
      ...payload.studentsCommittees.bachelor!.rows[0],
      'VŠKP-typ A: Katedra obhajoby - kod': ''
    }

    const datasets = collectDatasets(payload, 'BACHELOR')
    const committeesMapping = mapCommittees('BACHELOR', payload.committees, datasets.studentsCommitteesRows)

    expect(committeesMapping.committees).toHaveLength(1)
    expect(committeesMapping.committees[0]?.name).toBe('5-BI-PI.21')
    expect(committeesMapping.committees[0]).not.toHaveProperty('defenseDepartmentCode')
    expect(committeesMapping.committees[0]).not.toHaveProperty('defenseDepartmentName')
  })
})
