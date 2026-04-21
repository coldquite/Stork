<script setup lang="ts">
import { EXPORT_CLEAR_ALL_BUTTON_UI, EXPORT_SELECT_ALL_BUTTON_UI } from '~/constants/export-modal-ui'

interface EditorSyncInvigilatorsDiffEntry {
  id: string
  name: string
  willBeRemoved: boolean
}

interface EditorSyncInvigilatorsCommitteeItem {
  id: string
  label: string
  description: string
  currentInvigilators: EditorSyncInvigilatorsDiffEntry[]
  nextInvigilators: string[]
}

interface EditorSyncInvigilatorsRewriteRow {
  id: string
  currentName: string
  currentWillBeRemoved: boolean
  nextName: string
}

const props = defineProps<{
  title: string
  description: string
  committees: EditorSyncInvigilatorsCommitteeItem[]
  selectedCommitteeIds: string[]
  selectedCountLabel: string
  orderingHintLabel: string
  checklistAriaLabel: string
  selectAllLabel: string
  clearAllLabel: string
  cancelLabel: string
  submitLabel: string
  submitDisabled: boolean
  emptyTitle: string
  emptyDescription: string
  currentInvigilatorsLabel: string
  nextInvigilatorsLabel: string
}>()

const emit = defineEmits<{
  cancel: []
  submit: []
  selectAll: []
  clearAll: []
  updateSelectedCommitteeIds: [value: string[]]
}>()

const open = defineModel<boolean>('open', { default: false })
const loading = computed(() => false)
const submitDisabled = computed(() => props.submitDisabled)
const loadingLabel = computed(() => '')

const {
  isLoading,
  isSubmitDisabled,
  dimmedContainerClass,
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

const EMPTY_DISPLAY_VALUE = '—'
const selectedCommitteeIdsSet = computed(() => new Set(props.selectedCommitteeIds))
const hasCommittees = computed(() => props.committees.length > 0)

const selectedCommitteeIdsModel = computed({
  get: () => props.selectedCommitteeIds,
  set: (value: string[]) => {
    if (isLoading.value) {
      return
    }

    emit('updateSelectedCommitteeIds', value)
  }
})

function toggleCommitteeSelection(committeeId: string, shouldSelect: boolean): void {
  const nextSelectedCommitteeIds = new Set(selectedCommitteeIdsModel.value)

  if (shouldSelect) {
    nextSelectedCommitteeIds.add(committeeId)
  } else {
    nextSelectedCommitteeIds.delete(committeeId)
  }

  selectedCommitteeIdsModel.value = Array.from(nextSelectedCommitteeIds)
}

function handleCommitteeRowClick(item: EditorSyncInvigilatorsCommitteeItem): void {
  if (isLoading.value) {
    return
  }

  const isSelected = selectedCommitteeIdsSet.value.has(item.id)
  toggleCommitteeSelection(item.id, !isSelected)
}

function handleCommitteeCheckboxUpdate(
  item: EditorSyncInvigilatorsCommitteeItem,
  nextValue: boolean | 'indeterminate'
): void {
  if (isLoading.value) {
    return
  }

  toggleCommitteeSelection(item.id, nextValue === true)
}

function resolveCurrentInvigilators(item: EditorSyncInvigilatorsCommitteeItem): EditorSyncInvigilatorsDiffEntry[] {
  if (item.currentInvigilators.length > 0) {
    return item.currentInvigilators
  }

  return [
    {
      id: `${item.id}-current-empty`,
      name: EMPTY_DISPLAY_VALUE,
      willBeRemoved: false
    }
  ]
}

function resolveNextInvigilators(item: EditorSyncInvigilatorsCommitteeItem): string[] {
  if (item.nextInvigilators.length > 0) {
    return item.nextInvigilators
  }

  return [EMPTY_DISPLAY_VALUE]
}

function resolveInvigilatorsRewriteRows(item: EditorSyncInvigilatorsCommitteeItem): EditorSyncInvigilatorsRewriteRow[] {
  const currentInvigilators = resolveCurrentInvigilators(item)
  const nextInvigilators = resolveNextInvigilators(item)
  const rowCount = Math.max(currentInvigilators.length, nextInvigilators.length)

  return Array.from({ length: rowCount }, (_, index) => {
    const currentEntry = currentInvigilators[index]
    const nextName = nextInvigilators[index]

    return {
      id: `${item.id}-rewrite-row-${index}-${currentEntry?.id ?? 'current-empty'}`,
      currentName: currentEntry?.name ?? EMPTY_DISPLAY_VALUE,
      currentWillBeRemoved: currentEntry?.willBeRemoved ?? false,
      nextName: nextName ?? EMPTY_DISPLAY_VALUE
    }
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

            <div class="border-default max-h-[42vh] overflow-y-auto rounded-md border-2 p-2">
              <div role="group" :aria-label="props.checklistAriaLabel" class="space-y-2">
                <div v-for="(item, index) in props.committees" :key="item.id">
                  <button
                    type="button"
                    class="w-full rounded-md px-2 py-2 text-left transition-colors"
                    :class="
                      index % 2 === 0
                        ? 'bg-primary/5 hover:bg-primary/10 dark:bg-primary/20 dark:hover:bg-primary/18'
                        : 'hover:bg-primary/10 dark:bg-default dark:hover:bg-primary/18 bg-white'
                    "
                    :disabled="isLoading"
                    @click="handleCommitteeRowClick(item)"
                  >
                    <div class="flex items-start gap-2">
                      <span class="shrink-0 pt-1" @click.stop>
                        <UCheckbox
                          :model-value="selectedCommitteeIdsSet.has(item.id)"
                          :disabled="isLoading"
                          class="cursor-pointer"
                          @update:model-value="handleCommitteeCheckboxUpdate(item, $event)"
                        />
                      </span>

                      <div class="min-w-0 flex-1 space-y-2">
                        <div>
                          <span class="block truncate text-sm font-semibold">
                            {{ item.label }}
                          </span>
                          <span class="text-muted block text-sm leading-snug">
                            {{ item.description }}
                          </span>
                        </div>

                        <div class="space-y-1.5">
                          <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
                            <div class="text-xs font-medium">
                              {{ props.currentInvigilatorsLabel }}
                            </div>
                            <span />
                            <div class="text-xs font-medium">
                              {{ props.nextInvigilatorsLabel }}
                            </div>
                          </div>

                          <ul class="space-y-1">
                            <li
                              v-for="row in resolveInvigilatorsRewriteRows(item)"
                              :key="row.id"
                              class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5"
                            >
                              <span
                                class="block rounded-md px-2 py-1 text-xs"
                                :class="
                                  row.currentWillBeRemoved
                                    ? 'bg-error/15 text-error font-semibold'
                                    : 'bg-muted/40 text-muted-foreground'
                                "
                              >
                                {{ row.currentName }}
                              </span>

                              <UIcon name="i-lucide-arrow-right" class="text-muted-foreground h-3.5 w-3.5 shrink-0" />

                              <span class="bg-primary/15 text-primary block rounded-md px-2 py-1 text-xs font-semibold">
                                {{ row.nextName }}
                              </span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="py-4">
            <UEmpty icon="i-lucide-circle-slash-2" :title="props.emptyTitle" :description="props.emptyDescription" />
          </div>
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
          :disabled="isSubmitDisabled"
          @click="handleSubmit"
        >
          {{ props.submitLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
