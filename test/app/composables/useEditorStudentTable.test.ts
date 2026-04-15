import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { computed, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditorStudentTable } from '~/composables/editor/students/useEditorStudentTable'
import type { EditorStudentsTableViewMode } from '~/types/editor'
import type { ScheduleDraftCommittee, ScheduleDraftThesisTitleDisplayMode } from '~/types/schedule-draft'

const { i18nTranslateMock } = vi.hoisted(() => ({
  i18nTranslateMock: vi.fn((key: string) => key)
}))

mockNuxtImport('useI18n', () => {
  return () => ({
    t: i18nTranslateMock
  })
})

function resolveColumnKeys(columns: unknown[]): string[] {
  return columns
    .map((column) => {
      if (typeof column !== 'object' || column === null) {
        return null
      }

      const tableColumn = column as { accessorKey?: unknown; id?: unknown }
      if (typeof tableColumn.accessorKey === 'string') {
        return tableColumn.accessorKey
      }

      if (typeof tableColumn.id === 'string') {
        return tableColumn.id
      }

      return null
    })
    .filter((value): value is string => value !== null)
}

function createColumnKeysByMode(
  mode: ScheduleDraftThesisTitleDisplayMode,
  tableViewMode: EditorStudentsTableViewMode = 'MAXIMIZED'
): string[] {
  const thesisTitleDisplayMode = ref<ScheduleDraftThesisTitleDisplayMode>(mode)
  const tableViewModeRef = ref<EditorStudentsTableViewMode>(tableViewMode)
  const table = useEditorStudentTable(
    computed(() => null),
    computed(() => thesisTitleDisplayMode.value),
    computed(() => tableViewModeRef.value)
  )

  return resolveColumnKeys(table.columns.value)
}

function createCommitteeWithSingleStudent(
  studentOverrides: Partial<
    ScheduleDraftCommittee['items'][number] & {
      type: 'STUDENT'
      student: ScheduleDraftCommittee['items'][number]['student']
    }
  > = {}
): ScheduleDraftCommittee {
  return {
    localId: 'committee-a',
    name: '2-BI-UI.21',
    startMinute: 525,
    date: '2026-06-17T00:00:00.000Z',
    room: 'TH:A-1455',
    preparationRoom: null,
    secretaryName: 'Mgr. Tajemník',
    invigilators: [],
    language: 'CZECH',
    studyProgramName: 'Informatika',
    studyProgramType: 'BACHELOR',
    specializationName: 'Uživatelská rozhraní',
    specializationCode: 'BI-UI.21',
    chairName: 'Předseda',
    viceChairName: 'Místopředseda',
    member1Name: 'Člen 1',
    member2Name: 'Člen 2',
    member3Name: 'Člen 3',
    items: [
      {
        localId: 'student-1',
        type: 'STUDENT',
        position: 1,
        student: {
          firstName: 'Jan',
          lastName: 'Novák',
          email: 'jan.novak@fit.cvut.cz',
          titlesBefore: null,
          titlesAfter: null,
          thesisTitleLocal: 'Lokální název práce',
          thesisTitleEn: 'English thesis title',
          thesisLanguage: 'CZECH',
          supervisorName: 'Vedoucí',
          reviewerName: 'Oponent',
          additionalSupervisorName: null,
          additionalReviewerName: null,
          studyProgramName: 'Informatika',
          studyProgramType: 'BACHELOR',
          specializationName: 'Uživatelská rozhraní',
          specializationCode: 'BI-UI.21',
          studyLanguage: 'CZECH',
          repeatType: 'NONE',
          prepareMinutes: 45,
          examMinutes: 30
        },
        pause: null,
        ...studentOverrides
      }
    ]
  }
}

describe('useEditorStudentTable', () => {
  beforeEach(() => {
    i18nTranslateMock.mockClear()
  })

  it('returns columns in required order for AUTO thesis title mode', () => {
    const columnKeys = createColumnKeysByMode('AUTO')

    expect(columnKeys).toEqual([
      'drag',
      'order',
      'prepareTime',
      'examTime',
      'titlesBefore',
      'firstName',
      'lastName',
      'titlesAfter',
      'email',
      'specializationCode',
      'repeatType',
      'prepareMinutes',
      'examMinutes',
      'thesisTitle',
      'thesisLanguage',
      'supervisorName',
      'additionalSupervisorName',
      'reviewerName',
      'additionalReviewerName',
      'studyLanguage',
      'studyProgramType',
      'studyProgramName'
    ])
  })

  it('returns columns in required order for BOTH thesis title mode', () => {
    const columnKeys = createColumnKeysByMode('BOTH')

    expect(columnKeys).toEqual([
      'drag',
      'order',
      'prepareTime',
      'examTime',
      'titlesBefore',
      'firstName',
      'lastName',
      'titlesAfter',
      'email',
      'specializationCode',
      'repeatType',
      'prepareMinutes',
      'examMinutes',
      'thesisTitleLocal',
      'thesisTitleEn',
      'thesisLanguage',
      'supervisorName',
      'additionalSupervisorName',
      'reviewerName',
      'additionalReviewerName',
      'studyLanguage',
      'studyProgramType',
      'studyProgramName'
    ])
  })

  it('hides specific profile and language columns in OPTIMIZED view mode', () => {
    const columnKeys = createColumnKeysByMode('AUTO', 'OPTIMIZED')

    expect(columnKeys).toEqual([
      'drag',
      'order',
      'prepareTime',
      'examTime',
      'firstName',
      'lastName',
      'email',
      'repeatType',
      'prepareMinutes',
      'examMinutes',
      'thesisTitle',
      'supervisorName',
      'additionalSupervisorName',
      'reviewerName',
      'additionalReviewerName'
    ])
  })

  it('keeps student study profile unchanged when only non-profile fields are edited', () => {
    const selectedCommittee = ref(
      createCommitteeWithSingleStudent({
        student: {
          firstName: 'Jan',
          lastName: 'Novák',
          email: 'jan.novak@fit.cvut.cz',
          titlesBefore: null,
          titlesAfter: null,
          thesisTitleLocal: 'Lokální název práce',
          thesisTitleEn: 'English thesis title',
          thesisLanguage: 'CZECH',
          supervisorName: 'Vedoucí',
          reviewerName: 'Oponent',
          additionalSupervisorName: null,
          additionalReviewerName: null,
          studyProgramName: 'Informatika ',
          studyProgramType: 'BACHELOR',
          specializationName: 'Uživatelská rozhraní',
          specializationCode: 'BI-UI.21',
          studyLanguage: 'CZECH',
          repeatType: 'NONE',
          prepareMinutes: 45,
          examMinutes: 30
        }
      })
    )
    const table = useEditorStudentTable(
      computed(() => selectedCommittee.value),
      computed(() => 'AUTO' as const),
      computed(() => 'MAXIMIZED' as const)
    )

    const firstRow = table.selectedRows.value[0]
    if (!firstRow || firstRow.kind !== 'STUDENT') {
      throw new Error('Expected first table row to be a student')
    }

    table.selectedRows.value = [{ ...firstRow, firstName: 'Petr' }]

    const firstItem = selectedCommittee.value.items[0]
    if (!firstItem || firstItem.type !== 'STUDENT') {
      throw new Error('Expected first committee item to be a student')
    }

    expect(firstItem.student.firstName).toBe('Petr')
    expect(firstItem.student.studyLanguage).toBe('CZECH')
    expect(firstItem.student.studyProgramType).toBe('BACHELOR')
    expect(firstItem.student.studyProgramName).toBe('Informatika ')
    expect(firstItem.student.specializationCode).toBe('BI-UI.21')
  })

  it('in AUTO mode saves thesisTitle to the stored language field, not the new one', () => {
    const selectedCommittee = ref(
      createCommitteeWithSingleStudent({
        student: {
          firstName: 'Jan',
          lastName: 'Novák',
          email: 'jan.novak@fit.cvut.cz',
          titlesBefore: null,
          titlesAfter: null,
          thesisTitleLocal: 'Český název',
          thesisTitleEn: 'English title',
          thesisLanguage: 'CZECH',
          supervisorName: 'Vedoucí',
          reviewerName: 'Oponent',
          additionalSupervisorName: null,
          additionalReviewerName: null,
          studyProgramName: 'Informatika',
          studyProgramType: 'BACHELOR',
          specializationName: 'Uživatelská rozhraní',
          specializationCode: 'BI-UI.21',
          studyLanguage: 'CZECH',
          repeatType: 'NONE',
          prepareMinutes: 45,
          examMinutes: 30
        }
      })
    )
    const table = useEditorStudentTable(
      computed(() => selectedCommittee.value),
      computed(() => 'AUTO' as const),
      computed(() => 'MAXIMIZED' as const)
    )

    const firstRow = table.selectedRows.value[0]
    if (!firstRow || firstRow.kind !== 'STUDENT') {
      throw new Error('Expected first table row to be a student')
    }

    // User switches thesis language from CZECH to ENGLISH — thesisTitle still contains the Czech value
    // because the row was built before the language change propagated.
    table.selectedRows.value = [{ ...firstRow, thesisLanguage: 'ENGLISH' }]

    const firstItem = selectedCommittee.value.items[0]
    if (!firstItem || firstItem.type !== 'STUDENT') {
      throw new Error('Expected first committee item to be a student')
    }

    // thesisTitle came from thesisTitleLocal (old CZECH language), so it must be saved there.
    // thesisTitleEn must remain unchanged.
    expect(firstItem.student.thesisTitleLocal).toBe('Český název')
    expect(firstItem.student.thesisTitleEn).toBe('English title')
    expect(firstItem.student.thesisLanguage).toBe('ENGLISH')
  })

  it('in AUTO mode saves thesisTitle to english field when stored language was english', () => {
    const selectedCommittee = ref(
      createCommitteeWithSingleStudent({
        student: {
          firstName: 'Jan',
          lastName: 'Novák',
          email: 'jan.novak@fit.cvut.cz',
          titlesBefore: null,
          titlesAfter: null,
          thesisTitleLocal: 'Český název',
          thesisTitleEn: 'English title',
          thesisLanguage: 'ENGLISH',
          supervisorName: 'Vedoucí',
          reviewerName: 'Oponent',
          additionalSupervisorName: null,
          additionalReviewerName: null,
          studyProgramName: 'Informatika',
          studyProgramType: 'BACHELOR',
          specializationName: 'Uživatelská rozhraní',
          specializationCode: 'BI-UI.21',
          studyLanguage: 'CZECH',
          repeatType: 'NONE',
          prepareMinutes: 45,
          examMinutes: 30
        }
      })
    )
    const table = useEditorStudentTable(
      computed(() => selectedCommittee.value),
      computed(() => 'AUTO' as const),
      computed(() => 'MAXIMIZED' as const)
    )

    const firstRow = table.selectedRows.value[0]
    if (!firstRow || firstRow.kind !== 'STUDENT') {
      throw new Error('Expected first table row to be a student')
    }

    // User switches thesis language from ENGLISH to CZECH — thesisTitle still contains the English value.
    table.selectedRows.value = [{ ...firstRow, thesisLanguage: 'CZECH' }]

    const firstItem = selectedCommittee.value.items[0]
    if (!firstItem || firstItem.type !== 'STUDENT') {
      throw new Error('Expected first committee item to be a student')
    }

    // thesisTitle came from thesisTitleEn (old ENGLISH language), so it must be saved there.
    // thesisTitleLocal must remain unchanged.
    expect(firstItem.student.thesisTitleEn).toBe('English title')
    expect(firstItem.student.thesisTitleLocal).toBe('Český název')
    expect(firstItem.student.thesisLanguage).toBe('CZECH')
  })

  it('still applies study profile cleanup when profile fields are changed', () => {
    const selectedCommittee = ref(createCommitteeWithSingleStudent())
    const table = useEditorStudentTable(
      computed(() => selectedCommittee.value),
      computed(() => 'AUTO' as const),
      computed(() => 'MAXIMIZED' as const)
    )

    const firstRow = table.selectedRows.value[0]
    if (!firstRow || firstRow.kind !== 'STUDENT') {
      throw new Error('Expected first table row to be a student')
    }

    table.selectedRows.value = [{ ...firstRow, studyProgramType: 'MASTER' }]

    const firstItem = selectedCommittee.value.items[0]
    if (!firstItem || firstItem.type !== 'STUDENT') {
      throw new Error('Expected first committee item to be a student')
    }

    expect(firstItem.student.studyProgramType).toBe('MASTER')
    expect(firstItem.student.studyProgramName).toBe('Informatika')
    expect(firstItem.student.specializationCode).toBe('')
    expect(firstItem.student.prepareMinutes).toBe(45)
    expect(firstItem.student.examMinutes).toBe(35)
  })
})
