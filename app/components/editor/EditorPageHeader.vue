<script setup lang="ts">
const props = defineProps<{
  title: string
  draftName: string
  backAriaLabel: string
  renameAriaLabel: string
}>()

const emit = defineEmits<{
  (event: 'renameDraft'): void
}>()

function requestRenameDraft(): void {
  emit('renameDraft')
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
            :aria-label="props.renameAriaLabel"
            class="shrink-0 px-2.5"
            :ui="{ base: 'text-muted ring-[2px] ring-current/45 hover:text-secondary hover:ring-current/80' }"
            @click="requestRenameDraft"
          />
        </div>
      </div>
    </div>
  </div>
</template>
