import { describe, expect, it } from 'vitest'
import type { ScheduleDraftCommittee, ScheduleDraftItem } from '~/types/schedule-draft'
import { buildEditorTableRowsForCommittee, buildStudentRowsForCommittee } from '~/utils/editor/student-table'

function createStudentItem(options: {
  localId: string
  position: number
  firstName?: string
  lastName?: string
  thesisTitleLocal?: string
  thesisTitleEn?: string
  prepareMinutes?: number
  examMinutes?: number
}): ScheduleDraftItem {
  return {
    localId: options.localId,
    type: 'STUDENT',
    position: options.position,
    student: {
      firstName: options.firstName ?? 'Damir',
      lastName: options.lastName ?? 'Alenov',
      email: 'student@example.test',
      titlesBefore: null,
      titlesAfter: null,
      thesisTitleLocal: options.thesisTitleLocal ?? 'Český název',
      thesisTitleEn: options.thesisTitleEn ?? 'English title',
      thesisLanguage: 'CZECH',
      supervisorName: 'Vedoucí',
      reviewerName: 'Oponent',
      additionalSupervisorName: null,
      additionalReviewerName: null,
      studyProgramName: 'Informatika',
      studyProgramType: 'BACHELOR',
      specializationName: 'Softwarové inženýrství',
      specializationCode: 'BI-SI.21',
      studyLanguage: 'CZECH',
      repeatType: 'NONE',
      prepareMinutes: options.prepareMinutes ?? 45,
      examMinutes: options.examMinutes ?? 30
    },
    pause: null
  }
}

function createPauseItem(localId: string, position: number, durationMinutes: number): ScheduleDraftItem {
  return {
    localId,
    type: 'PAUSE',
    position,
    student: null,
    pause: {
      label: 'Pauza',
      pauseType: 'BREAK',
      durationMinutes
    }
  }
}

function createCommittee(options: {
  language?: ScheduleDraftCommittee['language']
  startMinute?: number
  items: ScheduleDraftItem[]
}): ScheduleDraftCommittee {
  return {
    localId: 'committee-1',
    name: 'Komise 1',
    startMinute: options.startMinute ?? 525,
    date: '2026-06-10T00:00:00.000Z',
    room: null,
    secretaryName: null,
    invigilators: [],
    language: options.language ?? 'CZECH',
    studyProgramName: 'Informatika',
    studyProgramType: 'BACHELOR',
    specializationName: 'Softwarové inženýrství',
    specializationCode: 'BI-SI.21',
    chairName: '',
    viceChairName: '',
    member1Name: '',
    member2Name: '',
    member3Name: '',
    items: options.items
  }
}

describe('student-table rows', () => {
  it('adds fixed ten-minute gap only between neighboring students', () => {
    const committee = createCommittee({
      items: [
        createStudentItem({ localId: 'student-1', position: 1 }),
        createStudentItem({ localId: 'student-2', position: 2 })
      ]
    })

    const rows = buildStudentRowsForCommittee(committee)

    expect(rows).toHaveLength(2)
    expect(rows[0]?.prepareTime).toBe('08:00')
    expect(rows[0]?.examTime).toBe('08:45 - 09:15')
    expect(rows[1]?.prepareTime).toBe('08:40')
    expect(rows[1]?.examTime).toBe('09:25 - 09:55')
  })

  it('does not add fixed gap around pauses', () => {
    const committee = createCommittee({
      items: [
        createStudentItem({ localId: 'student-1', position: 1 }),
        createPauseItem('pause-1', 2, 20),
        createStudentItem({ localId: 'student-2', position: 3 })
      ]
    })

    const rows = buildStudentRowsForCommittee(committee)

    expect(rows).toHaveLength(2)
    expect(rows[0]?.examTime).toBe('08:45 - 09:15')
    expect(rows[1]?.prepareTime).toBe('08:50')
    expect(rows[1]?.examTime).toBe('09:35 - 10:05')
  })

  it('selects thesis title language by committee language', () => {
    const committee = createCommittee({
      language: 'ENGLISH',
      items: [
        createStudentItem({
          localId: 'student-1',
          position: 1,
          thesisTitleLocal: 'Lokální název',
          thesisTitleEn: 'English thesis title'
        })
      ]
    })

    const rows = buildStudentRowsForCommittee(committee)

    expect(rows[0]?.thesisTitle).toBe('English thesis title')
  })

  it('does not fallback thesis title from EN to CS when committee language is czech', () => {
    const committee = createCommittee({
      language: 'CZECH',
      items: [
        createStudentItem({
          localId: 'student-1',
          position: 1,
          thesisTitleLocal: '',
          thesisTitleEn: 'English thesis title'
        })
      ]
    })

    const rows = buildStudentRowsForCommittee(committee)

    expect(rows[0]?.thesisTitle).toBe('')
    expect(rows[0]?.thesisTitleLocal).toBe('')
    expect(rows[0]?.thesisTitleEn).toBe('English thesis title')
  })

  it('does not fallback thesis title from CS to EN when committee language is english', () => {
    const committee = createCommittee({
      language: 'ENGLISH',
      items: [
        createStudentItem({
          localId: 'student-1',
          position: 1,
          thesisTitleLocal: 'Lokální název',
          thesisTitleEn: ''
        })
      ]
    })

    const rows = buildStudentRowsForCommittee(committee)

    expect(rows[0]?.thesisTitle).toBe('')
    expect(rows[0]?.thesisTitleLocal).toBe('Lokální název')
    expect(rows[0]?.thesisTitleEn).toBe('')
  })

  it('always exposes both thesis title variants in row model', () => {
    const committee = createCommittee({
      language: 'CZECH',
      items: [
        createStudentItem({
          localId: 'student-1',
          position: 1,
          thesisTitleLocal: 'Lokální název',
          thesisTitleEn: 'English thesis title'
        })
      ]
    })

    const rows = buildStudentRowsForCommittee(committee)

    expect(rows[0]?.thesisTitleLocal).toBe('Lokální název')
    expect(rows[0]?.thesisTitleEn).toBe('English thesis title')
    expect(rows[0]?.thesisLanguage).toBe('CZECH')
    expect(rows[0]?.studyLanguage).toBe('CZECH')
    expect(rows[0]?.studyProgramType).toBe('BACHELOR')
    expect(rows[0]?.studyProgramName).toBe('Informatika')
    expect(rows[0]?.specializationCode).toBe('BI-SI.21')
    expect(rows[0]?.additionalSupervisorName).toBe('')
    expect(rows[0]?.additionalReviewerName).toBe('')
  })

  it('builds mixed rows with pause details and keeps student order student-only', () => {
    const committee = createCommittee({
      items: [
        createStudentItem({ localId: 'student-1', position: 1 }),
        createPauseItem('pause-1', 2, 20),
        createStudentItem({ localId: 'student-2', position: 3 })
      ]
    })

    const rows = buildEditorTableRowsForCommittee(committee)

    expect(rows).toHaveLength(3)
    expect(rows[0]?.kind).toBe('STUDENT')
    expect(rows[1]?.kind).toBe('PAUSE')
    expect(rows[2]?.kind).toBe('STUDENT')

    const firstStudent = rows[0]
    const pause = rows[1]
    const secondStudent = rows[2]
    if (!firstStudent || firstStudent.kind !== 'STUDENT') {
      throw new Error('Expected first row to be student')
    }
    if (!pause || pause.kind !== 'PAUSE') {
      throw new Error('Expected second row to be pause')
    }
    if (!secondStudent || secondStudent.kind !== 'STUDENT') {
      throw new Error('Expected third row to be student')
    }

    expect(firstStudent.studentOrder).toBe(1)
    expect(firstStudent.examTime).toBe('08:45 - 09:15')
    expect(pause.startTime).toBe('09:15')
    expect(pause.endTime).toBe('09:35')
    expect(pause.rangeLabel).toBe('09:15 - 09:35')
    expect('studentOrder' in pause).toBe(false)
    expect(secondStudent.studentOrder).toBe(2)
    expect(secondStudent.prepareTime).toBe('08:50')
    expect(secondStudent.examTime).toBe('09:35 - 10:05')
  })
})
