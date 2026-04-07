import type { TableColumn } from '@nuxt/ui'
import { resolveEditorSpecializationOptions, type EditorSpecializationOption } from '#shared/constants/editor'
import { STUDENT_TABLE_THESIS_COLUMN_WIDTH_CLASS } from '~/constants/editor-students-table'
import type { StudentRow } from '~/types/editor'
import type {
  ScheduleDraftCommittee,
  ScheduleDraftItem,
  ScheduleDraftThesisTitleDisplayMode
} from '~/types/schedule-draft'
import { isStudentItem, normalizeOptionalText, normalizeRequiredText } from '~/utils/editor/draft-committee'
import { resolveRepeatType } from '~/utils/editor/repeat-type'
import { buildStudentRowsForCommittee } from '~/utils/editor/student-table'
import { resolveThesisLanguage } from '~/utils/editor/thesis-language'

function resolveMinutes(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback
  }

  return Math.max(Math.trunc(value), 0)
}

function resolveRequiredText(nextValue: string, fallback: string): string {
  const normalized = normalizeRequiredText(nextValue)
  return normalized.length > 0 ? normalized : fallback
}

/**
 * Student rows and table columns for the selected committee, including drag-reorder via v-model.
 */
export function useEditorStudentTable(
  selectedCommittee: ComputedRef<ScheduleDraftCommittee | null>,
  thesisTitleDisplayMode: ComputedRef<ScheduleDraftThesisTitleDisplayMode>
) {
  const { t } = useI18n()

  const selectedStudents = computed<StudentRow[]>({
    get: () => {
      const committee = selectedCommittee.value
      if (!committee) {
        return []
      }

      return buildStudentRowsForCommittee(committee)
    },
    set: (value) => {
      const committee = selectedCommittee.value
      if (!committee) {
        return
      }

      const orderedItems = committee.items.slice().sort((left, right) => left.position - right.position)
      const studentsByLocalId = new Map(orderedItems.filter(isStudentItem).map((item) => [item.localId, item]))
      const rowsByStudentId = new Map(value.map((row) => [row.id, row]))
      if (rowsByStudentId.size !== studentsByLocalId.size) {
        return
      }

      const specializationByCode = new Map(
        resolveEditorSpecializationOptions(committee.studyProgramType, committee.studyProgramName).map((option) => [
          option.specializationCode,
          option
        ])
      )

      for (const [studentId, studentItem] of studentsByLocalId.entries()) {
        const row = rowsByStudentId.get(studentId)
        if (!row) {
          return
        }

        studentItem.student.lastName = resolveRequiredText(row.lastName, studentItem.student.lastName)
        studentItem.student.firstName = resolveRequiredText(row.firstName, studentItem.student.firstName)
        studentItem.student.titlesBefore = normalizeOptionalText(row.titlesBefore)
        studentItem.student.titlesAfter = normalizeOptionalText(row.titlesAfter)

        const specializationCode = normalizeRequiredText(row.specializationCode)
        studentItem.student.specializationCode = specializationCode
        if (specializationCode.length < 1) {
          studentItem.student.specializationName = ''
        } else {
          const specializationOption = specializationByCode.get(specializationCode)
          studentItem.student.specializationName = specializationOption?.specializationName ?? specializationCode
        }

        if (thesisTitleDisplayMode.value === 'BOTH') {
          studentItem.student.thesisTitleLocal = normalizeRequiredText(row.thesisTitleLocal)
          studentItem.student.thesisTitleEn = normalizeRequiredText(row.thesisTitleEn)
        } else {
          const normalizedThesisTitle = normalizeRequiredText(row.thesisTitle)
          if (committee.language === 'ENGLISH') {
            studentItem.student.thesisTitleEn = normalizedThesisTitle
          } else {
            studentItem.student.thesisTitleLocal = normalizedThesisTitle
          }
        }

        studentItem.student.supervisorName = normalizeRequiredText(row.supervisorName)
        studentItem.student.additionalSupervisorName = normalizeOptionalText(row.additionalSupervisorName)
        studentItem.student.reviewerName = normalizeRequiredText(row.reviewerName)
        studentItem.student.additionalReviewerName = normalizeOptionalText(row.additionalReviewerName)
        studentItem.student.thesisLanguage = resolveThesisLanguage(
          row.thesisLanguage,
          studentItem.student.thesisLanguage
        )
        studentItem.student.repeatType = resolveRepeatType(row.repeatType, studentItem.student.repeatType)
        studentItem.student.prepareMinutes = resolveMinutes(row.prepareMinutes, studentItem.student.prepareMinutes)
        studentItem.student.examMinutes = resolveMinutes(row.examMinutes, studentItem.student.examMinutes)
      }

      const reorderedStudents = value
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
  })

  const specializationOptions = computed<EditorSpecializationOption[]>(() => {
    const committee = selectedCommittee.value
    if (!committee) {
      return []
    }

    return resolveEditorSpecializationOptions(committee.studyProgramType, committee.studyProgramName)
  })

  const columns = computed<TableColumn<StudentRow>[]>(() => {
    const thesisTitleColumns: TableColumn<StudentRow>[] =
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

    return [
      {
        id: 'drag',
        header: '',
        meta: { class: { th: 'w-10', td: 'w-10' } }
      },
      {
        id: 'order',
        header: t('editor.table.order'),
        meta: { class: { th: 'w-16 whitespace-nowrap', td: 'text-muted text-xs font-semibold whitespace-nowrap' } }
      },
      {
        accessorKey: 'prepareTime',
        header: t('editor.table.prepareTime'),
        meta: { class: { th: 'whitespace-nowrap' } }
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
      {
        accessorKey: 'specializationCode',
        header: t('editor.table.specialization'),
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
      }
    ]
  })

  return {
    selectedStudents,
    columns,
    specializationOptions
  }
}
