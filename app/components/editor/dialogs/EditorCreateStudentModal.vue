<script setup lang="ts">
import type { EditorSpecializationOption } from '#shared/constants/editor'
import type {
  RepeatTypeDto,
  StudyLanguageDto,
  StudyProgramTypeDto,
  ThesisLanguageDto
} from '#shared/types/time-schedules'
import EditorRepeatTypeDurationWarningPopover from '~/components/editor/students/EditorRepeatTypeDurationWarningPopover.vue'
import type {
  EditorCreateStudentDraft,
  EditorCreateStudentMinutesField,
  EditorCreateStudentTextField,
  EditorCreateStudentValidationErrors
} from '~/types/editor'

interface LabeledOption<T extends string> {
  label: string
  value: T
}

const props = withDefaults(
  defineProps<{
    open: boolean
    draft?: EditorCreateStudentDraft | null
    committeeLabel: string
    validationErrors: EditorCreateStudentValidationErrors
    studyProgramNameOptions: string[]
    specializationOptions: EditorSpecializationOption[]
  }>(),
  {
    draft: null
  }
)

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'update:textField', payload: { field: EditorCreateStudentTextField; value: string }): void
  (event: 'update:minutesField', payload: { field: EditorCreateStudentMinutesField; value: unknown }): void
  (
    event:
      | 'update:studyLanguage'
      | 'update:studyProgramType'
      | 'update:studyProgramName'
      | 'update:specializationCode'
      | 'update:thesisLanguage'
      | 'update:repeatType',
    value: unknown
  ): void
  (event: 'submit' | 'cancel'): void
}>()

const { t } = useI18n()

const EMPTY_DRAFT: Readonly<EditorCreateStudentDraft> = {
  firstName: '',
  lastName: '',
  email: '',
  titlesBefore: '',
  titlesAfter: '',
  thesisTitleLocal: '',
  thesisTitleEn: '',
  thesisLanguage: 'CZECH',
  supervisorName: '',
  reviewerName: '',
  additionalSupervisorName: '',
  additionalReviewerName: '',
  studyProgramName: '',
  studyProgramType: 'BACHELOR',
  specializationCode: '',
  studyLanguage: 'CZECH',
  repeatType: 'NONE',
  prepareMinutes: 45,
  examMinutes: 30
}

const draft = computed(() => props.draft ?? EMPTY_DRAFT)
const isInputDisabled = computed(() => props.draft === null)
const isStudyProgramTypeSelectOpen = ref(false)
const isRepeatTypeSelectOpen = ref(false)
const isSpecializationPickerDisabled = computed(
  () => isInputDisabled.value || draft.value.studyProgramName.trim().length < 1
)

const thesisLanguageOptions = computed<LabeledOption<ThesisLanguageDto>[]>(() => [
  {
    value: 'CZECH',
    label: t('editor.table.thesisLanguageOptions.czech')
  },
  {
    value: 'ENGLISH',
    label: t('editor.table.thesisLanguageOptions.english')
  },
  {
    value: 'SLOVAK',
    label: t('editor.table.thesisLanguageOptions.slovak')
  }
])

const studyLanguageOptions = computed<LabeledOption<StudyLanguageDto>[]>(() => [
  {
    value: 'CZECH',
    label: t('editor.table.studyLanguageOptions.czech')
  },
  {
    value: 'ENGLISH',
    label: t('editor.table.studyLanguageOptions.english')
  }
])

const studyProgramTypeOptions = computed<LabeledOption<StudyProgramTypeDto>[]>(() => [
  {
    value: 'BACHELOR',
    label: t('editor.table.studyProgramTypeOptions.bachelor')
  },
  {
    value: 'MASTER',
    label: t('editor.table.studyProgramTypeOptions.master')
  }
])

const repeatTypeOptions = computed<LabeledOption<RepeatTypeDto>[]>(() => [
  {
    value: 'NONE',
    label: t('editor.table.repeatTypeOptions.none')
  },
  {
    value: 'THESIS_DEFENSE',
    label: t('editor.table.repeatTypeOptions.thesisDefense')
  },
  {
    value: 'ORAL_EXAM',
    label: t('editor.table.repeatTypeOptions.oralExam')
  },
  {
    value: 'BOTH',
    label: t('editor.table.repeatTypeOptions.both')
  },
  {
    value: 'UNKNOWN',
    label: t('editor.table.repeatTypeOptions.unknown')
  }
])

const inputClass = 'w-full'
const selectClass = 'w-full'
const errorClass = 'text-error text-xs'

function emitTextField(field: EditorCreateStudentTextField, value: string | number): void {
  emit('update:textField', { field, value: String(value ?? '') })
}

function emitMinutesField(field: EditorCreateStudentMinutesField, value: unknown): void {
  emit('update:minutesField', { field, value })
}

function submit(): void {
  if (isInputDisabled.value) {
    return
  }

  emit('submit')
}

function cancel(): void {
  emit('cancel')
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      isStudyProgramTypeSelectOpen.value = false
      isRepeatTypeSelectOpen.value = false
    }
  }
)
</script>

<template>
  <UModal
    :open="props.open"
    :title="t('editor.students.add.title')"
    :description="t('editor.students.add.description')"
    :ui="{
      content: 'sm:max-w-5xl'
    }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="max-h-[68vh] w-full space-y-4 overflow-y-auto pe-1">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div class="space-y-1">
            <span class="text-sm font-medium">{{ t('editor.students.add.fields.committee') }}</span>
            <UInput
              :model-value="props.committeeLabel"
              disabled
              size="md"
              class="bg-accented w-full overflow-hidden rounded-md"
            />
          </div>

          <div class="space-y-1">
            <span class="text-sm font-medium">{{ t('editor.students.add.fields.email') }}</span>
            <UInput
              :model-value="draft.email"
              :class="inputClass"
              :disabled="isInputDisabled"
              @update:model-value="emitTextField('email', $event)"
            />
            <p v-if="props.validationErrors.email" :class="errorClass">
              {{ props.validationErrors.email }}
            </p>
          </div>

          <div class="sm:col-span-2">
            <div
              class="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,0.7fr)]"
            >
              <div class="space-y-1">
                <span class="text-sm font-medium">{{ t('editor.students.add.fields.titlesBefore') }}</span>
                <UInput
                  :model-value="draft.titlesBefore"
                  :class="inputClass"
                  :disabled="isInputDisabled"
                  @update:model-value="emitTextField('titlesBefore', $event)"
                />
              </div>

              <div class="space-y-1">
                <span class="text-sm font-medium">{{ t('editor.students.add.fields.firstName') }}</span>
                <UInput
                  :model-value="draft.firstName"
                  :class="inputClass"
                  :disabled="isInputDisabled"
                  @update:model-value="emitTextField('firstName', $event)"
                />
                <p v-if="props.validationErrors.firstName" :class="errorClass">
                  {{ props.validationErrors.firstName }}
                </p>
              </div>

              <div class="space-y-1">
                <span class="text-sm font-medium">{{ t('editor.students.add.fields.lastName') }}</span>
                <UInput
                  :model-value="draft.lastName"
                  :class="inputClass"
                  :disabled="isInputDisabled"
                  @update:model-value="emitTextField('lastName', $event)"
                />
                <p v-if="props.validationErrors.lastName" :class="errorClass">
                  {{ props.validationErrors.lastName }}
                </p>
              </div>

              <div class="space-y-1">
                <span class="text-sm font-medium">{{ t('editor.students.add.fields.titlesAfter') }}</span>
                <UInput
                  :model-value="draft.titlesAfter"
                  :class="inputClass"
                  :disabled="isInputDisabled"
                  @update:model-value="emitTextField('titlesAfter', $event)"
                />
              </div>
            </div>
          </div>

          <div class="space-y-1">
            <span class="text-sm font-medium">{{ t('editor.students.add.fields.studyLanguage') }}</span>
            <USelectMenu
              :model-value="draft.studyLanguage"
              :items="studyLanguageOptions"
              value-key="value"
              label-key="label"
              :search-input="false"
              :class="selectClass"
              :disabled="isInputDisabled"
              @update:model-value="emit('update:studyLanguage', $event)"
            />
          </div>

          <div class="space-y-1">
            <span class="text-sm font-medium">{{ t('editor.students.add.fields.studyProgramType') }}</span>
            <div class="relative">
              <USelectMenu
                :model-value="draft.studyProgramType"
                :items="studyProgramTypeOptions"
                value-key="value"
                label-key="label"
                :search-input="false"
                :class="selectClass"
                :disabled="isInputDisabled"
                @update:model-value="emit('update:studyProgramType', $event)"
                @update:open="isStudyProgramTypeSelectOpen = $event"
              />

              <EditorRepeatTypeDurationWarningPopover :open="isStudyProgramTypeSelectOpen" />
            </div>
          </div>

          <div class="space-y-1">
            <span class="text-sm font-medium">{{ t('editor.students.add.fields.studyProgramName') }}</span>
            <USelectMenu
              :model-value="draft.studyProgramName"
              :items="props.studyProgramNameOptions"
              :search-input="false"
              :class="selectClass"
              :disabled="isInputDisabled"
              @update:model-value="emit('update:studyProgramName', $event)"
            />
            <p v-if="props.validationErrors.studyProgramName" :class="errorClass">
              {{ props.validationErrors.studyProgramName }}
            </p>
          </div>

          <div class="space-y-1">
            <span class="text-sm font-medium">{{ t('editor.students.add.fields.specializationCode') }}</span>
            <USelectMenu
              :model-value="draft.specializationCode"
              :items="props.specializationOptions"
              value-key="specializationCode"
              label-key="specializationCode"
              :search-input="false"
              :class="selectClass"
              :disabled="isSpecializationPickerDisabled"
              @update:model-value="emit('update:specializationCode', $event)"
            />
            <p v-if="props.validationErrors.specializationCode" :class="errorClass">
              {{ props.validationErrors.specializationCode }}
            </p>
          </div>

          <div class="py-2 sm:col-span-2">
            <div class="border-secondary/45 border-t-2" />
          </div>

          <div class="space-y-1">
            <span class="text-sm font-medium">{{ t('editor.students.add.fields.thesisTitleLocal') }}</span>
            <UTextarea
              :model-value="draft.thesisTitleLocal"
              :class="inputClass"
              :disabled="isInputDisabled"
              :rows="2"
              autoresize
              @update:model-value="emitTextField('thesisTitleLocal', $event)"
            />
            <p v-if="props.validationErrors.thesisTitleLocal" :class="errorClass">
              {{ props.validationErrors.thesisTitleLocal }}
            </p>
          </div>

          <div class="space-y-1">
            <span class="text-sm font-medium">{{ t('editor.students.add.fields.thesisTitleEn') }}</span>
            <UTextarea
              :model-value="draft.thesisTitleEn"
              :class="inputClass"
              :disabled="isInputDisabled"
              :rows="2"
              autoresize
              @update:model-value="emitTextField('thesisTitleEn', $event)"
            />
            <p v-if="props.validationErrors.thesisTitleEn" :class="errorClass">
              {{ props.validationErrors.thesisTitleEn }}
            </p>
          </div>

          <div class="space-y-1">
            <span class="text-sm font-medium">{{ t('editor.students.add.fields.supervisorName') }}</span>
            <UInput
              :model-value="draft.supervisorName"
              :class="inputClass"
              :disabled="isInputDisabled"
              @update:model-value="emitTextField('supervisorName', $event)"
            />
            <p v-if="props.validationErrors.supervisorName" :class="errorClass">
              {{ props.validationErrors.supervisorName }}
            </p>
          </div>

          <div class="space-y-1">
            <span class="text-sm font-medium">{{ t('editor.students.add.fields.additionalSupervisorName') }}</span>
            <UInput
              :model-value="draft.additionalSupervisorName"
              :class="inputClass"
              :disabled="isInputDisabled"
              @update:model-value="emitTextField('additionalSupervisorName', $event)"
            />
          </div>

          <div class="space-y-1">
            <span class="text-sm font-medium">{{ t('editor.students.add.fields.reviewerName') }}</span>
            <UInput
              :model-value="draft.reviewerName"
              :class="inputClass"
              :disabled="isInputDisabled"
              @update:model-value="emitTextField('reviewerName', $event)"
            />
            <p v-if="props.validationErrors.reviewerName" :class="errorClass">
              {{ props.validationErrors.reviewerName }}
            </p>
          </div>

          <div class="space-y-1">
            <span class="text-sm font-medium">{{ t('editor.students.add.fields.additionalReviewerName') }}</span>
            <UInput
              :model-value="draft.additionalReviewerName"
              :class="inputClass"
              :disabled="isInputDisabled"
              @update:model-value="emitTextField('additionalReviewerName', $event)"
            />
          </div>

          <div class="space-y-1">
            <span class="text-sm font-medium">{{ t('editor.students.add.fields.repeatType') }}</span>
            <div class="relative">
              <USelectMenu
                :model-value="draft.repeatType"
                :items="repeatTypeOptions"
                value-key="value"
                label-key="label"
                :search-input="false"
                :class="selectClass"
                :disabled="isInputDisabled"
                @update:model-value="emit('update:repeatType', $event)"
                @update:open="isRepeatTypeSelectOpen = $event"
              />

              <EditorRepeatTypeDurationWarningPopover :open="isRepeatTypeSelectOpen" />
            </div>
          </div>

          <div class="space-y-1">
            <span class="text-sm font-medium">{{ t('editor.students.add.fields.thesisLanguage') }}</span>
            <USelectMenu
              :model-value="draft.thesisLanguage"
              :items="thesisLanguageOptions"
              value-key="value"
              label-key="label"
              :search-input="false"
              :class="selectClass"
              :disabled="isInputDisabled"
              @update:model-value="emit('update:thesisLanguage', $event)"
            />
          </div>

          <div class="space-y-1">
            <span class="text-sm font-medium">{{ t('editor.students.add.fields.prepareMinutes') }}</span>
            <UInput
              type="number"
              :model-value="draft.prepareMinutes"
              :class="inputClass"
              :disabled="isInputDisabled"
              min="0"
              @update:model-value="emitMinutesField('prepareMinutes', $event)"
            />
          </div>

          <div class="space-y-1">
            <span class="text-sm font-medium">{{ t('editor.students.add.fields.examMinutes') }}</span>
            <UInput
              type="number"
              :model-value="draft.examMinutes"
              :class="inputClass"
              :disabled="isInputDisabled"
              min="0"
              @update:model-value="emitMinutesField('examMinutes', $event)"
            />
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" class="cursor-pointer" @click="cancel">
          {{ t('common.confirmDialog.cancel') }}
        </UButton>

        <UButton color="primary" variant="solid" class="cursor-pointer" :disabled="isInputDisabled" @click="submit">
          {{ t('editor.students.add.submit') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
