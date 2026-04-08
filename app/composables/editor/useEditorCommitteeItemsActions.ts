import { useScheduleDraftStore } from '~/stores/schedule-draft'
import type { ScheduleDraftCommittee } from '~/types/schedule-draft'
import { isPauseItem, isStudentItem, resolveCommitteeLabel } from '~/utils/editor/draft-committee'
import {
  applyStudentCommitteeRewrite,
  buildStudentCommitteeRewritePreview,
  hasStudentCommitteeRewriteChanges,
  toStudentCommitteeRewritePreviewList
} from '~/utils/editor/student-committee-rewrite'

type EditorDeleteItemTargetKind = 'STUDENT' | 'PAUSE'

interface EditorDeleteItemTarget {
  kind: EditorDeleteItemTargetKind
  label: string
}

function normalizeCommitteeItemsOrder(items: ScheduleDraftCommittee['items']): ScheduleDraftCommittee['items'] {
  const orderedItems = items.slice().sort((left, right) => left.position - right.position)

  orderedItems.forEach((item, index) => {
    item.position = index + 1
  })

  return orderedItems
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
  const currentItemsCount = committee.items.length
  const filteredItems = committee.items.filter((item) => item.localId !== itemLocalId)
  if (filteredItems.length === currentItemsCount) {
    return false
  }

  committee.items = normalizeCommitteeItemsOrder(filteredItems)
  return true
}

/**
 * Actions for committee table items (student + pause): delete confirm flow and move-student flow.
 */
export function useEditorCommitteeItemsActions(
  selectedCommittee: ComputedRef<ScheduleDraftCommittee | null>,
  focusStudentInCommittee: (committeeId: string, studentId: string) => void
) {
  const { t } = useI18n()
  const scheduleDraftStore = useScheduleDraftStore()

  const isDeleteItemConfirmOpen = ref(false)
  const deleteItemLocalId = ref<string | null>(null)
  const isMoveStudentDialogOpen = ref(false)
  const moveStudentLocalId = ref<string | null>(null)
  const moveStudentSourceCommitteeId = ref<string | null>(null)
  const selectedMoveStudentTargetCommitteeId = ref<string | null>(null)
  const fallbackCommitteeLabel = computed(() => t('editor.untitled'))

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

  const moveStudentSourceCommittee = computed(() => {
    const draft = scheduleDraftStore.draft
    const sourceCommitteeId = moveStudentSourceCommitteeId.value
    if (!draft || !sourceCommitteeId) {
      return null
    }

    return draft.committees.find((committee) => committee.localId === sourceCommitteeId) ?? null
  })

  const moveStudentSourceCommitteeLabel = computed(() => {
    const sourceCommittee = moveStudentSourceCommittee.value
    if (!sourceCommittee) {
      return t('editor.items.move.fallbackCommitteeName')
    }

    return resolveCommitteeLabel(sourceCommittee, fallbackCommitteeLabel.value)
  })

  const moveStudentSourceItem = computed(() => {
    const sourceCommittee = moveStudentSourceCommittee.value
    const studentLocalId = moveStudentLocalId.value
    if (!sourceCommittee || !studentLocalId) {
      return null
    }

    const sourceItem = sourceCommittee.items.find((item) => item.localId === studentLocalId)
    return sourceItem && isStudentItem(sourceItem) ? sourceItem : null
  })

  const moveStudentLabel = computed(() => {
    const sourceItem = moveStudentSourceItem.value
    if (!sourceItem) {
      return t('editor.items.move.fallbackStudentName')
    }

    const normalizedName = `${sourceItem.student.firstName} ${sourceItem.student.lastName}`.trim()
    return normalizedName.length > 0 ? normalizedName : t('editor.items.move.fallbackStudentName')
  })

  const moveStudentDialogTitle = computed(() => t('editor.items.move.dialogTitle'))
  const moveStudentDialogDescription = computed(() => {
    return t('editor.items.move.description', {
      name: moveStudentLabel.value,
      committee: moveStudentSourceCommitteeLabel.value
    })
  })
  const moveStudentCurrentCommitteeBadgeLabel = computed(() => t('editor.items.move.currentCommitteeBadge'))

  const moveStudentTargetCommittee = computed(() => {
    const draft = scheduleDraftStore.draft
    const sourceCommitteeId = moveStudentSourceCommitteeId.value
    const targetCommitteeId = selectedMoveStudentTargetCommitteeId.value
    if (!draft || !sourceCommitteeId || !targetCommitteeId || sourceCommitteeId === targetCommitteeId) {
      return null
    }

    return draft.committees.find((committee) => committee.localId === targetCommitteeId) ?? null
  })

  const moveStudentRewritePreviewObject = computed(() => {
    const sourceItem = moveStudentSourceItem.value
    const targetCommittee = moveStudentTargetCommittee.value
    if (!sourceItem || !targetCommittee) {
      return null
    }

    return buildStudentCommitteeRewritePreview(sourceItem.student, targetCommittee)
  })

  const moveStudentRewritePreview = computed(() => {
    if (!moveStudentRewritePreviewObject.value) {
      return null
    }

    return toStudentCommitteeRewritePreviewList(moveStudentRewritePreviewObject.value)
  })

  const moveStudentHasRewriteChanges = computed(() => {
    if (!moveStudentRewritePreviewObject.value) {
      return false
    }

    return hasStudentCommitteeRewriteChanges(moveStudentRewritePreviewObject.value)
  })

  const moveStudentSubmitLabel = computed(() => {
    return moveStudentHasRewriteChanges.value
      ? t('editor.items.move.submitWithOverwrite')
      : t('editor.items.move.submit')
  })

  const isMoveStudentSubmitDisabled = computed(() => {
    return !moveStudentTargetCommittee.value
  })

  function openMoveStudentDialog(studentLocalId: string): void {
    const committee = selectedCommittee.value
    if (!committee) {
      return
    }

    const targetItem = committee.items.find((item) => item.localId === studentLocalId)
    if (!targetItem || !isStudentItem(targetItem)) {
      return
    }

    moveStudentLocalId.value = studentLocalId
    moveStudentSourceCommitteeId.value = committee.localId
    selectedMoveStudentTargetCommitteeId.value = null
    isMoveStudentDialogOpen.value = true
  }

  function selectMoveStudentTargetCommittee(targetCommitteeId: string): void {
    const draft = scheduleDraftStore.draft
    const sourceCommitteeId = moveStudentSourceCommitteeId.value
    if (!draft || !sourceCommitteeId || targetCommitteeId === sourceCommitteeId) {
      return
    }

    const targetCommitteeExists = draft.committees.some((committee) => committee.localId === targetCommitteeId)
    if (!targetCommitteeExists) {
      return
    }

    selectedMoveStudentTargetCommitteeId.value = targetCommitteeId
  }

  function closeMoveStudentDialog(): void {
    isMoveStudentDialogOpen.value = false
    moveStudentLocalId.value = null
    moveStudentSourceCommitteeId.value = null
    selectedMoveStudentTargetCommitteeId.value = null
  }

  function submitMoveStudentToCommittee(targetCommitteeId?: string): void {
    const draft = scheduleDraftStore.draft
    const studentLocalId = moveStudentLocalId.value
    const sourceCommitteeId = moveStudentSourceCommitteeId.value
    const resolvedTargetCommitteeId = targetCommitteeId ?? selectedMoveStudentTargetCommitteeId.value
    if (!draft || !studentLocalId || !sourceCommitteeId) {
      closeMoveStudentDialog()
      return
    }

    if (!resolvedTargetCommitteeId || sourceCommitteeId === resolvedTargetCommitteeId) {
      return
    }

    const sourceCommittee = draft.committees.find((committee) => committee.localId === sourceCommitteeId)
    const targetCommittee = draft.committees.find((committee) => committee.localId === resolvedTargetCommitteeId)
    if (!sourceCommittee || !targetCommittee) {
      closeMoveStudentDialog()
      return
    }

    const sourceItems = sourceCommittee.items.slice().sort((left, right) => left.position - right.position)
    const sourceItemIndex = sourceItems.findIndex((item) => item.localId === studentLocalId && isStudentItem(item))
    if (sourceItemIndex < 0) {
      closeMoveStudentDialog()
      return
    }

    const [movedStudentItem] = sourceItems.splice(sourceItemIndex, 1)
    if (!movedStudentItem || !isStudentItem(movedStudentItem)) {
      closeMoveStudentDialog()
      return
    }

    applyStudentCommitteeRewrite(movedStudentItem.student, targetCommittee)
    sourceCommittee.items = normalizeCommitteeItemsOrder(sourceItems)

    const targetItems = targetCommittee.items.slice().sort((left, right) => left.position - right.position)
    movedStudentItem.position = targetItems.length + 1
    targetCommittee.items = normalizeCommitteeItemsOrder([...targetItems, movedStudentItem])

    closeMoveStudentDialog()
    focusStudentInCommittee(resolvedTargetCommitteeId, studentLocalId)
  }

  return {
    isDeleteItemConfirmOpen,
    deleteItemConfirmActionLabel,
    deleteItemConfirmDescription,
    isMoveStudentDialogOpen,
    moveStudentDialogTitle,
    moveStudentDialogDescription,
    moveStudentSourceCommitteeId,
    selectedMoveStudentTargetCommitteeId,
    moveStudentCurrentCommitteeBadgeLabel,
    moveStudentRewritePreview,
    moveStudentHasRewriteChanges,
    moveStudentSubmitLabel,
    isMoveStudentSubmitDisabled,
    openDeleteItemConfirm,
    closeDeleteItemConfirm,
    submitDeleteItem,
    openMoveStudentDialog,
    selectMoveStudentTargetCommittee,
    closeMoveStudentDialog,
    submitMoveStudentToCommittee,
    requestMoveStudentToAnotherCommittee: openMoveStudentDialog
  }
}
