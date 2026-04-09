<script setup lang="ts">
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

const props = defineProps<{
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
  emptyTitle: string
  emptyDescription: string
  submitDisabled: boolean
}>()

const emit = defineEmits<{
  cancel: []
  submit: []
  selectAll: []
  clearAll: []
  updateSelectedCommitteeIds: [value: string[]]
}>()

const { t } = useI18n()
const open = defineModel<boolean>('open', { default: false })
const expandedDayIds = ref<string[]>([])

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
    emit('updateSelectedCommitteeIds', value)
  }
})

const selectedCommitteeIdsSet = computed(() => new Set(props.selectedCommitteeIds))
const hasCommittees = computed(() => props.dayGroups.some((day) => day.committees.length > 0))
const committeeCheckboxGroupUi = {
  item: 'cursor-pointer rounded-md px-2 py-2 odd:bg-primary/5 even:bg-white hover:bg-primary/10 dark:odd:bg-primary/20 dark:even:bg-default dark:hover:bg-primary/18',
  base: 'cursor-pointer',
  label: 'cursor-pointer',
  description: 'cursor-pointer'
}

function handleCancel(): void {
  open.value = false
  emit('cancel')
}

function handleSubmit(): void {
  if (props.submitDisabled) {
    return
  }

  emit('submit')
}

function handleSelectAll(): void {
  emit('selectAll')
}

function handleClearAll(): void {
  emit('clearAll')
}

function isDayExpanded(dayId: string): boolean {
  return expandedDayIds.value.includes(dayId)
}

function toggleDay(dayId: string): void {
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
    :ui="{
      content: 'sm:max-w-3xl'
    }"
  >
    <template #body>
      <div v-if="hasCommittees" class="space-y-4">
        <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div class="max-w-[42rem] min-w-0 space-y-1">
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
              :ui="{
                base: 'border-2 border-primary-600 text-primary-800 hover:border-stork-600 hover:bg-stork-100 dark:border-stork-400 dark:text-stork-100 dark:hover:border-stork-300 dark:hover:bg-stork-800/35'
              }"
              @click="handleSelectAll"
            >
              {{ props.selectAllLabel }}
            </UButton>

            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-brush-cleaning"
              class="w-full cursor-pointer justify-center"
              :ui="{
                base: 'border-2 border-capaccent-400 text-capaccent-800 hover:border-capaccent-500 hover:bg-capaccent-50 dark:border-capaccent-500 dark:text-capaccent-100 dark:hover:bg-capaccent-900/50'
              }"
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
                  class="shrink-0 cursor-pointer"
                  @click.stop
                  @update:model-value="toggleDaySelection(day)"
                />

                <button
                  type="button"
                  class="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 text-left"
                  @click="toggleDay(day.id)"
                >
                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold">
                      {{ day.dayLabel }}
                    </p>
                    <p class="text-muted text-sm">
                      {{ resolveDaySelectedCountLabel(day) }}
                    </p>
                  </div>

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
                  :ui="committeeCheckboxGroupUi"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="py-4">
        <UEmpty icon="i-lucide-circle-slash-2" :title="props.emptyTitle" :description="props.emptyDescription" />
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" class="cursor-pointer" @click="handleCancel">
          {{ props.cancelLabel }}
        </UButton>

        <UButton
          color="primary"
          variant="solid"
          class="cursor-pointer"
          :disabled="props.submitDisabled"
          @click="handleSubmit"
        >
          {{ props.submitLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
