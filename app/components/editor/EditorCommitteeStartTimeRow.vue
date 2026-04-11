<script setup lang="ts">
import type { ScheduleDraftCommittee } from '~/types/schedule-draft'
import {
  buildEditorHourOptions,
  buildEditorMinuteOptions,
  buildStartMinuteFromHourAndSteppedMinute,
  formatStartMinuteLabelStepped,
  splitStartMinute
} from '~/utils/editor/start-minute-time'

const props = withDefaults(
  defineProps<{
    selectedCommittee: ScheduleDraftCommittee | null
    startTimeLabel: string
    startTimeHourLabel: string
    startTimeMinuteLabel: string
    compact?: boolean
  }>(),
  {
    compact: false
  }
)

const emit = defineEmits<{
  (e: 'update:committeeStartMinute', value: number): void
}>()

const startTimeButtonLabel = computed(() => formatStartMinuteLabelStepped(props.selectedCommittee?.startMinute))

const startTimeSelectParts = computed(() => splitStartMinute(props.selectedCommittee?.startMinute))

const startTimeHourOptions = buildEditorHourOptions()
const startTimeMinuteOptions = buildEditorMinuteOptions()

const rootClass = computed(() =>
  props.compact
    ? 'grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2'
    : 'flex min-w-0 flex-wrap items-center gap-3'
)
const labelClass = computed(() =>
  props.compact ? 'text-sm whitespace-nowrap' : 'text-base font-medium whitespace-nowrap'
)
const fieldContainerClass = computed(() => (props.compact ? 'min-w-0' : ''))
const popoverClass = computed(() => (props.compact ? 'flex w-full' : ''))
const buttonClass = computed(() =>
  props.compact
    ? 'flex h-auto w-full items-center justify-center px-2 py-1 text-sm font-medium tabular-nums'
    : 'h-auto w-fit min-w-0 shrink-0 justify-start px-3.5 py-2 text-base font-semibold tabular-nums'
)
const buttonSize = computed(() => (props.compact ? 'sm' : 'md'))
const buttonUi = computed(() => ({
  leadingIcon: props.compact ? 'size-3.5 shrink-0 me-1' : 'size-5 shrink-0 me-2.5'
}))

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

  if (typeof value === 'object' && 'value' in value) {
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

  if (typeof value === 'object' && 'value' in value) {
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
  <div :class="rootClass">
    <span :class="labelClass">{{ props.startTimeLabel }}:</span>
    <div :class="fieldContainerClass">
      <UPopover :content="{ side: 'bottom', align: 'start' }" :class="popoverClass">
        <UButton
          color="neutral"
          variant="outline"
          :size="buttonSize"
          icon="i-lucide-clock-3"
          :class="buttonClass"
          :ui="buttonUi"
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
  </div>
</template>
