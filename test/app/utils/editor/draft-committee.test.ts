import { describe, expect, it } from 'vitest'
import type { ScheduleDraftCommittee } from '~/types/schedule-draft'
import { buildEditorCommitteeSidebarItems } from '~/utils/editor/draft-committee'

function createCommittee(options: {
  localId: string
  name: string
  date: string
  startMinute: number
}): ScheduleDraftCommittee {
  return {
    localId: options.localId,
    name: options.name,
    startMinute: options.startMinute,
    date: options.date,
    room: null,
    secretaryName: null,
    invigilators: [],
    language: 'CZECH',
    studyProgramName: 'Informatika',
    studyProgramType: 'BACHELOR',
    specializationName: 'Softwarové inženýrství',
    specializationCode: 'BI-SI.21',
    defenseDepartmentCode: '18102',
    defenseDepartmentName: 'KSI',
    chairName: '',
    viceChairName: '',
    member1Name: '',
    member2Name: '',
    member3Name: '',
    items: []
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
      { kind: 'committee', label: 'Komise A', value: 'committee-early', studentsCount: 0 },
      { kind: 'committee', label: 'Komise B', value: 'committee-late', studentsCount: 0 }
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
      { kind: 'committee', label: 'Komise 1', value: 'committee-day-1', studentsCount: 0 },
      { kind: 'day-bookmark', id: 'day-11.06.2026', dayLabel: '11.06.2026' },
      { kind: 'committee', label: 'Komise 2', value: 'committee-day-2', studentsCount: 0 }
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
      { kind: 'committee', label: 'Bez názvu', value: 'committee-empty-name', studentsCount: 0 }
    ])
  })
})
