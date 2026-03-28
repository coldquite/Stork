import type { TableColumn } from '@nuxt/ui'
import { format, isValid, parseISO } from 'date-fns'
import { computed, ref, watch } from 'vue'
import type { ScheduleDraftCommittee, ScheduleDraftItem } from '~/stores/schedule-draft'
import { useScheduleDraftStore } from '~/stores/schedule-draft'
import type { CommitteeTabItem, StudentRow } from '~/types/editor'

const EDITOR_DRAFT_NAME_MAX_LENGTH = 120

function isStudentItem(item: ScheduleDraftItem): item is ScheduleDraftItem & { type: 'STUDENT' } {
  return item.type === 'STUDENT' && item.student !== null
}

function formatCommitteeDate(value: string): string {
  const parsed = parseISO(value)
  if (!isValid(parsed)) {
    return value
  }

  return format(parsed, 'dd.MM.yyyy')
}

function resolveCommitteeLabel(committee: ScheduleDraftCommittee): string {
  return committee.name.trim()
}

function resolveCommitteeDayTimestamp(committee: ScheduleDraftCommittee): number {
  const parsedDate = parseISO(committee.date)
  return isValid(parsedDate) ? parsedDate.getTime() : Number.POSITIVE_INFINITY
}

function compareCommitteesByTimeline(left: ScheduleDraftCommittee, right: ScheduleDraftCommittee): number {
  const dayDiff = resolveCommitteeDayTimestamp(left) - resolveCommitteeDayTimestamp(right)
  if (dayDiff !== 0) {
    return dayDiff
  }

  const minuteDiff = left.startMinute - right.startMinute
  if (minuteDiff !== 0) {
    return minuteDiff
  }

  const nameDiff = left.name.localeCompare(right.name, 'cs')
  if (nameDiff !== 0) {
    return nameDiff
  }

  return left.localId.localeCompare(right.localId, 'cs')
}

function toStudentRow(item: ScheduleDraftItem & { type: 'STUDENT' }): StudentRow {
  const fullName = [item.student.titlesBefore, item.student.firstName, item.student.lastName, item.student.titlesAfter]
    .filter((part) => (part ?? '').trim().length > 0)
    .join(' ')
    .trim()

  return {
    id: item.localId,
    fullName: fullName.length > 0 ? fullName : '-',
    personalNumber: item.student.personalNumber?.trim() || '-',
    specialization: item.student.specializationName.trim() || '-',
    thesisTitle: item.student.thesisTitleLocal.trim() || item.student.thesisTitleEn.trim() || '-'
  }
}

export function useEditorPage() {
  const { t } = useI18n()
  const scheduleDraftStore = useScheduleDraftStore()

  const selectedCommitteeId = ref('')
  const isCreateCommitteeDialogOpen = ref(false)
  const createCommitteeName = ref('')
  const createCommitteeValidationError = ref<string | null>(null)
  const isRenameCommitteeDialogOpen = ref(false)
  const renameCommitteeId = ref('')
  const renameCommitteeName = ref('')
  const renameCommitteeValidationError = ref<string | null>(null)
  const isDeleteCommitteeConfirmOpen = ref(false)
  const deleteCommitteeId = ref('')
  const isRenameDraftDialogOpen = ref(false)
  const renameDraftName = ref('')
  const renameDraftValidationError = ref<string | null>(null)

  const committees = computed(() => {
    const draftCommittees = scheduleDraftStore.draft?.committees ?? []

    return draftCommittees
      .slice()
      .sort(compareCommitteesByTimeline)
      .map((committee) => ({
        committee,
        label: resolveCommitteeLabel(committee),
        dateLabel: formatCommitteeDate(committee.date),
        studentsCount: committee.items.filter((item) => item.type === 'STUDENT').length
      }))
  })

  watch(
    committees,
    (nextCommittees) => {
      if (nextCommittees.length === 0) {
        selectedCommitteeId.value = ''
        return
      }

      const hasSelectedCommittee = nextCommittees.some((entry) => entry.committee.localId === selectedCommitteeId.value)

      if (!hasSelectedCommittee) {
        const firstCommitteeEntry = nextCommittees[0]
        if (firstCommitteeEntry) {
          selectedCommitteeId.value = firstCommitteeEntry.committee.localId
        }
      }
    },
    { immediate: true }
  )

  const selectedCommitteeEntry = computed(() => {
    return committees.value.find((entry) => entry.committee.localId === selectedCommitteeId.value) ?? null
  })

  const selectedCommittee = computed(() => selectedCommitteeEntry.value?.committee ?? null)
  const selectedCommitteeLabel = computed(() => selectedCommitteeEntry.value?.label ?? '-')
  const selectedCommitteeDate = computed(() => selectedCommitteeEntry.value?.dateLabel ?? '-')

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

  const committeeTabs = computed<CommitteeTabItem[]>(() => {
    return committees.value.map((entry) => ({
      label: entry.label,
      value: entry.committee.localId,
      studentsCount: entry.studentsCount
    }))
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

  const draftName = computed(() => scheduleDraftStore.draft?.name ?? t('editor.untitled'))
  const studentsCountLabel = computed(() => t('editor.students.count', { count: selectedStudents.value.length }))
  const isPageLoading = computed(() => scheduleDraftStore.isDraftLoading)
  const renameCommitteeTargetLabel = computed(() => {
    const targetEntry = committees.value.find((entry) => entry.committee.localId === renameCommitteeId.value)
    return targetEntry?.label ?? '-'
  })
  const renameCommitteeDialogDescription = computed(() => {
    return t('editor.committees.rename.description', { name: renameCommitteeTargetLabel.value })
  })
  const deleteCommitteeTargetLabel = computed(() => {
    const targetEntry = committees.value.find((entry) => entry.committee.localId === deleteCommitteeId.value)
    return targetEntry?.label ?? '-'
  })
  const deleteCommitteeConfirmDescription = computed(() => {
    return t('editor.committees.delete.description', { name: deleteCommitteeTargetLabel.value })
  })

  watch(renameCommitteeName, () => {
    if (renameCommitteeValidationError.value) {
      renameCommitteeValidationError.value = null
    }
  })

  watch(createCommitteeName, () => {
    if (createCommitteeValidationError.value) {
      createCommitteeValidationError.value = null
    }
  })

  watch(renameDraftName, () => {
    if (renameDraftValidationError.value) {
      renameDraftValidationError.value = null
    }
  })

  function resolveLastCommittee(): ScheduleDraftCommittee | null {
    const draftCommittees = scheduleDraftStore.draft?.committees ?? []
    return draftCommittees.slice().sort(compareCommitteesByTimeline).at(-1) ?? null
  }

  function openCreateCommitteeDialog(): void {
    createCommitteeName.value = ''
    createCommitteeValidationError.value = null
    isCreateCommitteeDialogOpen.value = true
  }

  function closeCreateCommitteeDialog(): void {
    isCreateCommitteeDialogOpen.value = false
    createCommitteeName.value = ''
    createCommitteeValidationError.value = null
  }

  function openRenameCommitteeDialog(committeeId: string): void {
    const committee = scheduleDraftStore.draft?.committees.find((entry) => entry.localId === committeeId)
    if (!committee) {
      return
    }

    renameCommitteeId.value = committeeId
    renameCommitteeName.value = committee.name
    renameCommitteeValidationError.value = null
    isRenameCommitteeDialogOpen.value = true
  }

  function closeRenameCommitteeDialog(): void {
    isRenameCommitteeDialogOpen.value = false
    renameCommitteeId.value = ''
    renameCommitteeName.value = ''
    renameCommitteeValidationError.value = null
  }

  function openDeleteCommitteeConfirm(committeeId: string): void {
    const committee = scheduleDraftStore.draft?.committees.find((entry) => entry.localId === committeeId)
    if (!committee) {
      return
    }

    deleteCommitteeId.value = committeeId
    isDeleteCommitteeConfirmOpen.value = true
  }

  function closeDeleteCommitteeConfirm(): void {
    isDeleteCommitteeConfirmOpen.value = false
    deleteCommitteeId.value = ''
  }

  function openRenameDraftDialog(): void {
    const draft = scheduleDraftStore.draft
    if (!draft) {
      return
    }

    renameDraftName.value = draft.name
    renameDraftValidationError.value = null
    isRenameDraftDialogOpen.value = true
  }

  function closeRenameDraftDialog(): void {
    isRenameDraftDialogOpen.value = false
    renameDraftName.value = ''
    renameDraftValidationError.value = null
  }

  function validateDraftName(nextName: string): string | null {
    const normalizedName = nextName.trim()

    if (normalizedName.length < 1) {
      return t('editor.plan.rename.validation.required')
    }

    if (nextName !== normalizedName) {
      return t('editor.plan.rename.validation.leadingTrailingWhitespace')
    }

    if (normalizedName.length > EDITOR_DRAFT_NAME_MAX_LENGTH) {
      return t('editor.plan.rename.validation.maxLength', { max: EDITOR_DRAFT_NAME_MAX_LENGTH })
    }

    return null
  }

  function validateCommitteeName(nextName: string, committeeId: string): string | null {
    const normalizedName = nextName.trim()

    if (normalizedName.length < 1) {
      return t('editor.committees.rename.validation.required')
    }

    const hasDuplicateName = (scheduleDraftStore.draft?.committees ?? []).some((committee) => {
      return committee.localId !== committeeId && committee.name.trim() === normalizedName
    })

    if (hasDuplicateName) {
      return t('editor.committees.rename.validation.duplicate')
    }

    return null
  }

  function submitCreateCommittee(): void {
    const draft = scheduleDraftStore.draft
    if (!draft) {
      closeCreateCommitteeDialog()
      return
    }

    const normalizedName = createCommitteeName.value.trim()
    const validationError = validateCommitteeName(normalizedName, '')
    if (validationError) {
      createCommitteeValidationError.value = validationError
      return
    }

    const lastCommittee = resolveLastCommittee()
    const nextCommittee: ScheduleDraftCommittee = {
      localId: crypto.randomUUID(),
      name: normalizedName,
      startMinute: lastCommittee?.startMinute ?? 525,
      date: lastCommittee?.date ?? new Date().toISOString(),
      room: lastCommittee?.room ?? null,
      secretaryName: lastCommittee?.secretaryName ?? null,
      invigilators: lastCommittee?.invigilators.slice() ?? [],
      language: lastCommittee?.language ?? 'CZECH',
      studyProgramName: lastCommittee?.studyProgramName ?? '',
      studyProgramType: lastCommittee?.studyProgramType ?? 'BACHELOR',
      specializationName: lastCommittee?.specializationName ?? '',
      specializationCode: lastCommittee?.specializationCode ?? '',
      defenseDepartmentCode: lastCommittee?.defenseDepartmentCode ?? '',
      defenseDepartmentName: lastCommittee?.defenseDepartmentName ?? '',
      chairName: lastCommittee?.chairName ?? '',
      viceChairName: lastCommittee?.viceChairName ?? '',
      member1Name: lastCommittee?.member1Name ?? '',
      member2Name: lastCommittee?.member2Name ?? '',
      member3Name: lastCommittee?.member3Name ?? '',
      items: []
    }

    draft.committees.push(nextCommittee)
    selectedCommitteeId.value = nextCommittee.localId
    closeCreateCommitteeDialog()
  }

  function submitRenameCommittee(): void {
    const targetCommittee = scheduleDraftStore.draft?.committees.find(
      (committee) => committee.localId === renameCommitteeId.value
    )

    if (!targetCommittee) {
      closeRenameCommitteeDialog()
      return
    }

    const normalizedName = renameCommitteeName.value.trim()
    const validationError = validateCommitteeName(normalizedName, targetCommittee.localId)
    if (validationError) {
      renameCommitteeValidationError.value = validationError
      return
    }

    targetCommittee.name = normalizedName
    closeRenameCommitteeDialog()
  }

  function submitDeleteCommittee(): void {
    const draft = scheduleDraftStore.draft
    if (!draft) {
      closeDeleteCommitteeConfirm()
      return
    }

    const targetIndex = draft.committees.findIndex((committee) => committee.localId === deleteCommitteeId.value)
    if (targetIndex < 0) {
      closeDeleteCommitteeConfirm()
      return
    }

    const [deletedCommittee] = draft.committees.splice(targetIndex, 1)
    if (deletedCommittee && selectedCommitteeId.value === deletedCommittee.localId) {
      const nextCommittee = committees.value[0]?.committee
      selectedCommitteeId.value = nextCommittee?.localId ?? ''
    }

    closeDeleteCommitteeConfirm()
  }

  function submitRenameDraft(): void {
    const draft = scheduleDraftStore.draft
    if (!draft) {
      closeRenameDraftDialog()
      return
    }

    const validationError = validateDraftName(renameDraftName.value)
    if (validationError) {
      renameDraftValidationError.value = validationError
      return
    }

    draft.name = renameDraftName.value.trim()
    closeRenameDraftDialog()
  }

  function updateSelectedCommitteeRoom(nextRoom: string): void {
    const committee = selectedCommittee.value
    if (!committee) {
      return
    }

    committee.room = nextRoom.length > 0 ? nextRoom : null
  }

  function updateSelectedCommitteeDate(nextIsoDate: string): void {
    const committee = selectedCommittee.value
    if (!committee) {
      return
    }

    committee.date = nextIsoDate
  }

  function updateSelectedCommitteeSecretary(nextSecretaryName: string): void {
    const committee = selectedCommittee.value
    if (!committee) {
      return
    }

    committee.secretaryName = nextSecretaryName.length > 0 ? nextSecretaryName : null
  }

  return {
    committees,
    selectedCommittee,
    selectedCommitteeId,
    selectedCommitteeLabel,
    selectedCommitteeDate,
    isCreateCommitteeDialogOpen,
    createCommitteeName,
    createCommitteeValidationError,
    isRenameCommitteeDialogOpen,
    renameCommitteeName,
    renameCommitteeValidationError,
    isDeleteCommitteeConfirmOpen,
    isRenameDraftDialogOpen,
    renameDraftName,
    renameDraftValidationError,
    committeeTabs,
    selectedStudents,
    columns,
    draftName,
    studentsCountLabel,
    isPageLoading,
    renameCommitteeDialogDescription,
    deleteCommitteeConfirmDescription,
    openCreateCommitteeDialog,
    closeCreateCommitteeDialog,
    openRenameCommitteeDialog,
    closeRenameCommitteeDialog,
    openDeleteCommitteeConfirm,
    closeDeleteCommitteeConfirm,
    openRenameDraftDialog,
    closeRenameDraftDialog,
    submitCreateCommittee,
    submitRenameCommittee,
    submitDeleteCommittee,
    submitRenameDraft,
    updateSelectedCommitteeRoom,
    updateSelectedCommitteeDate,
    updateSelectedCommitteeSecretary,
    draftNameMaxLength: EDITOR_DRAFT_NAME_MAX_LENGTH
  }
}
