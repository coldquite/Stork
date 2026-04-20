import { describe, expect, it } from 'vitest'
import type { ScheduleDraftCommittee, ScheduleDraftItem } from '~/types/schedule-draft'
import { buildEditorCommitteeSidebarItems } from '~/utils/editor/draft-committee'

function createPauseItem(localId: string, position: number, durationMinutes: number): ScheduleDraftItem {
  return {
    localId,
    type: 'PAUSE',
    position,
    student: null,
    pause: {
      label: '',
      pauseType: 'BREAK',
      durationMinutes
    }
  }
}

function createStudentItem(localId: string, position: number, examMinutes: number): ScheduleDraftItem {
  return {
    localId,
    type: 'STUDENT',
    position,
    student: {
      firstName: 'Jan',
      lastName: 'Novák',
      email: 'jan.novak@fit.cvut.cz',
      titlesBefore: null,
      titlesAfter: null,
      thesisTitleLocal: 'Lokální název',
      thesisTitleEn: 'English title',
      thesisLanguage: 'CZECH',
      supervisorName: 'Vedoucí',
      reviewerName: 'Oponent',
      additionalSupervisorName: null,
      additionalReviewerName: null,
      studyProgramName: 'Informatika',
      studyProgramType: 'BACHELOR',
      specializationName: 'Softwarové inženýrství 2021',
      specializationCode: 'BI-SI.21',
      studyLanguage: 'CZECH',
      repeatType: 'NONE',
      prepareMinutes: 45,
      examMinutes
    },
    pause: null
  }
}

function createCommittee(options: {
  localId: string
  name: string
  date: string
  startMinute: number
  room?: string | null
  items?: ScheduleDraftItem[]
}): ScheduleDraftCommittee {
  return {
    localId: options.localId,
    name: options.name,
    startMinute: options.startMinute,
    date: options.date,
    room: options.room ?? null,
    secretaryName: null,
    invigilators: [],
    language: 'CZECH',
    studyProgramName: 'Informatika',
    studyProgramType: 'BACHELOR',
    specializationName: 'Softwarové inženýrství',
    specializationCode: 'BI-SI.21',
    chairName: '',
    viceChairName: '',
    member1Name: '',
    member2Name: '',
    member3Name: '',
    items: options.items ?? []
  }
}

describe('draft-committee sidebar items', () => {
  it('adds only one day bookmark for multiple committees in one day', () => {
    const items = buildEditorCommitteeSidebarItems(
      [
        createCommittee({
          localId: 'committee-late',
          name: 'Komise B',
          date: '2026-06-10T00:00:00.000Z',
          startMinute: 600
        }),
        createCommittee({
          localId: 'committee-early',
          name: 'Komise A',
          date: '2026-06-10T00:00:00.000Z',
          startMinute: 540
        })
      ],
      'Bez názvu'
    )

    expect(items).toEqual([
      { kind: 'day-bookmark', id: 'day-10.06.2026', dayLabel: '10.06.2026' },
      {
        kind: 'committee',
        label: 'Komise A',
        value: 'committee-early',
        studentsCount: 0,
        roomLabel: '—',
        timelineStartLabel: '—',
        timelineEndLabel: '—'
      },
      {
        kind: 'committee',
        label: 'Komise B',
        value: 'committee-late',
        studentsCount: 0,
        roomLabel: '—',
        timelineStartLabel: '—',
        timelineEndLabel: '—'
      }
    ])
  })

  it('adds day bookmark for each different day', () => {
    const items = buildEditorCommitteeSidebarItems(
      [
        createCommittee({
          localId: 'committee-day-2',
          name: 'Komise 2',
          date: '2026-06-11T00:00:00.000Z',
          startMinute: 540
        }),
        createCommittee({
          localId: 'committee-day-1',
          name: 'Komise 1',
          date: '2026-06-10T00:00:00.000Z',
          startMinute: 540
        })
      ],
      'Bez názvu'
    )

    expect(items).toEqual([
      { kind: 'day-bookmark', id: 'day-10.06.2026', dayLabel: '10.06.2026' },
      {
        kind: 'committee',
        label: 'Komise 1',
        value: 'committee-day-1',
        studentsCount: 0,
        roomLabel: '—',
        timelineStartLabel: '—',
        timelineEndLabel: '—'
      },
      { kind: 'day-bookmark', id: 'day-11.06.2026', dayLabel: '11.06.2026' },
      {
        kind: 'committee',
        label: 'Komise 2',
        value: 'committee-day-2',
        studentsCount: 0,
        roomLabel: '—',
        timelineStartLabel: '—',
        timelineEndLabel: '—'
      }
    ])
  })

  it('uses fallback label for empty committee names', () => {
    const items = buildEditorCommitteeSidebarItems(
      [
        createCommittee({
          localId: 'committee-empty-name',
          name: '  ',
          date: '2026-06-12T00:00:00.000Z',
          startMinute: 540
        })
      ],
      'Bez názvu'
    )

    expect(items).toEqual([
      { kind: 'day-bookmark', id: 'day-12.06.2026', dayLabel: '12.06.2026' },
      {
        kind: 'committee',
        label: 'Bez názvu',
        value: 'committee-empty-name',
        studentsCount: 0,
        roomLabel: '—',
        timelineStartLabel: '—',
        timelineEndLabel: '—'
      }
    ])
  })

  it('sorts committees with equal date/time by numeric prefix in name and then by remaining name', () => {
    const items = buildEditorCommitteeSidebarItems(
      [
        createCommittee({
          localId: 'committee-10',
          name: '10-NI-ZI',
          date: '2026-08-28T00:00:00.000Z',
          startMinute: 525
        }),
        createCommittee({
          localId: 'committee-2',
          name: '2-BI-SI.21',
          date: '2026-08-28T00:00:00.000Z',
          startMinute: 525
        }),
        createCommittee({
          localId: 'committee-11',
          name: '11-BI-UI.21',
          date: '2026-08-28T00:00:00.000Z',
          startMinute: 525
        }),
        createCommittee({
          localId: 'committee-1',
          name: '1-BI-SI.21',
          date: '2026-08-28T00:00:00.000Z',
          startMinute: 525
        }),
        createCommittee({
          localId: 'committee-text',
          name: 'Komise A',
          date: '2026-08-28T00:00:00.000Z',
          startMinute: 525
        })
      ],
      'Bez názvu'
    )

    expect(items).toEqual([
      { kind: 'day-bookmark', id: 'day-28.08.2026', dayLabel: '28.08.2026' },
      {
        kind: 'committee',
        label: '1-BI-SI.21',
        value: 'committee-1',
        studentsCount: 0,
        roomLabel: '—',
        timelineStartLabel: '—',
        timelineEndLabel: '—'
      },
      {
        kind: 'committee',
        label: '2-BI-SI.21',
        value: 'committee-2',
        studentsCount: 0,
        roomLabel: '—',
        timelineStartLabel: '—',
        timelineEndLabel: '—'
      },
      {
        kind: 'committee',
        label: '10-NI-ZI',
        value: 'committee-10',
        studentsCount: 0,
        roomLabel: '—',
        timelineStartLabel: '—',
        timelineEndLabel: '—'
      },
      {
        kind: 'committee',
        label: '11-BI-UI.21',
        value: 'committee-11',
        studentsCount: 0,
        roomLabel: '—',
        timelineStartLabel: '—',
        timelineEndLabel: '—'
      },
      {
        kind: 'committee',
        label: 'Komise A',
        value: 'committee-text',
        studentsCount: 0,
        roomLabel: '—',
        timelineStartLabel: '—',
        timelineEndLabel: '—'
      }
    ])
  })

  it('uses room and computes timeline range from first to last committee item', () => {
    const items = buildEditorCommitteeSidebarItems(
      [
        createCommittee({
          localId: 'committee-with-items',
          name: 'Komise C',
          date: '2026-06-13T00:00:00.000Z',
          startMinute: 540,
          room: 'TH:A-1435',
          items: [
            createPauseItem('pause-1', 1, 20),
            createStudentItem('student-1', 2, 30),
            createPauseItem('pause-2', 3, 10),
            createStudentItem('student-2', 4, 25)
          ]
        })
      ],
      'Bez názvu'
    )

    expect(items).toEqual([
      { kind: 'day-bookmark', id: 'day-13.06.2026', dayLabel: '13.06.2026' },
      {
        kind: 'committee',
        label: 'Komise C',
        value: 'committee-with-items',
        studentsCount: 2,
        roomLabel: 'TH:A-1435',
        timelineStartLabel: '09:00',
        timelineEndLabel: '10:25'
      }
    ])
  })
})
