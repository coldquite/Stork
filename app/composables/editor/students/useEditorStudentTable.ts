import type { TableColumn } from '@nuxt/ui'
import { STUDENT_TABLE_THESIS_COLUMN_WIDTH_CLASS } from '~/constants/editor-students-table'
import type { EditorStudentTableRow, EditorStudentsTableViewMode, EditorTableRow } from '~/types/editor'
import type {
  ScheduleDraftCommittee,
  ScheduleDraftItem,
  ScheduleDraftThesisTitleDisplayMode
} from '~/types/schedule-draft'
import { isStudentItem, normalizeOptionalText, normalizeRequiredText } from '~/utils/editor/draft-committee'
import { resolveRepeatType } from '~/utils/editor/repeat-type'
import { buildEditorTableRowsForCommittee } from '~/utils/editor/student-table'
import {
  applySpecializationCodeChange,
  applyStudyLanguageChange,
  applyStudyProgramNameChange,
  applyStudyProgramTypeChange,
  resolveSpecializationNameForStudyProfile
} from '~/utils/editor/student-study-profile'
import { resolveThesisLanguage } from '~/utils/editor/thesis-language'
import { resolveStudentDurationByStudyProgramAndRepeat } from '~/utils/student-duration'

function resolveMinutes(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback
  }

  return Math.max(Math.trunc(value), 0)
}

function isEditorStudentRow(row: EditorTableRow): row is EditorStudentTableRow {
  return row.kind === 'STUDENT'
}

function updateStudentItemFromRow(
  committee: ScheduleDraftCommittee,
  studentItem: ScheduleDraftItem & { type: 'STUDENT' },
  row: EditorStudentTableRow,
  thesisTitleDisplayMode: ScheduleDraftThesisTitleDisplayMode
): void {
  studentItem.student.lastName = normalizeRequiredText(row.lastName)
  studentItem.student.firstName = normalizeRequiredText(row.firstName)
  studentItem.student.email = normalizeOptionalText(row.email)
  studentItem.student.titlesBefore = normalizeOptionalText(row.titlesBefore)
  studentItem.student.titlesAfter = normalizeOptionalText(row.titlesAfter)

  const normalizedCurrentStudyProgramName = normalizeRequiredText(studentItem.student.studyProgramName)
  const normalizedCurrentSpecializationCode = normalizeRequiredText(studentItem.student.specializationCode)
  const normalizedRowStudyProgramName = normalizeRequiredText(row.studyProgramName)
  const normalizedRowSpecializationCode = normalizeRequiredText(row.specializationCode)
  const hasStudyLanguageChanged = row.studyLanguage !== studentItem.student.studyLanguage
  const hasStudyProgramTypeChanged = row.studyProgramType !== studentItem.student.studyProgramType
  const hasStudyProgramNameChanged = normalizedRowStudyProgramName !== normalizedCurrentStudyProgramName
  const hasSpecializationCodeChanged = normalizedRowSpecializationCode !== normalizedCurrentSpecializationCode
  const hasStudyProfileChanged =
    hasStudyLanguageChanged || hasStudyProgramTypeChanged || hasStudyProgramNameChanged || hasSpecializationCodeChanged
  const hasPrimaryStudyProfileChanged =
    hasStudyLanguageChanged || hasStudyProgramTypeChanged || hasStudyProgramNameChanged
  const shouldClearSpecializationAfterProfileChange = hasPrimaryStudyProfileChanged && !hasSpecializationCodeChanged

  let nextStudyProfile = {
    studyLanguage: studentItem.student.studyLanguage,
    studyProgramType: studentItem.student.studyProgramType,
    studyProgramName: studentItem.student.studyProgramName,
    specializationCode: studentItem.student.specializationCode
  }

  if (hasStudyProfileChanged) {
    nextStudyProfile = applyStudyLanguageChange(nextStudyProfile, row.studyLanguage)
    nextStudyProfile = applyStudyProgramTypeChange(nextStudyProfile, row.studyProgramType)
    nextStudyProfile = applyStudyProgramNameChange(nextStudyProfile, row.studyProgramName)
    nextStudyProfile = applySpecializationCodeChange(
      nextStudyProfile,
      shouldClearSpecializationAfterProfileChange ? '' : row.specializationCode
    )
  }

  const previousStudyProgramType = studentItem.student.studyProgramType
  const previousRepeatType = studentItem.student.repeatType
  const nextRepeatType = resolveRepeatType(row.repeatType, previousRepeatType)
  const shouldOverwriteDuration =
    nextRepeatType !== previousRepeatType || nextStudyProfile.studyProgramType !== previousStudyProgramType

  studentItem.student.studyLanguage = nextStudyProfile.studyLanguage
  studentItem.student.studyProgramType = nextStudyProfile.studyProgramType
  studentItem.student.studyProgramName = nextStudyProfile.studyProgramName
  studentItem.student.specializationCode = nextStudyProfile.specializationCode
  studentItem.student.specializationName = resolveSpecializationNameForStudyProfile(
    nextStudyProfile.studyProgramType,
    nextStudyProfile.studyProgramName,
    nextStudyProfile.specializationCode
  )

  if (thesisTitleDisplayMode === 'BOTH') {
    studentItem.student.thesisTitleLocal = normalizeRequiredText(row.thesisTitleLocal)
    studentItem.student.thesisTitleEn = normalizeRequiredText(row.thesisTitleEn)
  } else {
    const normalizedThesisTitle = normalizeRequiredText(row.thesisTitle)
    // thesisTitle was built from the field corresponding to the stored (old) thesis language.
    // We must write it back to that same field — not the new row language — otherwise
    // changing thesisLanguage would overwrite the wrong field with the old language's value.
    if (studentItem.student.thesisLanguage === 'ENGLISH') {
      studentItem.student.thesisTitleEn = normalizedThesisTitle
    } else {
      studentItem.student.thesisTitleLocal = normalizedThesisTitle
    }
  }

  studentItem.student.supervisorName = normalizeRequiredText(row.supervisorName)
  studentItem.student.additionalSupervisorName = normalizeOptionalText(row.additionalSupervisorName)
  studentItem.student.reviewerName = normalizeRequiredText(row.reviewerName)
  studentItem.student.additionalReviewerName = normalizeOptionalText(row.additionalReviewerName)
  studentItem.student.thesisLanguage = resolveThesisLanguage(row.thesisLanguage, studentItem.student.thesisLanguage)
  studentItem.student.repeatType = nextRepeatType

  if (shouldOverwriteDuration) {
    const mappedDuration = resolveStudentDurationByStudyProgramAndRepeat(
      nextStudyProfile.studyProgramType,
      nextRepeatType
    )
    studentItem.student.prepareMinutes = mappedDuration.prepareMinutes
    studentItem.student.examMinutes = mappedDuration.examMinutes
    return
  }

  studentItem.student.prepareMinutes = resolveMinutes(row.prepareMinutes, studentItem.student.prepareMinutes)
  studentItem.student.examMinutes = resolveMinutes(row.examMinutes, studentItem.student.examMinutes)
}

/**
 * Table rows and columns for the selected committee, including drag-reorder via a v-model.
 */
export function useEditorStudentTable(
  selectedCommittee: ComputedRef<ScheduleDraftCommittee | null>,
  thesisTitleDisplayMode: ComputedRef<ScheduleDraftThesisTitleDisplayMode>,
  tableViewMode: ComputedRef<EditorStudentsTableViewMode>
) {
  const { t } = useI18n()

  function reorderItemsByRows(committee: ScheduleDraftCommittee, rows: EditorTableRow[]): void {
    const orderedItems = committee.items.slice().sort((left, right) => left.position - right.position)
    if (rows.length !== orderedItems.length) {
      return
    }

    const itemsByLocalId = new Map(orderedItems.map((item) => [item.localId, item]))
    const rowsByLocalId = new Map(rows.map((row) => [row.id, row]))
    if (rowsByLocalId.size !== orderedItems.length) {
      return
    }

    for (const item of orderedItems) {
      const row = rowsByLocalId.get(item.localId)
      if (!row) {
        return
      }

      if (isStudentItem(item)) {
        if (!isEditorStudentRow(row)) {
          return
        }

        updateStudentItemFromRow(committee, item, row, thesisTitleDisplayMode.value)
      }
    }

    const reorderedItems = rows
      .map((row) => itemsByLocalId.get(row.id))
      .filter((item): item is ScheduleDraftItem => item !== undefined)
    if (reorderedItems.length !== orderedItems.length) {
      return
    }

    reorderedItems.forEach((item, index) => {
      item.position = index + 1
    })

    committee.items = reorderedItems
  }

  function reorderOnlyStudents(committee: ScheduleDraftCommittee, rows: EditorStudentTableRow[]): void {
    const orderedItems = committee.items.slice().sort((left, right) => left.position - right.position)
    const studentsByLocalId = new Map(orderedItems.filter(isStudentItem).map((item) => [item.localId, item]))
    const rowsByStudentId = new Map(rows.map((row) => [row.id, row]))
    if (rowsByStudentId.size !== studentsByLocalId.size) {
      return
    }

    for (const [studentId, studentItem] of studentsByLocalId.entries()) {
      const row = rowsByStudentId.get(studentId)
      if (!row) {
        return
      }

      updateStudentItemFromRow(committee, studentItem, row, thesisTitleDisplayMode.value)
    }

    const reorderedStudents = rows
      .map((row) => studentsByLocalId.get(row.id))
      .filter((item): item is ScheduleDraftItem & { type: 'STUDENT' } => item !== undefined)
    if (reorderedStudents.length !== studentsByLocalId.size) {
      return
    }

    let studentIndex = 0
    const reorderedCommitteeItems = orderedItems.map((item) => {
      if (!isStudentItem(item)) {
        return item
      }

      const nextStudent = reorderedStudents[studentIndex]
      studentIndex += 1
      return nextStudent ?? item
    })

    reorderedCommitteeItems.forEach((item, index) => {
      item.position = index + 1
    })

    committee.items = reorderedCommitteeItems
  }

  const selectedRows = computed<EditorTableRow[]>({
    get: () => {
      const committee = selectedCommittee.value
      if (!committee) {
        return []
      }

      return buildEditorTableRowsForCommittee(committee)
    },
    set: (value) => {
      const committee = selectedCommittee.value
      if (!committee) {
        return
      }

      reorderItemsByRows(committee, value)
    }
  })

  // Backward-compatible interface for student-only update flows in existing tests/composables.
  const selectedStudents = computed<EditorStudentTableRow[]>({
    get: () => selectedRows.value.filter(isEditorStudentRow),
    set: (value) => {
      const committee = selectedCommittee.value
      if (!committee) {
        return
      }

      reorderOnlyStudents(committee, value)
    }
  })

  const columns = computed<TableColumn<EditorTableRow>[]>(() => {
    const thesisTitleColumns: TableColumn<EditorTableRow>[] =
      thesisTitleDisplayMode.value === 'BOTH'
        ? [
            {
              accessorKey: 'thesisTitleLocal',
              header: t('editor.table.thesisTitleLocal'),
              meta: { class: { th: `whitespace-nowrap ${STUDENT_TABLE_THESIS_COLUMN_WIDTH_CLASS}` } }
            },
            {
              accessorKey: 'thesisTitleEn',
              header: t('editor.table.thesisTitleEn'),
              meta: { class: { th: `whitespace-nowrap ${STUDENT_TABLE_THESIS_COLUMN_WIDTH_CLASS}` } }
            }
          ]
        : [
            {
              accessorKey: 'thesisTitle',
              header: t('editor.table.thesisTitle'),
              meta: { class: { th: `whitespace-nowrap ${STUDENT_TABLE_THESIS_COLUMN_WIDTH_CLASS}` } }
            }
          ]

    let pauseDetailsColspan = 1

    const allColumns: TableColumn<EditorTableRow>[] = [
      {
        id: 'drag',
        header: '',
        meta: { class: { th: 'w-10', td: 'w-10' } }
      },
      {
        id: 'order',
        header: t('editor.table.order'),
        meta: {
          class: {
            th: 'w-36 whitespace-nowrap',
            td: 'px-0 py-0 text-muted text-sm font-semibold whitespace-nowrap'
          }
        }
      },
      {
        accessorKey: 'prepareTime',
        header: t('editor.table.prepareTime'),
        meta: {
          class: {
            th: 'whitespace-nowrap',
            td: (cell: { row: { original: EditorTableRow } }) => {
              if (cell.row.original.kind === 'PAUSE') {
                return 'editor-students-pause-details-cell'
              }

              return 'whitespace-nowrap'
            }
          },
          colspan: {
            td: (cell: { row: { original: EditorTableRow } }) => {
              if (cell.row.original.kind !== 'PAUSE') {
                return '1'
              }

              return String(pauseDetailsColspan)
            }
          }
        }
      },
      { accessorKey: 'examTime', header: t('editor.table.examTime'), meta: { class: { th: 'whitespace-nowrap' } } },
      {
        accessorKey: 'titlesBefore',
        header: t('editor.table.titlesBefore'),
        meta: { class: { th: 'whitespace-nowrap' } }
      },
      { accessorKey: 'firstName', header: t('editor.table.firstName'), meta: { class: { th: 'whitespace-nowrap' } } },
      { accessorKey: 'lastName', header: t('editor.table.lastName'), meta: { class: { th: 'whitespace-nowrap' } } },
      {
        accessorKey: 'titlesAfter',
        header: t('editor.table.titlesAfter'),
        meta: { class: { th: 'whitespace-nowrap' } }
      },
      { accessorKey: 'email', header: t('editor.table.email'), meta: { class: { th: 'whitespace-nowrap' } } },
      {
        accessorKey: 'specializationCode',
        header: t('editor.table.specialization'),
        meta: { class: { th: 'whitespace-nowrap' } }
      },
      { accessorKey: 'repeatType', header: t('editor.table.repeatType'), meta: { class: { th: 'whitespace-nowrap' } } },
      {
        accessorKey: 'prepareMinutes',
        header: t('editor.table.prepareMinutes'),
        meta: { class: { th: 'whitespace-nowrap' } }
      },
      {
        accessorKey: 'examMinutes',
        header: t('editor.table.examMinutes'),
        meta: { class: { th: 'whitespace-nowrap' } }
      },
      ...thesisTitleColumns,
      {
        accessorKey: 'thesisLanguage',
        header: t('editor.table.thesisLanguage'),
        meta: { class: { th: 'whitespace-nowrap' } }
      },
      {
        accessorKey: 'supervisorName',
        header: t('editor.table.supervisor'),
        meta: { class: { th: 'whitespace-nowrap' } }
      },
      {
        accessorKey: 'additionalSupervisorName',
        header: t('editor.table.additionalSupervisor'),
        meta: { class: { th: 'min-w-[6.5rem] whitespace-nowrap' } }
      },
      { accessorKey: 'reviewerName', header: t('editor.table.reviewer'), meta: { class: { th: 'whitespace-nowrap' } } },
      {
        accessorKey: 'additionalReviewerName',
        header: t('editor.table.additionalReviewer'),
        meta: { class: { th: 'min-w-[6.5rem] whitespace-nowrap' } }
      },
      {
        accessorKey: 'studyLanguage',
        header: t('editor.table.studyLanguage'),
        meta: { class: { th: 'whitespace-nowrap' } }
      },
      {
        accessorKey: 'studyProgramType',
        header: t('editor.table.studyProgramType'),
        meta: { class: { th: 'whitespace-nowrap' } }
      },
      {
        accessorKey: 'studyProgramName',
        header: t('editor.table.studyProgramName'),
        meta: { class: { th: 'whitespace-nowrap' } }
      }
    ]

    const visibleColumns =
      tableViewMode.value !== 'OPTIMIZED'
        ? allColumns
        : allColumns.filter((column) => {
            const accessorKey = (column as { accessorKey?: unknown }).accessorKey
            if (typeof accessorKey !== 'string') {
              return true
            }

            const hiddenColumns = new Set([
              'titlesBefore',
              'titlesAfter',
              'thesisLanguage',
              'studyLanguage',
              'studyProgramType',
              'studyProgramName',
              'specializationCode'
            ])

            return !hiddenColumns.has(accessorKey)
          })

    pauseDetailsColspan = Math.max(1, visibleColumns.length - 2)
    return visibleColumns
  })

  return {
    selectedRows,
    selectedStudents,
    columns
  }
}
