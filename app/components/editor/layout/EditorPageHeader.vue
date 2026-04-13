<script setup lang="ts">
const props = defineProps<{
  title: string
  draftName?: string
  backAriaLabel: string
  renameAriaLabel: string
  renameLabel: string
  searchStudentsAriaLabel: string
  searchStudentsLabel: string
  cloudSaveAriaLabel: string
  cloudSaveLabel: string
  cloudSaveLoading: boolean
  validationSummaryAriaLabel: string
  validationSummaryLabel: string
  validationSummaryHasErrors: boolean
  exportAriaLabel: string
  exportLabel: string
  exportPublicPdfLabel: string
  exportInvigilatorsPdfLabel: string
  exportCsvQuestionsEnvelopeLabel: string
}>()

const emit = defineEmits<{
  (
    event:
      | 'renameDraft'
      | 'searchStudents'
      | 'saveToCloud'
      | 'openValidationSummary'
      | 'exportPublicPdf'
      | 'exportInvigilatorsPdf'
      | 'exportCsvQuestionsEnvelope'
  ): void
}>()

function requestRenameDraft(): void {
  emit('renameDraft')
}

function requestSaveToCloud(): void {
  emit('saveToCloud')
}

function requestSearchStudents(): void {
  emit('searchStudents')
}

function requestOpenValidationSummary(): void {
  emit('openValidationSummary')
}

function requestExportPublicPdf(close: () => void): void {
  close()
  emit('exportPublicPdf')
}

function requestExportInvigilatorsPdf(close: () => void): void {
  close()
  emit('exportInvigilatorsPdf')
}

function requestExportCsvQuestionsEnvelope(close: () => void): void {
  close()
  emit('exportCsvQuestionsEnvelope')
}
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-stretch">
    <div class="flex min-w-0 flex-1 items-stretch gap-3">
      <CommonAppBackToHomepageIconButton :aria-label="props.backAriaLabel" />

      <div class="min-w-0 flex-1">
        <p class="text-muted text-xl font-medium">
          {{ props.title }}
        </p>
        <div class="mt-1 flex min-w-0 items-center gap-2">
          <h1 class="text-2xl font-semibold tracking-tight whitespace-nowrap">
            {{ props.draftName }}
          </h1>
          <UButton
            color="neutral"
            variant="ghost"
            size="md"
            icon="i-lucide-pencil"
            :label="props.renameLabel"
            :aria-label="props.renameAriaLabel"
            class="ml-3 shrink-0 cursor-pointer"
            :ui="{
              base: 'h-10 bg-default border-2 border-secondary-400 text-secondary-800 hover:border-secondary-500 hover:bg-secondary-50 dark:border-secondary-500 dark:bg-default dark:text-secondary-100 dark:hover:bg-secondary-900/50'
            }"
            @click="requestRenameDraft"
          />
          <UButton
            color="neutral"
            variant="ghost"
            size="md"
            icon="i-lucide-search"
            :label="props.searchStudentsLabel"
            :aria-label="props.searchStudentsAriaLabel"
            class="shrink-0 cursor-pointer"
            :ui="{
              base: 'h-10 bg-default border-2 border-primary-600 text-primary-800 hover:border-stork-600 hover:bg-stork-100 dark:border-stork-400 dark:bg-default dark:text-stork-100 dark:hover:border-stork-300 dark:hover:bg-stork-800/35'
            }"
            @click="requestSearchStudents"
          />
          <UButton
            color="neutral"
            variant="ghost"
            size="md"
            icon="i-lucide-cloud-upload"
            :label="props.cloudSaveLabel"
            :aria-label="props.cloudSaveAriaLabel"
            :loading="props.cloudSaveLoading"
            class="shrink-0 cursor-pointer"
            :ui="{
              base: 'h-10 bg-default border-2 border-success-600/65 text-success-700 hover:border-success-600/85 hover:bg-success-100 dark:border-success-400/70 dark:bg-default dark:text-success-100 dark:hover:border-success-300 dark:hover:bg-success-700/25'
            }"
            @click="requestSaveToCloud"
          />

          <div
            aria-hidden="true"
            class="bg-primary/60 dark:bg-primary/70 hidden w-0.5 self-stretch rounded-full sm:block"
          />

          <UButton
            color="neutral"
            variant="ghost"
            size="md"
            :icon="props.validationSummaryHasErrors ? 'i-lucide-circle-x' : 'i-lucide-circle-check'"
            :label="props.validationSummaryLabel"
            :aria-label="props.validationSummaryAriaLabel"
            class="shrink-0 cursor-pointer"
            :ui="{
              base: props.validationSummaryHasErrors
                ? 'h-10 bg-default border-2 border-error-500 text-error-700 hover:border-error-600 hover:bg-error-100 dark:border-error-400 dark:bg-default dark:text-error-100 dark:hover:border-error-300 dark:hover:bg-error-700/25'
                : 'h-10 bg-default border-2 border-success-600/65 text-success-700 hover:border-success-600/85 hover:bg-success-100 dark:border-success-400/70 dark:bg-default dark:text-success-100 dark:hover:border-success-300 dark:hover:bg-success-700/25'
            }"
            @click="requestOpenValidationSummary"
          />

          <UPopover :content="{ side: 'top', align: 'start' }">
            <UButton
              color="neutral"
              variant="ghost"
              size="md"
              icon="i-lucide-download"
              :label="props.exportLabel"
              :aria-label="props.exportAriaLabel"
              class="shrink-0 cursor-pointer"
              :ui="{
                base: 'h-10 bg-default border-2 border-secondary-400 text-secondary-800 hover:border-secondary-500 hover:bg-secondary-50 dark:border-secondary-500 dark:bg-default dark:text-secondary-100 dark:hover:bg-secondary-900/50'
              }"
            />

            <template #content="{ close }">
              <div class="w-md max-w-[94vw] space-y-1.5 p-2">
                <UButton
                  color="neutral"
                  variant="ghost"
                  block
                  size="lg"
                  class="w-full cursor-pointer justify-start gap-2.5"
                  @click="requestExportPublicPdf(close)"
                >
                  <UIcon name="i-bi-filetype-pdf" class="text-error size-6 shrink-0" />
                  <span class="truncate">{{ props.exportPublicPdfLabel }}</span>
                </UButton>

                <UButton
                  color="neutral"
                  variant="ghost"
                  block
                  size="lg"
                  class="w-full cursor-pointer justify-start gap-2.5"
                  @click="requestExportInvigilatorsPdf(close)"
                >
                  <UIcon name="i-bi-filetype-pdf" class="text-error size-6 shrink-0" />
                  <span class="truncate">{{ props.exportInvigilatorsPdfLabel }}</span>
                </UButton>

                <UButton
                  color="neutral"
                  variant="ghost"
                  block
                  size="lg"
                  class="w-full cursor-pointer justify-start gap-2.5"
                  @click="requestExportCsvQuestionsEnvelope(close)"
                >
                  <UIcon name="i-bi-filetype-csv" class="text-success-600 dark:text-success-400 size-6 shrink-0" />
                  <span class="truncate">{{ props.exportCsvQuestionsEnvelopeLabel }}</span>
                </UButton>
              </div>
            </template>
          </UPopover>
        </div>
      </div>
    </div>
  </div>
</template>
