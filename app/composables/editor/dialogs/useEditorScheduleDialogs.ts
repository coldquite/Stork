import { EDITOR_DRAFT_NAME_MAX_LENGTH } from '#shared/constants/editor'
import { useValidationField } from '~/composables/useValidationField'
import { useScheduleDraftStore } from '~/stores/schedule-draft'
import { buildEditorCommitteeListEntries } from '~/utils/editor/draft-committee'
import { extractHttpErrorMessage } from '~/utils/http-error'
import { createQuestionsEnvelopeCsvEnumLabelResolver } from '~/utils/export/questions-envelope-csv-enums'
import {
  buildPdfInvigilatorsExportPayload,
  buildPdfInvigilatorsFileName,
  downloadPdfFile
} from '~/utils/export/pdf-invigilators-export'
import { buildPdfPublicExportPayload, buildPdfPublicFileName } from '~/utils/export/pdf-public-export'
import {
  QuestionsEnvelopeCsvDepartmentMappingError,
  exportQuestionsEnvelopeCsv
} from '~/utils/export/questions-envelope-csv-export'
import type { EditorCommitteeListEntry } from '~/utils/editor/draft-committee'

interface EditorExportCommitteeItem {
  id: string
  label: string
  description: string
}

interface EditorExportCommitteeDayGroup {
  id: string
  dayLabel: string
  committees: EditorExportCommitteeItem[]
}

/**
 * Draft rename, manual cloud-save, and export modal flows.
 */
export function useEditorScheduleDialogs() {
  const { t } = useI18n()
  const scheduleDraftStore = useScheduleDraftStore()

  const isRenameDraftDialogOpen = ref(false)
  const renameDraftName = ref('')
  const renameDraftValidationError = ref<string | null>(null)
  const isCloudSaveDialogOpen = ref(false)
  const cloudSaveName = ref('')
  const cloudSaveValidationError = ref<string | null>(null)
  const isCsvExportDialogOpen = ref(false)
  const selectedCsvExportCommitteeIds = ref<string[]>([])
  const csvExportErrorItems = ref<string[]>([])
  const isPdfPublicExportDialogOpen = ref(false)
  const selectedPdfPublicExportCommitteeIds = ref<string[]>([])
  const pdfPublicExportErrorItems = ref<string[]>([])
  const isPdfPublicExportLoading = ref(false)
  const isPdfInvigilatorsExportDialogOpen = ref(false)
  const selectedPdfInvigilatorsExportCommitteeIds = ref<string[]>([])
  const pdfInvigilatorsExportErrorItems = ref<string[]>([])
  const isPdfInvigilatorsExportLoading = ref(false)

  const isCloudSaveLoading = computed(() => scheduleDraftStore.isManualSaveLoading)
  const questionsEnvelopeCsvEnumLabelResolver = createQuestionsEnvelopeCsvEnumLabelResolver((key) => t(key))
  const fallbackCommitteeLabel = computed(() => t('editor.untitled'))
  const exportCommitteeEntries = computed(() => {
    const draftCommittees = scheduleDraftStore.draft?.committees ?? []
    return buildEditorCommitteeListEntries(draftCommittees, fallbackCommitteeLabel.value)
  })

  function buildExportCommitteeDescription(entry: EditorCommitteeListEntry): string {
    return t('editor.schedule.export.csvCommitteesDialog.committeeDescription', {
      date: entry.dateLabel,
      room: entry.roomLabel,
      start: entry.timelineStartLabel,
      end: entry.timelineEndLabel,
      students: t('editor.students.count', { count: entry.studentsCount })
    })
  }

  const exportCommitteeItems = computed<EditorExportCommitteeItem[]>(() => {
    return exportCommitteeEntries.value.map((entry) => ({
      id: entry.committee.localId,
      label: entry.label,
      description: buildExportCommitteeDescription(entry)
    }))
  })

  const csvExportCommitteeItems = computed(() => exportCommitteeItems.value)
  const pdfPublicExportCommitteeItems = computed(() => exportCommitteeItems.value)
  const pdfInvigilatorsExportDayGroups = computed<EditorExportCommitteeDayGroup[]>(() => {
    const groups: EditorExportCommitteeDayGroup[] = []
    let currentGroup: EditorExportCommitteeDayGroup | null = null

    for (const entry of exportCommitteeEntries.value) {
      if (!currentGroup || currentGroup.dayLabel !== entry.dateLabel) {
        currentGroup = {
          id: `day-${entry.dateLabel}`,
          dayLabel: entry.dateLabel,
          committees: []
        }
        groups.push(currentGroup)
      }

      currentGroup.committees.push({
        id: entry.committee.localId,
        label: entry.label,
        description: buildExportCommitteeDescription(entry)
      })
    }

    return groups
  })

  function resolveAllExportCommitteeIds(): string[] {
    return exportCommitteeItems.value.map((entry) => entry.id)
  }

  function sanitizeSelectedExportCommitteeIds(nextIds: string[]): string[] {
    const availableCommitteeIds = new Set(resolveAllExportCommitteeIds())
    const uniqueIds: string[] = []

    for (const committeeId of nextIds) {
      if (!availableCommitteeIds.has(committeeId) || uniqueIds.includes(committeeId)) {
        continue
      }

      uniqueIds.push(committeeId)
    }

    return uniqueIds
  }

  function openExportDialog(openState: { value: boolean }, selectedIdsState: { value: string[] }): void {
    if (!scheduleDraftStore.draft) {
      return
    }

    selectedIdsState.value = resolveAllExportCommitteeIds()
    openState.value = true
  }

  function closeExportDialog(openState: { value: boolean }, selectedIdsState: { value: string[] }): void {
    openState.value = false
    selectedIdsState.value = []
  }

  function updateSelectedExportCommitteeIds(selectedIdsState: { value: string[] }, nextIds: string[]): void {
    selectedIdsState.value = sanitizeSelectedExportCommitteeIds(nextIds)
  }

  function selectAllExportCommittees(selectedIdsState: { value: string[] }): void {
    selectedIdsState.value = resolveAllExportCommitteeIds()
  }

  function clearExportCommittees(selectedIdsState: { value: string[] }): void {
    selectedIdsState.value = []
  }

  const isCsvExportSubmitDisabled = computed(() => {
    return exportCommitteeItems.value.length < 1 || selectedCsvExportCommitteeIds.value.length < 1
  })
  const isPdfPublicExportSubmitDisabled = computed(() => {
    return (
      isPdfPublicExportLoading.value ||
      exportCommitteeItems.value.length < 1 ||
      selectedPdfPublicExportCommitteeIds.value.length < 1
    )
  })
  const isPdfInvigilatorsExportSubmitDisabled = computed(() => {
    return (
      isPdfInvigilatorsExportLoading.value ||
      exportCommitteeItems.value.length < 1 ||
      selectedPdfInvigilatorsExportCommitteeIds.value.length < 1
    )
  })

  useValidationField(renameDraftName, renameDraftValidationError)
  useValidationField(cloudSaveName, cloudSaveValidationError)

  function validateDraftName(nextName: string): string | null {
    const normalizedName = nextName.trim()

    if (normalizedName.length < 1) {
      return t('editor.schedule.rename.validation.required')
    }

    if (nextName !== normalizedName) {
      return t('editor.schedule.rename.validation.leadingTrailingWhitespace')
    }

    if (normalizedName.length > EDITOR_DRAFT_NAME_MAX_LENGTH) {
      return t('editor.schedule.rename.validation.maxLength', { max: EDITOR_DRAFT_NAME_MAX_LENGTH })
    }

    return null
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

  function openCloudSaveDialog(): void {
    const draft = scheduleDraftStore.draft
    if (!draft) {
      return
    }

    cloudSaveName.value = draft.name
    cloudSaveValidationError.value = null
    isCloudSaveDialogOpen.value = true
  }

  function closeCloudSaveDialog(): void {
    if (isCloudSaveLoading.value) {
      return
    }

    isCloudSaveDialogOpen.value = false
    cloudSaveName.value = ''
    cloudSaveValidationError.value = null
  }

  function openCsvExportDialog(): void {
    csvExportErrorItems.value = []
    openExportDialog(isCsvExportDialogOpen, selectedCsvExportCommitteeIds)
  }

  function closeCsvExportDialog(): void {
    closeExportDialog(isCsvExportDialogOpen, selectedCsvExportCommitteeIds)
    csvExportErrorItems.value = []
  }

  function updateSelectedCsvExportCommitteeIds(nextIds: string[]): void {
    updateSelectedExportCommitteeIds(selectedCsvExportCommitteeIds, nextIds)
    csvExportErrorItems.value = []
  }

  function selectAllCsvExportCommittees(): void {
    selectAllExportCommittees(selectedCsvExportCommitteeIds)
    csvExportErrorItems.value = []
  }

  function clearCsvExportCommittees(): void {
    clearExportCommittees(selectedCsvExportCommitteeIds)
    csvExportErrorItems.value = []
  }

  function openPdfPublicExportDialog(): void {
    pdfPublicExportErrorItems.value = []
    openExportDialog(isPdfPublicExportDialogOpen, selectedPdfPublicExportCommitteeIds)
  }

  function closePdfPublicExportDialog(): void {
    if (isPdfPublicExportLoading.value) {
      return
    }

    closeExportDialog(isPdfPublicExportDialogOpen, selectedPdfPublicExportCommitteeIds)
    pdfPublicExportErrorItems.value = []
  }

  function updateSelectedPdfPublicExportCommitteeIds(nextIds: string[]): void {
    updateSelectedExportCommitteeIds(selectedPdfPublicExportCommitteeIds, nextIds)
    pdfPublicExportErrorItems.value = []
  }

  function selectAllPdfPublicExportCommittees(): void {
    selectAllExportCommittees(selectedPdfPublicExportCommitteeIds)
    pdfPublicExportErrorItems.value = []
  }

  function clearPdfPublicExportCommittees(): void {
    clearExportCommittees(selectedPdfPublicExportCommitteeIds)
    pdfPublicExportErrorItems.value = []
  }

  function openPdfInvigilatorsExportDialog(): void {
    pdfInvigilatorsExportErrorItems.value = []
    openExportDialog(isPdfInvigilatorsExportDialogOpen, selectedPdfInvigilatorsExportCommitteeIds)
  }

  function closePdfInvigilatorsExportDialog(): void {
    if (isPdfInvigilatorsExportLoading.value) {
      return
    }

    closeExportDialog(isPdfInvigilatorsExportDialogOpen, selectedPdfInvigilatorsExportCommitteeIds)
    pdfInvigilatorsExportErrorItems.value = []
  }

  function updateSelectedPdfInvigilatorsExportCommitteeIds(nextIds: string[]): void {
    updateSelectedExportCommitteeIds(selectedPdfInvigilatorsExportCommitteeIds, nextIds)
    pdfInvigilatorsExportErrorItems.value = []
  }

  function selectAllPdfInvigilatorsExportCommittees(): void {
    selectAllExportCommittees(selectedPdfInvigilatorsExportCommitteeIds)
    pdfInvigilatorsExportErrorItems.value = []
  }

  function clearPdfInvigilatorsExportCommittees(): void {
    clearExportCommittees(selectedPdfInvigilatorsExportCommitteeIds)
    pdfInvigilatorsExportErrorItems.value = []
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

  async function submitCloudSave(): Promise<void> {
    if (isCloudSaveLoading.value || scheduleDraftStore.isAutoSaveRunning) {
      return
    }

    const validationError = validateDraftName(cloudSaveName.value)
    if (validationError) {
      cloudSaveValidationError.value = validationError
      return
    }

    const savedSuccessfully = await scheduleDraftStore
      .saveManualDraft(cloudSaveName.value.trim(), true)
      .then(() => true)
      .catch(() => false)

    if (!savedSuccessfully) {
      // `saveManualDraft` sets `manualSaveErrorCode` before rejecting and `useScheduleAutoSaveToasts` shows it
      return
    }

    closeCloudSaveDialog()
  }

  function submitCsvExportSelection(): void {
    if (isCsvExportSubmitDisabled.value) {
      return
    }

    csvExportErrorItems.value = []

    const draft = scheduleDraftStore.draft
    if (!draft) {
      closeCsvExportDialog()
      return
    }

    const selectedCommitteeIdsSet = new Set(selectedCsvExportCommitteeIds.value)
    const selectedCommittees = exportCommitteeEntries.value
      .filter((entry) => selectedCommitteeIdsSet.has(entry.committee.localId))
      .map((entry) => entry.committee)

    try {
      exportQuestionsEnvelopeCsv({
        committees: selectedCommittees,
        fallbackCommitteeLabel: fallbackCommitteeLabel.value,
        enumLabelResolver: questionsEnvelopeCsvEnumLabelResolver,
        draftName: draft.name
      })
    } catch (error: unknown) {
      if (error instanceof QuestionsEnvelopeCsvDepartmentMappingError) {
        csvExportErrorItems.value = error.issues.map((issue) =>
          t('editor.schedule.export.questionsEnvelopeCsvExport.errors.departmentMappingIssue', {
            student: issue.studentFullName,
            email: issue.studentEmail || '-',
            committee: issue.committeeLabel,
            committeeDate: issue.committeeDate || '-',
            committeeOrder: issue.committeeStudentOrder ? String(issue.committeeStudentOrder) : '-',
            specializationCode: issue.specializationCode || '-',
            studyProgramName: issue.studyProgramName || '-',
            studyProgramType: questionsEnvelopeCsvEnumLabelResolver.resolveStudyProgramTypeLabel(issue.studyProgramType)
          })
        )
        return
      }

      csvExportErrorItems.value = [t('editor.schedule.export.questionsEnvelopeCsvExport.errors.unknown')]
      return
    }

    closeCsvExportDialog()
  }

  async function submitPdfPublicExportSelection(): Promise<void> {
    if (isPdfPublicExportSubmitDisabled.value || isPdfPublicExportLoading.value) {
      return
    }

    const draft = scheduleDraftStore.draft
    if (!draft) {
      closePdfPublicExportDialog()
      return
    }

    const selectedCommitteeIdsSet = new Set(selectedPdfPublicExportCommitteeIds.value)
    const selectedCommittees = exportCommitteeEntries.value
      .filter((entry) => selectedCommitteeIdsSet.has(entry.committee.localId))
      .map((entry) => entry.committee)
    const payload = buildPdfPublicExportPayload({
      draftName: draft.name,
      committees: selectedCommittees,
      fallbackCommitteeLabel: fallbackCommitteeLabel.value
    })
    if (payload.sections.length < 1) {
      return
    }

    pdfPublicExportErrorItems.value = []
    isPdfPublicExportLoading.value = true

    try {
      const requestFetch = useRequestFetch()
      const pdfContent = await requestFetch<ArrayBuffer>('/api/editor/export/pdf/public', {
        method: 'POST',
        body: payload,
        responseType: 'arrayBuffer'
      })
      const fileName = buildPdfPublicFileName(draft.name)
      downloadPdfFile(pdfContent, fileName)
    } catch (error: unknown) {
      pdfPublicExportErrorItems.value = [
        extractHttpErrorMessage(error) || t('editor.schedule.export.pdfPublicDialog.errors.unknown')
      ]
      return
    } finally {
      isPdfPublicExportLoading.value = false
    }

    closePdfPublicExportDialog()
  }

  async function submitPdfInvigilatorsExportSelection(): Promise<void> {
    if (isPdfInvigilatorsExportSubmitDisabled.value || isPdfInvigilatorsExportLoading.value) {
      return
    }

    const draft = scheduleDraftStore.draft
    if (!draft) {
      closePdfInvigilatorsExportDialog()
      return
    }

    const selectedCommitteeIdsSet = new Set(selectedPdfInvigilatorsExportCommitteeIds.value)
    const selectedCommittees = exportCommitteeEntries.value
      .filter((entry) => selectedCommitteeIdsSet.has(entry.committee.localId))
      .map((entry) => entry.committee)
    const payload = buildPdfInvigilatorsExportPayload({
      draftName: draft.name,
      committees: selectedCommittees,
      fallbackCommitteeLabel: fallbackCommitteeLabel.value,
      repeatTypeLabelResolver: questionsEnvelopeCsvEnumLabelResolver.resolveRepeatTypeLabel
    })
    if (payload.sections.length < 1) {
      return
    }

    pdfInvigilatorsExportErrorItems.value = []
    isPdfInvigilatorsExportLoading.value = true

    try {
      const requestFetch = useRequestFetch()
      const pdfContent = await requestFetch<ArrayBuffer>('/api/editor/export/pdf/invigilators', {
        method: 'POST',
        body: payload,
        responseType: 'arrayBuffer'
      })
      const fileName = buildPdfInvigilatorsFileName(draft.name)
      downloadPdfFile(pdfContent, fileName)
    } catch (error: unknown) {
      pdfInvigilatorsExportErrorItems.value = [
        extractHttpErrorMessage(error) || t('editor.schedule.export.pdfInvigilatorsDialog.errors.unknown')
      ]
      return
    } finally {
      isPdfInvigilatorsExportLoading.value = false
    }

    closePdfInvigilatorsExportDialog()
  }

  return {
    isRenameDraftDialogOpen,
    renameDraftName,
    renameDraftValidationError,
    isCloudSaveDialogOpen,
    cloudSaveName,
    cloudSaveValidationError,
    isCloudSaveLoading,
    isCsvExportDialogOpen,
    selectedCsvExportCommitteeIds,
    csvExportErrorItems,
    csvExportCommitteeItems,
    isCsvExportSubmitDisabled,
    isPdfPublicExportDialogOpen,
    selectedPdfPublicExportCommitteeIds,
    pdfPublicExportErrorItems,
    isPdfPublicExportLoading,
    pdfPublicExportCommitteeItems,
    isPdfPublicExportSubmitDisabled,
    isPdfInvigilatorsExportDialogOpen,
    selectedPdfInvigilatorsExportCommitteeIds,
    pdfInvigilatorsExportErrorItems,
    isPdfInvigilatorsExportLoading,
    pdfInvigilatorsExportDayGroups,
    isPdfInvigilatorsExportSubmitDisabled,
    openRenameDraftDialog,
    closeRenameDraftDialog,
    openCloudSaveDialog,
    closeCloudSaveDialog,
    openCsvExportDialog,
    closeCsvExportDialog,
    updateSelectedCsvExportCommitteeIds,
    selectAllCsvExportCommittees,
    clearCsvExportCommittees,
    openPdfPublicExportDialog,
    closePdfPublicExportDialog,
    updateSelectedPdfPublicExportCommitteeIds,
    selectAllPdfPublicExportCommittees,
    clearPdfPublicExportCommittees,
    openPdfInvigilatorsExportDialog,
    closePdfInvigilatorsExportDialog,
    updateSelectedPdfInvigilatorsExportCommitteeIds,
    selectAllPdfInvigilatorsExportCommittees,
    clearPdfInvigilatorsExportCommittees,
    submitRenameDraft,
    submitCloudSave,
    submitCsvExportSelection,
    submitPdfPublicExportSelection,
    submitPdfInvigilatorsExportSelection,
    draftNameMaxLength: EDITOR_DRAFT_NAME_MAX_LENGTH
  }
}
