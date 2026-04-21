<script setup lang="ts">
import type { ScheduleDraftCommittee, ScheduleDraftInvigilator } from '~/types/schedule-draft'
import type { EditorCommitteeStringFieldPayload } from '~/types/editor'

const props = defineProps<{
  selectedCommittee: ScheduleDraftCommittee | null
  preparationRoomLabel: string
  applyPreparationRoomToAllLabel: string
  invigilators: ScheduleDraftInvigilator[]
  invigilatorsCountLabel: string
  addActionLabel: string
  syncInvigilatorsToMatchingCommitteesLabel: string
  deleteInvigilatorAriaLabel: string
  isInvigilatorsEmpty: boolean
}>()

const emit = defineEmits<{
  (e: 'addInvigilator' | 'applyPreparationRoomToAll' | 'syncInvigilatorsToMatchingCommittees'): void
  (e: 'deleteInvigilator', localId: string): void
  (e: 'committeeStringField', payload: EditorCommitteeStringFieldPayload): void
}>()

const readOnlyInputClass = 'min-w-0 flex-1 overflow-hidden rounded-md bg-accented'
const actionButtonClass = 'size-8 shrink-0 cursor-pointer justify-center rounded-md'
const applyPreparationRoomActionButtonClass = 'size-8 shrink-0 cursor-pointer justify-center rounded-md'
const deleteActionButtonUi = {
  base: 'text-error ring-[2px] ring-error/70 hover:text-error hover:ring-error/85 dark:text-error dark:ring-error/85 dark:hover:text-error dark:hover:ring-error'
}
const applyPreparationRoomActionButtonUi = {
  base: 'text-primary ring-[2px] ring-primary/60 hover:text-primary hover:ring-primary/75 dark:text-primary dark:ring-primary/70 dark:hover:text-primary dark:hover:ring-primary/85'
}
const invalidInputUi = {
  base: 'ring-2 ring-inset ring-error/70 dark:ring-error/85'
} as const
const hasSelectedCommittee = computed(() => Boolean(props.selectedCommittee))
const isPreparationRoomInvalid = computed(() => {
  return hasSelectedCommittee.value && (props.selectedCommittee?.preparationRoom?.trim().length ?? 0) < 1
})
const isApplyPreparationRoomToAllDisabled = computed(() => {
  if (!props.selectedCommittee) {
    return true
  }

  return (props.selectedCommittee.preparationRoom?.trim().length ?? 0) < 1
})
const isSyncInvigilatorsToMatchingCommitteesDisabled = computed(() => {
  if (!props.selectedCommittee) {
    return true
  }

  if (props.invigilators.length < 1) {
    return true
  }

  return (props.selectedCommittee.preparationRoom?.trim().length ?? 0) < 1
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

function requestApplyPreparationRoomToAll(): void {
  if (isApplyPreparationRoomToAllDisabled.value) {
    return
  }

  emit('applyPreparationRoomToAll')
}

function requestSyncInvigilatorsToMatchingCommittees(): void {
  if (isSyncInvigilatorsToMatchingCommitteesDisabled.value) {
    return
  }

  emit('syncInvigilatorsToMatchingCommittees')
}

function emitPreparationRoom(value: string | number): void {
  if (!props.selectedCommittee) {
    return
  }

  emit('committeeStringField', { field: 'preparationRoom', value: String(value) })
}
</script>

<template>
  <div class="border-default w-fit max-w-full min-w-0 rounded-md border p-2">
    <div class="flex flex-col gap-3">
      <div class="space-y-2">
        <div class="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
          <span class="text-sm whitespace-nowrap">{{ props.preparationRoomLabel }}:</span>
          <UInput
            :model-value="props.selectedCommittee?.preparationRoom ?? ''"
            class="w-full min-w-0"
            :ui="isPreparationRoomInvalid ? invalidInputUi : undefined"
            placeholder="—"
            :disabled="!props.selectedCommittee"
            @update:model-value="emitPreparationRoom"
          />
          <UTooltip :text="props.applyPreparationRoomToAllLabel">
            <span class="inline-flex">
              <UButton
                color="primary"
                variant="ghost"
                size="sm"
                icon="i-lucide-copy"
                :aria-label="props.applyPreparationRoomToAllLabel"
                :class="applyPreparationRoomActionButtonClass"
                :ui="applyPreparationRoomActionButtonUi"
                :disabled="isApplyPreparationRoomToAllDisabled"
                @click="requestApplyPreparationRoomToAll"
              />
            </span>
          </UTooltip>
        </div>

        <p :class="['text-sm font-medium', props.isInvigilatorsEmpty ? 'text-error' : '']">
          {{ props.invigilatorsCountLabel }}
        </p>

        <ul v-if="props.invigilators.length > 0" class="space-y-2">
          <li v-for="invigilator in props.invigilators" :key="invigilator.localId" class="flex items-center gap-2">
            <UInput
              :model-value="invigilator.name"
              disabled
              :class="`cursor-not-allowed select-none ${readOnlyInputClass}`"
            />
            <UTooltip :text="props.deleteInvigilatorAriaLabel">
              <UButton
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                :aria-label="props.deleteInvigilatorAriaLabel"
                :class="actionButtonClass"
                :ui="deleteActionButtonUi"
                @click="requestDelete(invigilator.localId)"
              />
            </UTooltip>
          </li>
        </ul>

        <div class="flex items-center gap-2">
          <UButton
            color="primary"
            variant="soft"
            size="sm"
            icon="i-lucide-plus"
            class="ring-primary/35 hover:ring-primary/55 min-w-0 flex-1 cursor-pointer justify-center text-sm font-semibold ring-2"
            :disabled="!props.selectedCommittee"
            @click="requestAdd"
          >
            {{ props.addActionLabel }}
          </UButton>

          <UTooltip :text="props.syncInvigilatorsToMatchingCommitteesLabel">
            <span class="inline-flex">
              <UButton
                color="primary"
                variant="ghost"
                size="sm"
                icon="i-lucide-refresh-cw"
                :aria-label="props.syncInvigilatorsToMatchingCommitteesLabel"
                :class="applyPreparationRoomActionButtonClass"
                :ui="applyPreparationRoomActionButtonUi"
                :disabled="isSyncInvigilatorsToMatchingCommitteesDisabled"
                @click="requestSyncInvigilatorsToMatchingCommittees"
              />
            </span>
          </UTooltip>
        </div>
      </div>
    </div>
  </div>
</template>
