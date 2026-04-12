<script setup lang="ts">
import type { PauseTypeDto } from '#shared/types/time-schedules'
import type { EditorCreatePauseDraft, EditorCreatePauseValidationErrors } from '~/types/editor'
import { EDITOR_PAUSE_MIN_DURATION_MINUTES } from '~/constants/editor-pause'

const props = withDefaults(
  defineProps<{
    open: boolean
    mode: 'create' | 'edit'
    draft?: EditorCreatePauseDraft | null
    validationErrors: EditorCreatePauseValidationErrors
  }>(),
  {
    draft: null
  }
)

const emit = defineEmits<{
  (event: 'update:open' | 'update:customLabelEnabled', value: boolean): void
  (event: 'update:pauseType', value: PauseTypeDto): void
  (event: 'update:customLabel' | 'update:durationMinutes', value: unknown): void
  (event: 'submit' | 'cancel'): void
}>()

const { t } = useI18n()

const EMPTY_DRAFT: Readonly<EditorCreatePauseDraft> = {
  pauseType: 'BREAK',
  durationMinutes: 20,
  useCustomLabel: false,
  customLabel: ''
}

const draft = computed(() => props.draft ?? EMPTY_DRAFT)
const isInputDisabled = computed(() => props.draft === null)
const isCreateMode = computed(() => props.mode === 'create')

const dialogTitle = computed(() => (isCreateMode.value ? t('editor.pause.add.title') : t('editor.pause.edit.title')))
const dialogDescription = computed(() =>
  isCreateMode.value ? t('editor.pause.add.description') : t('editor.pause.edit.description')
)
const submitLabel = computed(() => (isCreateMode.value ? t('editor.pause.add.submit') : t('editor.pause.edit.submit')))

function selectPauseType(value: PauseTypeDto): void {
  if (isInputDisabled.value) {
    return
  }

  emit('update:pauseType', value)
}

function updateCustomLabelEnabled(value: boolean): void {
  if (isInputDisabled.value) {
    return
  }

  emit('update:customLabelEnabled', value)
}

function updateCustomLabel(value: string | number): void {
  emit('update:customLabel', String(value ?? ''))
}

function updateDuration(value: unknown): void {
  emit('update:durationMinutes', value)
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
</script>

<template>
  <UModal
    :open="props.open"
    :title="dialogTitle"
    :description="dialogDescription"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="w-full space-y-4">
        <div class="space-y-2">
          <span class="text-sm font-medium">{{ t('editor.pause.fields.type') }}</span>
          <div class="border-default flex min-w-0 items-center gap-1 rounded-md border p-1">
            <UButton
              color="primary"
              size="sm"
              icon="i-lucide-hourglass"
              :variant="draft.pauseType === 'BREAK' ? 'solid' : 'ghost'"
              class="min-w-0 flex-1 cursor-pointer justify-center whitespace-nowrap"
              :disabled="isInputDisabled"
              @click="selectPauseType('BREAK')"
            >
              {{ t('editor.pause.typeOptions.break') }}
            </UButton>
            <UButton
              color="primary"
              size="sm"
              icon="i-lucide-utensils-crossed"
              :variant="draft.pauseType === 'LUNCH' ? 'solid' : 'ghost'"
              class="min-w-0 flex-1 cursor-pointer justify-center whitespace-nowrap"
              :disabled="isInputDisabled"
              @click="selectPauseType('LUNCH')"
            >
              {{ t('editor.pause.typeOptions.lunch') }}
            </UButton>
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <USwitch
              :model-value="draft.useCustomLabel"
              :disabled="isInputDisabled"
              @update:model-value="updateCustomLabelEnabled(Boolean($event))"
            />
            <span class="text-sm">{{ t('editor.pause.fields.customLabelToggle') }}</span>
          </div>
        </div>

        <div v-if="draft.useCustomLabel" class="space-y-1">
          <span class="text-sm font-medium">{{ t('editor.pause.fields.customLabel') }}</span>
          <UInput
            :model-value="draft.customLabel"
            class="w-full"
            :disabled="isInputDisabled"
            @update:model-value="updateCustomLabel"
            @keydown.enter="submit"
          />
          <p v-if="props.validationErrors.customLabel" class="text-error text-xs">
            {{ props.validationErrors.customLabel }}
          </p>
        </div>

        <div class="space-y-1">
          <span class="text-sm font-medium">{{ t('editor.pause.fields.durationMinutes') }}</span>
          <UInput
            type="number"
            :model-value="draft.durationMinutes"
            class="w-full"
            :disabled="isInputDisabled"
            :min="EDITOR_PAUSE_MIN_DURATION_MINUTES"
            @update:model-value="updateDuration"
            @keydown.enter="submit"
          />
          <p v-if="props.validationErrors.durationMinutes" class="text-error text-xs">
            {{ props.validationErrors.durationMinutes }}
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" class="cursor-pointer" @click="cancel">
          {{ t('common.confirmDialog.cancel') }}
        </UButton>

        <UButton color="primary" variant="solid" class="cursor-pointer" :disabled="isInputDisabled" @click="submit">
          {{ submitLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
