import { describe, expect, it } from 'vitest'
import type { ScheduleDraftCommittee, ScheduleDraftItem } from '~/types/schedule-draft'
import type { QuestionsEnvelopeCsvEnumLabelResolver } from '~/utils/editor/questions-envelope-csv-enums'
import {
  addUtf8Bom,
  buildQuestionsEnvelopeCsvFileName,
  buildQuestionsEnvelopeCsvRows,
  QuestionsEnvelopeCsvDepartmentMappingError,
  serializeQuestionsEnvelopeCsv
} from '~/utils/editor/questions-envelope-csv-export'

const enumLabelResolver: QuestionsEnvelopeCsvEnumLabelResolver = {
  resolveStudyProgramTypeLabel(value) {
    if (value === 'BACHELOR') {
      return 'Bakalářský'
    }

    return 'Magisterský'
  },
  resolveThesisLanguageLabel(value) {
    if (value === 'CZECH') {
      return 'Čeština'
    }

    if (value === 'ENGLISH') {
      return 'Angličtina'
    }

    return 'Slovenština'
  },
  resolveRepeatTypeLabel(value) {
    if (value === 'NONE') {
      return 'Neopakuje'
    }

    if (value === 'THESIS_DEFENSE') {
      return 'Opakuje obhajobu'
    }

    if (value === 'ORAL_EXAM') {
      return 'Opakuje zkoušku'
    }

    if (value === 'BOTH') {
      return 'Opakuje zkoušku i obhajobu'
    }

    return 'Neznámý stav'
  }
}

function createStudentItem(
  localId: string,
  position: number,
  overrides: Partial<NonNullable<ScheduleDraftItem['student']>> = {}
): ScheduleDraftItem {
  return {
    localId,
    type: 'STUDENT',
    position,
    student: {
      firstName: 'Jan',
      lastName: 'Novák',
      email: 'jan.novak@fit.cvut.cz',
      titlesBefore: 'Bc.',
      titlesAfter: null,
      thesisTitleLocal: 'Lokální název',
      thesisTitleEn: 'Translated title',
      thesisLanguage: 'CZECH',
      supervisorName: 'Vedoucí 1',
      reviewerName: 'Oponent 1',
      additionalSupervisorName: null,
      additionalReviewerName: null,
      studyProgramName: 'Informatika',
      studyProgramType: 'BACHELOR',
      specializationName: 'Softwarové inženýrství',
      specializationCode: 'BI-SI.21',
      studyLanguage: 'CZECH',
      repeatType: 'NONE',
      prepareMinutes: 45,
      examMinutes: 30,
      ...overrides
    },
    pause: null
  }
}

function createPauseItem(localId: string, position: number): ScheduleDraftItem {
  return {
    localId,
    type: 'PAUSE',
    position,
    student: null,
    pause: {
      label: 'Přestávka',
      pauseType: 'BREAK',
      durationMinutes: 15
    }
  }
}

function createCommittee(
  localId: string,
  name: string,
  date: string,
  items: ScheduleDraftItem[]
): ScheduleDraftCommittee {
  return {
    localId,
    name,
    startMinute: 525,
    date,
    room: 'TH:A-1435',
    secretaryName: 'Sekretář',
    invigilators: [],
    language: 'CZECH',
    studyProgramName: 'Informatika',
    studyProgramType: 'BACHELOR',
    specializationName: 'Softwarové inženýrství',
    specializationCode: 'BI-SI.21',
    defenseDepartmentCode: '18102',
    defenseDepartmentName: 'KSI',
    chairName: 'Předseda',
    viceChairName: 'Místopředseda',
    member1Name: 'Člen 1',
    member2Name: 'Člen 2',
    member3Name: 'Člen 3',
    items
  }
}

describe('questions-envelope-csv-export', () => {
  it('builds one CSV row per student and keeps student order within committee', () => {
    const committee = createCommittee('committee-a', '1-BI-SI.21', '2026-06-23T00:00:00.000Z', [
      createStudentItem('student-1', 1, {
        firstName: 'Adam',
        lastName: 'Novotný',
        repeatType: 'THESIS_DEFENSE'
      }),
      createPauseItem('pause-1', 2),
      createStudentItem('student-2', 3, {
        firstName: 'Eva',
        lastName: 'Svobodová',
        email: null,
        studyProgramType: 'MASTER',
        thesisLanguage: 'ENGLISH',
        additionalSupervisorName: 'Vedoucí 2',
        additionalReviewerName: 'Oponent 2',
        repeatType: 'ORAL_EXAM'
      })
    ])

    const rows = buildQuestionsEnvelopeCsvRows({
      committees: [committee],
      fallbackCommitteeLabel: 'Bez názvu',
      enumLabelResolver
    })

    expect(rows).toHaveLength(2)
    expect(rows[0]?.Pořadí).toBe('1')
    expect(rows[1]?.Pořadí).toBe('2')
    expect(rows[0]?.Komise).toBe('1-BI-SI.21')
    expect(rows[0]?.['Datum konání komise']).toBe('23.06.2026')
    expect(rows[0]?.['Typ studijního plánu']).toBe('Bakalářský')
    expect(rows[0]?.['Jazyk práce']).toBe('Čeština')
    expect(rows[0]?.Opakování).toBe('Opakuje obhajobu')
    expect(rows[1]?.['Typ studijního plánu']).toBe('Magisterský')
    expect(rows[1]?.['Jazyk práce']).toBe('Angličtina')
    expect(rows[1]?.Opakování).toBe('Opakuje zkoušku')
    expect(rows[1]?.Email).toBe('')
    expect(rows[1]?.['Vedoucí práce 2']).toBe('Vedoucí 2')
    expect(rows[1]?.['Oponent práce 2']).toBe('Oponent 2')
    expect(rows[0]?.['Katedra studenta (název)']).toBe('Katedra softwarového inženýrství')
    expect(rows[0]?.['Katedra studenta (kód)']).toBe('18102')
  })

  it('serializes CSV with semicolon delimiter and keeps header row for empty exports', () => {
    const csv = serializeQuestionsEnvelopeCsv([])

    expect(csv).toBe(
      'Příjmení;Jméno;Titul;Titul za;Email;Typ studijního plánu;Název studijního plánu;Název specializace;Kód studijního plánu;Katedra studenta (název);Katedra studenta (kód);Jazyk práce;Název práce;Překlad názvu práce;Vedoucí práce 1;Vedoucí práce 2;Oponent práce 1;Oponent práce 2;Opakování;Komise;Datum konání komise;Pořadí'
    )
  })

  it('throws with all problematic students when student specialization cannot be mapped to department', () => {
    const committee = createCommittee('committee-a', '1-BI-SI.21', '2026-06-23T00:00:00.000Z', [
      createStudentItem('student-1', 1, { firstName: 'Adam', lastName: 'Novotný', specializationCode: 'UNKNOWN-1' }),
      createPauseItem('pause-1', 2),
      createStudentItem('student-2', 3, { firstName: 'Eva', lastName: 'Svobodová', specializationCode: 'UNKNOWN-2' })
    ])

    expect(() =>
      buildQuestionsEnvelopeCsvRows({
        committees: [committee],
        fallbackCommitteeLabel: 'Bez názvu',
        enumLabelResolver
      })
    ).toThrow(QuestionsEnvelopeCsvDepartmentMappingError)

    try {
      buildQuestionsEnvelopeCsvRows({
        committees: [committee],
        fallbackCommitteeLabel: 'Bez názvu',
        enumLabelResolver
      })
      throw new Error('Expected QuestionsEnvelopeCsvDepartmentMappingError')
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(QuestionsEnvelopeCsvDepartmentMappingError)
      if (!(error instanceof QuestionsEnvelopeCsvDepartmentMappingError)) {
        return
      }

      expect(error.issues).toHaveLength(2)
      expect(error.issues.map((issue) => issue.studentFullName)).toEqual(['Novotný Adam', 'Svobodová Eva'])
      expect(error.issues.map((issue) => issue.specializationCode)).toEqual(['UNKNOWN-1', 'UNKNOWN-2'])
      expect(error.issues.every((issue) => issue.committeeLabel === '1-BI-SI.21')).toBe(true)
    }
  })

  it('adds UTF-8 BOM at the beginning of the CSV content', () => {
    expect(addUtf8Bom('A;B')).toBe('\uFEFFA;B')
  })

  it('builds file names from draft name and Czech-local timestamp', () => {
    const fixedNow = new Date('2026-04-11T10:20:30.000Z')
    expect(buildQuestionsEnvelopeCsvFileName(' SZZ / Test : plán ', fixedNow)).toBe(
      'SZZ - Test - plán_11.04.2026_12-20-30.csv'
    )
    expect(buildQuestionsEnvelopeCsvFileName('   ', fixedNow)).toBe('Export_11.04.2026_12-20-30.csv')
  })
})
