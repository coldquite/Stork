import { isValid, parseISO, startOfDay } from 'date-fns'
import { useValidationField } from '~/composables/useValidationField'
import { useScheduleDraftStore } from '~/stores/schedule-draft'
import type { ScheduleDraftCommittee } from '~/types/schedule-draft'
import {
  assignCommitteePreparationRoom,
  buildEditorCommitteeListEntries,
  normalizeOptionalText,
  resolveCommitteeLabel,
  type EditorCommitteeListEntry
} from '~/utils/editor/draft-committee'
import { createLocalId } from '~/utils/id'

interface SyncInvigilatorsCommitteeItem {
  id: string
  label: string
  description: string
  currentInvigilators: SyncInvigilatorsDiffEntry[]
  nextInvigilators: string[]
}

interface SyncInvigilatorsDiffEntry {
  id: string
  name: string
  willBeRemoved: boolean
}

const SYNC_INVIGILATORS_TOAST_DURATION_MS = 10_000
const SYNC_INVIGILATORS_SUCCESS_TOAST_ICON = 'i-lucide-refresh-cw'
const SYNC_INVIGILATORS_NO_CHANGES_TOAST_ICON = 'i-lucide-circle-alert'

function resolveCommitteeDayKey(dateIso: string): number | null {
  const parsedDate = parseISO(dateIso)
  if (!isValid(parsedDate)) {
    return null
  }

  return startOfDay(parsedDate).getTime()
}

function normalizePreparationRoomKey(preparationRoom: string | null | undefined): string | null {
  const normalizedPreparationRoom = normalizeOptionalText(preparationRoom)
  if (!normalizedPreparationRoom) {
    return null
  }

  return normalizedPreparationRoom.toLocaleLowerCase('cs-CZ')
}

function normalizeInvigilatorNameKey(name: string): string | null {
  const normalizedName = normalizeOptionalText(name)
  if (!normalizedName) {
    return null
  }

  return normalizedName.toLocaleLowerCase('cs-CZ')
}

function normalizeInvigilatorDisplayName(name: string): string {
  return normalizeOptionalText(name) ?? '—'
}

function createInvigilatorNameCounter(invigilatorNames: string[]): Map<string, number> {
  const nameCounter = new Map<string, number>()

  for (const name of invigilatorNames) {
    const key = normalizeInvigilatorNameKey(name)
    if (!key) {
      continue
    }

    nameCounter.set(key, (nameCounter.get(key) ?? 0) + 1)
  }

  return nameCounter
}

function consumeInvigilatorName(counter: Map<string, number>, nameKey: string | null): boolean {
  if (!nameKey) {
    return false
  }

  const remainingCount = counter.get(nameKey) ?? 0
  if (remainingCount < 1) {
    return false
  }

  counter.set(nameKey, remainingCount - 1)
  return true
}

function countComparableInvigilatorNames(invigilatorNames: string[]): number {
  let comparableNameCount = 0

  for (const name of invigilatorNames) {
    if (normalizeInvigilatorNameKey(name)) {
      comparableNameCount += 1
    }
  }

  return comparableNameCount
}

function areInvigilatorNameListsEquivalent(
  sourceInvigilatorNames: string[],
  targetInvigilatorNames: string[]
): boolean {
  const sourceNameCounter = createInvigilatorNameCounter(sourceInvigilatorNames)
  const sourceComparableNamesCount = countComparableInvigilatorNames(sourceInvigilatorNames)
  let targetComparableNamesCount = 0

  for (const name of targetInvigilatorNames) {
    const nameKey = normalizeInvigilatorNameKey(name)
    if (!nameKey) {
      continue
    }

    targetComparableNamesCount += 1
    if (!consumeInvigilatorName(sourceNameCounter, nameKey)) {
      return false
    }
  }

  if (sourceComparableNamesCount !== targetComparableNamesCount) {
    return false
  }

  return Array.from(sourceNameCounter.values()).every((remainingCount) => remainingCount === 0)
}

/**
 * Invigilator list UI state and mutations for the selected committee.
 */
export function useEditorInvigilators(selectedCommittee: ComputedRef<ScheduleDraftCommittee | null>) {
  const { t } = useI18n()
  const toast = useToast()
  const scheduleDraftStore = useScheduleDraftStore()

  const isAddInvigilatorDialogOpen = ref(false)
  const newInvigilatorName = ref('')
  const invigilatorValidationError = ref<string | null>(null)
  const isDeleteInvigilatorConfirmOpen = ref(false)
  const deleteInvigilatorLocalId = ref<string | null>(null)
  const isApplyPreparationRoomToAllConfirmOpen = ref(false)
  const applyPreparationRoomToAllSourceRoom = ref<string | null>(null)
  const isSyncInvigilatorsDialogOpen = ref(false)
  const syncInvigilatorsSourceCommitteeId = ref<string | null>(null)
  const selectedSyncInvigilatorsCommitteeIds = ref<string[]>([])

  const selectedInvigilators = computed(() => selectedCommittee.value?.invigilators ?? [])
  const fallbackCommitteeLabel = computed(() => t('editor.untitled'))

  const invigilatorsCountLabel = computed(() =>
    t('editor.committee.invigilators.count', { count: selectedInvigilators.value.length })
  )

  const deleteInvigilatorTargetName = computed(() => {
    const targetLocalId = deleteInvigilatorLocalId.value
    if (!targetLocalId) {
      return undefined
    }

    return selectedInvigilators.value.find((invigilator) => invigilator.localId === targetLocalId)?.name
  })
  const deleteInvigilatorConfirmDescription = computed(() => {
    return t('editor.committee.invigilators.delete.description', { name: deleteInvigilatorTargetName.value })
  })
  const applyPreparationRoomToAllRoom = computed(() => {
    const selectedRoom = normalizeOptionalText(selectedCommittee.value?.preparationRoom)
    return normalizeOptionalText(applyPreparationRoomToAllSourceRoom.value) ?? selectedRoom
  })
  const applyPreparationRoomToAllCommitteesCount = computed(() => scheduleDraftStore.draft?.committees.length ?? 0)
  const applyPreparationRoomToAllConfirmDescription = computed(() => {
    return t('editor.committee.preparationRoomSync.confirm.description', {
      room: applyPreparationRoomToAllRoom.value ?? '—',
      count: applyPreparationRoomToAllCommitteesCount.value
    })
  })
  const syncInvigilatorsSourceCommittee = computed(() => {
    const draft = scheduleDraftStore.draft
    const sourceCommitteeId = syncInvigilatorsSourceCommitteeId.value
    if (!draft || !sourceCommitteeId) {
      return null
    }

    return draft.committees.find((committee) => committee.localId === sourceCommitteeId) ?? null
  })
  const syncInvigilatorsSourceCommitteeLabel = computed(() => {
    const sourceCommittee = syncInvigilatorsSourceCommittee.value
    if (!sourceCommittee) {
      return fallbackCommitteeLabel.value
    }

    return resolveCommitteeLabel(sourceCommittee, fallbackCommitteeLabel.value)
  })
  const syncInvigilatorsSourceDayKey = computed(() => {
    const sourceCommittee = syncInvigilatorsSourceCommittee.value
    if (!sourceCommittee) {
      return null
    }

    return resolveCommitteeDayKey(sourceCommittee.date)
  })
  const syncInvigilatorsSourcePreparationRoomKey = computed(() => {
    return normalizePreparationRoomKey(syncInvigilatorsSourceCommittee.value?.preparationRoom)
  })

  function buildSyncInvigilatorsCommitteeDescription(entry: EditorCommitteeListEntry): string {
    return t('editor.schedule.export.csvCommitteesDialog.committeeDescription', {
      date: entry.dateLabel,
      room: entry.roomLabel,
      start: entry.timelineStartLabel,
      end: entry.timelineEndLabel,
      students: t('editor.students.count', { count: entry.studentsCount })
    })
  }

  const syncInvigilatorsCommitteeItems = computed<SyncInvigilatorsCommitteeItem[]>(() => {
    const sourceCommittee = syncInvigilatorsSourceCommittee.value
    if (!sourceCommittee) {
      return []
    }

    const sourceDayKey = syncInvigilatorsSourceDayKey.value
    const sourcePreparationRoomKey = syncInvigilatorsSourcePreparationRoomKey.value
    if (sourceDayKey === null || sourcePreparationRoomKey === null) {
      return []
    }

    const committeeEntries = buildEditorCommitteeListEntries(
      scheduleDraftStore.draft?.committees ?? [],
      fallbackCommitteeLabel.value
    )
    const sourceInvigilatorNames = sourceCommittee.invigilators.map((invigilator) => invigilator.name)
    const nextInvigilatorNames = sourceInvigilatorNames.map(normalizeInvigilatorDisplayName)

    return committeeEntries.flatMap((entry) => {
      const committee = entry.committee
      if (committee.localId === sourceCommittee.localId) {
        return []
      }

      const committeeDayKey = resolveCommitteeDayKey(committee.date)
      if (committeeDayKey !== sourceDayKey) {
        return []
      }

      if (normalizePreparationRoomKey(committee.preparationRoom) !== sourcePreparationRoomKey) {
        return []
      }

      const sourceNameCounter = createInvigilatorNameCounter(sourceInvigilatorNames)
      const currentInvigilatorDiff = committee.invigilators.map((invigilator) => ({
        id: invigilator.localId,
        name: normalizeInvigilatorDisplayName(invigilator.name),
        willBeRemoved: !consumeInvigilatorName(sourceNameCounter, normalizeInvigilatorNameKey(invigilator.name))
      }))

      return [
        {
          id: committee.localId,
          label: entry.label,
          description: buildSyncInvigilatorsCommitteeDescription(entry),
          currentInvigilators: currentInvigilatorDiff,
          nextInvigilators: nextInvigilatorNames
        }
      ]
    })
  })
  const selectableSyncInvigilatorsCommitteeIds = computed(() => {
    return syncInvigilatorsCommitteeItems.value.map((item) => item.id)
  })
  const isSyncInvigilatorsActionDisabled = computed(() => {
    if (!selectedCommittee.value) {
      return true
    }

    if (selectedInvigilators.value.length < 1) {
      return true
    }

    return normalizeOptionalText(selectedCommittee.value.preparationRoom) === null
  })
  const isSyncInvigilatorsSubmitDisabled = computed(() => {
    return (
      selectableSyncInvigilatorsCommitteeIds.value.length < 1 || selectedSyncInvigilatorsCommitteeIds.value.length < 1
    )
  })

  useValidationField(newInvigilatorName, invigilatorValidationError)

  function validateInvigilatorName(nextName: string): string | null {
    const normalizedName = nextName.trim()

    if (normalizedName.length < 1) {
      return t('editor.committee.invigilators.add.validation.required')
    }

    if (nextName !== normalizedName) {
      return t('editor.committee.invigilators.add.validation.leadingTrailingWhitespace')
    }

    return null
  }

  function openDeleteInvigilatorConfirm(invigilatorLocalId: string): void {
    const committee = selectedCommittee.value
    if (!committee) {
      return
    }

    const hasInvigilator = committee.invigilators.some((invigilator) => invigilator.localId === invigilatorLocalId)
    if (!hasInvigilator) {
      return
    }

    deleteInvigilatorLocalId.value = invigilatorLocalId
    isDeleteInvigilatorConfirmOpen.value = true
  }

  function closeDeleteInvigilatorConfirm(): void {
    isDeleteInvigilatorConfirmOpen.value = false
    deleteInvigilatorLocalId.value = null
  }

  function openApplyPreparationRoomToAllConfirm(): void {
    const room = normalizeOptionalText(selectedCommittee.value?.preparationRoom)
    if (!selectedCommittee.value || !room) {
      return
    }

    applyPreparationRoomToAllSourceRoom.value = room
    isApplyPreparationRoomToAllConfirmOpen.value = true
  }

  function closeApplyPreparationRoomToAllConfirm(): void {
    isApplyPreparationRoomToAllConfirmOpen.value = false
    applyPreparationRoomToAllSourceRoom.value = null
  }

  function sanitizeSelectedSyncInvigilatorsCommitteeIds(nextIds: string[]): string[] {
    const selectableCommitteeIds = new Set(selectableSyncInvigilatorsCommitteeIds.value)
    const uniqueIds: string[] = []

    for (const committeeId of nextIds) {
      if (!selectableCommitteeIds.has(committeeId) || uniqueIds.includes(committeeId)) {
        continue
      }

      uniqueIds.push(committeeId)
    }

    return uniqueIds
  }

  function openSyncInvigilatorsDialog(): void {
    const committee = selectedCommittee.value
    if (!committee || isSyncInvigilatorsActionDisabled.value) {
      return
    }

    syncInvigilatorsSourceCommitteeId.value = committee.localId
    selectedSyncInvigilatorsCommitteeIds.value = selectableSyncInvigilatorsCommitteeIds.value
    isSyncInvigilatorsDialogOpen.value = true
  }

  function closeSyncInvigilatorsDialog(): void {
    isSyncInvigilatorsDialogOpen.value = false
    syncInvigilatorsSourceCommitteeId.value = null
    selectedSyncInvigilatorsCommitteeIds.value = []
  }

  function updateSelectedSyncInvigilatorsCommitteeIds(nextIds: string[]): void {
    selectedSyncInvigilatorsCommitteeIds.value = sanitizeSelectedSyncInvigilatorsCommitteeIds(nextIds)
  }

  function selectAllSyncInvigilatorsCommittees(): void {
    selectedSyncInvigilatorsCommitteeIds.value = selectableSyncInvigilatorsCommitteeIds.value
  }

  function clearSyncInvigilatorsCommittees(): void {
    selectedSyncInvigilatorsCommitteeIds.value = []
  }

  function openAddInvigilatorDialog(): void {
    if (!selectedCommittee.value) {
      return
    }

    newInvigilatorName.value = ''
    invigilatorValidationError.value = null
    isAddInvigilatorDialogOpen.value = true
  }

  function closeAddInvigilatorDialog(): void {
    isAddInvigilatorDialogOpen.value = false
    newInvigilatorName.value = ''
    invigilatorValidationError.value = null
  }

  function submitAddInvigilator(): void {
    const committee = selectedCommittee.value
    if (!committee) {
      closeAddInvigilatorDialog()
      return
    }

    const validationError = validateInvigilatorName(newInvigilatorName.value)
    if (validationError) {
      invigilatorValidationError.value = validationError
      return
    }

    committee.invigilators.push({
      localId: createLocalId(),
      name: newInvigilatorName.value.trim()
    })
    closeAddInvigilatorDialog()
  }

  function submitDeleteInvigilator(): void {
    const committee = selectedCommittee.value
    if (!committee) {
      closeDeleteInvigilatorConfirm()
      return
    }

    const targetLocalId = deleteInvigilatorLocalId.value
    if (!targetLocalId) {
      closeDeleteInvigilatorConfirm()
      return
    }

    const nextInvigilators = committee.invigilators.filter((invigilator) => invigilator.localId !== targetLocalId)
    if (nextInvigilators.length === committee.invigilators.length) {
      closeDeleteInvigilatorConfirm()
      return
    }

    committee.invigilators = nextInvigilators
    closeDeleteInvigilatorConfirm()
  }

  function submitApplyPreparationRoomToAll(): void {
    const draft = scheduleDraftStore.draft
    if (!draft) {
      closeApplyPreparationRoomToAllConfirm()
      return
    }

    const nextPreparationRoom = normalizeOptionalText(
      applyPreparationRoomToAllSourceRoom.value ?? selectedCommittee.value?.preparationRoom
    )
    if (!nextPreparationRoom) {
      closeApplyPreparationRoomToAllConfirm()
      return
    }

    draft.committees.forEach((committee) => {
      assignCommitteePreparationRoom(committee, nextPreparationRoom)
    })
    closeApplyPreparationRoomToAllConfirm()
  }

  function submitSyncInvigilatorsToMatchingCommittees(): void {
    if (isSyncInvigilatorsSubmitDisabled.value) {
      return
    }

    const draft = scheduleDraftStore.draft
    const sourceCommitteeId = syncInvigilatorsSourceCommitteeId.value
    if (!draft || !sourceCommitteeId) {
      closeSyncInvigilatorsDialog()
      return
    }

    const sourceCommittee = draft.committees.find((committee) => committee.localId === sourceCommitteeId)
    if (!sourceCommittee) {
      closeSyncInvigilatorsDialog()
      return
    }

    const targetCommitteeIds = new Set(
      sanitizeSelectedSyncInvigilatorsCommitteeIds(selectedSyncInvigilatorsCommitteeIds.value)
    )
    if (targetCommitteeIds.size < 1) {
      return
    }

    const sourceInvigilatorNames = sourceCommittee.invigilators.map((invigilator) => invigilator.name)
    let updatedCommitteesCount = 0

    draft.committees.forEach((committee) => {
      if (committee.localId === sourceCommittee.localId || !targetCommitteeIds.has(committee.localId)) {
        return
      }

      if (
        !areInvigilatorNameListsEquivalent(
          sourceInvigilatorNames,
          committee.invigilators.map((invigilator) => invigilator.name)
        )
      ) {
        updatedCommitteesCount += 1
      }

      committee.invigilators = sourceInvigilatorNames.map((name) => ({
        localId: createLocalId(),
        name
      }))
    })

    closeSyncInvigilatorsDialog()

    if (updatedCommitteesCount > 0) {
      toast.add({
        title: t('editor.committee.invigilators.sync.toast.successTitle'),
        description: t('editor.committee.invigilators.sync.toast.successDescription', {
          updated: updatedCommitteesCount,
          selected: targetCommitteeIds.size
        }),
        color: 'success',
        icon: SYNC_INVIGILATORS_SUCCESS_TOAST_ICON,
        duration: SYNC_INVIGILATORS_TOAST_DURATION_MS
      })
      return
    }

    toast.add({
      title: t('editor.committee.invigilators.sync.toast.noChangesTitle'),
      description: t('editor.committee.invigilators.sync.toast.noChangesDescription'),
      color: 'error',
      icon: SYNC_INVIGILATORS_NO_CHANGES_TOAST_ICON,
      duration: SYNC_INVIGILATORS_TOAST_DURATION_MS
    })
  }

  return {
    selectedInvigilators,
    invigilatorsCountLabel,
    isAddInvigilatorDialogOpen,
    newInvigilatorName,
    invigilatorValidationError,
    isDeleteInvigilatorConfirmOpen,
    deleteInvigilatorConfirmDescription,
    isApplyPreparationRoomToAllConfirmOpen,
    applyPreparationRoomToAllConfirmDescription,
    isSyncInvigilatorsActionDisabled,
    isSyncInvigilatorsDialogOpen,
    syncInvigilatorsSourceCommitteeLabel,
    syncInvigilatorsCommitteeItems,
    selectedSyncInvigilatorsCommitteeIds,
    isSyncInvigilatorsSubmitDisabled,
    openAddInvigilatorDialog,
    closeAddInvigilatorDialog,
    openDeleteInvigilatorConfirm,
    closeDeleteInvigilatorConfirm,
    openApplyPreparationRoomToAllConfirm,
    closeApplyPreparationRoomToAllConfirm,
    openSyncInvigilatorsDialog,
    closeSyncInvigilatorsDialog,
    updateSelectedSyncInvigilatorsCommitteeIds,
    selectAllSyncInvigilatorsCommittees,
    clearSyncInvigilatorsCommittees,
    submitAddInvigilator,
    submitDeleteInvigilator,
    submitApplyPreparationRoomToAll,
    submitSyncInvigilatorsToMatchingCommittees
  }
}
