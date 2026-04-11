<script setup lang="ts">
import {
  resolveEditorSpecializationOptions,
  resolveEditorSpecializationOptionForDepartment,
  resolveEditorStudyProgramNameOptions
} from '#shared/constants/editor'
import type { ScheduleDraftCommittee } from '~/types/schedule-draft'
import type { StudyProgramTypeDto } from '#shared/types/time-schedules'
import type { EditorCommitteeStringFieldPayload } from '~/types/editor'

const props = defineProps<{
  selectedCommittee: ScheduleDraftCommittee | null
  studyProgramTypeLabel: string
  studyProgramTypeBachelorLabel: string
  studyProgramTypeMasterLabel: string
  studyProgramNameLabel: string
  specializationCodeLabel: string
  departmentLabel: string
  fullWidth?: boolean
}>()

const emit = defineEmits<{
  (e: 'committeeStringField', payload: EditorCommitteeStringFieldPayload): void
  (e: 'update:committeeStudyProgramType', value: StudyProgramTypeDto): void
}>()

const committeeStudyProgramTypeValue = computed<StudyProgramTypeDto | null>(
  () => props.selectedCommittee?.studyProgramType ?? null
)
const committeeLanguageValue = computed(() => props.selectedCommittee?.language ?? null)
const committeeStudyProgramNameValue = computed(() => props.selectedCommittee?.studyProgramName ?? '')
const committeeSpecializationCodeValue = computed(() => props.selectedCommittee?.specializationCode ?? '')

const hasSelectedCommittee = computed(() => Boolean(props.selectedCommittee))
const isEmptyValue = (value: string) => value.trim().length < 1
const isStudyProgramInvalid = computed(
  () => hasSelectedCommittee.value && isEmptyValue(committeeStudyProgramNameValue.value)
)
const isSpecializationInvalid = computed(
  () => hasSelectedCommittee.value && isEmptyValue(committeeSpecializationCodeValue.value)
)
const resolvedDepartment = computed(() => {
  return resolveEditorSpecializationOptionForDepartment(
    committeeStudyProgramTypeValue.value,
    committeeStudyProgramNameValue.value,
    committeeSpecializationCodeValue.value
  )
})
const isDepartmentInvalid = computed(() => {
  if (!hasSelectedCommittee.value) {
    return false
  }

  return resolvedDepartment.value === null
})

const invalidInputUi = {
  base: 'ring-2 ring-inset ring-error/70 dark:ring-error/85'
} as const
const invalidSelectUi = {
  base: 'ring-2 ring-inset ring-error/70 dark:ring-error/85'
} as const
const rootClass = computed(() =>
  props.fullWidth
    ? 'border-default w-full max-w-full min-w-0 rounded-md border p-2'
    : 'border-default w-fit max-w-full min-w-0 rounded-md border p-2'
)

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
  const departmentName = resolvedDepartment.value?.departmentNameCs?.trim() ?? ''
  const departmentCode = resolvedDepartment.value?.departmentCode?.trim() ?? ''

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

function setStudyProgramType(next: StudyProgramTypeDto): void {
  if (!props.selectedCommittee) {
    return
  }

  emit('update:committeeStudyProgramType', next)
}

function emitStudyProgramName(value: string): void {
  if (!props.selectedCommittee) {
    return
  }

  emit('committeeStringField', { field: 'studyProgramName', value })
}

function emitSpecializationCode(value: string): void {
  if (!props.selectedCommittee) {
    return
  }

  emit('committeeStringField', { field: 'specializationCode', value })
}
</script>

<template>
  <div :class="rootClass">
    <div class="flex flex-col gap-2">
      <div class="flex min-w-0 items-center gap-2">
        <span class="text-sm whitespace-nowrap">{{ props.studyProgramTypeLabel }}:</span>

        <div class="border-default flex min-w-0 flex-1 items-center gap-1 rounded-md border p-1">
          <UButton
            color="primary"
            size="xs"
            :variant="committeeStudyProgramTypeValue === 'BACHELOR' ? 'solid' : 'ghost'"
            :disabled="!props.selectedCommittee"
            class="flex-1 cursor-pointer justify-center"
            @click="setStudyProgramType('BACHELOR')"
          >
            {{ props.studyProgramTypeBachelorLabel }}
          </UButton>
          <UButton
            color="primary"
            size="xs"
            :variant="committeeStudyProgramTypeValue === 'MASTER' ? 'solid' : 'ghost'"
            :disabled="!props.selectedCommittee"
            class="flex-1 cursor-pointer justify-center"
            @click="setStudyProgramType('MASTER')"
          >
            {{ props.studyProgramTypeMasterLabel }}
          </UButton>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <span class="text-sm whitespace-nowrap">{{ props.studyProgramNameLabel }}:</span>
        <USelectMenu
          :model-value="committeeStudyProgramNameValue"
          :items="committeeStudyProgramNameOptions"
          :search-input="false"
          class="min-w-0 flex-1"
          placeholder="—"
          :ui="isStudyProgramInvalid ? invalidSelectUi : undefined"
          :disabled="!props.selectedCommittee"
          @update:model-value="(value) => emitStudyProgramName(String(value ?? ''))"
        />
      </div>

      <div class="flex items-center gap-2">
        <span class="text-sm whitespace-nowrap">{{ props.specializationCodeLabel }}:</span>
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
          @update:model-value="(value) => emitSpecializationCode(String(value ?? ''))"
        />
      </div>

      <div class="flex items-center gap-2">
        <span class="text-sm whitespace-nowrap">{{ props.departmentLabel }}:</span>
        <div
          role="textbox"
          aria-readonly="true"
          aria-disabled="true"
          tabindex="-1"
          class="bg-accented relative inline-flex min-w-0 flex-1 cursor-not-allowed items-start overflow-hidden rounded-md select-none"
          :class="isDepartmentInvalid ? invalidInputUi.base : undefined"
        >
          <span
            class="bg-default text-highlighted ring-accented pointer-events-none w-full appearance-none rounded-md border-0 px-2.5 py-1.5 text-sm/4 break-words whitespace-normal opacity-75 ring ring-inset md:text-xs"
          >
            {{ committeeDepartmentDisplayLabel }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
