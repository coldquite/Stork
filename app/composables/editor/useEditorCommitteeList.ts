import { DEFAULT_COMMITTEE_START_MINUTE } from '#shared/constants/editor'
import type { StudyLanguageDto, StudyProgramTypeDto } from '#shared/types/time-schedules'
import { useEditorCommitteeFields } from '~/composables/editor/useEditorCommitteeFields'
import { useValidationField } from '~/composables/useValidationField'
import { useScheduleDraftStore } from '~/stores/schedule-draft'
import type { CommitteeSidebarItem, EditorCommitteeStringFieldPayload } from '~/types/editor'
import type { ScheduleDraftCommittee } from '~/types/schedule-draft'
import {
  buildEditorCommitteeSidebarItems,
  buildEditorCommitteeListEntries,
  formatCommitteeDate,
  resolveLastCommitteeByTimeline
} from '~/utils/editor/draft-committee'
import { createLocalId } from '~/utils/id'

/**
 * Committee list, selection sync, and create / rename / delete flows for the schedule editor.
 */
export function useEditorCommitteeList() {
  const { t } = useI18n()
  const scheduleDraftStore = useScheduleDraftStore()

  const selectedCommitteeId = ref('')
  const isCreateCommitteeDialogOpen = ref(false)
  const createCommitteeName = ref('')
  const createCommitteeDraft = ref<ScheduleDraftCommittee | null>(null)
  const createCommitteeValidationError = ref<string | null>(null)
  const isRenameCommitteeDialogOpen = ref(false)
  const renameCommitteeId = ref('')
  const renameCommitteeName = ref('')
  const renameCommitteeValidationError = ref<string | null>(null)
  const isDeleteCommitteeConfirmOpen = ref(false)
  const deleteCommitteeId = ref('')

  const fallbackCommitteeLabel = computed(() => t('editor.untitled'))

  const committees = computed(() => {
    const draftCommittees = scheduleDraftStore.draft?.committees ?? []
    return buildEditorCommitteeListEntries(draftCommittees, fallbackCommitteeLabel.value)
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
  const selectedCommitteeLabel = computed(() => selectedCommitteeEntry.value?.label)
  const selectedCommitteeDate = computed(() => selectedCommitteeEntry.value?.dateLabel)

  const committeeSidebarItems = computed<CommitteeSidebarItem[]>(() => {
    const draftCommittees = scheduleDraftStore.draft?.committees ?? []
    return buildEditorCommitteeSidebarItems(draftCommittees, fallbackCommitteeLabel.value)
  })

  const renameCommitteeTargetLabel = computed(() => {
    const targetEntry = committees.value.find((entry) => entry.committee.localId === renameCommitteeId.value)
    return targetEntry?.label
  })
  const renameCommitteeDialogDescription = computed(() => {
    return t('editor.committees.rename.description', { name: renameCommitteeTargetLabel.value })
  })
  const deleteCommitteeTargetLabel = computed(() => {
    const targetEntry = committees.value.find((entry) => entry.committee.localId === deleteCommitteeId.value)
    return targetEntry?.label
  })
  const deleteCommitteeConfirmDescription = computed(() => {
    return t('editor.committees.delete.description', { name: deleteCommitteeTargetLabel.value })
  })

  useValidationField(renameCommitteeName, renameCommitteeValidationError)
  useValidationField(createCommitteeName, createCommitteeValidationError)

  const createCommitteeFields = useEditorCommitteeFields(computed(() => createCommitteeDraft.value))

  const createCommitteeDateLabel = computed(() => {
    const createDate = createCommitteeDraft.value?.date
    if (!createDate) {
      return '—'
    }

    return formatCommitteeDate(createDate)
  })

  const isCreateCommitteeSubmitDisabled = computed(() => {
    const committeeDraft = createCommitteeDraft.value
    if (!committeeDraft) {
      return true
    }

    const hasStudyProgram = committeeDraft.studyProgramName.trim().length > 0
    const hasSpecialization = committeeDraft.specializationCode.trim().length > 0
    const hasDepartment =
      committeeDraft.defenseDepartmentCode.trim().length > 0 || committeeDraft.defenseDepartmentName.trim().length > 0

    return !hasStudyProgram || !hasSpecialization || !hasDepartment
  })

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

  function openCreateCommitteeDialog(): void {
    const lastCommittee = resolveLastCommitteeByTimeline(scheduleDraftStore.draft?.committees ?? [])

    createCommitteeDraft.value = {
      localId: createLocalId(),
      name: '',
      startMinute: lastCommittee?.startMinute ?? DEFAULT_COMMITTEE_START_MINUTE,
      date: lastCommittee?.date ?? new Date().toISOString(),
      room: null,
      secretaryName: null,
      invigilators: [],
      language: lastCommittee?.language ?? 'CZECH',
      studyProgramName: lastCommittee?.studyProgramName ?? '',
      studyProgramType: lastCommittee?.studyProgramType ?? 'BACHELOR',
      specializationName: lastCommittee?.specializationName ?? '',
      specializationCode: lastCommittee?.specializationCode ?? '',
      defenseDepartmentCode: lastCommittee?.defenseDepartmentCode ?? '',
      defenseDepartmentName: lastCommittee?.defenseDepartmentName ?? '',
      chairName: '',
      viceChairName: '',
      member1Name: '',
      member2Name: '',
      member3Name: '',
      items: []
    }

    createCommitteeName.value = ''
    createCommitteeValidationError.value = null
    isCreateCommitteeDialogOpen.value = true
  }

  function closeCreateCommitteeDialog(): void {
    isCreateCommitteeDialogOpen.value = false
    createCommitteeName.value = ''
    createCommitteeDraft.value = null
    createCommitteeValidationError.value = null
  }

  function updateCreateCommitteeDate(nextIsoDate: string): void {
    createCommitteeFields.updateSelectedCommitteeDate(nextIsoDate)
  }

  function updateCreateCommitteeStartMinute(nextStartMinute: number): void {
    createCommitteeFields.updateSelectedCommitteeStartMinute(nextStartMinute)
  }

  function updateCreateCommitteeLanguage(nextLanguage: StudyLanguageDto): void {
    createCommitteeFields.updateSelectedCommitteeLanguage(nextLanguage)
  }

  function updateCreateCommitteeStudyProgramType(nextStudyProgramType: StudyProgramTypeDto): void {
    createCommitteeFields.updateSelectedCommitteeStudyProgramType(nextStudyProgramType)
  }

  function updateCreateCommitteeStringField(payload: EditorCommitteeStringFieldPayload): void {
    switch (payload.field) {
      case 'studyProgramName':
        createCommitteeFields.updateSelectedCommitteeStudyProgramName(payload.value)
        break
      case 'specializationCode':
        createCommitteeFields.updateSelectedCommitteeSpecializationCode(payload.value)
        break
      default:
        break
    }
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

  function submitCreateCommittee(): void {
    const draft = scheduleDraftStore.draft
    if (!draft) {
      closeCreateCommitteeDialog()
      return
    }

    if (isCreateCommitteeSubmitDisabled.value) {
      return
    }

    const normalizedName = createCommitteeName.value.trim()
    const validationError = validateCommitteeName(normalizedName, '')
    if (validationError) {
      createCommitteeValidationError.value = validationError
      return
    }

    const createDraft = createCommitteeDraft.value
    if (!createDraft) {
      closeCreateCommitteeDialog()
      return
    }

    const nextCommittee: ScheduleDraftCommittee = {
      localId: createLocalId(),
      name: normalizedName,
      startMinute: createDraft.startMinute,
      date: createDraft.date,
      room: null,
      secretaryName: null,
      invigilators: [],
      language: createDraft.language,
      studyProgramName: createDraft.studyProgramName,
      studyProgramType: createDraft.studyProgramType,
      specializationName: createDraft.specializationName,
      specializationCode: createDraft.specializationCode,
      defenseDepartmentCode: createDraft.defenseDepartmentCode,
      defenseDepartmentName: createDraft.defenseDepartmentName,
      chairName: '',
      viceChairName: '',
      member1Name: '',
      member2Name: '',
      member3Name: '',
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

  return {
    committees,
    selectedCommittee,
    selectedCommitteeId,
    selectedCommitteeLabel,
    selectedCommitteeDate,
    committeeSidebarItems,
    isCreateCommitteeDialogOpen,
    createCommitteeName,
    createCommitteeDraft,
    createCommitteeDateLabel,
    isCreateCommitteeSubmitDisabled,
    createCommitteeValidationError,
    isRenameCommitteeDialogOpen,
    renameCommitteeName,
    renameCommitteeValidationError,
    isDeleteCommitteeConfirmOpen,
    renameCommitteeDialogDescription,
    deleteCommitteeConfirmDescription,
    openCreateCommitteeDialog,
    closeCreateCommitteeDialog,
    updateCreateCommitteeDate,
    updateCreateCommitteeStartMinute,
    updateCreateCommitteeLanguage,
    updateCreateCommitteeStudyProgramType,
    updateCreateCommitteeStringField,
    openRenameCommitteeDialog,
    closeRenameCommitteeDialog,
    openDeleteCommitteeConfirm,
    closeDeleteCommitteeConfirm,
    submitCreateCommittee,
    submitRenameCommittee,
    submitDeleteCommittee
  }
}
