<script setup lang="ts">
interface EditorCsvExportCommitteeItem {
  id: string
  label: string
  description: string
}

const props = defineProps<{
  title: string
  description: string
  committees: EditorCsvExportCommitteeItem[]
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

const open = defineModel<boolean>('open', { default: false })

const selectedCommitteeIdsModel = computed({
  get: () => props.selectedCommitteeIds,
  set: (value: string[]) => {
    emit('updateSelectedCommitteeIds', value)
  }
})

const hasCommittees = computed(() => props.committees.length > 0)
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

        <div class="border-default max-h-[40vh] overflow-y-auto rounded-md border-2 p-3">
          <UCheckboxGroup
            v-model="selectedCommitteeIdsModel"
            :items="props.committees"
            value-key="id"
            label-key="label"
            description-key="description"
            :legend="props.checklistAriaLabel"
            :ui="committeeCheckboxGroupUi"
          />
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
