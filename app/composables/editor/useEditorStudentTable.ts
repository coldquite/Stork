import type { TableColumn } from '@nuxt/ui'
import type { StudentRow } from '~/types/editor'
import type { ScheduleDraftCommittee, ScheduleDraftItem } from '~/types/schedule-draft'
import { isStudentItem, toStudentRow } from '~/utils/editor/draft-committee'

/**
 * Student rows and table columns for the selected committee, including drag-reorder via v-model.
 */
export function useEditorStudentTable(selectedCommittee: ComputedRef<ScheduleDraftCommittee | null>) {
  const { t } = useI18n()

  const selectedStudents = computed<StudentRow[]>({
    get: () => {
      if (!selectedCommittee.value) {
        return []
      }

      return selectedCommittee.value.items
        .slice()
        .sort((left, right) => left.position - right.position)
        .filter(isStudentItem)
        .map((item) => toStudentRow(item))
    },
    set: (value) => {
      const committee = selectedCommittee.value
      if (!committee) {
        return
      }

      const orderedItems = committee.items.slice().sort((left, right) => left.position - right.position)
      const studentsByLocalId = new Map(orderedItems.filter(isStudentItem).map((item) => [item.localId, item]))
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

  const columns = computed<TableColumn<StudentRow>[]>(() => [
    {
      id: 'drag',
      header: '',
      meta: { class: { th: 'w-10', td: 'w-10' } }
    },
    {
      id: 'order',
      header: t('editor.table.order'),
      meta: { class: { th: 'w-16', td: 'text-muted text-xs font-semibold' } }
    },
    { accessorKey: 'fullName', header: t('editor.table.student') },
    { accessorKey: 'personalNumber', header: t('editor.table.personalNumber') },
    { accessorKey: 'specialization', header: t('editor.table.specialization') },
    { accessorKey: 'thesisTitle', header: t('editor.table.thesisTitle') }
  ])

  return {
    selectedStudents,
    columns
  }
}
