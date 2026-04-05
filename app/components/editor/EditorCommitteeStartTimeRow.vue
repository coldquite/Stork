<script setup lang="ts">
import type { ScheduleDraftCommittee } from '~/types/schedule-draft'
import {
  buildEditorHourOptions,
  buildEditorMinuteOptions,
  buildStartMinuteFromHourAndSteppedMinute,
  formatStartMinuteLabelStepped,
  splitStartMinute
} from '~/utils/editor/start-minute-time'

const props = defineProps<{
  selectedCommittee: ScheduleDraftCommittee | null
  startTimeLabel: string
  startTimeHourLabel: string
  startTimeMinuteLabel: string
}>()

const emit = defineEmits<{
  (e: 'update:committeeStartMinute', value: number): void
}>()

const startTimeButtonLabel = computed(() => formatStartMinuteLabelStepped(props.selectedCommittee?.startMinute))

const startTimeSelectParts = computed(() => splitStartMinute(props.selectedCommittee?.startMinute))

const startTimeHourOptions = buildEditorHourOptions()
const startTimeMinuteOptions = buildEditorMinuteOptions()

function emitStartMinute(value: number): void {
  if (!props.selectedCommittee) {
    return
  }

  emit('update:committeeStartMinute', value)
}

function parseHourSelectValue(value: unknown): number | undefined {
  if (value === null || value === undefined) {
    return undefined
  }

  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 23) {
    return value
  }

  if (typeof value === 'object' && value !== null && 'value' in value) {
    const inner = (value as { value: unknown }).value
    if (typeof inner === 'number' && Number.isInteger(inner) && inner >= 0 && inner <= 23) {
      return inner
    }
  }

  return undefined
}

function parseMinuteSelectValue(value: unknown): number | undefined {
  if (value === null || value === undefined) {
    return undefined
  }

  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 59) {
    return value
  }

  if (typeof value === 'object' && value !== null && 'value' in value) {
    const inner = (value as { value: unknown }).value
    if (typeof inner === 'number' && Number.isInteger(inner) && inner >= 0 && inner <= 59) {
      return inner
    }
  }

  return undefined
}

function handleStartHourSelect(value: unknown): void {
  const hour = parseHourSelectValue(value)
  if (hour === undefined) {
    return
  }

  emitStartMinute(buildStartMinuteFromHourAndSteppedMinute(hour, startTimeSelectParts.value.minute))
}

function handleStartMinuteSelect(value: unknown): void {
  const minute = parseMinuteSelectValue(value)
  if (minute === undefined) {
    return
  }

  emitStartMinute(buildStartMinuteFromHourAndSteppedMinute(startTimeSelectParts.value.hour, minute))
}
</script>

<template>
  <div class="flex min-w-0 flex-wrap items-center gap-3">
    <span class="text-base font-medium whitespace-nowrap">{{ props.startTimeLabel }}:</span>
    <UPopover :content="{ side: 'bottom', align: 'start' }">
      <UButton
        color="neutral"
        variant="outline"
        size="md"
        icon="i-lucide-clock-3"
        class="h-auto w-fit min-w-0 shrink-0 justify-start px-3.5 py-2 text-base font-semibold tabular-nums"
        :ui="{ leadingIcon: 'size-5 shrink-0 me-2.5' }"
        :disabled="!props.selectedCommittee"
      >
        {{ startTimeButtonLabel }}
      </UButton>

      <template #content>
        <div class="flex flex-col gap-3 p-3 sm:flex-row sm:items-end">
          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <span class="text-muted text-sm font-medium">{{ props.startTimeHourLabel }}</span>
            <USelectMenu
              :model-value="startTimeSelectParts.hour"
              :items="startTimeHourOptions"
              value-key="value"
              label-key="label"
              size="md"
              :search-input="false"
              class="min-w-32"
              :disabled="!props.selectedCommittee"
              @update:model-value="handleStartHourSelect"
            />
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <span class="text-muted text-sm font-medium">{{ props.startTimeMinuteLabel }}</span>
            <USelectMenu
              :model-value="startTimeSelectParts.minute"
              :items="startTimeMinuteOptions"
              value-key="value"
              label-key="label"
              size="md"
              :search-input="false"
              class="min-w-32"
              :disabled="!props.selectedCommittee"
              @update:model-value="handleStartMinuteSelect"
            />
          </div>
        </div>
      </template>
    </UPopover>
  </div>
</template>
