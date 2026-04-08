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
  base: 'text-error/80 ring-[2px] ring-current/45 hover:text-error hover:ring-current/80'
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
      props.isInvigilatorsEmpty ? 'border-error/70 ring-error/40 ring-2 ring-inset' : ''
    ]"
  >
    <div class="flex flex-col gap-3">
      <div class="space-y-2">
        <span class="text-sm font-medium">
          {{ props.invigilatorsCountLabel }}
        </span>

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
              :class="actionButtonClass"
              :ui="deleteActionButtonUi"
              @click="requestDelete(invigilator.localId)"
            />
          </li>
        </ul>

        <UButton
          color="primary"
          variant="soft"
          size="sm"
          icon="i-lucide-plus"
          class="ring-primary/35 hover:ring-primary/55 mt-2 w-full cursor-pointer justify-center text-sm font-semibold ring-2"
          :disabled="!props.selectedCommittee"
          @click="requestAdd"
        >
          {{ props.addActionLabel }}
        </UButton>
      </div>
    </div>
  </div>
</template>
