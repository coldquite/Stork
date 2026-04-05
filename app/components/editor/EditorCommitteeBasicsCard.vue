<script setup lang="ts">
import type { ScheduleDraftCommittee } from '~/types/schedule-draft'
import type { StudyLanguageDto } from '#shared/types/time-schedules'
import type { EditorCommitteeStringFieldPayload } from '~/types/editor'

const props = defineProps<{
  selectedCommittee: ScheduleDraftCommittee | null
  selectedCommitteeDate?: string
  dateLabel: string
  roomLabel: string
  languageLabel: string
  languageCzechLabel: string
  languageEnglishLabel: string
  secretaryLabel: string
}>()

const emit = defineEmits<{
  (e: 'committeeStringField', payload: EditorCommitteeStringFieldPayload): void
  (e: 'update:committeeDate', value: string): void
  (e: 'update:committeeLanguage', value: StudyLanguageDto): void
}>()

const roomInputValue = computed(() => props.selectedCommittee?.room ?? '')
const secretaryInputValue = computed(() => props.selectedCommittee?.secretaryName ?? '')
const committeeLanguageValue = computed<StudyLanguageDto | null>(() => props.selectedCommittee?.language ?? null)

const calendarModelValue = ref<CalendarLikeDate | undefined>(undefined)

interface CalendarLikeDate {
  year: number
  month: number
  day: number
}

function resolveCalendarModelValue(isoDate: string | undefined): CalendarLikeDate | undefined {
  if (!isoDate) {
    return undefined
  }

  const parsedDate = new Date(isoDate)
  if (!Number.isFinite(parsedDate.getTime())) {
    return undefined
  }

  return {
    year: parsedDate.getUTCFullYear(),
    month: parsedDate.getUTCMonth() + 1,
    day: parsedDate.getUTCDate()
  }
}

watch(
  () => props.selectedCommittee?.date,
  (nextDate) => {
    calendarModelValue.value = resolveCalendarModelValue(nextDate)
  },
  { immediate: true }
)

const secretaryInputWidthCh = computed(() => {
  return Math.max(22, secretaryInputValue.value.length + 2)
})
const hasSelectedCommittee = computed(() => Boolean(props.selectedCommittee))
const isEmptyValue = (value: string) => value.trim().length < 1
const isSecretaryInvalid = computed(() => hasSelectedCommittee.value && isEmptyValue(secretaryInputValue.value))

const invalidInputUi = {
  base: 'ring-2 ring-inset ring-error/70'
} as const
const inputWidthPadding = '1.25rem + 2px'
const secretaryInputWidthStyle = computed(() => {
  return {
    width: `calc(${secretaryInputWidthCh.value}ch + ${inputWidthPadding})`
  }
})

function isCalendarLikeDate(value: unknown): value is CalendarLikeDate {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Partial<CalendarLikeDate>
  return (
    typeof candidate.year === 'number' &&
    Number.isFinite(candidate.year) &&
    typeof candidate.month === 'number' &&
    Number.isFinite(candidate.month) &&
    typeof candidate.day === 'number' &&
    Number.isFinite(candidate.day)
  )
}

function toCommitteeIsoDate(nextDate: CalendarLikeDate, currentDateRaw: string | undefined): string {
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
  if (!isCalendarLikeDate(nextDateValue)) {
    return
  }

  calendarModelValue.value = nextDateValue
  emit('update:committeeDate', toCommitteeIsoDate(nextDateValue, props.selectedCommittee?.date))
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
  <div class="border-default w-fit max-w-full min-w-0 rounded-md border p-2">
    <div class="flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <span class="text-sm">{{ props.dateLabel }}:</span>
        <UPopover :content="{ side: 'bottom', align: 'start' }">
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-calendar"
            class="min-w-42 justify-start font-medium"
            :disabled="!props.selectedCommittee"
          >
            {{ props.selectedCommitteeDate }}
          </UButton>

          <template #content="{ close }">
            <UCalendar
              :model-value="calendarModelValue as any"
              :week-starts-on="1"
              @update:model-value="(value) => handleCalendarDateSelect(value, close)"
            />
          </template>
        </UPopover>
      </div>

      <div class="flex items-center gap-2">
        <span class="text-sm">{{ props.roomLabel }}:</span>
        <UInput
          :model-value="roomInputValue"
          class="w-38"
          placeholder="—"
          :disabled="!props.selectedCommittee"
          @update:model-value="emitRoom"
        />
      </div>

      <div class="flex items-center gap-2">
        <span class="text-sm">{{ props.languageLabel }}:</span>
        <div class="border-default flex w-42 items-center gap-1 rounded-md border p-1">
          <UButton
            color="primary"
            size="xs"
            :variant="committeeLanguageValue === 'CZECH' ? 'solid' : 'ghost'"
            :disabled="!props.selectedCommittee"
            class="flex-1 cursor-pointer justify-center"
            @click="setLanguage('CZECH')"
          >
            {{ props.languageCzechLabel }}
          </UButton>
          <UButton
            color="primary"
            size="xs"
            :variant="committeeLanguageValue === 'ENGLISH' ? 'solid' : 'ghost'"
            :disabled="!props.selectedCommittee"
            class="flex-1 cursor-pointer justify-center"
            @click="setLanguage('ENGLISH')"
          >
            {{ props.languageEnglishLabel }}
          </UButton>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <span class="text-sm">{{ props.secretaryLabel }}:</span>
        <UInput
          :model-value="secretaryInputValue"
          class="w-auto"
          :style="secretaryInputWidthStyle"
          :ui="isSecretaryInvalid ? invalidInputUi : undefined"
          placeholder="—"
          :disabled="!props.selectedCommittee"
          @update:model-value="emitSecretary"
        />
      </div>
    </div>
  </div>
</template>
