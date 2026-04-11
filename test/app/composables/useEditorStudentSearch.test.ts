import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { reactive, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ScheduleDraft } from '~/types/schedule-draft'
import { useEditorStudentSearch } from '~/composables/editor/useEditorStudentSearch'
import { EDITOR_STUDENT_SEARCH_DEBOUNCE_MS } from '~/constants/editor-student-search'

const { i18nTranslateMock } = vi.hoisted(() => ({
  i18nTranslateMock: vi.fn((key: string, params?: Record<string, unknown>) => {
    if (key === 'editor.studentSearch.results.order') {
      return `Pořadí: ${String(params?.order ?? '')}`
    }

    return key
  })
}))

const scheduleDraftStoreMock = reactive({
  draft: null as ScheduleDraft | null
})

mockNuxtImport('useI18n', () => {
  return () => ({
    t: i18nTranslateMock
  })
})

vi.mock('~/stores/schedule-draft', () => {
  return {
    useScheduleDraftStore: () => scheduleDraftStoreMock
  }
})

function createDraft(): ScheduleDraft {
  return {
    name: 'Plán',
    type: 'MANUAL',
    thesisTitleDisplayMode: 'AUTO',
    committees: [
      {
        localId: 'committee-a',
        name: '1-BI-SI.21',
        startMinute: 510,
        date: '2026-06-10T00:00:00.000Z',
        room: null,
        secretaryName: null,
        invigilators: [],
        language: 'CZECH',
        studyProgramName: 'Informatika',
        studyProgramType: 'BACHELOR',
        specializationName: 'Softwarové inženýrství 2021',
        specializationCode: 'BI-SI.21',
        chairName: 'Předseda',
        viceChairName: 'Místopředseda',
        member1Name: 'Člen 1',
        member2Name: 'Člen 2',
        member3Name: 'Člen 3',
        items: [
          {
            localId: 'student-a1',
            type: 'STUDENT',
            position: 1,
            student: {
              firstName: 'Jan',
              lastName: 'Novák',
              email: 'jan.novak@fit.cvut.cz',
              titlesBefore: null,
              titlesAfter: null,
              thesisTitleLocal: 'A',
              thesisTitleEn: 'A',
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
              examMinutes: 30
            },
            pause: null
          },
          {
            localId: 'pause-a1',
            type: 'PAUSE',
            position: 2,
            student: null,
            pause: {
              label: 'Přestávka',
              pauseType: 'BREAK',
              durationMinutes: 15
            }
          },
          {
            localId: 'student-a2',
            type: 'STUDENT',
            position: 3,
            student: {
              firstName: 'Eva',
              lastName: 'Srnková',
              email: 'eva.srnkova@fit.cvut.cz',
              titlesBefore: null,
              titlesAfter: null,
              thesisTitleLocal: 'B',
              thesisTitleEn: 'B',
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
              examMinutes: 30
            },
            pause: null
          }
        ]
      },
      {
        localId: 'committee-b',
        name: '2-BI-SI.21',
        startMinute: 525,
        date: '2026-06-11T00:00:00.000Z',
        room: null,
        secretaryName: null,
        invigilators: [],
        language: 'CZECH',
        studyProgramName: 'Informatika',
        studyProgramType: 'BACHELOR',
        specializationName: 'Softwarové inženýrství 2021',
        specializationCode: 'BI-SI.21',
        chairName: 'Předseda',
        viceChairName: 'Místopředseda',
        member1Name: 'Člen 1',
        member2Name: 'Člen 2',
        member3Name: 'Člen 3',
        items: [
          {
            localId: 'student-b1',
            type: 'STUDENT',
            position: 1,
            student: {
              firstName: 'Adam',
              lastName: 'Černý',
              email: 'adam.cerny@fit.cvut.cz',
              titlesBefore: null,
              titlesAfter: null,
              thesisTitleLocal: 'C',
              thesisTitleEn: 'C',
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
              examMinutes: 30
            },
            pause: null
          }
        ]
      }
    ]
  }
}

describe('useEditorStudentSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    i18nTranslateMock.mockClear()
    scheduleDraftStoreMock.draft = createDraft()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('returns all students for empty query and preserves committee timeline ordering', () => {
    const selectedCommitteeId = ref('committee-a')
    const search = useEditorStudentSearch(selectedCommitteeId)

    expect(search.studentSearchResults.value.map((entry) => entry.studentId)).toEqual([
      'student-a1',
      'student-a2',
      'student-b1'
    ])
    expect(search.studentSearchResults.value[0]?.orderLabel).toBe('Pořadí: 1')
    expect(search.studentSearchResults.value[1]?.orderLabel).toBe('Pořadí: 2')
  })

  it('finds by email and by diacritics-insensitive surname', () => {
    const selectedCommitteeId = ref('committee-a')
    const search = useEditorStudentSearch(selectedCommitteeId)

    search.updateStudentSearchQuery('eva.srnkova@fit.cvut.cz')
    expect(search.isStudentSearchLoading.value).toBe(true)
    vi.advanceTimersByTime(EDITOR_STUDENT_SEARCH_DEBOUNCE_MS)
    expect(search.isStudentSearchLoading.value).toBe(false)
    expect(search.studentSearchResults.value.map((entry) => entry.studentId)).toEqual(['student-a2'])

    search.updateStudentSearchQuery('cerny')
    expect(search.isStudentSearchLoading.value).toBe(true)
    vi.advanceTimersByTime(EDITOR_STUDENT_SEARCH_DEBOUNCE_MS)
    expect(search.isStudentSearchLoading.value).toBe(false)
    expect(search.studentSearchResults.value.map((entry) => entry.studentId)).toEqual(['student-b1'])
  })

  it('selects result, switches committee, emits highlight request and resets dialog state', async () => {
    const selectedCommitteeId = ref('committee-a')
    const search = useEditorStudentSearch(selectedCommitteeId)

    search.openStudentSearchDialog()
    search.updateStudentSearchQuery('adam')
    vi.advanceTimersByTime(EDITOR_STUDENT_SEARCH_DEBOUNCE_MS)
    const result = search.studentSearchResults.value[0]
    if (!result) {
      throw new Error('Expected search result to exist')
    }

    search.selectStudentSearchResult(result)

    await nextTick()
    expect(selectedCommitteeId.value).toBe('committee-b')
    expect(search.highlightRequest.value).toEqual({
      requestId: 1,
      committeeId: 'committee-b',
      studentId: 'student-b1'
    })
    expect(search.isStudentSearchDialogOpen.value).toBe(false)
    expect(search.studentSearchQuery.value).toBe('')
    expect(search.isStudentSearchLoading.value).toBe(false)
  })

  it('focuses student in committee using shared navigation method', async () => {
    const selectedCommitteeId = ref('committee-a')
    const search = useEditorStudentSearch(selectedCommitteeId)

    search.focusStudentInCommittee('committee-b', 'student-b1')

    expect(selectedCommitteeId.value).toBe('committee-b')
    await nextTick()
    expect(search.highlightRequest.value).toEqual({
      requestId: 1,
      committeeId: 'committee-b',
      studentId: 'student-b1'
    })
  })
})
