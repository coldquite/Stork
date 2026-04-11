import { describe, expect, it } from 'vitest'
import type { ScheduleDraftCommittee, ScheduleDraftItem, ScheduleDraftInvigilator } from '~/types/schedule-draft'
import {
  buildPdfInvigilatorsExportPayload,
  buildPdfInvigilatorsFileName,
  buildPdfInvigilatorsSections
} from '~/utils/export/pdf-invigilators-export'

function createInvigilator(name: string, localId: string): ScheduleDraftInvigilator {
  return {
    localId,
    name
  }
}

function createStudentItem(
  options: Partial<{
    localId: string
    position: number
    firstName: string
    lastName: string
    titlesBefore: string | null
    titlesAfter: string | null
    thesisLanguage: 'CZECH' | 'ENGLISH' | 'SLOVAK'
    thesisTitleLocal: string
    thesisTitleEn: string
    repeatType: 'NONE' | 'THESIS_DEFENSE' | 'ORAL_EXAM' | 'BOTH' | 'UNKNOWN'
    prepareMinutes: number
    examMinutes: number
  }>
): ScheduleDraftItem {
  return {
    localId: options.localId ?? 'student-item',
    type: 'STUDENT',
    position: options.position ?? 1,
    student: {
      firstName: options.firstName ?? 'Jan',
      lastName: options.lastName ?? 'Novák',
      email: 'test@example.com',
      titlesBefore: options.titlesBefore ?? null,
      titlesAfter: options.titlesAfter ?? null,
      thesisTitleLocal: options.thesisTitleLocal ?? 'Lokální název práce',
      thesisTitleEn: options.thesisTitleEn ?? 'English thesis title',
      thesisLanguage: options.thesisLanguage ?? 'CZECH',
      supervisorName: 'Vedoucí',
      reviewerName: 'Oponent',
      additionalSupervisorName: null,
      additionalReviewerName: null,
      studyProgramName: 'Informatika',
      studyProgramType: 'BACHELOR',
      specializationName: 'Softwarové inženýrství',
      specializationCode: 'BI-SI.21',
      studyLanguage: 'CZECH',
      repeatType: options.repeatType ?? 'NONE',
      prepareMinutes: options.prepareMinutes ?? 45,
      examMinutes: options.examMinutes ?? 30
    },
    pause: null
  }
}

function createCommittee(
  options: Partial<{
    localId: string
    name: string
    startMinute: number
    date: string
    room: string | null
    preparationRoom: string | null
    invigilators: ScheduleDraftInvigilator[]
    items: ScheduleDraftItem[]
  }>
): ScheduleDraftCommittee {
  return {
    localId: options.localId ?? 'committee',
    name: options.name ?? 'Komise 1',
    startMinute: options.startMinute ?? 540,
    date: options.date ?? '2025-08-28T00:00:00.000Z',
    room: options.room ?? 'TH:A-1500',
    preparationRoom: options.preparationRoom ?? null,
    secretaryName: null,
    invigilators: options.invigilators ?? [],
    language: 'CZECH',
    studyProgramName: 'Informatika',
    studyProgramType: 'BACHELOR',
    specializationName: 'Softwarové inženýrství',
    specializationCode: 'BI-SI.21',
    chairName: 'Předseda',
    viceChairName: 'Místopředseda',
    member1Name: 'Člen 1',
    member2Name: 'Člen 2',
    member3Name: 'Člen 3',
    items: options.items ?? []
  }
}

const repeatLabels = {
  NONE: 'Neopakuje',
  THESIS_DEFENSE: 'Opakuje obhajobu',
  ORAL_EXAM: 'Opakuje zkoušku',
  BOTH: 'Opakuje zkoušku i obhajobu',
  UNKNOWN: 'Neznámý stav'
} as const

describe('pdf-invigilators-export', () => {
  it('builds day+preparation room sections, keeps committee room in rows and sorts students by prepare start time', () => {
    const committees: ScheduleDraftCommittee[] = [
      createCommittee({
        localId: 'committee-1',
        name: 'Komise A',
        startMinute: 540,
        date: '2025-08-28T00:00:00.000Z',
        room: 'TH:A-1500',
        preparationRoom: 'TH:PR-200',
        invigilators: [createInvigilator('Jan Novák', 'inv-1'), createInvigilator('Petr Svoboda', 'inv-2')],
        items: [
          createStudentItem({
            localId: 'student-a',
            position: 1,
            firstName: 'Adam',
            lastName: 'Procházka',
            titlesBefore: 'Ing.',
            titlesAfter: 'Ph.D.',
            prepareMinutes: 45,
            examMinutes: 30
          }),
          createStudentItem({
            localId: 'student-b',
            position: 2,
            firstName: 'Eliška',
            lastName: 'Dvořáková',
            titlesBefore: null,
            titlesAfter: null,
            thesisLanguage: 'ENGLISH',
            thesisTitleLocal: 'Lokální B',
            thesisTitleEn: 'English B',
            repeatType: 'THESIS_DEFENSE',
            prepareMinutes: 20,
            examMinutes: 20
          })
        ]
      }),
      createCommittee({
        localId: 'committee-2',
        name: '   ',
        startMinute: 525,
        date: '2025-08-28T00:00:00.000Z',
        room: 'TH:A-1600',
        preparationRoom: 'TH:PR-200',
        invigilators: [createInvigilator('jan novák', 'inv-3'), createInvigilator('Eva Dvořáková', 'inv-4')],
        items: [
          createStudentItem({
            localId: 'student-c',
            position: 1,
            firstName: 'Marek',
            lastName: 'Kříž',
            thesisLanguage: 'ENGLISH',
            thesisTitleLocal: 'Lokální C',
            thesisTitleEn: 'English C',
            repeatType: 'ORAL_EXAM',
            prepareMinutes: 45,
            examMinutes: 30
          })
        ]
      }),
      createCommittee({
        localId: 'committee-3',
        name: 'Komise B',
        startMinute: 600,
        date: '2025-08-28T00:00:00.000Z',
        room: 'TH:A-2000',
        preparationRoom: null,
        invigilators: [],
        items: [createStudentItem({ localId: 'student-d', position: 1, firstName: 'Zuzana', lastName: 'Hájková' })]
      }),
      createCommittee({
        localId: 'committee-4',
        name: 'Komise C',
        startMinute: 540,
        date: '2025-08-29T00:00:00.000Z',
        room: 'TH:A-1500',
        preparationRoom: null,
        invigilators: [],
        items: []
      })
    ]

    const sections = buildPdfInvigilatorsSections({
      committees,
      fallbackCommitteeLabel: 'Bez názvu',
      repeatTypeLabelResolver: (repeatType) => repeatLabels[repeatType]
    })

    expect(sections).toHaveLength(3)
    expect(sections[0]?.dayLabel).toBe('ČTVRTEK 28. 8. 2025')
    expect(sections[0]?.roomLabel).toBe('TH:PR-200')
    expect(sections[0]?.invigilatorsLabel).toBe('jan novák, Eva Dvořáková, Petr Svoboda')
    expect(sections[0]?.students.map((student) => student.prepareStartTime)).toEqual(['08:00', '08:15', '09:20'])
    expect(sections[0]?.students[0]?.committeeExamRangeTime).toBe('08:45 - 09:15')
    expect(sections[0]?.students[0]?.committeeLabel).toBe('Bez názvu')
    expect(sections[0]?.students[0]?.roomLabel).toBe('TH:A-1600')
    expect(sections[0]?.students[1]?.roomLabel).toBe('TH:A-1500')
    expect(sections[0]?.students[1]?.studentName).toBe('Ing. Adam Procházka, Ph.D.')
    expect(sections[0]?.students[2]?.thesisTitle).toBe('English B')
    expect(sections[0]?.students[2]?.repeatLabel).toBe('Opakuje obhajobu')

    expect(sections[1]?.roomLabel).toBe('—')
    expect(sections[1]?.invigilatorsLabel).toBe('—')
    expect(sections[2]?.dayLabel).toBe('PÁTEK 29. 8. 2025')
    expect(sections[2]?.roomLabel).toBe('—')
  })

  it('builds request payload using computed sections', () => {
    const payload = buildPdfInvigilatorsExportPayload({
      draftName: 'SZZ test',
      committees: [
        createCommittee({
          localId: 'committee-1',
          items: [createStudentItem({ localId: 'student-a', position: 1 })]
        })
      ],
      fallbackCommitteeLabel: 'Bez názvu',
      repeatTypeLabelResolver: (repeatType) => repeatLabels[repeatType]
    })

    expect(payload.draftName).toBe('SZZ test')
    expect(payload.sections).toHaveLength(1)
    expect(payload.sections[0]?.students).toHaveLength(1)
  })

  it('builds file name with czech timestamp and Dozor prefix', () => {
    const fixedNow = new Date('2026-04-11T10:20:30.000Z')
    const fileName = buildPdfInvigilatorsFileName('Název plánu', fixedNow)

    expect(fileName).toBe('Dozor_Název plánu_11.04.2026_12-20-30.pdf')
  })
})
