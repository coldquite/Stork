type EditorCommitteeItemDeletionKind = 'STUDENT' | 'PAUSE'

const DELETE_TOAST_DURATION_MS = 10_000
const DELETE_TOAST_ICON = 'i-lucide-trash-2'

function resolveNormalizedName(name: string, fallbackName: string): string {
  const normalizedName = name.trim()
  return normalizedName.length > 0 ? normalizedName : fallbackName
}

export function useDeletionToasts() {
  const { t } = useI18n()
  const toast = useToast()

  function showDeletedSuccessToast(title: string, description: string): void {
    toast.add({
      title,
      description,
      color: 'success',
      icon: DELETE_TOAST_ICON,
      duration: DELETE_TOAST_DURATION_MS
    })
  }

  function showTeachersDictionaryEntryDeleted(entryName: string): void {
    const resolvedName = resolveNormalizedName(entryName, t('teachersDictionary.table.delete.fallbackEntryName'))
    showDeletedSuccessToast(
      t('teachersDictionary.table.delete.toast.successTitle'),
      t('teachersDictionary.table.delete.toast.successDescription', { name: resolvedName })
    )
  }

  function showManualScheduleDeleted(scheduleName: string): void {
    const resolvedName = resolveNormalizedName(scheduleName, t('homepage.schedulesModal.delete.fallbackScheduleName'))
    showDeletedSuccessToast(
      t('homepage.schedulesModal.delete.toast.successTitle'),
      t('homepage.schedulesModal.delete.toast.successDescription', { name: resolvedName })
    )
  }

  function showCommitteeDeleted(committeeName: string): void {
    const resolvedName = resolveNormalizedName(committeeName, t('editor.untitled'))
    showDeletedSuccessToast(
      t('editor.committees.delete.toast.successTitle'),
      t('editor.committees.delete.toast.successDescription', { name: resolvedName })
    )
  }

  function showCommitteeItemDeleted(kind: EditorCommitteeItemDeletionKind, itemName: string): void {
    const successTitle = t('editor.items.delete.toast.successTitle')
    if (kind === 'STUDENT') {
      const resolvedName = resolveNormalizedName(itemName, t('editor.items.delete.fallbackStudentName'))
      showDeletedSuccessToast(
        successTitle,
        t('editor.items.delete.toast.studentSuccessDescription', { name: resolvedName })
      )
      return
    }

    const resolvedName = resolveNormalizedName(itemName, t('editor.items.delete.fallbackPauseName'))
    showDeletedSuccessToast(
      successTitle,
      t('editor.items.delete.toast.pauseSuccessDescription', { name: resolvedName })
    )
  }

  return {
    showTeachersDictionaryEntryDeleted,
    showManualScheduleDeleted,
    showCommitteeDeleted,
    showCommitteeItemDeleted
  }
}
