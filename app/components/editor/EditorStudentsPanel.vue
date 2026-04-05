<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { useSortable } from '@vueuse/integrations/useSortable'
import { resolveEditorSpecializationOptions, resolveEditorStudyProgramNameOptions } from '~/constants/editor'
import type { StudentRow } from '~/types/editor'
import type { ScheduleDraftCommittee } from '~/types/schedule-draft'
import type { StudyLanguageDto, StudyProgramTypeDto } from '#shared/types/time-schedules'

const props = defineProps<{
  cardRootClass: string
  selectedCommittee: ScheduleDraftCommittee | null
  selectedCommitteeLabel?: string
  selectedCommitteeDate?: string
  studentsCountLabel: string
  students: StudentRow[]
  columns: TableColumn<StudentRow>[]
  committeeTitleLabel: string
  committeeRoomLabel: string
  committeeDateLabel: string
  committeeSecretaryLabel: string
  committeeMembersLabel: string
  committeeChairLabel: string
  committeeViceChairLabel: string
  committeeMember1Label: string
  committeeMember2Label: string
  committeeMember3Label: string
  committeeLanguageLabel: string
  committeeLanguageCzechLabel: string
  committeeLanguageEnglishLabel: string
  committeeStudyProgramTypeLabel: string
  committeeStudyProgramTypeBachelorLabel: string
  committeeStudyProgramTypeMasterLabel: string
  committeeStudyProgramNameLabel: string
  committeeSpecializationCodeLabel: string
  committeeDepartmentLabel: string
  invigilators: string[]
  invigilatorsCountLabel: string
  addInvigilatorActionLabel: string
  deleteInvigilatorAriaLabel: string
  studentsEmptyTitle: string
  studentsEmptyDescription: string
  renameCommitteeAriaLabel: string
  deleteCommitteeAriaLabel: string
}>()

const emit = defineEmits<{
  (event: 'update:students', value: StudentRow[]): void
  (event: 'addInvigilator'): void
  (event: 'deleteInvigilator', value: number): void
  (
    event:
      | 'renameCommittee'
      | 'deleteCommittee'
      | 'update:committeeRoom'
      | 'update:committeeDate'
      | 'update:committeeSecretary'
      | 'update:committeeChair'
      | 'update:committeeViceChair'
      | 'update:committeeMember1'
      | 'update:committeeMember2'
      | 'update:committeeMember3'
      | 'update:committeeStudyProgramName'
      | 'update:committeeSpecializationCode',
    value: string
  ): void
  (event: 'update:committeeLanguage', value: StudyLanguageDto): void
  (event: 'update:committeeStudyProgramType', value: StudyProgramTypeDto): void
}>()

const tableWrapper = ref<HTMLElement | null>(null)
const localStudents = ref<StudentRow[]>([])
const roomInputValue = computed(() => props.selectedCommittee?.room ?? '')
const secretaryInputValue = computed(() => props.selectedCommittee?.secretaryName ?? '')
const chairInputValue = computed(() => props.selectedCommittee?.chairName ?? '')
const viceChairInputValue = computed(() => props.selectedCommittee?.viceChairName ?? '')
const member1InputValue = computed(() => props.selectedCommittee?.member1Name ?? '')
const member2InputValue = computed(() => props.selectedCommittee?.member2Name ?? '')
const member3InputValue = computed(() => props.selectedCommittee?.member3Name ?? '')
const committeeLanguageValue = computed<StudyLanguageDto | null>(() => props.selectedCommittee?.language ?? null)
const committeeStudyProgramTypeValue = computed<StudyProgramTypeDto | null>(
  () => props.selectedCommittee?.studyProgramType ?? null
)
const committeeStudyProgramNameValue = computed(() => props.selectedCommittee?.studyProgramName ?? '')
const committeeSpecializationCodeValue = computed(() => props.selectedCommittee?.specializationCode ?? '')
const calendarModelValue = ref<CalendarLikeDate | undefined>(undefined)
const renameActionButtonClass = 'shrink-0 px-2 cursor-pointer'
const renameActionButtonUi = {
  base: '!text-capaccent-800 ring-[2px] ring-capaccent-300/80 hover:!text-capaccent-800 hover:ring-capaccent-500 hover:bg-capaccent-50 dark:!text-capaccent-100 dark:ring-capaccent-400/80 dark:hover:!text-capaccent-100 dark:hover:bg-capaccent-500/25'
}
const actionButtonClass = 'shrink-0 px-2 cursor-pointer'

const readOnlyInputClass = 'min-w-0 flex-1 overflow-hidden rounded-md bg-accented'
const deleteActionButtonUi = {
  base: 'text-error/80 ring-[2px] ring-current/45 hover:text-error hover:ring-current/80'
}
const secretaryInputWidthCh = computed(() => {
  return Math.max(22, secretaryInputValue.value.length + 2)
})
const hasSelectedCommittee = computed(() => Boolean(props.selectedCommittee))
const isEmptyValue = (value: string) => value.trim().length < 1
const isSecretaryInvalid = computed(() => hasSelectedCommittee.value && isEmptyValue(secretaryInputValue.value))
const isStudyProgramInvalid = computed(
  () => hasSelectedCommittee.value && isEmptyValue(committeeStudyProgramNameValue.value)
)
const isSpecializationInvalid = computed(
  () => hasSelectedCommittee.value && isEmptyValue(committeeSpecializationCodeValue.value)
)
const isChairInvalid = computed(() => hasSelectedCommittee.value && isEmptyValue(chairInputValue.value))
const isViceChairInvalid = computed(() => hasSelectedCommittee.value && isEmptyValue(viceChairInputValue.value))
const isMember1Invalid = computed(() => hasSelectedCommittee.value && isEmptyValue(member1InputValue.value))
const isMember2Invalid = computed(() => hasSelectedCommittee.value && isEmptyValue(member2InputValue.value))
const isMember3Invalid = computed(() => hasSelectedCommittee.value && isEmptyValue(member3InputValue.value))
const isDepartmentInvalid = computed(() => {
  if (!hasSelectedCommittee.value) {
    return false
  }

  const departmentName = props.selectedCommittee?.defenseDepartmentName?.trim() ?? ''
  const departmentCode = props.selectedCommittee?.defenseDepartmentCode?.trim() ?? ''

  return departmentName.length < 1 && departmentCode.length < 1
})
const isInvigilatorsEmpty = computed(() => hasSelectedCommittee.value && props.invigilators.length < 1)
const committeeLeadersInputWidthCh = computed(() => {
  const longestLeaderLength = Math.max(chairInputValue.value.length, viceChairInputValue.value.length)
  return Math.max(14, longestLeaderLength)
})
const committeeLeadersLabelWidthCh = computed(() => {
  const longestLeaderLabelLength = Math.max(props.committeeChairLabel.length, props.committeeViceChairLabel.length)
  return longestLeaderLabelLength + 1
})
const committeeMembersInputWidthCh = computed(() => {
  const longestMemberLength = Math.max(
    member1InputValue.value.length,
    member2InputValue.value.length,
    member3InputValue.value.length
  )
  return Math.max(14, longestMemberLength)
})
const invalidInputUi = {
  base: 'ring-2 ring-inset ring-error/70'
} as const
const invalidSelectUi = {
  base: 'ring-2 ring-inset ring-error/70'
} as const
const inputWidthPadding = '1.25rem + 2px'
const secretaryInputWidthStyle = computed(() => {
  return {
    width: `calc(${secretaryInputWidthCh.value}ch + ${inputWidthPadding})`
  }
})
const leaderInputWidthStyle = computed(() => {
  return {
    width: `calc(${committeeLeadersInputWidthCh.value}ch + ${inputWidthPadding})`
  }
})
const memberInputWidthStyle = computed(() => {
  return {
    width: `calc(${committeeMembersInputWidthCh.value}ch + ${inputWidthPadding})`
  }
})
const committeeStudyProgramNameOptions = computed(() => {
  const studyProgramType = committeeStudyProgramTypeValue.value
  const studyLanguage = committeeLanguageValue.value

  if (!studyProgramType || !studyLanguage) {
    return []
  }

  return resolveEditorStudyProgramNameOptions(studyProgramType, studyLanguage)
})
const committeeSpecializationCodeOptions = computed(() => {
  const baseOptions = resolveEditorSpecializationOptions(
    committeeStudyProgramTypeValue.value,
    committeeStudyProgramNameValue.value
  )
  const currentValue = committeeSpecializationCodeValue.value
  if (!currentValue || baseOptions.some((option) => option.specializationCode === currentValue)) {
    return baseOptions
  }

  return [
    {
      specializationCode: currentValue,
      specializationName: currentValue,
      departmentCode: null,
      departmentNameCs: null,
      departmentNameEn: null
    },
    ...baseOptions
  ]
})
const committeeDepartmentDisplayLabel = computed(() => {
  const departmentName = props.selectedCommittee?.defenseDepartmentName?.trim() ?? ''
  const departmentCode = props.selectedCommittee?.defenseDepartmentCode?.trim() ?? ''

  if (departmentName.length < 1 && departmentCode.length < 1) {
    return '—'
  }

  if (departmentName.length > 0 && departmentCode.length > 0) {
    return `${departmentName} (${departmentCode})`
  }

  return departmentName.length > 0 ? departmentName : departmentCode
})
const isSpecializationPickerDisabled = computed(() => {
  return !props.selectedCommittee || committeeStudyProgramNameValue.value.trim().length < 1
})

watch(
  () => props.students,
  (nextStudents) => {
    localStudents.value = nextStudents.slice()
  },
  { immediate: true, deep: true }
)

const sortableTarget = computed(() => {
  return (tableWrapper.value?.querySelector('tbody') as HTMLElement | null) ?? null
})

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

function emitStudentsOrder(): void {
  emit('update:students', localStudents.value.slice())
}

function requestRenameCommittee(): void {
  if (!props.selectedCommittee) {
    return
  }

  emit('renameCommittee', props.selectedCommittee.localId)
}

function requestDeleteCommittee(): void {
  if (!props.selectedCommittee) {
    return
  }

  emit('deleteCommittee', props.selectedCommittee.localId)
}

function requestAddInvigilator(): void {
  if (!props.selectedCommittee) {
    return
  }

  emit('addInvigilator')
}

function requestDeleteInvigilator(invigilatorIndex: number): void {
  if (!props.selectedCommittee) {
    return
  }

  emit('deleteInvigilator', invigilatorIndex)
}

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

function updateCommitteeRoom(nextValue: string | number): void {
  if (!props.selectedCommittee) {
    return
  }

  emit('update:committeeRoom', String(nextValue))
}

function updateCommitteeSecretary(nextValue: string | number): void {
  if (!props.selectedCommittee) {
    return
  }

  emit('update:committeeSecretary', String(nextValue))
}

function updateCommitteeChair(nextValue: string | number): void {
  if (!props.selectedCommittee) {
    return
  }

  emit('update:committeeChair', String(nextValue))
}

function updateCommitteeViceChair(nextValue: string | number): void {
  if (!props.selectedCommittee) {
    return
  }

  emit('update:committeeViceChair', String(nextValue))
}

function updateCommitteeMember1(nextValue: string | number): void {
  if (!props.selectedCommittee) {
    return
  }

  emit('update:committeeMember1', String(nextValue))
}

function updateCommitteeMember2(nextValue: string | number): void {
  if (!props.selectedCommittee) {
    return
  }

  emit('update:committeeMember2', String(nextValue))
}

function updateCommitteeMember3(nextValue: string | number): void {
  if (!props.selectedCommittee) {
    return
  }

  emit('update:committeeMember3', String(nextValue))
}

function updateCommitteeLanguage(nextLanguage: StudyLanguageDto): void {
  if (!props.selectedCommittee) {
    return
  }

  emit('update:committeeLanguage', nextLanguage)
}

function updateCommitteeStudyProgramType(nextStudyProgramType: StudyProgramTypeDto): void {
  if (!props.selectedCommittee) {
    return
  }

  emit('update:committeeStudyProgramType', nextStudyProgramType)
}

function updateCommitteeStudyProgramName(nextStudyProgramName: string): void {
  if (!props.selectedCommittee) {
    return
  }

  emit('update:committeeStudyProgramName', nextStudyProgramName)
}

function updateCommitteeSpecializationCode(nextSpecializationCode: string): void {
  if (!props.selectedCommittee) {
    return
  }

  emit('update:committeeSpecializationCode', nextSpecializationCode)
}

function handleCalendarDateSelect(nextDateValue: unknown, close?: () => void): void {
  if (!isCalendarLikeDate(nextDateValue)) {
    return
  }

  calendarModelValue.value = nextDateValue
  emit('update:committeeDate', toCommitteeIsoDate(nextDateValue, props.selectedCommittee?.date))
  close?.()
}

if (import.meta.client) {
  const sortable = useSortable(sortableTarget, localStudents)

  onMounted(() => {
    sortable.option('animation', 150)
    sortable.option('handle', '.drag-handle')
    sortable.option('draggable', 'tr')
    sortable.option('onEnd', () => {
      emitStudentsOrder()
    })
  })
}
</script>

<template>
  <UCard :ui="{ root: props.cardRootClass }">
    <template #header>
      <div class="flex flex-col gap-3">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0 space-y-1">
            <p class="text-muted text-sm">
              {{ props.committeeTitleLabel }}
            </p>
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-lg font-semibold">
                {{ props.selectedCommitteeLabel }}
              </h2>

              <div v-if="props.selectedCommittee" class="flex items-center gap-2">
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  icon="i-lucide-pencil"
                  :aria-label="props.renameCommitteeAriaLabel"
                  :class="renameActionButtonClass"
                  :ui="renameActionButtonUi"
                  @click="requestRenameCommittee"
                />

                <UButton
                  color="error"
                  variant="ghost"
                  size="sm"
                  icon="i-lucide-trash-2"
                  :aria-label="props.deleteCommitteeAriaLabel"
                  :class="actionButtonClass"
                  :ui="deleteActionButtonUi"
                  @click="requestDeleteCommittee"
                />
              </div>
            </div>
          </div>

          <UBadge
            color="primary"
            variant="soft"
            leading-icon="i-lucide-users"
            class="shrink-0 self-start px-3 py-1 text-base font-semibold ring-[2px] ring-current/45 sm:self-center"
          >
            {{ props.studentsCountLabel }}
          </UBadge>
        </div>

        <div class="text-muted flex flex-wrap items-stretch gap-2">
          <div class="border-default w-fit max-w-full min-w-0 rounded-md border p-2">
            <div class="flex flex-col gap-2">
              <div class="flex items-center gap-2">
                <span class="text-sm">{{ props.committeeDateLabel }}:</span>
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
                <span class="text-sm">{{ props.committeeRoomLabel }}:</span>
                <UInput
                  :model-value="roomInputValue"
                  class="w-38"
                  placeholder="—"
                  :disabled="!props.selectedCommittee"
                  @update:model-value="updateCommitteeRoom"
                />
              </div>

              <div class="flex items-center gap-2">
                <span class="text-sm">{{ props.committeeLanguageLabel }}:</span>
                <div class="border-default flex w-42 items-center gap-1 rounded-md border p-1">
                  <UButton
                    color="primary"
                    size="xs"
                    :variant="committeeLanguageValue === 'CZECH' ? 'solid' : 'ghost'"
                    :disabled="!props.selectedCommittee"
                    class="flex-1 cursor-pointer justify-center"
                    @click="updateCommitteeLanguage('CZECH')"
                  >
                    {{ props.committeeLanguageCzechLabel }}
                  </UButton>
                  <UButton
                    color="primary"
                    size="xs"
                    :variant="committeeLanguageValue === 'ENGLISH' ? 'solid' : 'ghost'"
                    :disabled="!props.selectedCommittee"
                    class="flex-1 cursor-pointer justify-center"
                    @click="updateCommitteeLanguage('ENGLISH')"
                  >
                    {{ props.committeeLanguageEnglishLabel }}
                  </UButton>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <span class="text-sm">{{ props.committeeSecretaryLabel }}:</span>
                <UInput
                  :model-value="secretaryInputValue"
                  class="w-auto"
                  :style="secretaryInputWidthStyle"
                  :ui="isSecretaryInvalid ? invalidInputUi : undefined"
                  placeholder="—"
                  :disabled="!props.selectedCommittee"
                  @update:model-value="updateCommitteeSecretary"
                />
              </div>
            </div>
          </div>

          <div class="border-default w-fit max-w-full min-w-0 rounded-md border p-2">
            <div class="flex flex-col gap-2">
              <div class="flex items-center gap-2">
                <span class="text-sm whitespace-nowrap">{{ props.committeeStudyProgramTypeLabel }}:</span>

                <div class="border-default flex w-58 items-center gap-1 rounded-md border p-1">
                  <UButton
                    color="primary"
                    size="xs"
                    :variant="committeeStudyProgramTypeValue === 'BACHELOR' ? 'solid' : 'ghost'"
                    :disabled="!props.selectedCommittee"
                    class="flex-1 cursor-pointer justify-center"
                    @click="updateCommitteeStudyProgramType('BACHELOR')"
                  >
                    {{ props.committeeStudyProgramTypeBachelorLabel }}
                  </UButton>
                  <UButton
                    color="primary"
                    size="xs"
                    :variant="committeeStudyProgramTypeValue === 'MASTER' ? 'solid' : 'ghost'"
                    :disabled="!props.selectedCommittee"
                    class="flex-1 cursor-pointer justify-center"
                    @click="updateCommitteeStudyProgramType('MASTER')"
                  >
                    {{ props.committeeStudyProgramTypeMasterLabel }}
                  </UButton>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <span class="text-sm whitespace-nowrap">{{ props.committeeStudyProgramNameLabel }}:</span>
                <USelectMenu
                  :model-value="committeeStudyProgramNameValue"
                  :items="committeeStudyProgramNameOptions"
                  :search-input="false"
                  class="min-w-0 flex-1"
                  placeholder="—"
                  :ui="isStudyProgramInvalid ? invalidSelectUi : undefined"
                  :disabled="!props.selectedCommittee"
                  @update:model-value="(value) => updateCommitteeStudyProgramName(String(value ?? ''))"
                />
              </div>

              <div class="flex items-center gap-2">
                <span class="text-sm whitespace-nowrap">{{ props.committeeSpecializationCodeLabel }}:</span>
                <USelectMenu
                  :model-value="committeeSpecializationCodeValue"
                  :items="committeeSpecializationCodeOptions"
                  value-key="specializationCode"
                  label-key="specializationCode"
                  :search-input="false"
                  class="min-w-0 flex-1"
                  placeholder="—"
                  :ui="isSpecializationInvalid ? invalidSelectUi : undefined"
                  :disabled="isSpecializationPickerDisabled"
                  @update:model-value="(value) => updateCommitteeSpecializationCode(String(value ?? ''))"
                />
              </div>

              <div class="flex items-center gap-2">
                <span class="text-sm whitespace-nowrap">{{ props.committeeDepartmentLabel }}:</span>
                <UInput
                  :model-value="committeeDepartmentDisplayLabel"
                  disabled
                  size="sm"
                  :class="readOnlyInputClass"
                  :ui="isDepartmentInvalid ? invalidInputUi : undefined"
                />
              </div>
            </div>
          </div>

          <div class="border-default w-fit max-w-full min-w-0 rounded-md border p-2">
            <div class="space-y-2">
              <p class="text-sm font-medium">{{ props.committeeMembersLabel }}</p>

              <div class="grid gap-2 md:grid-cols-[auto_auto] md:justify-start md:gap-4">
                <div class="w-fit space-y-2">
                  <div class="flex items-center gap-2">
                    <span
                      class="shrink-0 text-left text-sm whitespace-nowrap"
                      :style="{ width: `${committeeLeadersLabelWidthCh}ch` }"
                    >
                      {{ props.committeeChairLabel }}:
                    </span>
                    <UInput
                      :model-value="chairInputValue"
                      class="w-auto"
                      :style="leaderInputWidthStyle"
                      :ui="isChairInvalid ? invalidInputUi : undefined"
                      placeholder="—"
                      :disabled="!props.selectedCommittee"
                      @update:model-value="updateCommitteeChair"
                    />
                  </div>

                  <div class="flex items-center gap-2">
                    <span
                      class="shrink-0 text-left text-sm whitespace-nowrap"
                      :style="{ width: `${committeeLeadersLabelWidthCh}ch` }"
                    >
                      {{ props.committeeViceChairLabel }}:
                    </span>
                    <UInput
                      :model-value="viceChairInputValue"
                      class="w-auto"
                      :style="leaderInputWidthStyle"
                      :ui="isViceChairInvalid ? invalidInputUi : undefined"
                      placeholder="—"
                      :disabled="!props.selectedCommittee"
                      @update:model-value="updateCommitteeViceChair"
                    />
                  </div>
                </div>

                <div class="w-fit space-y-2">
                  <div class="flex items-center gap-2">
                    <span class="text-sm whitespace-nowrap">{{ props.committeeMember1Label }}:</span>
                    <UInput
                      :model-value="member1InputValue"
                      class="w-auto"
                      :style="memberInputWidthStyle"
                      :ui="isMember1Invalid ? invalidInputUi : undefined"
                      placeholder="—"
                      :disabled="!props.selectedCommittee"
                      @update:model-value="updateCommitteeMember1"
                    />
                  </div>

                  <div class="flex items-center gap-2">
                    <span class="text-sm whitespace-nowrap">{{ props.committeeMember2Label }}:</span>
                    <UInput
                      :model-value="member2InputValue"
                      class="w-auto"
                      :style="memberInputWidthStyle"
                      :ui="isMember2Invalid ? invalidInputUi : undefined"
                      placeholder="—"
                      :disabled="!props.selectedCommittee"
                      @update:model-value="updateCommitteeMember2"
                    />
                  </div>

                  <div class="flex items-center gap-2">
                    <span class="text-sm whitespace-nowrap">{{ props.committeeMember3Label }}:</span>
                    <UInput
                      :model-value="member3InputValue"
                      class="w-auto"
                      :style="memberInputWidthStyle"
                      :ui="isMember3Invalid ? invalidInputUi : undefined"
                      placeholder="—"
                      :disabled="!props.selectedCommittee"
                      @update:model-value="updateCommitteeMember3"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            :class="[
              'border-default w-fit max-w-full min-w-0 rounded-md border p-2',
              isInvigilatorsEmpty ? 'border-error/70 ring-error/40 ring-2 ring-inset' : ''
            ]"
          >
            <div class="flex flex-col gap-3">
              <div class="space-y-2">
                <span class="text-sm font-medium">
                  {{ props.invigilatorsCountLabel }}
                </span>

                <ul v-if="props.invigilators.length > 0" class="space-y-2">
                  <li
                    v-for="(invigilatorName, invigilatorIndex) in props.invigilators"
                    :key="`${invigilatorName}-${invigilatorIndex}`"
                    class="flex items-center gap-2"
                  >
                    <UInput
                      :model-value="invigilatorName"
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
                      @click="requestDeleteInvigilator(invigilatorIndex)"
                    />
                  </li>
                </ul>

                <UButton
                  color="primary"
                  variant="soft"
                  size="sm"
                  icon="i-lucide-plus"
                  class="ring-primary/35 hover:ring-primary/55 mt-2 w-full cursor-pointer justify-center font-semibold ring-2"
                  :disabled="!props.selectedCommittee"
                  @click="requestAddInvigilator"
                >
                  {{ props.addInvigilatorActionLabel }}
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div ref="tableWrapper" class="overflow-x-auto">
      <UTable
        :data="localStudents"
        :columns="props.columns"
        :get-row-id="(row) => row.id"
        :ui="{
          tbody: 'editor-students-tbody divide-y divide-default',
          separator: 'bg-default'
        }"
      >
        <template #drag-cell>
          <UButton
            icon="i-lucide-grip-vertical"
            variant="ghost"
            color="neutral"
            size="xs"
            class="drag-handle text-muted cursor-grab active:cursor-grabbing"
          />
        </template>

        <template #order-cell="{ row }">
          <span class="text-muted text-xs font-semibold">
            {{ row.index + 1 }}
          </span>
        </template>

        <template #empty>
          <UEmpty
            icon="i-lucide-users"
            :title="props.studentsEmptyTitle"
            :description="props.studentsEmptyDescription"
          />
        </template>
      </UTable>
    </div>
  </UCard>
</template>
