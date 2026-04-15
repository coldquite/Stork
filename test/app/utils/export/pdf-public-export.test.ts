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
    additionalSupervisorName: string | null
    additionalReviewerName: string | null
    titlesBefore: string | null
    titlesAfter: string | null
    repeatType: 'NONE' | 'THESIS_DEFENSE' | 'ORAL_EXAM' | 'BOTH' | 'UNKNOWN'
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
      titlesBefore: options.titlesBefore ?? null,
      titlesAfter: options.titlesAfter ?? null,
      thesisTitleLocal: options.thesisTitleLocal ?? 'Lokální název práce',
      thesisTitleEn: options.thesisTitleEn ?? 'English thesis title',
      thesisLanguage: options.thesisLanguage ?? 'CZECH',
      supervisorName: options.supervisorName ?? 'Ing. Vedoucí',
      reviewerName: options.reviewerName ?? 'Ing. Oponent',
      additionalSupervisorName: options.additionalSupervisorName ?? null,
      additionalReviewerName: options.additionalReviewerName ?? null,
      studyProgramName: 'Informatika',
      studyProgramType: 'BACHELOR',
      specializationName: 'Softwarové inženýrství',
      specializationCode: options.specializationCode ?? 'BI-SI.21',
      studyLanguage: 'CZECH',
      repeatType: options.repeatType ?? 'NONE',
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
            titlesBefore: 'Bc.',
            titlesAfter: 'DiS.',
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
    expect(sections[0]?.committeeDateIso).toBe('2025-06-23T00:00:00.000Z')
    expect(sections[0]?.committeeRoomValue).toBe('TH:A-1455')
    expect(sections[0]?.degreeTitle).toBe('BAKALÁŘSKÉ STÁTNÍ ZÁVĚREČNÉ ZKOUŠKY')
    expect(sections[0]?.semesterLabel).toBe('Letní semestr 2024/2025 (červen)')
    expect(sections[0]?.committeeLine).toBe('Komise 1-BI-SI.21')
    expect(sections[0]?.departmentLine).toBe('Katedra obhajoby: Katedra softwarového inženýrství')
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
    expect(firstStudentRow.committeeExamRangeTime).toBe('08:45–09:15')
    expect(firstStudentRow.studentName).toBe('Bc. David Ampapa, DiS.')
    expect(firstStudentRow.repeatLabel).toBe('')
    expect(firstStudentRow.supervisorPrimaryLabel).toBe('Ing. Vedoucí')
    expect(firstStudentRow.supervisorAdditionalLabel).toBe('')
    expect(firstStudentRow.reviewerPrimaryLabel).toBe('Ing. Oponent')
    expect(firstStudentRow.reviewerAdditionalLabel).toBe('')

    expect(sections[1]?.language).toBe('ENGLISH')
    expect(sections[1]?.committeeDateIso).toBe('2025-06-23T00:00:00.000Z')
    expect(sections[1]?.committeeRoomValue).toBe('TH:A-1455')
    expect(sections[1]?.degreeTitle).toBe('BACHELOR STATE FINAL EXAMINATIONS')
    expect(sections[1]?.semesterLabel).toBe('Summer semester 2024/2025 (June)')
    expect(sections[1]?.topMetaRoomLine).toBe('classroom TH:A-1455')
    expect(sections[1]?.tableThesisTitleHeader).toBe('Final thesis topic')
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
    expect(sections[0]?.semesterLabel).toBe('Zimní semestr 2024/2025 (únor)')
    expect(sections[0]?.departmentLine).toContain('—')
  })

  it('builds semester label from first committee date for arbitrary month in both languages', () => {
    const sections = buildPdfPublicSections({
      committees: [
        createCommittee({
          localId: 'committee-cs-april',
          date: '2025-04-10T00:00:00.000Z',
          language: 'CZECH',
          items: [createStudentItem({ localId: 'student-cs-april', position: 1 })]
        }),
        createCommittee({
          localId: 'committee-en-april',
          date: '2025-04-10T00:00:00.000Z',
          language: 'ENGLISH',
          items: [createStudentItem({ localId: 'student-en-april', position: 1 })]
        })
      ],
      fallbackCommitteeLabel: 'Bez názvu'
    })

    expect(sections).toHaveLength(2)
    expect(sections[0]?.semesterLabel).toBe('Letní semestr 2024/2025 (duben)')
    expect(sections[1]?.semesterLabel).toBe('Summer semester 2024/2025 (April)')
  })

  it('switches semester on configured boundary dates', () => {
    const septemberBoundarySections = buildPdfPublicSections({
      committees: [
        createCommittee({
          localId: 'committee-september-boundary',
          date: '2024-09-20T00:00:00.000Z',
          language: 'CZECH',
          items: [createStudentItem({ localId: 'student-september-boundary', position: 1 })]
        })
      ],
      fallbackCommitteeLabel: 'Bez názvu'
    })

    const winterBoundarySections = buildPdfPublicSections({
      committees: [
        createCommittee({
          localId: 'committee-winter-boundary',
          date: '2025-02-15T00:00:00.000Z',
          language: 'ENGLISH',
          items: [createStudentItem({ localId: 'student-winter-boundary', position: 1 })]
        })
      ],
      fallbackCommitteeLabel: 'Bez názvu'
    })

    const summerBoundarySections = buildPdfPublicSections({
      committees: [
        createCommittee({
          localId: 'committee-summer-boundary',
          date: '2025-02-16T00:00:00.000Z',
          language: 'CZECH',
          items: [createStudentItem({ localId: 'student-summer-boundary', position: 1 })]
        })
      ],
      fallbackCommitteeLabel: 'Bez názvu'
    })

    expect(septemberBoundarySections[0]?.semesterLabel).toBe('Zimní semestr 2024/2025 (září)')
    expect(winterBoundarySections[0]?.semesterLabel).toBe('Winter semester 2024/2025 (February)')
    expect(summerBoundarySections[0]?.semesterLabel).toBe('Letní semestr 2024/2025 (únor)')
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
    expect(payload.sections[0]?.committeeDateIso).toBe('2025-06-23T00:00:00.000Z')
    expect(payload.sections[0]?.committeeRoomValue).toBe('TH:A-1455')
  })

  it('keeps all supervisor and reviewer fields separately for PDF rendering', () => {
    const sections = buildPdfPublicSections({
      committees: [
        createCommittee({
          localId: 'committee-multi-teachers',
          items: [
            createStudentItem({
              localId: 'student-multi-teachers',
              position: 1,
              supervisorName: 'Vedoucí 1',
              additionalSupervisorName: 'Vedoucí 2',
              reviewerName: 'Oponent 1',
              additionalReviewerName: 'Oponent 2'
            })
          ]
        })
      ],
      fallbackCommitteeLabel: 'Bez názvu'
    })

    const firstRow = sections[0]?.rows[0]
    expect(firstRow?.kind).toBe('STUDENT')
    if (!firstRow || firstRow.kind !== 'STUDENT') {
      throw new Error('Expected first row to be STUDENT')
    }

    expect(firstRow.supervisorPrimaryLabel).toBe('Vedoucí 1')
    expect(firstRow.supervisorAdditionalLabel).toBe('Vedoucí 2')
    expect(firstRow.reviewerPrimaryLabel).toBe('Oponent 1')
    expect(firstRow.reviewerAdditionalLabel).toBe('Oponent 2')
  })

  it('shows czech repeat label for repeating student in czech committee', () => {
    const sections = buildPdfPublicSections({
      committees: [
        createCommittee({
          localId: 'committee-repeat-cs',
          language: 'CZECH',
          items: [
            createStudentItem({ localId: 'student-defense', position: 1, repeatType: 'THESIS_DEFENSE' }),
            createStudentItem({ localId: 'student-oral', position: 2, repeatType: 'ORAL_EXAM' }),
            createStudentItem({ localId: 'student-both', position: 3, repeatType: 'BOTH' }),
            createStudentItem({ localId: 'student-none', position: 4, repeatType: 'NONE' }),
            createStudentItem({ localId: 'student-unknown', position: 5, repeatType: 'UNKNOWN' })
          ]
        })
      ],
      fallbackCommitteeLabel: 'Bez názvu'
    })

    const rows = sections[0]?.rows.filter((row) => row.kind === 'STUDENT') ?? []
    expect(rows).toHaveLength(5)
    if (
      rows[0]?.kind !== 'STUDENT' ||
      rows[1]?.kind !== 'STUDENT' ||
      rows[2]?.kind !== 'STUDENT' ||
      rows[3]?.kind !== 'STUDENT' ||
      rows[4]?.kind !== 'STUDENT'
    ) {
      throw new Error('Expected all rows to be STUDENT')
    }

    expect(rows[0].repeatLabel).toBe('Opakuje obhajobu')
    expect(rows[1].repeatLabel).toBe('Opakuje zkoušku')
    expect(rows[2].repeatLabel).toBe('Opakuje zkoušku i obhajobu')
    expect(rows[3].repeatLabel).toBe('')
    expect(rows[4].repeatLabel).toBe('')
  })

  it('shows english repeat label for repeating student in english committee', () => {
    const sections = buildPdfPublicSections({
      committees: [
        createCommittee({
          localId: 'committee-repeat-en',
          language: 'ENGLISH',
          studyProgramName: 'INFORMATICS 2021',
          specializationCode: 'BIE-SI.21',
          items: [
            createStudentItem({
              localId: 'student-defense-en',
              position: 1,
              repeatType: 'THESIS_DEFENSE',
              specializationCode: 'BIE-SI.21'
            }),
            createStudentItem({
              localId: 'student-oral-en',
              position: 2,
              repeatType: 'ORAL_EXAM',
              specializationCode: 'BIE-SI.21'
            }),
            createStudentItem({
              localId: 'student-none-en',
              position: 3,
              repeatType: 'NONE',
              specializationCode: 'BIE-SI.21'
            })
          ]
        })
      ],
      fallbackCommitteeLabel: 'Bez názvu'
    })

    const rows = sections[0]?.rows.filter((row) => row.kind === 'STUDENT') ?? []
    expect(rows).toHaveLength(3)
    if (rows[0]?.kind !== 'STUDENT' || rows[1]?.kind !== 'STUDENT' || rows[2]?.kind !== 'STUDENT') {
      throw new Error('Expected all rows to be STUDENT')
    }

    expect(rows[0].repeatLabel).toBe('Repeats thesis defense')
    expect(rows[1].repeatLabel).toBe('Repeats oral exam')
    expect(rows[2].repeatLabel).toBe('')
  })

  it('builds file name with timestamp and Časový plán SZZ prefix', () => {
    const fixedNow = new Date('2026-04-11T10:20:30.000Z')
    const fileName = buildPdfPublicFileName('Název plánu', fixedNow)

    expect(fileName).toBe('Časový plán SZZ_Název plánu_11.04.2026_12-20-30.pdf')
  })
})
