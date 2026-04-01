<script setup lang="ts">
interface TeachersDictionaryResolutionDialogEntry {
  lookupKey: string
  sourceValue: string
  canonicalName: string
}

interface ImportTeachersDictionaryResolutionDialogProps {
  loading: boolean
  entries: TeachersDictionaryResolutionDialogEntry[]
  fieldErrors: Record<string, string>
  error: string | null
  submitDisabled: boolean
}

const props = defineProps<ImportTeachersDictionaryResolutionDialogProps>()
const emit = defineEmits<{
  cancel: []
  submit: []
  updateCanonicalName: [payload: { lookupKey: string; value: string }]
}>()

const open = defineModel<boolean>('open', { default: false })

function normalizeInputValue(value: string | number | null | undefined): string {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number') {
    return String(value)
  }

  return ''
}

function handleCanonicalNameChange(lookupKey: string, value: string | number | null | undefined): void {
  emit('updateCanonicalName', {
    lookupKey,
    value: normalizeInputValue(value)
  })
}

function handleCancel(): void {
  if (props.loading) {
    return
  }

  emit('cancel')
}

function handleSubmit(): void {
  if (props.loading || props.submitDisabled) {
    return
  }

  emit('submit')
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="$t('homepage.actions.create.import.teachersDictionaryResolution.title')"
    :dismissible="!props.loading"
    :close="{ disabled: props.loading }"
    :ui="{ content: 'sm:max-w-3xl' }"
  >
    <template #body>
      <div class="space-y-4">
        <div class="space-y-3">
          <p class="text-muted text-sm">
            {{ $t('homepage.actions.create.import.teachersDictionaryResolution.description') }}
          </p>
          <p class="text-muted text-sm">
            {{ $t('homepage.actions.create.import.teachersDictionaryResolution.descriptionUsermapPrefix') }}
            {{ ' ' }}
            <ULink
              to="https://usermap.cvut.cz/search"
              external
              target="_blank"
              rel="noopener"
              class="text-primary font-medium"
            >
              {{
                $t('homepage.actions.create.import.teachersDictionaryResolution.descriptionUsermapLinkLabel')
              }} </ULink
            >{{ $t('homepage.actions.create.import.teachersDictionaryResolution.descriptionUsermapSuffix') }}
          </p>
        </div>

        <UAlert
          icon="i-lucide-info"
          color="primary"
          variant="subtle"
          :title="$t('homepage.actions.create.import.teachersDictionaryResolution.hintTitle')"
          :description="$t('homepage.actions.create.import.teachersDictionaryResolution.hintDescription')"
        />

        <div
          class="border-default bg-muted/40 cursor-not-allowed space-y-2 rounded-lg border p-3 opacity-80 select-none"
        >
          <p class="text-muted text-xs">
            {{ $t('homepage.actions.create.import.teachersDictionaryResolution.sourceValueLabel') }}
          </p>
          <p class="text-highlighted text-sm font-medium break-all">
            {{ $t('homepage.actions.create.import.teachersDictionaryResolution.example.sourceValue') }}
          </p>

          <UInput
            :model-value="$t('homepage.actions.create.import.teachersDictionaryResolution.example.canonicalValue')"
            class="w-full cursor-not-allowed"
            disabled
          />
        </div>

        <UAlert
          v-if="props.error"
          icon="i-lucide-triangle-alert"
          color="error"
          variant="subtle"
          :title="$t('homepage.actions.create.import.teachersDictionaryResolution.errorTitle')"
          :description="props.error"
        />

        <div class="max-h-[48vh] space-y-3 overflow-y-auto pr-1">
          <div
            v-for="entry in props.entries"
            :key="entry.lookupKey"
            class="border-default bg-elevated space-y-2 rounded-lg border p-3"
          >
            <p class="text-muted text-xs">
              {{ $t('homepage.actions.create.import.teachersDictionaryResolution.sourceValueLabel') }}
            </p>
            <p class="text-highlighted text-sm font-medium break-all">
              {{ entry.sourceValue }}
            </p>

            <UInput
              :model-value="entry.canonicalName"
              class="w-full"
              :disabled="props.loading"
              :placeholder="$t('homepage.actions.create.import.teachersDictionaryResolution.inputPlaceholder')"
              @update:model-value="handleCanonicalNameChange(entry.lookupKey, $event)"
            />

            <p v-if="props.fieldErrors[entry.lookupKey]" class="text-error text-xs">
              {{ props.fieldErrors[entry.lookupKey] }}
            </p>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="ml-auto flex gap-2">
        <UButton color="neutral" variant="ghost" class="cursor-pointer" :disabled="props.loading" @click="handleCancel">
          {{ $t('common.confirmDialog.cancel') }}
        </UButton>

        <UButton
          color="primary"
          variant="solid"
          class="cursor-pointer"
          :loading="props.loading"
          :disabled="props.submitDisabled || props.loading"
          @click="handleSubmit"
        >
          {{ $t('homepage.actions.create.import.teachersDictionaryResolution.submitAction') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
