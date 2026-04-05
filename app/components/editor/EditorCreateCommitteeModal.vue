<script setup lang="ts">
import type { StudyLanguageDto, StudyProgramTypeDto } from '#shared/types/time-schedules'
import type { EditorCommitteeStringFieldPayload } from '~/types/editor'
import type { ScheduleDraftCommittee } from '~/types/schedule-draft'

const props = withDefaults(
  defineProps<{
    open: boolean
    name: string
    title: string
    description: string
    placeholder: string
    hint: string
    submitLabel: string
    cancelLabel: string
    loading?: boolean
    submitDisabled?: boolean
    validationError?: string | null
    selectedCommittee: ScheduleDraftCommittee | null
    selectedCommitteeDate?: string
    dateLabel: string
    roomLabel: string
    languageLabel: string
    languageCzechLabel: string
    languageEnglishLabel: string
    startTimeLabel: string
    startTimeHourLabel: string
    startTimeMinuteLabel: string
    secretaryLabel: string
    studyProgramTypeLabel: string
    studyProgramTypeBachelorLabel: string
    studyProgramTypeMasterLabel: string
    studyProgramNameLabel: string
    specializationCodeLabel: string
    departmentLabel: string
  }>(),
  {
    loading: false,
    submitDisabled: false,
    validationError: null
  }
)

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'update:name' | 'update:committeeDate', value: string): void
  (event: 'committeeStringField', payload: EditorCommitteeStringFieldPayload): void
  (event: 'update:committeeStartMinute', value: number): void
  (event: 'update:committeeLanguage', value: StudyLanguageDto): void
  (event: 'update:committeeStudyProgramType', value: StudyProgramTypeDto): void
  (event: 'submit' | 'cancel'): void
}>()

function updateName(value: string | number): void {
  emit('update:name', String(value))
}

function submit(): void {
  if (props.loading || props.submitDisabled) {
    return
  }

  emit('submit')
}

function cancel(): void {
  if (props.loading) {
    return
  }

  emit('cancel')
}
</script>

<template>
  <UModal
    :open="props.open"
    :title="props.title"
    :description="props.description"
    :dismissible="!props.loading"
    :close="{ disabled: props.loading }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="w-full space-y-4">
        <div class="space-y-2">
          <UInput
            :model-value="props.name"
            class="w-full"
            autofocus
            :placeholder="props.placeholder"
            :disabled="props.loading"
            @update:model-value="updateName"
            @keydown.enter="submit"
          />

          <p class="text-muted text-base">
            {{ props.hint }}
          </p>

          <p v-if="props.validationError" class="text-error text-base">
            {{ props.validationError }}
          </p>
        </div>

        <div class="text-muted flex w-full flex-col items-stretch gap-2">
          <EditorCommitteeBasicsCard
            :selected-committee="props.selectedCommittee"
            :selected-committee-date="props.selectedCommitteeDate"
            :date-label="props.dateLabel"
            :room-label="props.roomLabel"
            :language-label="props.languageLabel"
            :language-czech-label="props.languageCzechLabel"
            :language-english-label="props.languageEnglishLabel"
            :start-time-label="props.startTimeLabel"
            :start-time-hour-label="props.startTimeHourLabel"
            :start-time-minute-label="props.startTimeMinuteLabel"
            :secretary-label="props.secretaryLabel"
            :show-room-field="false"
            :show-secretary-field="false"
            :show-start-time-field="true"
            :full-width="true"
            @committee-string-field="emit('committeeStringField', $event)"
            @update:committee-date="emit('update:committeeDate', $event)"
            @update:committee-start-minute="emit('update:committeeStartMinute', $event)"
            @update:committee-language="emit('update:committeeLanguage', $event)"
          />

          <EditorCommitteeStudyProgramCard
            :selected-committee="props.selectedCommittee"
            :study-program-type-label="props.studyProgramTypeLabel"
            :study-program-type-bachelor-label="props.studyProgramTypeBachelorLabel"
            :study-program-type-master-label="props.studyProgramTypeMasterLabel"
            :study-program-name-label="props.studyProgramNameLabel"
            :specialization-code-label="props.specializationCodeLabel"
            :department-label="props.departmentLabel"
            :full-width="true"
            @committee-string-field="emit('committeeStringField', $event)"
            @update:committee-study-program-type="emit('update:committeeStudyProgramType', $event)"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" class="cursor-pointer" :disabled="props.loading" @click="cancel">
          {{ props.cancelLabel }}
        </UButton>

        <UButton
          color="primary"
          variant="solid"
          class="cursor-pointer"
          :loading="props.loading"
          :disabled="props.loading || props.submitDisabled"
          @click="submit"
        >
          {{ props.submitLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
