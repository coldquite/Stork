<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { useSortable } from '@vueuse/integrations/useSortable'
import { resolveEditorSpecializationOptionForDepartment } from '#shared/constants/editor'
import EditorRepeatTypeDurationWarningPopover from '~/components/editor/students/EditorRepeatTypeDurationWarningPopover.vue'
import EditorStudentTableInlineCell from '~/components/editor/students/EditorStudentTableInlineCell.vue'
import type {
  PauseTypeDto,
  RepeatTypeDto,
  StudyLanguageDto,
  StudyProgramTypeDto,
  ThesisLanguageDto
} from '#shared/types/time-schedules'
import { STUDENT_TABLE_THESIS_COLUMN_WIDTH_CLASS } from '~/constants/editor-students-table'
import type {
  EditorPauseTableRow,
  EditorStudentValidationFieldKey,
  EditorStudentValidationIssue,
  EditorStudentHighlightRequest,
  EditorStudentTableRow,
  EditorStudentsPanelStudentsEmptyLabels,
  EditorTableRow
} from '~/types/editor'
import { EDITOR_INVALID_INPUT_UI, EDITOR_INVALID_TEXT_CLASS } from '~/constants/editor-validation-ui'
import { resolveRepeatTypeFromSelectValue } from '~/utils/editor/repeat-type'
import {
  applySpecializationCodeChange,
  applyStudyLanguageChange,
  applyStudyProgramNameChange,
  applyStudyProgramTypeChange,
  resolveSpecializationOptionsForStudyProfile,
  resolveStudyProgramNameOptionsForStudyProfile,
  type StudentStudyProfileFields
} from '~/utils/editor/student-study-profile'
import { resolveStudyLanguageFromSelectValue } from '~/utils/editor/study-language'
import { resolveStudyProgramTypeFromSelectValue } from '~/utils/editor/study-program-type'
import { resolveThesisLanguageFromSelectValue } from '~/utils/editor/thesis-language'
import { resolveStudentDurationByStudyProgramAndRepeat } from '~/utils/student-duration'

type EditableTextField =
  | 'titlesBefore'
  | 'lastName'
  | 'firstName'
  | 'email'
  | 'titlesAfter'
  | 'thesisTitle'
  | 'thesisTitleLocal'
  | 'thesisTitleEn'
  | 'supervisorName'
  | 'additionalSupervisorName'
  | 'reviewerName'
  | 'additionalReviewerName'
type EditableMinuteField = 'prepareMinutes' | 'examMinutes'

interface RepeatTypeOption {
  label: string
  value: RepeatTypeDto
}

interface ThesisLanguageOption {
  label: string
  value: ThesisLanguageDto
}

interface StudyLanguageOption {
  label: string
  value: StudyLanguageDto
}

interface StudyProgramTypeOption {
  label: string
  value: StudyProgramTypeDto
}

interface SortableUpdateEventLike {
  oldIndex: number | null
  newIndex: number | null
}

type EditorStudentValidationUiFieldKey = EditorStudentValidationFieldKey | 'thesisTitle'

const props = defineProps<{
  /** Stable key when the parent committee changes (resets local row order). */
  committeeLocalId: string
  modelValue: EditorTableRow[]
  columns: TableColumn<EditorTableRow>[]
  emptyLabels: EditorStudentsPanelStudentsEmptyLabels
  studentValidationIssues: EditorStudentValidationIssue[]
  highlightRequest?: EditorStudentHighlightRequest | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: EditorTableRow[]): void
  (e: 'editPause' | 'requestDeleteItem' | 'requestMoveStudent', value: string): void
}>()

const { t } = useI18n()
const runtimeConfig = useRuntimeConfig()
const tableWrapper = ref<HTMLElement | null>(null)
const localStudents = ref<EditorTableRow[]>([])
const editingRowId = ref<string | null>(null)
const openStudyProgramTypeSelectRowId = ref<string | null>(null)
const openRepeatTypeSelectRowId = ref<string | null>(null)
const highlightedRowId = ref<string | null>(null)
const fadingHighlightedRowId = ref<string | null>(null)
const isDragging = ref(false)
const isHoverSuppressedAfterDrag = ref(false)
const activeDragCommitteeId = ref<string | null>(null)
const hasPendingInlineEdits = ref(false)
const useBlurCommitPipeline = computed(() => runtimeConfig.public.editorPerfPipelineV2 !== false)
let clearHighlightedRowTimer: ReturnType<typeof setTimeout> | null = null
let clearHighlightFadeTimer: ReturnType<typeof setTimeout> | null = null
const inlineEditInputClass = 'w-full [&_input]:text-sm'
const inlineEditSelectClass = 'w-full [&_[role=combobox]]:text-sm [&_[role=combobox]_span]:text-sm'
const inlineReadonlyFrameClass = 'w-full min-h-8 px-2.5 py-1.5'
const inlineReadonlySelectFrameClass = `${inlineReadonlyFrameClass} pe-9`
const inlineReadonlyTextClass = 'block text-sm whitespace-nowrap'
const thesisCellWrapperClass = `${STUDENT_TABLE_THESIS_COLUMN_WIDTH_CLASS} cursor-pointer`
const thesisTitleWarningMarker = '[?]'
const orderCellDeleteActionButtonUi = {
  base: 'cursor-pointer text-error ring-[2px] ring-inset ring-error/70 hover:text-error hover:ring-error/85 dark:text-error dark:ring-error/85 dark:hover:text-error dark:hover:ring-error'
}
const orderCellMoveActionButtonUi = {
  base: 'cursor-pointer text-primary ring-[2px] ring-inset ring-primary/60 hover:text-primary hover:ring-primary/75 dark:text-primary dark:ring-primary/70 dark:hover:text-primary dark:hover:ring-primary/85'
}
const orderCellActionButtonClass = 'size-9 shrink-0 cursor-pointer justify-center rounded-md'
const studentTableTbodyBaseClass =
  'editor-students-tbody divide-y divide-default [&_tr:nth-child(odd)]:bg-primary/5 [&_tr:nth-child(even)]:bg-white dark:[&_tr:nth-child(odd)]:bg-primary/10 dark:[&_tr:nth-child(even)]:bg-default'
const studentTableTbodyHoverClass =
  'editor-students-hover-accent [&_tr:hover]:bg-primary/12 dark:[&_tr:hover]:bg-primary/18'
const invalidSelectUi = EDITOR_INVALID_INPUT_UI

function syncFromParent(): void {
  localStudents.value = props.modelValue.slice()
}

function isStudentRow(row: EditorTableRow): row is EditorStudentTableRow {
  return row.kind === 'STUDENT'
}

function isPauseRow(row: EditorTableRow): row is EditorPauseTableRow {
  return row.kind === 'PAUSE'
}

function isStudentDepartmentResolvable(row: EditorStudentTableRow): boolean {
  return (
    resolveEditorSpecializationOptionForDepartment(
      row.studyProgramType,
      row.studyProgramName,
      row.specializationCode
    ) !== null
  )
}

const studentValidationIssuesByStudentId = computed(() => {
  const issuesByStudentId = new Map<string, EditorStudentValidationIssue[]>()

  props.studentValidationIssues.forEach((issue) => {
    const studentIssues = issuesByStudentId.get(issue.studentId) ?? []
    studentIssues.push(issue)
    issuesByStudentId.set(issue.studentId, studentIssues)
  })

  return issuesByStudentId
})

function resolveThesisValidationFieldKey(row: EditorStudentTableRow): EditorStudentValidationFieldKey {
  return row.thesisLanguage === 'ENGLISH' ? 'thesisTitleEn' : 'thesisTitleLocal'
}

function resolveStudentFieldValidationIssues(
  row: EditorStudentTableRow,
  fieldKey: EditorStudentValidationUiFieldKey
): EditorStudentValidationIssue[] {
  const studentIssues = studentValidationIssuesByStudentId.value.get(row.id) ?? []
  if (studentIssues.length < 1) {
    return []
  }

  const resolvedFieldKey = fieldKey === 'thesisTitle' ? resolveThesisValidationFieldKey(row) : fieldKey
  return studentIssues.filter((issue) => issue.fieldKey === resolvedFieldKey)
}

function isStudentFieldInvalid(row: EditorStudentTableRow, fieldKey: EditorStudentValidationUiFieldKey): boolean {
  return resolveStudentFieldValidationIssues(row, fieldKey).length > 0
}

function isStudentFieldRingInvalid(row: EditorStudentTableRow, fieldKey: EditorStudentValidationUiFieldKey): boolean {
  return resolveStudentFieldValidationIssues(row, fieldKey).some((issue) => issue.code !== 'COMMITTEE_PROFILE_MISMATCH')
}

function resolveInvalidTextClass(isInvalid: boolean): string | null {
  return isInvalid ? EDITOR_INVALID_TEXT_CLASS : null
}

function resolveSelectClass(row: EditorStudentTableRow, fieldKey: EditorStudentValidationUiFieldKey): string {
  if (!isStudentFieldInvalid(row, fieldKey)) {
    return inlineEditSelectClass
  }

  return `${inlineEditSelectClass} [&_[role=combobox]]:text-error [&_[role=combobox]_span]:text-error`
}

function resolveSelectUi(row: EditorStudentTableRow, fieldKey: EditorStudentValidationUiFieldKey) {
  return isStudentFieldRingInvalid(row, fieldKey) ? invalidSelectUi : undefined
}

function resolveSpecializationIsInvalid(row: EditorStudentTableRow): boolean {
  return isStudentFieldInvalid(row, 'specializationCode') || !isStudentDepartmentResolvable(row)
}

function clearRowHighlightTimer(): void {
  if (clearHighlightedRowTimer !== null) {
    clearTimeout(clearHighlightedRowTimer)
    clearHighlightedRowTimer = null
  }
}

function clearRowHighlightFadeTimer(): void {
  if (clearHighlightFadeTimer !== null) {
    clearTimeout(clearHighlightFadeTimer)
    clearHighlightFadeTimer = null
  }
}

function clearRowHighlight(): void {
  clearRowHighlightTimer()
  clearRowHighlightFadeTimer()
  highlightedRowId.value = null
  fadingHighlightedRowId.value = null
}

watch(
  () => props.committeeLocalId,
  () => {
    syncFromParent()
    editingRowId.value = null
    openStudyProgramTypeSelectRowId.value = null
    openRepeatTypeSelectRowId.value = null
    clearRowHighlight()
  },
  { immediate: true }
)

watch(
  () => props.modelValue,
  () => {
    syncFromParent()
  },
  { flush: 'post' }
)

function resolveRowElementById(rowId: string): HTMLTableRowElement | null {
  const tableBody = tableWrapper.value?.querySelector('tbody')
  if (!(tableBody instanceof HTMLTableSectionElement)) {
    return null
  }

  const rowIndex = localStudents.value.findIndex((row) => row.id === rowId)
  if (rowIndex < 0) {
    return null
  }

  const rowElements = Array.from(tableBody.querySelectorAll(':scope > tr'))
  const rowElement = rowElements[rowIndex]
  return rowElement instanceof HTMLTableRowElement ? rowElement : null
}

function highlightRow(rowId: string): void {
  clearRowHighlightTimer()
  clearRowHighlightFadeTimer()
  fadingHighlightedRowId.value = null
  highlightedRowId.value = rowId

  clearHighlightedRowTimer = setTimeout(() => {
    highlightedRowId.value = null
    fadingHighlightedRowId.value = rowId
    clearHighlightedRowTimer = null

    clearHighlightFadeTimer = setTimeout(() => {
      if (fadingHighlightedRowId.value === rowId) {
        fadingHighlightedRowId.value = null
      }

      clearHighlightFadeTimer = null
    }, 500)
  }, 2100)
}

function focusRowById(rowId: string, scrollBlock: 'center' | 'end' = 'center'): void {
  const rowElement = resolveRowElementById(rowId)
  if (!rowElement) {
    return
  }

  rowElement.scrollIntoView({ behavior: 'smooth', block: scrollBlock, inline: 'nearest' })
  highlightRow(rowId)
}

watch(
  () => props.highlightRequest,
  async (nextHighlightRequest) => {
    if (!nextHighlightRequest || nextHighlightRequest.committeeId !== props.committeeLocalId) {
      return
    }

    await nextTick()
    focusRowById(nextHighlightRequest.rowId, nextHighlightRequest.scrollBlock)
  }
)

const sortableTarget = computed(() => {
  return (tableWrapper.value?.querySelector('tbody') as HTMLElement | null) ?? null
})
// Recreate table only when committee changes; recreating on every reorder detaches Sortable listeners from tbody.
const tableRenderKey = computed(() => props.committeeLocalId)

// watchElement: tbody may appear after mount; re-bind Sortable when the node is replaced.
const sortable = useSortable(sortableTarget, localStudents, { watchElement: true })

function applySortableOptions(): void {
  sortable.option('animation', 150)
  sortable.option('handle', '.drag-handle')
  sortable.option('draggable', 'tr')
  sortable.option('onStart', () => {
    stopSuppressingHoverAfterDrag()
    activeDragCommitteeId.value = props.committeeLocalId
    isDragging.value = true
  })
  sortable.option('onUpdate', (event: SortableUpdateEventLike) => {
    if (event.oldIndex === null || event.newIndex === null) {
      return
    }

    reorderLocalStudents(event.oldIndex, event.newIndex)
  })
  sortable.option('onEnd', () => {
    const dragCommitteeLocalId = activeDragCommitteeId.value
    activeDragCommitteeId.value = null

    isDragging.value = false
    suppressHoverAfterDragUntilPointerMove()

    void nextTick(() => {
      // Drag can finish after committee switch; ignore stale emit to avoid writing rows to another committee.
      if (dragCommitteeLocalId !== props.committeeLocalId) {
        return
      }

      emitRowsUpdate()
    })
  })
}

watch(
  sortableTarget,
  (nextTarget) => {
    if (!nextTarget) {
      return
    }

    // useSortable initializes Sortable for target in a post-flush watch.
    // Re-applying options here ensures handlers survive tbody rebinds.
    void nextTick(() => {
      applySortableOptions()
    })
  },
  { immediate: true, flush: 'post' }
)

const repeatTypeOptions = computed<RepeatTypeOption[]>(() => [
  {
    value: 'NONE',
    label: t('editor.table.repeatTypeOptions.none')
  },
  {
    value: 'THESIS_DEFENSE',
    label: t('editor.table.repeatTypeOptions.thesisDefense')
  },
  {
    value: 'ORAL_EXAM',
    label: t('editor.table.repeatTypeOptions.oralExam')
  },
  {
    value: 'BOTH',
    label: t('editor.table.repeatTypeOptions.both')
  }
])

const repeatTypeLabelsByValue = computed(() => {
  return new Map(repeatTypeOptions.value.map((option) => [option.value, option.label]))
})

const thesisLanguageOptions = computed<ThesisLanguageOption[]>(() => [
  {
    value: 'CZECH',
    label: t('editor.table.thesisLanguageOptions.czech')
  },
  {
    value: 'ENGLISH',
    label: t('editor.table.thesisLanguageOptions.english')
  },
  {
    value: 'SLOVAK',
    label: t('editor.table.thesisLanguageOptions.slovak')
  }
])

const thesisLanguageLabelsByValue = computed(() => {
  return new Map(thesisLanguageOptions.value.map((option) => [option.value, option.label]))
})

const studyLanguageOptions = computed<StudyLanguageOption[]>(() => [
  {
    value: 'CZECH',
    label: t('editor.table.studyLanguageOptions.czech')
  },
  {
    value: 'ENGLISH',
    label: t('editor.table.studyLanguageOptions.english')
  }
])

const studyLanguageLabelsByValue = computed(() => {
  return new Map(studyLanguageOptions.value.map((option) => [option.value, option.label]))
})

const studyProgramTypeOptions = computed<StudyProgramTypeOption[]>(() => [
  {
    value: 'BACHELOR',
    label: t('editor.table.studyProgramTypeOptions.bachelor')
  },
  {
    value: 'MASTER',
    label: t('editor.table.studyProgramTypeOptions.master')
  }
])

const studyProgramTypeLabelsByValue = computed(() => {
  return new Map(studyProgramTypeOptions.value.map((option) => [option.value, option.label]))
})

const pauseTypeLabelsByValue = computed(() => {
  return new Map<PauseTypeDto, string>([
    ['BREAK', t('editor.pause.typeOptions.break')],
    ['LUNCH', t('editor.pause.typeOptions.lunch')]
  ])
})

const tbodyUiClass = computed(() => {
  if (isDragging.value || isHoverSuppressedAfterDrag.value) {
    return studentTableTbodyBaseClass
  }

  return `${studentTableTbodyBaseClass} ${studentTableTbodyHoverClass}`
})

const tableMeta = computed(() => ({
  class: {
    tr: (row: { original: EditorTableRow }) => {
      const rowClasses = ['group']

      if (isPauseRow(row.original)) {
        rowClasses.push('editor-students-row-pause')
      }

      if (row.original.id === highlightedRowId.value) {
        rowClasses.push('editor-students-row-highlight')
      }

      if (row.original.id === fadingHighlightedRowId.value) {
        rowClasses.push('editor-students-row-highlight-fade')
      }

      return rowClasses.join(' ')
    }
  }
}))

function stopSuppressingHoverAfterDrag(): void {
  isHoverSuppressedAfterDrag.value = false
  window.removeEventListener('pointermove', handlePointerMoveAfterDragEnd, true)
}

function handlePointerMoveAfterDragEnd(): void {
  stopSuppressingHoverAfterDrag()
}

function suppressHoverAfterDragUntilPointerMove(): void {
  isHoverSuppressedAfterDrag.value = true

  // Use capture to reliably consume the first pointer move across nested interactive cells.
  window.removeEventListener('pointermove', handlePointerMoveAfterDragEnd, true)
  window.addEventListener('pointermove', handlePointerMoveAfterDragEnd, { capture: true, once: true, passive: true })
}

function emitRowsUpdate(): void {
  hasPendingInlineEdits.value = false
  emit('update:modelValue', localStudents.value.slice())
}

function commitPendingInlineEdits(): void {
  if (!hasPendingInlineEdits.value) {
    return
  }

  emitRowsUpdate()
}

function reorderLocalStudents(oldIndex: number, newIndex: number): void {
  if (oldIndex === newIndex) {
    return
  }

  const rows = localStudents.value.slice()
  if (oldIndex < 0 || newIndex < 0 || oldIndex >= rows.length || newIndex >= rows.length) {
    return
  }

  const [movedRow] = rows.splice(oldIndex, 1)
  if (!movedRow) {
    return
  }

  rows.splice(newIndex, 0, movedRow)
  localStudents.value = rows
  hasPendingInlineEdits.value = true
}

function activateRow(rowId: string): void {
  editingRowId.value = rowId

  if (openStudyProgramTypeSelectRowId.value !== rowId) {
    openStudyProgramTypeSelectRowId.value = null
  }

  if (openRepeatTypeSelectRowId.value !== rowId) {
    openRepeatTypeSelectRowId.value = null
  }
}

function clearActiveRow(): void {
  commitPendingInlineEdits()
  editingRowId.value = null
  openStudyProgramTypeSelectRowId.value = null
  openRepeatTypeSelectRowId.value = null
}

function isClickOnDragHandle(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('.drag-handle') !== null
}

function resolveClickedRow(target: EventTarget | null): EditorTableRow | null {
  if (!(target instanceof Element)) {
    return null
  }

  const rowElement = target.closest('tbody tr')
  if (!(rowElement instanceof HTMLTableRowElement)) {
    return null
  }

  const tbodyElement = rowElement.parentElement
  if (!(tbodyElement instanceof HTMLTableSectionElement)) {
    return null
  }

  const rowElements = Array.from(tbodyElement.querySelectorAll(':scope > tr'))
  const clickedRowIndex = rowElements.indexOf(rowElement)
  if (clickedRowIndex < 0) {
    return null
  }

  return localStudents.value[clickedRowIndex] ?? null
}

function handleTableClick(event: MouseEvent): void {
  if (isDragging.value || isClickOnDragHandle(event.target)) {
    return
  }

  const row = resolveClickedRow(event.target)
  if (!row) {
    clearActiveRow()
    return
  }

  if (isPauseRow(row)) {
    clearActiveRow()
    emit('editPause', row.id)
    return
  }

  activateRow(row.id)
}

function isClickInsideTable(target: EventTarget | null): boolean {
  if (!(target instanceof Node)) {
    return false
  }

  const wrapperElement = tableWrapper.value
  if (!wrapperElement) {
    return false
  }

  return wrapperElement.contains(target)
}

function handleDocumentClick(event: MouseEvent): void {
  if (editingRowId.value === null || isDragging.value) {
    return
  }

  if (isClickInsideTable(event.target)) {
    return
  }

  clearActiveRow()
}

function isEditingRow(rowId: string): boolean {
  return editingRowId.value === rowId
}

function isStudyProgramTypeSelectOpen(rowId: string): boolean {
  return openStudyProgramTypeSelectRowId.value === rowId
}

function updateStudyProgramTypeSelectOpen(rowId: string, isOpen: boolean): void {
  if (isOpen) {
    openStudyProgramTypeSelectRowId.value = rowId
    openRepeatTypeSelectRowId.value = null
    return
  }

  if (openStudyProgramTypeSelectRowId.value === rowId) {
    openStudyProgramTypeSelectRowId.value = null
  }
}

function isRepeatTypeSelectOpen(rowId: string): boolean {
  return openRepeatTypeSelectRowId.value === rowId
}

function updateRepeatTypeSelectOpen(rowId: string, isOpen: boolean): void {
  if (isOpen) {
    openStudyProgramTypeSelectRowId.value = null
    openRepeatTypeSelectRowId.value = rowId
    return
  }

  if (openRepeatTypeSelectRowId.value === rowId) {
    openRepeatTypeSelectRowId.value = null
  }
}

function updateRow(
  rowId: string,
  updater: (row: EditorStudentTableRow) => EditorStudentTableRow,
  options: { commitImmediately?: boolean } = {}
): void {
  const commitImmediately = options.commitImmediately ?? true
  const targetRow = localStudents.value.find((row) => row.id === rowId)
  if (!targetRow || !isStudentRow(targetRow)) {
    return
  }

  const nextRow = updater(targetRow)
  if (nextRow === targetRow) {
    return
  }

  Object.assign(targetRow, nextRow)

  if (commitImmediately) {
    emitRowsUpdate()
    return
  }

  hasPendingInlineEdits.value = true
}

function updateTextField(rowId: string, field: EditableTextField, value: unknown): void {
  const normalizedTextValue = String(value ?? '')

  updateRow(
    rowId,
    (row) => {
      if (row[field] === normalizedTextValue) {
        return row
      }

      return {
        ...row,
        [field]: normalizedTextValue
      }
    },
    {
      commitImmediately: !useBlurCommitPipeline.value
    }
  )
}

function resolveIntegerFromInput(value: unknown, fallback: number): number {
  const parsedValue =
    typeof value === 'number' ? value : typeof value === 'string' ? Number.parseInt(value, 10) : Number.NaN

  if (!Number.isFinite(parsedValue)) {
    return fallback
  }

  return Math.max(Math.trunc(parsedValue), 0)
}

function updateMinuteField(rowId: string, field: EditableMinuteField, value: unknown): void {
  const nextMinuteValueResolver = (row: EditorStudentTableRow): number => resolveIntegerFromInput(value, row[field])

  updateRow(
    rowId,
    (row) => {
      const nextMinuteValue = nextMinuteValueResolver(row)
      if (row[field] === nextMinuteValue) {
        return row
      }

      return {
        ...row,
        [field]: nextMinuteValue
      }
    },
    {
      commitImmediately: !useBlurCommitPipeline.value
    }
  )
}

function toStudyProfileFields(row: EditorStudentTableRow): StudentStudyProfileFields {
  return {
    studyLanguage: row.studyLanguage,
    studyProgramType: row.studyProgramType,
    studyProgramName: row.studyProgramName,
    specializationCode: row.specializationCode
  }
}

function withStudyProfileFields(row: EditorStudentTableRow, profile: StudentStudyProfileFields): EditorStudentTableRow {
  return {
    ...row,
    studyLanguage: profile.studyLanguage,
    studyProgramType: profile.studyProgramType,
    studyProgramName: profile.studyProgramName,
    specializationCode: profile.specializationCode
  }
}

function resolveSpecializationCodeFromSelectValue(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'object' && value !== null && 'specializationCode' in value) {
    return String(value.specializationCode)
  }

  return fallback
}

function resolveStudyProgramNameFromSelectValue(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    return value
  }

  return fallback
}

function withMappedDuration(row: EditorStudentTableRow): EditorStudentTableRow {
  const mappedDuration = resolveStudentDurationByStudyProgramAndRepeat(row.studyProgramType, row.repeatType)
  return {
    ...row,
    prepareMinutes: mappedDuration.prepareMinutes,
    examMinutes: mappedDuration.examMinutes
  }
}

function updateStudyLanguage(rowId: string, value: unknown): void {
  updateRow(rowId, (row) => {
    const nextStudyLanguage = resolveStudyLanguageFromSelectValue(value, row.studyLanguage)
    const nextStudyProfile = applyStudyLanguageChange(toStudyProfileFields(row), nextStudyLanguage)
    return withStudyProfileFields(row, nextStudyProfile)
  })
}

function updateStudyProgramType(rowId: string, value: unknown): void {
  updateRow(rowId, (row) => {
    const nextStudyProgramType = resolveStudyProgramTypeFromSelectValue(value, row.studyProgramType)
    const nextStudyProfile = applyStudyProgramTypeChange(toStudyProfileFields(row), nextStudyProgramType)
    const nextRow = withStudyProfileFields(row, nextStudyProfile)
    if (nextStudyProfile.studyProgramType === row.studyProgramType) {
      return nextRow
    }

    return withMappedDuration(nextRow)
  })
}

function updateStudyProgramName(rowId: string, value: unknown): void {
  updateRow(rowId, (row) => {
    const nextStudyProgramName = resolveStudyProgramNameFromSelectValue(value, row.studyProgramName)
    const nextStudyProfile = applyStudyProgramNameChange(toStudyProfileFields(row), nextStudyProgramName)
    return withStudyProfileFields(row, nextStudyProfile)
  })
}

function updateSpecializationCode(rowId: string, value: unknown): void {
  updateRow(rowId, (row) => {
    const nextSpecializationCode = resolveSpecializationCodeFromSelectValue(value, row.specializationCode)
    const nextStudyProfile = applySpecializationCodeChange(toStudyProfileFields(row), nextSpecializationCode)
    return withStudyProfileFields(row, nextStudyProfile)
  })
}

function updateRepeatType(rowId: string, value: unknown): void {
  updateRow(rowId, (row) => {
    const nextRepeatType = resolveRepeatTypeFromSelectValue(value, row.repeatType)
    if (nextRepeatType === row.repeatType) {
      return row
    }

    return withMappedDuration({
      ...row,
      repeatType: nextRepeatType
    })
  })
}

function updateThesisLanguage(rowId: string, value: unknown): void {
  updateRow(rowId, (row) => ({
    ...row,
    thesisLanguage: resolveThesisLanguageFromSelectValue(value, row.thesisLanguage)
  }))
}

function resolveRepeatTypeLabel(value: RepeatTypeDto): string {
  return repeatTypeLabelsByValue.value.get(value) ?? value
}

function resolvePauseTypeLabel(value: PauseTypeDto): string {
  return pauseTypeLabelsByValue.value.get(value) ?? value
}

function resolveThesisLanguageLabel(value: ThesisLanguageDto): string {
  return thesisLanguageLabelsByValue.value.get(value) ?? value
}

function resolveStudyLanguageLabel(value: StudyLanguageDto): string {
  return studyLanguageLabelsByValue.value.get(value) ?? value
}

function resolveStudyProgramTypeLabel(value: StudyProgramTypeDto): string {
  return studyProgramTypeLabelsByValue.value.get(value) ?? value
}

function displayText(value: string): string {
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : '—'
}

function studyProgramNameOptionsForRow(row: EditorStudentTableRow): string[] {
  return resolveStudyProgramNameOptionsForStudyProfile(row.studyProgramType, row.studyLanguage, row.studyProgramName)
}

function specializationOptionsForRow(row: EditorStudentTableRow) {
  return resolveSpecializationOptionsForStudyProfile(row.studyProgramType, row.studyProgramName, row.specializationCode)
}

function resolvePauseDisplayLabel(row: EditorPauseTableRow): string {
  const normalizedCustomLabel = row.label.trim()
  if (normalizedCustomLabel.length > 0) {
    return normalizedCustomLabel
  }

  return resolvePauseTypeLabel(row.pauseType)
}

function resolvePauseTypeIcon(value: PauseTypeDto): string {
  return value === 'LUNCH' ? 'i-lucide-utensils-crossed' : 'i-lucide-hourglass'
}

function requestDeleteItem(itemId: string): void {
  emit('requestDeleteItem', itemId)
}

function requestMoveStudent(studentId: string): void {
  emit('requestMoveStudent', studentId)
}

function getEditorRowId(row: EditorTableRow): string {
  return row.id
}

onMounted(() => {
  window.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  commitPendingInlineEdits()
  clearRowHighlight()
  stopSuppressingHoverAfterDrag()
  window.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div ref="tableWrapper" class="relative overflow-x-auto" @click="handleTableClick">
    <UTable
      :key="tableRenderKey"
      :data="localStudents"
      :columns="props.columns"
      :meta="tableMeta"
      :get-row-id="getEditorRowId"
      :ui="{
        base: 'min-w-full table-fixed',
        tbody: tbodyUiClass,
        separator: 'bg-default'
      }"
    >
      <template #drag-cell>
        <UButton
          icon="i-lucide-grip-vertical"
          variant="ghost"
          color="neutral"
          size="xs"
          class="drag-handle text-muted cursor-grab active:cursor-grabbing"
        />
      </template>

      <template #order-cell="{ row }">
        <div class="relative flex h-full min-h-10 w-full items-center justify-center">
          <span class="text-muted text-md font-semibold transition-opacity duration-150 group-hover:opacity-0">
            {{ isStudentRow(row.original) ? row.original.studentOrder : '' }}
          </span>

          <div
            class="pointer-events-none absolute inset-0 flex items-center justify-center gap-1 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100"
          >
            <UTooltip v-if="isStudentRow(row.original)" :text="t('editor.table.moveStudentAriaLabel')">
              <UButton
                color="primary"
                variant="ghost"
                size="sm"
                icon="i-lucide-git-pull-request-arrow"
                :class="orderCellActionButtonClass"
                :aria-label="t('editor.table.moveStudentAriaLabel')"
                :ui="orderCellMoveActionButtonUi"
                @click.stop="requestMoveStudent(row.original.id)"
              />
            </UTooltip>

            <UTooltip :text="t('editor.table.deleteItemAriaLabel')">
              <UButton
                color="error"
                variant="ghost"
                size="sm"
                icon="i-lucide-trash-2"
                :class="orderCellActionButtonClass"
                :aria-label="t('editor.table.deleteItemAriaLabel')"
                :ui="orderCellDeleteActionButtonUi"
                @click.stop="requestDeleteItem(row.original.id)"
              />
            </UTooltip>
          </div>
        </div>
      </template>

      <template #prepareTime-cell="{ row }">
        <div v-if="isPauseRow(row.original)" class="flex flex-wrap items-center gap-x-6 gap-y-1 py-1 text-base">
          <span class="inline-flex items-center gap-2 font-medium">
            <UIcon :name="resolvePauseTypeIcon(row.original.pauseType)" class="size-4" />
            {{ resolvePauseDisplayLabel(row.original) }}
          </span>
          <span class="whitespace-nowrap">
            <span class="font-medium">{{ t('editor.pause.row.duration') }}:</span>
            {{ row.original.durationMinutes }} min
          </span>
          <span class="whitespace-nowrap">
            <span class="font-medium">{{ t('editor.pause.row.range') }}:</span> {{ row.original.rangeLabel }}
          </span>
        </div>
        <span v-else class="text-sm whitespace-nowrap" @click="activateRow(row.original.id)">
          {{ row.original.prepareTime }}
        </span>
      </template>

      <template #examTime-cell="{ row }">
        <span v-if="isStudentRow(row.original)" class="text-sm whitespace-nowrap" @click="activateRow(row.original.id)">
          {{ row.original.examTime }}
        </span>
      </template>

      <template #titlesBefore-cell="{ row }">
        <EditorStudentTableInlineCell
          v-if="isStudentRow(row.original)"
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.titlesBefore"
          cell-wrapper-class="min-w-[3rem] cursor-pointer"
          :input-class="inlineEditInputClass"
          mode="text"
          @activate="activateRow(row.original.id)"
          @update:model-value="updateTextField(row.original.id, 'titlesBefore', $event)"
          @commit="commitPendingInlineEdits"
        />
      </template>

      <template #lastName-cell="{ row }">
        <EditorStudentTableInlineCell
          v-if="isStudentRow(row.original)"
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.lastName"
          cell-wrapper-class="min-w-[5rem] cursor-pointer"
          :input-class="inlineEditInputClass"
          :invalid="isStudentFieldInvalid(row.original, 'lastName')"
          mode="text"
          @activate="activateRow(row.original.id)"
          @update:model-value="updateTextField(row.original.id, 'lastName', $event)"
          @commit="commitPendingInlineEdits"
        />
      </template>

      <template #firstName-cell="{ row }">
        <EditorStudentTableInlineCell
          v-if="isStudentRow(row.original)"
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.firstName"
          cell-wrapper-class="min-w-[5rem] cursor-pointer"
          :input-class="inlineEditInputClass"
          :invalid="isStudentFieldInvalid(row.original, 'firstName')"
          mode="text"
          @activate="activateRow(row.original.id)"
          @update:model-value="updateTextField(row.original.id, 'firstName', $event)"
          @commit="commitPendingInlineEdits"
        />
      </template>

      <template #email-cell="{ row }">
        <EditorStudentTableInlineCell
          v-if="isStudentRow(row.original)"
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.email"
          cell-wrapper-class="min-w-[10rem] cursor-pointer"
          :input-class="inlineEditInputClass"
          mode="text"
          @activate="activateRow(row.original.id)"
          @update:model-value="updateTextField(row.original.id, 'email', $event)"
          @commit="commitPendingInlineEdits"
        />
      </template>

      <template #titlesAfter-cell="{ row }">
        <EditorStudentTableInlineCell
          v-if="isStudentRow(row.original)"
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.titlesAfter"
          cell-wrapper-class="min-w-[4rem] cursor-pointer"
          :input-class="inlineEditInputClass"
          mode="text"
          @activate="activateRow(row.original.id)"
          @update:model-value="updateTextField(row.original.id, 'titlesAfter', $event)"
          @commit="commitPendingInlineEdits"
        />
      </template>

      <template #studyLanguage-cell="{ row }">
        <EditorStudentTableInlineCell
          v-if="isStudentRow(row.original)"
          :is-editing="isEditingRow(row.original.id)"
          :model-value="resolveStudyLanguageLabel(row.original.studyLanguage)"
          cell-wrapper-class="min-w-[8.5rem] cursor-pointer"
          :input-class="resolveSelectClass(row.original, 'studyLanguage')"
          :display-frame-class="inlineReadonlySelectFrameClass"
          mode="text"
          @activate="activateRow(row.original.id)"
        >
          <template #edit>
            <USelectMenu
              :model-value="row.original.studyLanguage"
              :items="studyLanguageOptions"
              value-key="value"
              label-key="label"
              placeholder="—"
              :search-input="false"
              size="md"
              :class="resolveSelectClass(row.original, 'studyLanguage')"
              :ui="resolveSelectUi(row.original, 'studyLanguage')"
              @update:model-value="updateStudyLanguage(row.original.id, $event)"
            />
          </template>
          <template #display>
            <span
              :class="[
                inlineReadonlyTextClass,
                resolveInvalidTextClass(isStudentFieldInvalid(row.original, 'studyLanguage'))
              ]"
            >
              {{ resolveStudyLanguageLabel(row.original.studyLanguage) }}
            </span>
          </template>
        </EditorStudentTableInlineCell>
      </template>

      <template #studyProgramType-cell="{ row }">
        <EditorStudentTableInlineCell
          v-if="isStudentRow(row.original)"
          :is-editing="isEditingRow(row.original.id)"
          :model-value="resolveStudyProgramTypeLabel(row.original.studyProgramType)"
          cell-wrapper-class="min-w-[8.5rem] cursor-pointer"
          :input-class="resolveSelectClass(row.original, 'studyProgramType')"
          :display-frame-class="inlineReadonlySelectFrameClass"
          mode="text"
          @activate="activateRow(row.original.id)"
        >
          <template #edit>
            <div class="relative w-full">
              <USelectMenu
                :model-value="row.original.studyProgramType"
                :items="studyProgramTypeOptions"
                value-key="value"
                label-key="label"
                placeholder="—"
                :search-input="false"
                size="md"
                :class="resolveSelectClass(row.original, 'studyProgramType')"
                :ui="resolveSelectUi(row.original, 'studyProgramType')"
                @update:model-value="updateStudyProgramType(row.original.id, $event)"
                @update:open="updateStudyProgramTypeSelectOpen(row.original.id, $event)"
              />

              <EditorRepeatTypeDurationWarningPopover :open="isStudyProgramTypeSelectOpen(row.original.id)" />
            </div>
          </template>
          <template #display>
            <span
              :class="[
                inlineReadonlyTextClass,
                resolveInvalidTextClass(isStudentFieldInvalid(row.original, 'studyProgramType'))
              ]"
            >
              {{ resolveStudyProgramTypeLabel(row.original.studyProgramType) }}
            </span>
          </template>
        </EditorStudentTableInlineCell>
      </template>

      <template #studyProgramName-cell="{ row }">
        <EditorStudentTableInlineCell
          v-if="isStudentRow(row.original)"
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.studyProgramName"
          cell-wrapper-class="min-w-[9.5rem] cursor-pointer"
          :input-class="resolveSelectClass(row.original, 'studyProgramName')"
          :display-frame-class="inlineReadonlySelectFrameClass"
          mode="text"
          @activate="activateRow(row.original.id)"
        >
          <template #edit>
            <USelectMenu
              :model-value="row.original.studyProgramName"
              :items="studyProgramNameOptionsForRow(row.original)"
              placeholder="—"
              :search-input="false"
              size="md"
              :class="resolveSelectClass(row.original, 'studyProgramName')"
              :ui="resolveSelectUi(row.original, 'studyProgramName')"
              @update:model-value="updateStudyProgramName(row.original.id, $event)"
            />
          </template>
          <template #display>
            <span
              :class="[
                inlineReadonlyTextClass,
                resolveInvalidTextClass(isStudentFieldInvalid(row.original, 'studyProgramName'))
              ]"
            >
              {{ displayText(row.original.studyProgramName) }}
            </span>
          </template>
        </EditorStudentTableInlineCell>
      </template>

      <template #specializationCode-cell="{ row }">
        <EditorStudentTableInlineCell
          v-if="isStudentRow(row.original)"
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.specializationCode"
          cell-wrapper-class="min-w-32 cursor-pointer"
          :input-class="resolveSelectClass(row.original, 'specializationCode')"
          :display-frame-class="inlineReadonlySelectFrameClass"
          mode="text"
          @activate="activateRow(row.original.id)"
        >
          <template #edit>
            <USelectMenu
              :model-value="row.original.specializationCode"
              :items="specializationOptionsForRow(row.original)"
              value-key="specializationCode"
              label-key="specializationCode"
              placeholder="—"
              :search-input="false"
              size="md"
              :class="resolveSelectClass(row.original, 'specializationCode')"
              @update:model-value="updateSpecializationCode(row.original.id, $event)"
            />
          </template>
          <template #display>
            <span
              :class="[inlineReadonlyTextClass, resolveInvalidTextClass(resolveSpecializationIsInvalid(row.original))]"
            >
              {{ displayText(row.original.specializationCode) }}
            </span>
          </template>
        </EditorStudentTableInlineCell>
      </template>

      <template #thesisTitle-cell="{ row }">
        <EditorStudentTableInlineCell
          v-if="isStudentRow(row.original)"
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.thesisTitle"
          :cell-wrapper-class="thesisCellWrapperClass"
          :input-class="inlineEditInputClass"
          :invalid="isStudentFieldInvalid(row.original, 'thesisTitle')"
          :warning-marker="thesisTitleWarningMarker"
          mode="text"
          multiline
          @activate="activateRow(row.original.id)"
          @update:model-value="updateTextField(row.original.id, 'thesisTitle', $event)"
          @commit="commitPendingInlineEdits"
        />
      </template>

      <template #thesisTitleLocal-cell="{ row }">
        <EditorStudentTableInlineCell
          v-if="isStudentRow(row.original)"
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.thesisTitleLocal"
          :cell-wrapper-class="thesisCellWrapperClass"
          :input-class="inlineEditInputClass"
          :invalid="isStudentFieldInvalid(row.original, 'thesisTitleLocal')"
          :warning-marker="thesisTitleWarningMarker"
          mode="text"
          multiline
          @activate="activateRow(row.original.id)"
          @update:model-value="updateTextField(row.original.id, 'thesisTitleLocal', $event)"
          @commit="commitPendingInlineEdits"
        />
      </template>

      <template #thesisTitleEn-cell="{ row }">
        <EditorStudentTableInlineCell
          v-if="isStudentRow(row.original)"
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.thesisTitleEn"
          :cell-wrapper-class="thesisCellWrapperClass"
          :input-class="inlineEditInputClass"
          :invalid="isStudentFieldInvalid(row.original, 'thesisTitleEn')"
          :warning-marker="thesisTitleWarningMarker"
          mode="text"
          multiline
          @activate="activateRow(row.original.id)"
          @update:model-value="updateTextField(row.original.id, 'thesisTitleEn', $event)"
          @commit="commitPendingInlineEdits"
        />
      </template>

      <template #thesisLanguage-cell="{ row }">
        <EditorStudentTableInlineCell
          v-if="isStudentRow(row.original)"
          :is-editing="isEditingRow(row.original.id)"
          :model-value="resolveThesisLanguageLabel(row.original.thesisLanguage)"
          cell-wrapper-class="min-w-[9rem] cursor-pointer"
          :input-class="resolveSelectClass(row.original, 'thesisLanguage')"
          :display-frame-class="inlineReadonlySelectFrameClass"
          mode="text"
          @activate="activateRow(row.original.id)"
        >
          <template #edit>
            <USelectMenu
              :model-value="row.original.thesisLanguage"
              :items="thesisLanguageOptions"
              value-key="value"
              label-key="label"
              placeholder="—"
              :search-input="false"
              size="md"
              :class="resolveSelectClass(row.original, 'thesisLanguage')"
              :ui="resolveSelectUi(row.original, 'thesisLanguage')"
              @update:model-value="updateThesisLanguage(row.original.id, $event)"
            />
          </template>
          <template #display>
            <span
              :class="[
                inlineReadonlyTextClass,
                resolveInvalidTextClass(isStudentFieldInvalid(row.original, 'thesisLanguage'))
              ]"
            >
              {{ resolveThesisLanguageLabel(row.original.thesisLanguage) }}
            </span>
          </template>
        </EditorStudentTableInlineCell>
      </template>

      <template #supervisorName-cell="{ row }">
        <EditorStudentTableInlineCell
          v-if="isStudentRow(row.original)"
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.supervisorName"
          cell-wrapper-class="min-w-[11rem] cursor-pointer"
          :input-class="inlineEditInputClass"
          :invalid="isStudentFieldInvalid(row.original, 'supervisorName')"
          mode="text"
          @activate="activateRow(row.original.id)"
          @update:model-value="updateTextField(row.original.id, 'supervisorName', $event)"
          @commit="commitPendingInlineEdits"
        />
      </template>

      <template #additionalSupervisorName-cell="{ row }">
        <EditorStudentTableInlineCell
          v-if="isStudentRow(row.original)"
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.additionalSupervisorName"
          cell-wrapper-class="min-w-[6.5rem] cursor-pointer"
          :input-class="inlineEditInputClass"
          mode="text"
          @activate="activateRow(row.original.id)"
          @update:model-value="updateTextField(row.original.id, 'additionalSupervisorName', $event)"
          @commit="commitPendingInlineEdits"
        />
      </template>

      <template #reviewerName-cell="{ row }">
        <EditorStudentTableInlineCell
          v-if="isStudentRow(row.original)"
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.reviewerName"
          cell-wrapper-class="min-w-[11rem] cursor-pointer"
          :input-class="inlineEditInputClass"
          :invalid="isStudentFieldInvalid(row.original, 'reviewerName')"
          mode="text"
          @activate="activateRow(row.original.id)"
          @update:model-value="updateTextField(row.original.id, 'reviewerName', $event)"
          @commit="commitPendingInlineEdits"
        />
      </template>

      <template #additionalReviewerName-cell="{ row }">
        <EditorStudentTableInlineCell
          v-if="isStudentRow(row.original)"
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.additionalReviewerName"
          cell-wrapper-class="min-w-[6.5rem] cursor-pointer"
          :input-class="inlineEditInputClass"
          mode="text"
          @activate="activateRow(row.original.id)"
          @update:model-value="updateTextField(row.original.id, 'additionalReviewerName', $event)"
          @commit="commitPendingInlineEdits"
        />
      </template>

      <template #repeatType-cell="{ row }">
        <EditorStudentTableInlineCell
          v-if="isStudentRow(row.original)"
          :is-editing="isEditingRow(row.original.id)"
          :model-value="resolveRepeatTypeLabel(row.original.repeatType)"
          cell-wrapper-class="min-w-[11rem] cursor-pointer"
          :input-class="resolveSelectClass(row.original, 'repeatType')"
          :display-frame-class="inlineReadonlySelectFrameClass"
          mode="text"
          @activate="activateRow(row.original.id)"
        >
          <template #edit>
            <div class="relative w-full">
              <USelectMenu
                :model-value="row.original.repeatType"
                :items="repeatTypeOptions"
                value-key="value"
                label-key="label"
                placeholder="—"
                :search-input="false"
                size="md"
                :class="resolveSelectClass(row.original, 'repeatType')"
                :ui="resolveSelectUi(row.original, 'repeatType')"
                @update:model-value="updateRepeatType(row.original.id, $event)"
                @update:open="updateRepeatTypeSelectOpen(row.original.id, $event)"
              />

              <EditorRepeatTypeDurationWarningPopover :open="isRepeatTypeSelectOpen(row.original.id)" />
            </div>
          </template>
          <template #display>
            <span
              :class="[
                inlineReadonlyTextClass,
                resolveInvalidTextClass(isStudentFieldInvalid(row.original, 'repeatType'))
              ]"
            >
              {{ resolveRepeatTypeLabel(row.original.repeatType) }}
            </span>
          </template>
        </EditorStudentTableInlineCell>
      </template>

      <template #prepareMinutes-cell="{ row }">
        <EditorStudentTableInlineCell
          v-if="isStudentRow(row.original)"
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.prepareMinutes"
          cell-wrapper-class="min-w-[6.5rem] cursor-pointer"
          :input-class="inlineEditInputClass"
          :invalid="isStudentFieldInvalid(row.original, 'prepareMinutes')"
          mode="number"
          @activate="activateRow(row.original.id)"
          @update:model-value="updateMinuteField(row.original.id, 'prepareMinutes', $event)"
          @commit="commitPendingInlineEdits"
        />
      </template>

      <template #examMinutes-cell="{ row }">
        <EditorStudentTableInlineCell
          v-if="isStudentRow(row.original)"
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.examMinutes"
          cell-wrapper-class="min-w-[6.5rem] cursor-pointer"
          :input-class="inlineEditInputClass"
          :invalid="isStudentFieldInvalid(row.original, 'examMinutes')"
          mode="number"
          @activate="activateRow(row.original.id)"
          @update:model-value="updateMinuteField(row.original.id, 'examMinutes', $event)"
          @commit="commitPendingInlineEdits"
        />
      </template>

      <template #empty>
        <UEmpty
          icon="i-lucide-users"
          :title="props.emptyLabels.emptyTitle"
          :description="props.emptyLabels.emptyDescription"
        />
      </template>
    </UTable>

    <div
      aria-hidden="true"
      class="editor-students-table-drag-overlay pointer-events-none absolute inset-0 z-10"
      :class="{ 'editor-students-table-drag-overlay--visible': isDragging }"
    />
  </div>
</template>
