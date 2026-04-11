<script setup lang="ts">
import {
  EXPORT_CHECKBOX_GROUP_UI,
  EXPORT_CLEAR_ALL_BUTTON_UI,
  EXPORT_LOADING_OVERLAY_CLASS,
  EXPORT_SELECT_ALL_BUTTON_UI
} from '~/constants/export-modal-ui'

interface EditorPdfInvigilatorsCommitteeItem {
  id: string
  label: string
  description: string
}

interface EditorPdfInvigilatorsDayGroup {
  id: string
  dayLabel: string
  committees: EditorPdfInvigilatorsCommitteeItem[]
}

const props = withDefaults(
  defineProps<{
    title: string
    description: string
    dayGroups: EditorPdfInvigilatorsDayGroup[]
    selectedCommitteeIds: string[]
    selectedCountLabel: string
    orderingHintLabel: string
    checklistAriaLabel: string
    selectAllLabel: string
    clearAllLabel: string
    cancelLabel: string
    submitLabel: string
    loading?: boolean
    loadingLabel?: string
    emptyTitle: string
    emptyDescription: string
    submitDisabled: boolean
  }>(),
  {
    loading: false,
    loadingLabel: ''
  }
)

const emit = defineEmits<{
  cancel: []
  submit: []
  selectAll: []
  clearAll: []
  updateSelectedCommitteeIds: [value: string[]]
}>()

const open = defineModel<boolean>('open', { default: false })
const expandedDayIds = ref<string[]>([])
const loading = computed(() => props.loading)
const submitDisabled = computed(() => props.submitDisabled)
const loadingLabel = computed(() => props.loadingLabel)

const {
  isLoading,
  isSubmitDisabled,
  dimmedContainerClass,
  resolvedLoadingLabel,
  handleCancel,
  handleSubmit,
  handleSelectAll,
  handleClearAll
} = useExportModalControls({
  loading,
  submitDisabled,
  loadingLabel,
  open,
  emitCancel: () => emit('cancel'),
  emitSubmit: () => emit('submit'),
  emitSelectAll: () => emit('selectAll'),
  emitClearAll: () => emit('clearAll')
})

const { t } = useI18n()

watch(
  () => open.value,
  (isOpen) => {
    if (isOpen) {
      // Keep days collapsed on each open by default.
      expandedDayIds.value = []
    }
  }
)

const selectedCommitteeIdsModel = computed({
  get: () => props.selectedCommitteeIds,
  set: (value: string[]) => {
    if (isLoading.value) {
      return
    }

    emit('updateSelectedCommitteeIds', value)
  }
})

const selectedCommitteeIdsSet = computed(() => new Set(props.selectedCommitteeIds))
const hasCommittees = computed(() => props.dayGroups.some((day) => day.committees.length > 0))

function isDayExpanded(dayId: string): boolean {
  return expandedDayIds.value.includes(dayId)
}

function toggleDay(dayId: string): void {
  if (isLoading.value) {
    return
  }

  if (isDayExpanded(dayId)) {
    expandedDayIds.value = expandedDayIds.value.filter((id) => id !== dayId)
    return
  }

  expandedDayIds.value = [...expandedDayIds.value, dayId]
}

function resolveSelectedCountForDay(day: EditorPdfInvigilatorsDayGroup): number {
  return day.committees.reduce((count, committee) => {
    return selectedCommitteeIdsSet.value.has(committee.id) ? count + 1 : count
  }, 0)
}

function resolveDayCheckboxModelValue(day: EditorPdfInvigilatorsDayGroup): boolean | 'indeterminate' {
  const selectedCount = resolveSelectedCountForDay(day)
  const totalCount = day.committees.length

  if (selectedCount < 1) {
    return false
  }

  if (selectedCount === totalCount) {
    return true
  }

  return 'indeterminate'
}

function toggleDaySelection(day: EditorPdfInvigilatorsDayGroup): void {
  if (isLoading.value) {
    return
  }

  const nextSelected = new Set(props.selectedCommitteeIds)
  const shouldSelectWholeDay = resolveDayCheckboxModelValue(day) !== true

  for (const committee of day.committees) {
    if (shouldSelectWholeDay) {
      nextSelected.add(committee.id)
      continue
    }

    nextSelected.delete(committee.id)
  }

  emit('updateSelectedCommitteeIds', Array.from(nextSelected))
}

function resolveDaySelectedCountLabel(day: EditorPdfInvigilatorsDayGroup): string {
  return t('editor.schedule.export.pdfInvigilatorsDialog.daySelectedCount', {
    selected: resolveSelectedCountForDay(day),
    total: day.committees.length
  })
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="props.title"
    :description="props.description"
    :dismissible="!isLoading"
    :close="{ disabled: isLoading }"
    :ui="{
      content: 'sm:max-w-3xl'
    }"
  >
    <template #body>
      <div class="relative">
        <div :class="dimmedContainerClass">
          <div v-if="hasCommittees" class="space-y-4">
            <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div class="max-w-2xl min-w-0 space-y-1">
                <p class="text-muted text-xl font-semibold">
                  {{ props.selectedCountLabel }}
                </p>
                <p class="text-muted text-sm leading-snug">
                  {{ props.orderingHintLabel }}
                </p>
              </div>

              <div class="grid shrink-0 grid-cols-1 gap-2 justify-self-end">
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-list-checks"
                  class="w-full cursor-pointer justify-center"
                  :disabled="isLoading"
                  :ui="EXPORT_SELECT_ALL_BUTTON_UI"
                  @click="handleSelectAll"
                >
                  {{ props.selectAllLabel }}
                </UButton>

                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-brush-cleaning"
                  class="w-full cursor-pointer justify-center"
                  :disabled="isLoading"
                  :ui="EXPORT_CLEAR_ALL_BUTTON_UI"
                  @click="handleClearAll"
                >
                  {{ props.clearAllLabel }}
                </UButton>
              </div>
            </div>

            <div class="border-default max-h-[45vh] overflow-y-auto rounded-md border-2 p-3">
              <div role="group" :aria-label="props.checklistAriaLabel" class="space-y-2">
                <div v-for="(day, dayIndex) in props.dayGroups" :key="day.id" class="space-y-1">
                  <div
                    class="flex items-center gap-2 rounded-md px-2 py-2 transition-colors"
                    :class="
                      dayIndex % 2 === 0
                        ? 'bg-primary/5 hover:bg-primary/10 dark:bg-primary/20 dark:hover:bg-primary/18'
                        : 'hover:bg-primary/10 dark:bg-default dark:hover:bg-primary/18 bg-white'
                    "
                  >
                    <UCheckbox
                      :model-value="resolveDayCheckboxModelValue(day)"
                      :aria-label="day.dayLabel"
                      :disabled="isLoading"
                      class="shrink-0 cursor-pointer"
                      @click.stop
                      @update:model-value="toggleDaySelection(day)"
                    />

                    <button
                      type="button"
                      :disabled="isLoading"
                      class="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 text-left"
                      @click="toggleDay(day.id)"
                    >
                      <span class="min-w-0 pl-2">
                        <span class="block truncate text-sm font-semibold">
                          {{ day.dayLabel }}
                        </span>
                        <span class="text-muted block text-sm">
                          {{ resolveDaySelectedCountLabel(day) }}
                        </span>
                      </span>

                      <UIcon
                        name="i-lucide-chevron-down"
                        class="text-muted size-4 shrink-0 transition-transform"
                        :class="isDayExpanded(day.id) ? 'rotate-180' : ''"
                      />
                    </button>
                  </div>

                  <div v-if="isDayExpanded(day.id)" class="px-2 pb-1 pl-8">
                    <UCheckboxGroup
                      v-model="selectedCommitteeIdsModel"
                      :items="day.committees"
                      value-key="id"
                      label-key="label"
                      description-key="description"
                      :legend="`${props.checklistAriaLabel} — ${day.dayLabel}`"
                      :ui="EXPORT_CHECKBOX_GROUP_UI"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="py-4">
            <UEmpty icon="i-lucide-circle-slash-2" :title="props.emptyTitle" :description="props.emptyDescription" />
          </div>
        </div>

        <div v-show="isLoading" :class="EXPORT_LOADING_OVERLAY_CLASS" aria-busy="true" aria-live="polite">
          <CommonAppLoadingState :label="resolvedLoadingLabel" min-height-class="min-h-0" />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" class="cursor-pointer" :disabled="isLoading" @click="handleCancel">
          {{ props.cancelLabel }}
        </UButton>

        <UButton
          color="primary"
          variant="solid"
          class="cursor-pointer"
          :loading="isLoading"
          :disabled="isSubmitDisabled"
          @click="handleSubmit"
        >
          {{ props.submitLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
