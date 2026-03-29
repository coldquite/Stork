<script setup lang="ts">
const props = defineProps<{
  title: string
  draftName: string
  backAriaLabel: string
  renameAriaLabel: string
  renameLabel: string
  cloudSaveAriaLabel: string
  cloudSaveLabel: string
  cloudSaveLoading: boolean
}>()

const emit = defineEmits<{
  (event: 'renameDraft' | 'saveToCloud'): void
}>()

function requestRenameDraft(): void {
  emit('renameDraft')
}

function requestSaveToCloud(): void {
  emit('saveToCloud')
}
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-stretch">
    <div class="flex min-w-0 flex-1 items-stretch gap-3">
      <UButton
        to="/"
        color="neutral"
        variant="ghost"
        icon="i-lucide-undo-2"
        :aria-label="props.backAriaLabel"
        class="aspect-square shrink-0 justify-center self-stretch p-0"
        :ui="{
          base: 'h-full text-muted ring-[2px] ring-current/45 hover:text-stork-600 hover:ring-stork-500/70 hover:bg-stork-50 dark:hover:bg-stork-900/20'
        }"
      />

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
            class="ml-4 shrink-0"
            :ui="{
              base: 'h-10 bg-default border-2 border-capaccent-300 text-capaccent-800 hover:border-capaccent-500 hover:bg-capaccent-50 dark:border-capaccent-400 dark:bg-default dark:text-capaccent-100 dark:hover:bg-capaccent-900/50'
            }"
            @click="requestRenameDraft"
          />
          <UButton
            color="neutral"
            variant="ghost"
            size="md"
            icon="i-lucide-cloud-upload"
            :label="props.cloudSaveLabel"
            :aria-label="props.cloudSaveAriaLabel"
            :loading="props.cloudSaveLoading"
            class="shrink-0"
            :ui="{
              base: 'h-10 bg-default border-2 border-success-400 text-success-600 hover:border-success-500 hover:bg-success-50 dark:border-success-400 dark:bg-default dark:text-success-100 dark:hover:bg-success-600/25'
            }"
            @click="requestSaveToCloud"
          />
        </div>
      </div>
    </div>
  </div>
</template>
