<script setup lang="ts">
import type { PutTeachersDictionaryBulkResponseDto } from '#shared/types/teachers-dictionary'

const { t } = useI18n()
const {
  importState,
  hasImportStateValues,
  isSubmitDisabled,
  isSubmitting,
  submitError,
  handleImportFileChange,
  resetImportState,
  submitImport
} = useTeachersDictionaryCsvImport()

const importResult = ref<PutTeachersDictionaryBulkResponseDto | null>(null)
const successHideTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

function clearFileInputValue(): void {
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

function clearSuccessHideTimer(): void {
  if (!successHideTimer.value) {
    return
  }

  clearTimeout(successHideTimer.value)
  successHideTimer.value = null
}

function scheduleSuccessAlertHide(): void {
  clearSuccessHideTimer()
  successHideTimer.value = setTimeout(() => {
    importResult.value = null
    successHideTimer.value = null
  }, 10000)
}

async function handleSubmitImport(): Promise<void> {
  clearSuccessHideTimer()
  importResult.value = null

  const result = await submitImport()
  if (!result.ok || !result.response) {
    return
  }

  clearFileInputValue()
  importResult.value = result.response
  scheduleSuccessAlertHide()
}

function handleClearImportFiles(): void {
  clearSuccessHideTimer()
  importResult.value = null
  clearFileInputValue()
  resetImportState()
}

onBeforeUnmount(() => {
  clearSuccessHideTimer()
})
</script>

<template>
  <UCard>
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold">
          {{ $t('teachersDictionary.import.title') }}
        </h2>
        <p class="text-muted text-sm">
          {{ $t('teachersDictionary.import.description') }}
        </p>
      </div>
    </template>

    <div class="space-y-3">
      <p class="text-muted text-sm">
        {{ $t('homepage.actions.create.import.filesHint') }}
      </p>

      <div class="border-default space-y-2 rounded-lg border p-3">
        <label for="teachers-dictionary-import-file" class="text-sm font-medium">
          {{ $t('teachersDictionary.import.fileLabel') }}
        </label>

        <input
          id="teachers-dictionary-import-file"
          ref="fileInputRef"
          type="file"
          accept=".csv,text/csv"
          class="sr-only"
          :disabled="isSubmitting"
          @change="handleImportFileChange"
        />

        <label
          for="teachers-dictionary-import-file"
          class="bg-elevated border-default group flex items-center gap-3 rounded-md border px-3 py-2 transition-colors"
          :class="isSubmitting ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-[var(--ui-bg-accented)]'"
        >
          <span
            class="border-default rounded-md border px-2 py-1 text-xs font-medium transition-colors"
            :class="
              importState.file
                ? 'border-[var(--color-stork-500)] bg-[var(--color-stork-500)] text-white group-hover:border-[var(--color-stork-600)] group-hover:bg-[var(--color-stork-600)]'
                : isSubmitting
                  ? ''
                  : 'group-hover:border-[var(--ui-border-accented)] group-hover:bg-[var(--ui-bg)]'
            "
          >
            {{ $t('teachersDictionary.import.chooseFileAction') }}
          </span>

          <p
            class="min-w-0 truncate text-xs"
            :class="importState.file ? 'text-highlighted font-semibold' : 'text-muted'"
          >
            {{ importState.file?.name || $t('teachersDictionary.import.noFileSelected') }}
          </p>
        </label>

        <p v-if="importState.isValidating" class="text-muted text-xs">
          {{ $t('teachersDictionary.import.validation.validating') }}
        </p>

        <p v-if="importState.error" class="text-error text-xs">
          {{ importState.error }}
        </p>
      </div>

      <UAlert
        v-if="submitError"
        color="error"
        variant="soft"
        icon="i-lucide-triangle-alert"
        :title="$t('teachersDictionary.import.validation.submitErrorTitle')"
        :description="submitError"
      />

      <UAlert
        v-if="importResult"
        color="success"
        variant="soft"
        icon="i-lucide-check"
        class="text-default"
        :ui="{
          title: 'text-default',
          description: 'text-default'
        }"
        :title="$t('teachersDictionary.import.submitSuccessTitle')"
        :description="
          t('teachersDictionary.import.submitSuccessDescription', {
            processed: importResult.processed,
            created: importResult.created,
            updated: importResult.updated
          })
        "
      />
    </div>

    <template #footer>
      <div class="flex w-full items-center">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-trash-2"
          class="cursor-pointer"
          :disabled="isSubmitting || !hasImportStateValues"
          @click="handleClearImportFiles"
        >
          {{ $t('teachersDictionary.import.clearFilesAction') }}
        </UButton>

        <UButton
          color="primary"
          variant="solid"
          class="ml-auto cursor-pointer"
          :loading="isSubmitting"
          :disabled="isSubmitDisabled"
          @click="handleSubmitImport"
        >
          {{ $t('teachersDictionary.import.submitAction') }}
        </UButton>
      </div>
    </template>
  </UCard>
</template>
