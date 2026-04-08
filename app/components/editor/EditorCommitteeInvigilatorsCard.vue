<script setup lang="ts">
import type { ScheduleDraftCommittee, ScheduleDraftInvigilator } from '~/types/schedule-draft'

const props = defineProps<{
  selectedCommittee: ScheduleDraftCommittee | null
  invigilators: ScheduleDraftInvigilator[]
  invigilatorsCountLabel: string
  addActionLabel: string
  deleteInvigilatorAriaLabel: string
  isInvigilatorsEmpty: boolean
}>()

const emit = defineEmits<{
  (e: 'addInvigilator'): void
  (e: 'deleteInvigilator', localId: string): void
}>()

const readOnlyInputClass = 'min-w-0 flex-1 overflow-hidden rounded-md bg-accented'
const actionButtonClass = 'shrink-0 px-2 cursor-pointer'
const deleteActionButtonUi = {
  base: 'text-error ring-[2px] ring-error/70 hover:text-error hover:ring-error/85 dark:text-error dark:ring-error/85 dark:hover:text-error dark:hover:ring-error'
}

function requestAdd(): void {
  if (!props.selectedCommittee) {
    return
  }

  emit('addInvigilator')
}

function requestDelete(localId: string): void {
  if (!props.selectedCommittee) {
    return
  }

  emit('deleteInvigilator', localId)
}
</script>

<template>
  <div
    :class="[
      'border-default w-fit max-w-full min-w-0 rounded-md border p-2',
      props.isInvigilatorsEmpty
        ? 'border-error/70 ring-error/40 dark:border-error dark:ring-error/80 ring-2 ring-inset'
        : ''
    ]"
  >
    <div class="flex flex-col gap-3">
      <div class="space-y-2">
        <p class="text-sm font-medium">
          {{ props.invigilatorsCountLabel }}
        </p>

        <ul v-if="props.invigilators.length > 0" class="space-y-2">
          <li v-for="invigilator in props.invigilators" :key="invigilator.localId" class="flex items-center gap-2">
            <UInput
              :model-value="invigilator.name"
              disabled
              :class="`cursor-not-allowed select-none ${readOnlyInputClass}`"
            />
            <UButton
              color="error"
              variant="ghost"
              icon="i-lucide-trash-2"
              :aria-label="props.deleteInvigilatorAriaLabel"
              :title="props.deleteInvigilatorAriaLabel"
              :class="actionButtonClass"
              :ui="deleteActionButtonUi"
              @click="requestDelete(invigilator.localId)"
            />
          </li>
        </ul>

        <div>
          <UButton
            color="primary"
            variant="soft"
            size="sm"
            icon="i-lucide-plus"
            class="ring-primary/35 hover:ring-primary/55 w-full cursor-pointer justify-center text-sm font-semibold ring-2"
            :disabled="!props.selectedCommittee"
            @click="requestAdd"
          >
            {{ props.addActionLabel }}
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
