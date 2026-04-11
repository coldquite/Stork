<script setup lang="ts">
import type { ScheduleDraftCommittee, ScheduleDraftInvigilator } from '~/types/schedule-draft'
import type { EditorCommitteeStringFieldPayload } from '~/types/editor'

const props = defineProps<{
  selectedCommittee: ScheduleDraftCommittee | null
  preparationRoomLabel: string
  invigilators: ScheduleDraftInvigilator[]
  invigilatorsCountLabel: string
  addActionLabel: string
  deleteInvigilatorAriaLabel: string
  isInvigilatorsEmpty: boolean
}>()

const emit = defineEmits<{
  (e: 'addInvigilator'): void
  (e: 'deleteInvigilator', localId: string): void
  (e: 'committeeStringField', payload: EditorCommitteeStringFieldPayload): void
}>()

const readOnlyInputClass = 'min-w-0 flex-1 overflow-hidden rounded-md bg-accented'
const actionButtonClass = 'shrink-0 px-2 cursor-pointer'
const deleteActionButtonUi = {
  base: 'text-error ring-[2px] ring-error/70 hover:text-error hover:ring-error/85 dark:text-error dark:ring-error/85 dark:hover:text-error dark:hover:ring-error'
}
const invalidInputUi = {
  base: 'ring-2 ring-inset ring-error/70 dark:ring-error/85'
} as const
const hasSelectedCommittee = computed(() => Boolean(props.selectedCommittee))
const isPreparationRoomInvalid = computed(() => {
  return hasSelectedCommittee.value && (props.selectedCommittee?.preparationRoom?.trim().length ?? 0) < 1
})

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

function emitPreparationRoom(value: string | number): void {
  if (!props.selectedCommittee) {
    return
  }

  emit('committeeStringField', { field: 'preparationRoom', value: String(value) })
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
        <div class="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
          <span class="text-sm whitespace-nowrap">{{ props.preparationRoomLabel }}:</span>
          <UInput
            :model-value="props.selectedCommittee?.preparationRoom ?? ''"
            class="w-full min-w-0"
            :ui="isPreparationRoomInvalid ? invalidInputUi : undefined"
            placeholder="—"
            :disabled="!props.selectedCommittee"
            @update:model-value="emitPreparationRoom"
          />
        </div>

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
