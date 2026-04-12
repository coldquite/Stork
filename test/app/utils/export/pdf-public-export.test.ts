import { describe, expect, it } from 'vitest'
import type { ScheduleDraftCommittee, ScheduleDraftItem, ScheduleDraftInvigilator } from '~/types/schedule-draft'
import {
  buildPdfPublicExportPayload,
  buildPdfPublicFileName,
  buildPdfPublicSections
} from '~/utils/export/pdf-public-export'

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
    thesisLanguage: 'CZECH' | 'ENGLISH' | 'SLOVAK'
    thesisTitleLocal: string
    thesisTitleEn: string
    specializationCode: string
    supervisorName: string
    reviewerName: string
  }>
): ScheduleDraftItem {
  return {
    localId: options.localId ?? 'student-item',
    type: 'STUDENT',
    position: options.position ?? 1,
    student: {
      firstName: options.firstName ?? 'David',
      lastName: options.lastName ?? 'Ampapa',
      email: 'test@example.com',
      titlesBefore: null,
      titlesAfter: null,
      thesisTitleLocal: options.thesisTitleLocal ?? 'Lokální název práce',
      thesisTitleEn: options.thesisTitleEn ?? 'English thesis title',
      thesisLanguage: options.thesisLanguage ?? 'CZECH',
      supervisorName: options.supervisorName ?? 'Ing. Vedoucí',
      reviewerName: options.reviewerName ?? 'Ing. Oponent',
      additionalSupervisorName: null,
      additionalReviewerName: null,
      studyProgramName: 'Informatika',
      studyProgramType: 'BACHELOR',
      specializationName: 'Softwarové inženýrství',
      specializationCode: options.specializationCode ?? 'BI-SI.21',
      studyLanguage: 'CZECH',
      repeatType: 'NONE',
      prepareMinutes: 45,
      examMinutes: 30
    },
    pause: null
  }
}

function createPauseItem(
  options: Partial<{
    localId: string
    position: number
    label: string
    durationMinutes: number
    pauseType: 'BREAK' | 'LUNCH'
  }>
): ScheduleDraftItem {
  return {
    localId: options.localId ?? 'pause-item',
    type: 'PAUSE',
    position: options.position ?? 2,
    student: null,
    pause: {
      label: options.label ?? 'přestávka',
      durationMinutes: options.durationMinutes ?? 20,
      pauseType: options.pauseType ?? 'BREAK'
    }
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
    language: 'CZECH' | 'ENGLISH'
    studyProgramName: string
    studyProgramType: 'BACHELOR' | 'MASTER'
    specializationCode: string
    secretaryName: string | null
    invigilators: ScheduleDraftInvigilator[]
    items: ScheduleDraftItem[]
  }>
): ScheduleDraftCommittee {
  return {
    localId: options.localId ?? 'committee',
    name: options.name ?? '1-BI-SI.21',
    startMinute: options.startMinute ?? 525,
    date: options.date ?? '2025-06-23T00:00:00.000Z',
    room: options.room ?? 'TH:A-1455',
    preparationRoom: options.preparationRoom ?? 'TH:A-1146',
    secretaryName: options.secretaryName ?? 'Ing. Marek Bělohoubek',
    invigilators: options.invigilators ?? [createInvigilator('Ing. Jan Pokorný', 'inv-1')],
    language: options.language ?? 'CZECH',
    studyProgramName: options.studyProgramName ?? 'INFORMATIKA 2021',
    studyProgramType: options.studyProgramType ?? 'BACHELOR',
    specializationName: 'Softwarové inženýrství',
    specializationCode: options.specializationCode ?? 'BI-SI.21',
    chairName: 'prof. Dr. Ing. Petr Kroha, CSc.',
    viceChairName: 'Ing. Zdeněk Rybola, Ph.D.',
    member1Name: 'Ing. Jan Matoušek',
    member2Name: 'Ing. Tomáš Vondra, Ph.D.',
    member3Name: 'Ing. Tomáš Kalvoda, Ph.D.',
    items: options.items ?? []
  }
}

describe('pdf-public-export', () => {
  it('builds localized committee sections and keeps timeline rows including pauses', () => {
    const committees: ScheduleDraftCommittee[] = [
      createCommittee({
        localId: 'committee-cs',
        name: '1-BI-SI.21',
        startMinute: 525,
        date: '2025-06-23T00:00:00.000Z',
        language: 'CZECH',
        items: [
          createStudentItem({
            localId: 'student-a',
            position: 1,
            firstName: 'David',
            lastName: 'Ampapa',
            thesisTitleLocal: 'ETCS - Integrace OpenRails'
          }),
          createPauseItem({
            localId: 'pause-a',
            position: 2,
            label: 'přestávka',
            durationMinutes: 20
          }),
          createStudentItem({
            localId: 'student-b',
            position: 3,
            firstName: 'Jan',
            lastName: 'Boťa',
            thesisLanguage: 'ENGLISH',
            thesisTitleLocal: 'Lokální název',
            thesisTitleEn: 'English title'
          })
        ]
      }),
      createCommittee({
        localId: 'committee-en',
        name: '6-BIE-PI.21',
        startMinute: 830,
        date: '2025-06-23T00:00:00.000Z',
        language: 'ENGLISH',
        studyProgramName: 'INFORMATICS 2021 (in English)',
        specializationCode: 'BIE-PI.21',
        secretaryName: 'Ing. Jaroslav Pešek',
        invigilators: [createInvigilator('Ing. Jan Pokorný', 'inv-2')],
        items: [
          createStudentItem({
            localId: 'student-en',
            position: 1,
            firstName: 'Riku',
            lastName: 'Kawasaki',
            specializationCode: 'BIE-PI.21',
            thesisLanguage: 'ENGLISH',
            thesisTitleEn: 'Robotic Arm'
          })
        ]
      })
    ]

    const sections = buildPdfPublicSections({
      committees,
      fallbackCommitteeLabel: 'Bez názvu'
    })

    expect(sections).toHaveLength(2)

    expect(sections[0]?.language).toBe('CZECH')
    expect(sections[0]?.degreeTitle).toBe('BAKALÁŘSKÉ STÁTNÍ ZÁVĚREČNÉ ZKOUŠKY')
    expect(sections[0]?.semesterLabel).toBe('letní semestr 2024/2025 (červen)')
    expect(sections[0]?.committeeLine).toBe('Komise 1-BI-SI.21')
    expect(sections[0]?.departmentLine).toBe('katedra obhajoby: Katedra softwarového inženýrství')
    expect(sections[0]?.rows).toHaveLength(3)
    expect(sections[0]?.rows[1]).toEqual({
      kind: 'PAUSE',
      pauseLine: 'přestávka (20 minut)'
    })

    const firstStudentRow = sections[0]?.rows[0]
    expect(firstStudentRow?.kind).toBe('STUDENT')
    if (!firstStudentRow || firstStudentRow.kind !== 'STUDENT') {
      throw new Error('Expected first row to be STUDENT')
    }

    expect(firstStudentRow.preparationStartTime).toBe('08:00')
    expect(firstStudentRow.committeeExamRangeTime).toBe('08:45 - 09:15')
    expect(firstStudentRow.studentName).toBe('Ampapa David')

    expect(sections[1]?.language).toBe('ENGLISH')
    expect(sections[1]?.degreeTitle).toBe('BACHELOR STATE FINAL EXAMINATIONS')
    expect(sections[1]?.semesterLabel).toBe('summer semester 2024/2025 (June)')
    expect(sections[1]?.topMetaRoomLine).toBe('classroom TH:A-1455')
    expect(sections[1]?.tableThesisTitleHeader).toBe('Thesis topic')
  })

  it('uses winter semester label and falls back to dash when department is unknown', () => {
    const sections = buildPdfPublicSections({
      committees: [
        createCommittee({
          localId: 'committee-feb',
          date: '2025-02-10T00:00:00.000Z',
          specializationCode: 'UNKNOWN-CODE',
          items: [createStudentItem({ localId: 'student-feb', position: 1, specializationCode: 'UNKNOWN-CODE' })]
        })
      ],
      fallbackCommitteeLabel: 'Bez názvu'
    })

    expect(sections).toHaveLength(1)
    expect(sections[0]?.semesterLabel).toBe('zimní semestr 2024/2025 (únor)')
    expect(sections[0]?.departmentLine).toContain('—')
  })

  it('builds request payload with static document header title', () => {
    const payload = buildPdfPublicExportPayload({
      draftName: 'SZZ test',
      committees: [createCommittee({ localId: 'committee-1', items: [createStudentItem({ localId: 'student-1' })] })],
      fallbackCommitteeLabel: 'Bez názvu'
    })

    expect(payload.draftName).toBe('SZZ test')
    expect(payload.documentHeaderTitle).toBe('PLÁN KONÁNÍ STÁTNÍCH ZÁVĚREČNÝCH ZKOUŠEK')
    expect(payload.sections).toHaveLength(1)
  })

  it('builds file name with timestamp and Časový plán SZZ prefix', () => {
    const fixedNow = new Date('2026-04-11T10:20:30.000Z')
    const fileName = buildPdfPublicFileName('Název plánu', fixedNow)

    expect(fileName).toBe('Časový plán SZZ_Název plánu_11.04.2026_12-20-30.pdf')
  })
})
