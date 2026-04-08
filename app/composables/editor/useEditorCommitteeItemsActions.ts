import type { ScheduleDraftCommittee } from '~/types/schedule-draft'
import { isPauseItem, isStudentItem } from '~/utils/editor/draft-committee'

type EditorDeleteItemTargetKind = 'STUDENT' | 'PAUSE'

interface EditorDeleteItemTarget {
  kind: EditorDeleteItemTargetKind
  label: string
}

function resolveStudentLabel(committeeItem: ScheduleDraftCommittee['items'][number]): string {
  if (!isStudentItem(committeeItem)) {
    return ''
  }

  return `${committeeItem.student.firstName} ${committeeItem.student.lastName}`.trim()
}

function resolvePauseLabel(
  committeeItem: ScheduleDraftCommittee['items'][number],
  fallbackBreakLabel: string,
  fallbackLunchLabel: string
): string {
  if (!isPauseItem(committeeItem)) {
    return ''
  }

  const normalizedCustomLabel = committeeItem.pause.label.trim()
  if (normalizedCustomLabel.length > 0) {
    return normalizedCustomLabel
  }

  return committeeItem.pause.pauseType === 'LUNCH' ? fallbackLunchLabel : fallbackBreakLabel
}

function removeCommitteeItemByLocalId(committee: ScheduleDraftCommittee, itemLocalId: string): boolean {
  const orderedItems = committee.items.slice().sort((left, right) => left.position - right.position)
  const filteredItems = orderedItems.filter((item) => item.localId !== itemLocalId)
  if (filteredItems.length === orderedItems.length) {
    return false
  }

  filteredItems.forEach((item, index) => {
    item.position = index + 1
  })

  committee.items = filteredItems
  return true
}

/**
 * Actions for committee table items (student + pause): delete confirm flow and move-student placeholder.
 */
export function useEditorCommitteeItemsActions(selectedCommittee: ComputedRef<ScheduleDraftCommittee | null>) {
  const { t } = useI18n()

  const isDeleteItemConfirmOpen = ref(false)
  const deleteItemLocalId = ref<string | null>(null)

  const deleteItemTarget = computed<EditorDeleteItemTarget | null>(() => {
    const committee = selectedCommittee.value
    const targetLocalId = deleteItemLocalId.value
    if (!committee || !targetLocalId) {
      return null
    }

    const targetItem = committee.items.find((item) => item.localId === targetLocalId)
    if (!targetItem) {
      return null
    }

    if (isStudentItem(targetItem)) {
      return {
        kind: 'STUDENT',
        label: resolveStudentLabel(targetItem)
      }
    }

    if (isPauseItem(targetItem)) {
      return {
        kind: 'PAUSE',
        label: resolvePauseLabel(targetItem, t('editor.pause.typeOptions.break'), t('editor.pause.typeOptions.lunch'))
      }
    }

    return null
  })

  const deleteItemConfirmActionLabel = computed(() => t('editor.items.delete.confirmAction'))
  const deleteItemConfirmDescription = computed(() => {
    const target = deleteItemTarget.value
    if (!target) {
      return t('editor.items.delete.fallbackDescription')
    }

    if (target.kind === 'STUDENT') {
      return t('editor.items.delete.studentDescription', {
        name: target.label || t('editor.items.delete.fallbackStudentName')
      })
    }

    return t('editor.items.delete.pauseDescription', {
      name: target.label || t('editor.items.delete.fallbackPauseName')
    })
  })

  function openDeleteItemConfirm(itemLocalId: string): void {
    const committee = selectedCommittee.value
    if (!committee) {
      return
    }

    const hasTargetItem = committee.items.some((item) => item.localId === itemLocalId)
    if (!hasTargetItem) {
      return
    }

    deleteItemLocalId.value = itemLocalId
    isDeleteItemConfirmOpen.value = true
  }

  function closeDeleteItemConfirm(): void {
    isDeleteItemConfirmOpen.value = false
    deleteItemLocalId.value = null
  }

  function submitDeleteItem(): void {
    const committee = selectedCommittee.value
    const targetLocalId = deleteItemLocalId.value
    if (!committee || !targetLocalId) {
      closeDeleteItemConfirm()
      return
    }

    removeCommitteeItemByLocalId(committee, targetLocalId)
    closeDeleteItemConfirm()
  }

  function requestMoveStudentToAnotherCommittee(studentLocalId: string): void {
    const committee = selectedCommittee.value
    if (!committee) {
      return
    }

    const targetItem = committee.items.find((item) => item.localId === studentLocalId)
    if (!targetItem || !isStudentItem(targetItem)) {
      return
    }

    // Placeholder: move between committees will be implemented in a dedicated follow-up.
  }

  return {
    isDeleteItemConfirmOpen,
    deleteItemConfirmActionLabel,
    deleteItemConfirmDescription,
    openDeleteItemConfirm,
    closeDeleteItemConfirm,
    submitDeleteItem,
    requestMoveStudentToAnotherCommittee
  }
}
