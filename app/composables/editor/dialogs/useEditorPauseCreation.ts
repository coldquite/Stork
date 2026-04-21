import type { PauseTypeDto } from '#shared/types/time-schedules'
import { EDITOR_PAUSE_DURATION_BY_TYPE, EDITOR_PAUSE_MIN_DURATION_MINUTES } from '~/constants/editor-pause'
import type { EditorCreatePauseDraft, EditorCreatePauseValidationErrors } from '~/types/editor'
import type { ScheduleDraftCommittee, ScheduleDraftItem } from '~/types/schedule-draft'
import { isPauseItem, normalizeRequiredText, resolveNextCommitteeItemPosition } from '~/utils/editor/draft-committee'
import { createLocalId } from '~/utils/id'

type PauseDialogMode = 'create' | 'edit'

function createInitialPauseDraft(pauseType: PauseTypeDto = 'BREAK'): EditorCreatePauseDraft {
  return {
    pauseType,
    durationMinutes: EDITOR_PAUSE_DURATION_BY_TYPE[pauseType],
    useCustomLabel: false,
    customLabel: ''
  }
}

function createPauseDraftFromItem(item: ScheduleDraftItem & { type: 'PAUSE' }): EditorCreatePauseDraft {
  const normalizedLabel = item.pause.label.trim()

  return {
    pauseType: item.pause.pauseType,
    durationMinutes: item.pause.durationMinutes,
    useCustomLabel: normalizedLabel.length > 0,
    customLabel: normalizedLabel
  }
}

function resolveIntegerFromInput(value: unknown, fallback: number): number {
  const parsedValue =
    typeof value === 'number' ? value : typeof value === 'string' ? Number.parseInt(value, 10) : Number.NaN

  if (!Number.isFinite(parsedValue)) {
    return fallback
  }

  return Math.trunc(parsedValue)
}

/**
 * Create/edit pause dialog state and mutations for the selected committee.
 */
export function useEditorPauseCreation(
  selectedCommittee: ComputedRef<ScheduleDraftCommittee | null>,
  focusRowInCommittee?: (
    committeeId: string,
    rowId: string,
    options?: {
      scrollBlock?: 'center' | 'end'
    }
  ) => void
) {
  const { t } = useI18n()

  const isPauseDialogOpen = ref(false)
  const pauseDialogMode = ref<PauseDialogMode>('create')
  const pauseDraft = ref<EditorCreatePauseDraft | null>(null)
  const pauseValidationErrors = ref<EditorCreatePauseValidationErrors>({})
  const editingPauseLocalId = ref<string | null>(null)

  function clearValidationError(field: keyof EditorCreatePauseValidationErrors): void {
    if (!pauseValidationErrors.value[field]) {
      return
    }

    const { [field]: _removed, ...nextErrors } = pauseValidationErrors.value
    pauseValidationErrors.value = nextErrors
  }

  function setValidationError(field: keyof EditorCreatePauseValidationErrors, message: string): void {
    pauseValidationErrors.value = {
      ...pauseValidationErrors.value,
      [field]: message
    }
  }

  function validatePauseDraft(draft: EditorCreatePauseDraft): boolean {
    pauseValidationErrors.value = {}

    if (draft.durationMinutes < EDITOR_PAUSE_MIN_DURATION_MINUTES) {
      setValidationError('durationMinutes', t('editor.pause.validation.durationMinutesMin'))
    }

    if (!draft.useCustomLabel) {
      return Object.keys(pauseValidationErrors.value).length < 1
    }

    const normalizedCustomLabel = normalizeRequiredText(draft.customLabel)
    if (normalizedCustomLabel.length < 1) {
      setValidationError('customLabel', t('editor.pause.validation.customLabelRequired'))
    } else if (draft.customLabel !== normalizedCustomLabel) {
      setValidationError('customLabel', t('editor.pause.validation.customLabelLeadingTrailingWhitespace'))
    }

    return Object.keys(pauseValidationErrors.value).length < 1
  }

  function openCreatePauseDialog(): void {
    if (!selectedCommittee.value) {
      return
    }

    pauseDialogMode.value = 'create'
    editingPauseLocalId.value = null
    pauseDraft.value = createInitialPauseDraft()
    pauseValidationErrors.value = {}
    isPauseDialogOpen.value = true
  }

  function openEditPauseDialog(pauseLocalId: string): void {
    const committee = selectedCommittee.value
    if (!committee) {
      return
    }

    const targetItem = committee.items.find((item) => item.localId === pauseLocalId)
    if (!targetItem || !isPauseItem(targetItem)) {
      return
    }

    pauseDialogMode.value = 'edit'
    editingPauseLocalId.value = pauseLocalId
    pauseDraft.value = createPauseDraftFromItem(targetItem)
    pauseValidationErrors.value = {}
    isPauseDialogOpen.value = true
  }

  function closePauseDialog(): void {
    isPauseDialogOpen.value = false
    pauseDialogMode.value = 'create'
    editingPauseLocalId.value = null
    pauseDraft.value = null
    pauseValidationErrors.value = {}
  }

  function updatePauseType(value: PauseTypeDto): void {
    const draft = pauseDraft.value
    if (!draft) {
      return
    }

    draft.pauseType = value
    draft.durationMinutes = EDITOR_PAUSE_DURATION_BY_TYPE[value]
    clearValidationError('durationMinutes')
  }

  function updatePauseCustomLabelEnabled(value: boolean): void {
    const draft = pauseDraft.value
    if (!draft) {
      return
    }

    draft.useCustomLabel = value
    if (!value) {
      draft.customLabel = ''
      clearValidationError('customLabel')
    }
  }

  function updatePauseCustomLabel(value: unknown): void {
    const draft = pauseDraft.value
    if (!draft) {
      return
    }

    draft.customLabel = String(value ?? '')
    clearValidationError('customLabel')
  }

  function updatePauseDurationMinutes(value: unknown): void {
    const draft = pauseDraft.value
    if (!draft) {
      return
    }

    draft.durationMinutes = resolveIntegerFromInput(value, draft.durationMinutes)
    clearValidationError('durationMinutes')
  }

  function submitPauseDialog(): void {
    const committee = selectedCommittee.value
    const draft = pauseDraft.value
    if (!committee || !draft) {
      closePauseDialog()
      return
    }

    if (!validatePauseDraft(draft)) {
      return
    }

    const resolvedLabel = draft.useCustomLabel ? normalizeRequiredText(draft.customLabel) : ''

    if (pauseDialogMode.value === 'create') {
      const nextPauseItem: ScheduleDraftItem = {
        localId: createLocalId(),
        type: 'PAUSE',
        position: resolveNextCommitteeItemPosition(committee),
        student: null,
        pause: {
          label: resolvedLabel,
          pauseType: draft.pauseType,
          durationMinutes: draft.durationMinutes
        }
      }

      const createdRowId = nextPauseItem.localId
      committee.items.push(nextPauseItem)
      closePauseDialog()
      focusRowInCommittee?.(committee.localId, createdRowId, { scrollBlock: 'end' })
      return
    }

    const targetLocalId = editingPauseLocalId.value
    if (!targetLocalId) {
      closePauseDialog()
      return
    }

    const targetItem = committee.items.find((item) => item.localId === targetLocalId)
    if (!targetItem || !isPauseItem(targetItem)) {
      closePauseDialog()
      return
    }

    targetItem.pause.label = resolvedLabel
    targetItem.pause.pauseType = draft.pauseType
    targetItem.pause.durationMinutes = draft.durationMinutes
    closePauseDialog()
  }

  return {
    isPauseDialogOpen,
    pauseDialogMode,
    pauseDraft,
    pauseValidationErrors,
    openCreatePauseDialog,
    openEditPauseDialog,
    closePauseDialog,
    submitPauseDialog,
    updatePauseType,
    updatePauseCustomLabelEnabled,
    updatePauseCustomLabel,
    updatePauseDurationMinutes
  }
}
