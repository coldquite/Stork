<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'
import type { ScheduleDraftCommittee } from '~/types/schedule-draft'
import type { StudyLanguageDto } from '#shared/types/time-schedules'
import type { EditorCommitteeStringFieldPayload } from '~/types/editor'

const props = withDefaults(
  defineProps<{
    selectedCommittee: ScheduleDraftCommittee | null
    selectedCommitteeDate?: string
    dateLabel: string
    roomLabel: string
    languageLabel: string
    languageCzechLabel: string
    languageEnglishLabel: string
    secretaryLabel: string
    showRoomField?: boolean
    showSecretaryField?: boolean
    fullWidth?: boolean
    showStartTimeField?: boolean
    startTimeLabel?: string
    startTimeHourLabel?: string
    startTimeMinuteLabel?: string
  }>(),
  {
    showRoomField: true,
    showSecretaryField: true,
    fullWidth: false,
    showStartTimeField: false,
    startTimeLabel: '',
    startTimeHourLabel: '',
    startTimeMinuteLabel: ''
  }
)

const emit = defineEmits<{
  (e: 'committeeStringField', payload: EditorCommitteeStringFieldPayload): void
  (e: 'update:committeeDate', value: string): void
  (e: 'update:committeeStartMinute', value: number): void
  (e: 'update:committeeLanguage', value: StudyLanguageDto): void
}>()

const roomInputValue = computed(() => props.selectedCommittee?.room ?? '')
const secretaryInputValue = computed(() => props.selectedCommittee?.secretaryName ?? '')
const committeeLanguageValue = computed<StudyLanguageDto | null>(() => props.selectedCommittee?.language ?? null)

/** shallowRef: avoid deep readonly unwrap that breaks UCalendar's `DateValue` prop typing. */
const calendarModelValue = shallowRef<CalendarDate | undefined>(undefined)

/** UCalendar / Reka CalendarRoot require a DateValue with `.copy()` (not a plain object). */
function resolveCalendarModelValue(isoDate: string | undefined): CalendarDate | undefined {
  if (!isoDate) {
    return undefined
  }

  const parsedDate = new Date(isoDate)
  if (!Number.isFinite(parsedDate.getTime())) {
    return undefined
  }

  return new CalendarDate(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth() + 1, parsedDate.getUTCDate())
}

watch(
  () => props.selectedCommittee?.date,
  (nextDate) => {
    calendarModelValue.value = resolveCalendarModelValue(nextDate)
  },
  { immediate: true }
)

const hasSelectedCommittee = computed(() => Boolean(props.selectedCommittee))
const isEmptyValue = (value: string) => value.trim().length < 1
const isRoomInvalid = computed(() => hasSelectedCommittee.value && isEmptyValue(roomInputValue.value))
const isSecretaryInvalid = computed(() => hasSelectedCommittee.value && isEmptyValue(secretaryInputValue.value))

const invalidInputUi = {
  base: 'ring-2 ring-inset ring-error/70 dark:ring-error/85'
} as const
const rootClass = computed(() =>
  props.fullWidth
    ? 'border-default w-full max-w-full min-w-0 rounded-md border p-2'
    : 'border-default w-fit max-w-full min-w-58 rounded-md border p-2'
)

function toCalendarDateFromUnknown(value: unknown): CalendarDate | undefined {
  if (value instanceof CalendarDate) {
    return value
  }

  if (typeof value !== 'object' || value === null) {
    return undefined
  }

  const candidate = value as { year?: unknown; month?: unknown; day?: unknown }
  if (
    typeof candidate.year === 'number' &&
    Number.isInteger(candidate.year) &&
    typeof candidate.month === 'number' &&
    Number.isInteger(candidate.month) &&
    typeof candidate.day === 'number' &&
    Number.isInteger(candidate.day)
  ) {
    return new CalendarDate(candidate.year, candidate.month, candidate.day)
  }

  return undefined
}

function toCommitteeIsoDate(nextDate: CalendarDate, currentDateRaw: string | undefined): string {
  const currentDate = currentDateRaw ? new Date(currentDateRaw) : new Date()
  const hasValidCurrentDate = Number.isFinite(currentDate.getTime())

  const hour = hasValidCurrentDate ? currentDate.getUTCHours() : 0
  const minute = hasValidCurrentDate ? currentDate.getUTCMinutes() : 0
  const second = hasValidCurrentDate ? currentDate.getUTCSeconds() : 0
  const millisecond = hasValidCurrentDate ? currentDate.getUTCMilliseconds() : 0

  return new Date(
    Date.UTC(nextDate.year, nextDate.month - 1, nextDate.day, hour, minute, second, millisecond)
  ).toISOString()
}

function handleCalendarDateSelect(nextDateValue: unknown, close?: () => void): void {
  const nextCalendarDate = toCalendarDateFromUnknown(nextDateValue)
  if (!nextCalendarDate) {
    return
  }

  calendarModelValue.value = nextCalendarDate
  emit('update:committeeDate', toCommitteeIsoDate(nextCalendarDate, props.selectedCommittee?.date))
  close?.()
}

function emitRoom(value: string | number): void {
  if (!props.selectedCommittee) {
    return
  }

  emit('committeeStringField', { field: 'room', value: String(value) })
}

function emitSecretary(value: string | number): void {
  if (!props.selectedCommittee) {
    return
  }

  emit('committeeStringField', { field: 'secretary', value: String(value) })
}

function setLanguage(lang: StudyLanguageDto): void {
  if (!props.selectedCommittee) {
    return
  }

  emit('update:committeeLanguage', lang)
}
</script>

<template>
  <div :class="rootClass">
    <div class="flex flex-col gap-2">
      <div class="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
        <span class="text-sm whitespace-nowrap">{{ props.languageLabel }}:</span>
        <div class="border-default flex min-w-0 items-center gap-1 rounded-md border p-1">
          <UButton
            color="primary"
            size="xs"
            :variant="committeeLanguageValue === 'CZECH' ? 'solid' : 'ghost'"
            :disabled="!props.selectedCommittee"
            class="min-w-0 flex-1 cursor-pointer justify-center"
            @click="setLanguage('CZECH')"
          >
            {{ props.languageCzechLabel }}
          </UButton>
          <UButton
            color="primary"
            size="xs"
            :variant="committeeLanguageValue === 'ENGLISH' ? 'solid' : 'ghost'"
            :disabled="!props.selectedCommittee"
            class="min-w-0 flex-1 cursor-pointer justify-center"
            @click="setLanguage('ENGLISH')"
          >
            {{ props.languageEnglishLabel }}
          </UButton>
        </div>
      </div>

      <div class="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
        <span class="text-sm whitespace-nowrap">{{ props.dateLabel }}:</span>
        <div class="min-w-0">
          <!-- flex (not block): Popover merges this onto the trigger; block breaks UButton's flex row so icon/text misalign. -->
          <UPopover :content="{ side: 'bottom', align: 'start' }" class="flex w-full">
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              icon="i-lucide-calendar"
              class="flex h-auto w-full items-center justify-center px-2 py-1 text-sm font-medium"
              :ui="{ leadingIcon: 'size-3.5 shrink-0 me-1' }"
              :disabled="!props.selectedCommittee"
            >
              {{ props.selectedCommitteeDate }}
            </UButton>

            <template #content="{ close }">
              <UCalendar
                :model-value="calendarModelValue"
                :week-starts-on="1"
                @update:model-value="(value) => handleCalendarDateSelect(value, close)"
              />
            </template>
          </UPopover>
        </div>
      </div>

      <div v-if="props.showStartTimeField" class="w-full min-w-0">
        <EditorCommitteeStartTimeRow
          :selected-committee="props.selectedCommittee"
          :start-time-label="props.startTimeLabel"
          :start-time-hour-label="props.startTimeHourLabel"
          :start-time-minute-label="props.startTimeMinuteLabel"
          compact
          @update:committee-start-minute="emit('update:committeeStartMinute', $event)"
        />
      </div>

      <div v-if="props.showRoomField" class="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
        <span class="text-sm whitespace-nowrap">{{ props.roomLabel }}:</span>
        <UInput
          :model-value="roomInputValue"
          class="w-full min-w-0"
          :ui="isRoomInvalid ? invalidInputUi : undefined"
          placeholder="—"
          :disabled="!props.selectedCommittee"
          @update:model-value="emitRoom"
        />
      </div>

      <div v-if="props.showSecretaryField" class="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
        <span class="text-sm whitespace-nowrap">{{ props.secretaryLabel }}:</span>
        <UInput
          :model-value="secretaryInputValue"
          class="w-full min-w-0"
          :ui="isSecretaryInvalid ? invalidInputUi : undefined"
          placeholder="—"
          :disabled="!props.selectedCommittee"
          @update:model-value="emitSecretary"
        />
      </div>
    </div>
  </div>
</template>
