import { useEditorCommitteeFields } from '~/composables/editor/useEditorCommitteeFields'
import { useEditorCommitteeList } from '~/composables/editor/useEditorCommitteeList'
import { useEditorInvigilators } from '~/composables/editor/useEditorInvigilators'
import { useEditorScheduleDialogs } from '~/composables/editor/useEditorScheduleDialogs'
import { useEditorStudentTable } from '~/composables/editor/useEditorStudentTable'
import { useScheduleDraftStore } from '~/stores/schedule-draft'

/**
 * Facade composable for the schedule editor page: composes committee list, student table,
 * field mutations, invigilators, and draft/cloud dialogs. Keeps a stable public API for the page and tests.
 */
export function useEditorPage() {
  const { t } = useI18n()
  const scheduleDraftStore = useScheduleDraftStore()

  const committeeList = useEditorCommitteeList()
  const studentTable = useEditorStudentTable(committeeList.selectedCommittee)
  const committeeFields = useEditorCommitteeFields(committeeList.selectedCommittee)
  const invigilators = useEditorInvigilators(committeeList.selectedCommittee)
  const scheduleDialogs = useEditorScheduleDialogs()

  const draftName = computed(() => scheduleDraftStore.draft?.name ?? t('editor.untitled'))
  const studentsCountLabel = computed(() =>
    t('editor.students.count', { count: studentTable.selectedStudents.value.length })
  )
  const isPageLoading = computed(() => scheduleDraftStore.isDraftLoading)

  return {
    ...committeeList,
    ...studentTable,
    ...committeeFields,
    ...invigilators,
    ...scheduleDialogs,
    draftName,
    studentsCountLabel,
    isPageLoading
  }
}
