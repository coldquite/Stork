<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { useSortable } from '@vueuse/integrations/useSortable'
import type { EditorSpecializationOption } from '#shared/constants/editor'
import type { RepeatTypeDto, ThesisLanguageDto } from '#shared/types/time-schedules'
import { STUDENT_TABLE_THESIS_COLUMN_WIDTH_CLASS } from '~/constants/editor-students-table'
import type { EditorStudentsPanelStudentsEmptyLabels, StudentRow } from '~/types/editor'
import { resolveRepeatTypeFromSelectValue } from '~/utils/editor/repeat-type'
import { resolveThesisLanguageFromSelectValue } from '~/utils/editor/thesis-language'

type EditableTextField =
  | 'personalNumber'
  | 'titlesBefore'
  | 'lastName'
  | 'firstName'
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

interface SortableUpdateEventLike {
  oldIndex: number | null
  newIndex: number | null
}

const props = defineProps<{
  /** Stable key when the parent committee changes (resets local row order). */
  committeeLocalId: string
  modelValue: StudentRow[]
  columns: TableColumn<StudentRow>[]
  specializationOptions: EditorSpecializationOption[]
  emptyLabels: EditorStudentsPanelStudentsEmptyLabels
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: StudentRow[]): void
}>()

const { t } = useI18n()
const tableWrapper = ref<HTMLElement | null>(null)
const localStudents = ref<StudentRow[]>([])
const editingRowId = ref<string | null>(null)
const isDragging = ref(false)
const activeDragCommitteeId = ref<string | null>(null)
const inlineEditInputClass = 'w-full [&_input]:text-sm'
const inlineEditSelectClass = 'w-full [&_[role=combobox]]:text-sm [&_[role=combobox]_span]:text-sm'
const inlineReadonlyFrameClass = 'w-full min-h-8 px-2.5 py-1.5'
const inlineReadonlySelectFrameClass = `${inlineReadonlyFrameClass} pe-9`
const inlineReadonlyTextClass = 'block text-sm whitespace-nowrap truncate'
const thesisCellWrapperClass = `${STUDENT_TABLE_THESIS_COLUMN_WIDTH_CLASS} cursor-pointer`

function syncFromParent(): void {
  localStudents.value = props.modelValue.slice()
}

watch(
  () => props.committeeLocalId,
  () => {
    syncFromParent()
    editingRowId.value = null
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

    nextTick(() => {
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
    nextTick(() => {
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
  },
  {
    value: 'UNKNOWN',
    label: t('editor.table.repeatTypeOptions.unknown')
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

function emitRowsUpdate(): void {
  emit('update:modelValue', localStudents.value.slice())
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
}

function activateRow(rowId: string): void {
  editingRowId.value = rowId
}

function clearActiveRow(): void {
  editingRowId.value = null
}

function isClickOnDragHandle(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('.drag-handle') !== null
}

function resolveClickedRowId(target: EventTarget | null): string | null {
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

  return localStudents.value[clickedRowIndex]?.id ?? null
}

function handleTableClick(event: MouseEvent): void {
  if (isDragging.value || isClickOnDragHandle(event.target)) {
    return
  }

  const rowId = resolveClickedRowId(event.target)
  if (!rowId) {
    clearActiveRow()
    return
  }

  activateRow(rowId)
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

function updateRow(rowId: string, updater: (row: StudentRow) => StudentRow): void {
  localStudents.value = localStudents.value.map((row) => (row.id === rowId ? updater(row) : row))
  emitRowsUpdate()
}

function updateTextField(rowId: string, field: EditableTextField, value: unknown): void {
  updateRow(rowId, (row) => ({
    ...row,
    [field]: String(value ?? '')
  }))
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
  updateRow(rowId, (row) => ({
    ...row,
    [field]: resolveIntegerFromInput(value, row[field])
  }))
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

function updateSpecializationCode(rowId: string, value: unknown): void {
  updateRow(rowId, (row) => ({
    ...row,
    specializationCode: resolveSpecializationCodeFromSelectValue(value, row.specializationCode)
  }))
}

function updateRepeatType(rowId: string, value: unknown): void {
  updateRow(rowId, (row) => ({
    ...row,
    repeatType: resolveRepeatTypeFromSelectValue(value, row.repeatType)
  }))
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

function resolveThesisLanguageLabel(value: ThesisLanguageDto): string {
  return thesisLanguageLabelsByValue.value.get(value) ?? value
}

function displayText(value: string): string {
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : '-'
}

function specializationOptionsForRow(row: StudentRow): EditorSpecializationOption[] {
  const normalizedCode = row.specializationCode.trim()
  if (normalizedCode.length < 1) {
    return props.specializationOptions
  }

  const hasCodeInOptions = props.specializationOptions.some((option) => option.specializationCode === normalizedCode)
  if (hasCodeInOptions) {
    return props.specializationOptions
  }

  return [
    {
      specializationCode: normalizedCode,
      specializationName: normalizedCode,
      departmentCode: null,
      departmentNameCs: null,
      departmentNameEn: null
    },
    ...props.specializationOptions
  ]
}

onMounted(() => {
  window.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div ref="tableWrapper" class="overflow-x-auto" @click="handleTableClick">
    <UTable
      :key="tableRenderKey"
      :data="localStudents"
      :columns="props.columns"
      :get-row-id="(row) => row.id"
      :ui="{
        tbody:
          'editor-students-tbody divide-y divide-default [&_tr:nth-child(odd)]:bg-primary/5 [&_tr:nth-child(even)]:bg-white dark:[&_tr:nth-child(odd)]:bg-primary/10 dark:[&_tr:nth-child(even)]:bg-default',
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
        <span class="text-muted text-xs font-semibold">
          {{ row.index + 1 }}
        </span>
      </template>

      <template #prepareTime-cell="{ row }">
        <span class="text-sm whitespace-nowrap" @click="activateRow(row.original.id)">
          {{ row.original.prepareTime }}
        </span>
      </template>

      <template #examTime-cell="{ row }">
        <span class="text-sm whitespace-nowrap" @click="activateRow(row.original.id)">
          {{ row.original.examTime }}
        </span>
      </template>

      <template #personalNumber-cell="{ row }">
        <EditorStudentTableInlineCell
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.personalNumber"
          cell-wrapper-class="min-w-[9rem] cursor-pointer"
          :input-class="inlineEditInputClass"
          mode="text"
          @activate="activateRow(row.original.id)"
          @update:model-value="(value) => updateTextField(row.original.id, 'personalNumber', value)"
        />
      </template>

      <template #titlesBefore-cell="{ row }">
        <EditorStudentTableInlineCell
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.titlesBefore"
          cell-wrapper-class="min-w-[9rem] cursor-pointer"
          :input-class="inlineEditInputClass"
          mode="text"
          @activate="activateRow(row.original.id)"
          @update:model-value="(value) => updateTextField(row.original.id, 'titlesBefore', value)"
        />
      </template>

      <template #lastName-cell="{ row }">
        <EditorStudentTableInlineCell
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.lastName"
          cell-wrapper-class="min-w-[10rem] cursor-pointer"
          :input-class="inlineEditInputClass"
          mode="text"
          @activate="activateRow(row.original.id)"
          @update:model-value="(value) => updateTextField(row.original.id, 'lastName', value)"
        />
      </template>

      <template #firstName-cell="{ row }">
        <EditorStudentTableInlineCell
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.firstName"
          cell-wrapper-class="min-w-[10rem] cursor-pointer"
          :input-class="inlineEditInputClass"
          mode="text"
          @activate="activateRow(row.original.id)"
          @update:model-value="(value) => updateTextField(row.original.id, 'firstName', value)"
        />
      </template>

      <template #titlesAfter-cell="{ row }">
        <EditorStudentTableInlineCell
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.titlesAfter"
          cell-wrapper-class="min-w-[9rem] cursor-pointer"
          :input-class="inlineEditInputClass"
          mode="text"
          @activate="activateRow(row.original.id)"
          @update:model-value="(value) => updateTextField(row.original.id, 'titlesAfter', value)"
        />
      </template>

      <template #specializationCode-cell="{ row }">
        <EditorStudentTableInlineCell
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.specializationCode"
          cell-wrapper-class="min-w-44 cursor-pointer"
          :input-class="inlineEditSelectClass"
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
              :search-input="false"
              size="md"
              :class="inlineEditSelectClass"
              @update:model-value="(value) => updateSpecializationCode(row.original.id, value)"
            />
          </template>
          <template #display>
            <span :class="inlineReadonlyTextClass">
              {{ displayText(row.original.specializationCode) }}
            </span>
          </template>
        </EditorStudentTableInlineCell>
      </template>

      <template #thesisTitle-cell="{ row }">
        <EditorStudentTableInlineCell
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.thesisTitle"
          :cell-wrapper-class="thesisCellWrapperClass"
          :input-class="inlineEditInputClass"
          mode="text"
          multiline
          @activate="activateRow(row.original.id)"
          @update:model-value="(value) => updateTextField(row.original.id, 'thesisTitle', value)"
        />
      </template>

      <template #thesisTitleLocal-cell="{ row }">
        <EditorStudentTableInlineCell
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.thesisTitleLocal"
          :cell-wrapper-class="thesisCellWrapperClass"
          :input-class="inlineEditInputClass"
          mode="text"
          multiline
          @activate="activateRow(row.original.id)"
          @update:model-value="(value) => updateTextField(row.original.id, 'thesisTitleLocal', value)"
        />
      </template>

      <template #thesisTitleEn-cell="{ row }">
        <EditorStudentTableInlineCell
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.thesisTitleEn"
          :cell-wrapper-class="thesisCellWrapperClass"
          :input-class="inlineEditInputClass"
          mode="text"
          multiline
          @activate="activateRow(row.original.id)"
          @update:model-value="(value) => updateTextField(row.original.id, 'thesisTitleEn', value)"
        />
      </template>

      <template #thesisLanguage-cell="{ row }">
        <EditorStudentTableInlineCell
          :is-editing="isEditingRow(row.original.id)"
          :model-value="resolveThesisLanguageLabel(row.original.thesisLanguage)"
          cell-wrapper-class="min-w-[11rem] cursor-pointer"
          :input-class="inlineEditSelectClass"
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
              :search-input="false"
              size="md"
              :class="inlineEditSelectClass"
              @update:model-value="(value) => updateThesisLanguage(row.original.id, value)"
            />
          </template>
          <template #display>
            <span :class="inlineReadonlyTextClass">
              {{ resolveThesisLanguageLabel(row.original.thesisLanguage) }}
            </span>
          </template>
        </EditorStudentTableInlineCell>
      </template>

      <template #supervisorName-cell="{ row }">
        <EditorStudentTableInlineCell
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.supervisorName"
          cell-wrapper-class="min-w-[14rem] cursor-pointer"
          :input-class="inlineEditInputClass"
          mode="text"
          @activate="activateRow(row.original.id)"
          @update:model-value="(value) => updateTextField(row.original.id, 'supervisorName', value)"
        />
      </template>

      <template #additionalSupervisorName-cell="{ row }">
        <EditorStudentTableInlineCell
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.additionalSupervisorName"
          cell-wrapper-class="min-w-[14rem] cursor-pointer"
          :input-class="inlineEditInputClass"
          mode="text"
          @activate="activateRow(row.original.id)"
          @update:model-value="(value) => updateTextField(row.original.id, 'additionalSupervisorName', value)"
        />
      </template>

      <template #reviewerName-cell="{ row }">
        <EditorStudentTableInlineCell
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.reviewerName"
          cell-wrapper-class="min-w-[14rem] cursor-pointer"
          :input-class="inlineEditInputClass"
          mode="text"
          @activate="activateRow(row.original.id)"
          @update:model-value="(value) => updateTextField(row.original.id, 'reviewerName', value)"
        />
      </template>

      <template #additionalReviewerName-cell="{ row }">
        <EditorStudentTableInlineCell
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.additionalReviewerName"
          cell-wrapper-class="min-w-[14rem] cursor-pointer"
          :input-class="inlineEditInputClass"
          mode="text"
          @activate="activateRow(row.original.id)"
          @update:model-value="(value) => updateTextField(row.original.id, 'additionalReviewerName', value)"
        />
      </template>

      <template #repeatType-cell="{ row }">
        <EditorStudentTableInlineCell
          :is-editing="isEditingRow(row.original.id)"
          :model-value="resolveRepeatTypeLabel(row.original.repeatType)"
          cell-wrapper-class="min-w-48 cursor-pointer"
          :input-class="inlineEditSelectClass"
          :display-frame-class="inlineReadonlySelectFrameClass"
          mode="text"
          @activate="activateRow(row.original.id)"
        >
          <template #edit>
            <USelectMenu
              :model-value="row.original.repeatType"
              :items="repeatTypeOptions"
              value-key="value"
              label-key="label"
              :search-input="false"
              size="md"
              :class="inlineEditSelectClass"
              @update:model-value="(value) => updateRepeatType(row.original.id, value)"
            />
          </template>
          <template #display>
            <span :class="inlineReadonlyTextClass">
              {{ resolveRepeatTypeLabel(row.original.repeatType) }}
            </span>
          </template>
        </EditorStudentTableInlineCell>
      </template>

      <template #prepareMinutes-cell="{ row }">
        <EditorStudentTableInlineCell
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.prepareMinutes"
          cell-wrapper-class="min-w-[8rem] cursor-pointer"
          :input-class="inlineEditInputClass"
          mode="number"
          @activate="activateRow(row.original.id)"
          @update:model-value="(value) => updateMinuteField(row.original.id, 'prepareMinutes', value)"
        />
      </template>

      <template #examMinutes-cell="{ row }">
        <EditorStudentTableInlineCell
          :is-editing="isEditingRow(row.original.id)"
          :model-value="row.original.examMinutes"
          cell-wrapper-class="min-w-[8rem] cursor-pointer"
          :input-class="inlineEditInputClass"
          mode="number"
          @activate="activateRow(row.original.id)"
          @update:model-value="(value) => updateMinuteField(row.original.id, 'examMinutes', value)"
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
  </div>
</template>
