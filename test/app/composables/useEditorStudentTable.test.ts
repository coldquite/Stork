import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { computed, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditorStudentTable } from '~/composables/editor/useEditorStudentTable'
import type { ScheduleDraftThesisTitleDisplayMode } from '~/types/schedule-draft'
import type { EditorStudentsTableViewMode } from '~/types/editor-table-preferences'

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
      'titlesBefore',
      'firstName',
      'lastName',
      'titlesAfter',
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
})
