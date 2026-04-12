<script setup lang="ts">
const props = defineProps<{
  committeeTitleLabel: string
  committeeLabel?: string
  studentsCountLabel: string
  renameCommitteeLabel: string
  deleteCommitteeLabel: string
  renameCommitteeAriaLabel: string
  deleteCommitteeAriaLabel: string
  hasCommittee: boolean
}>()

const emit = defineEmits<{
  (e: 'renameCommittee' | 'deleteCommittee'): void
}>()

const renameActionButtonClass = 'shrink-0 px-2 text-sm cursor-pointer'
const renameActionButtonUi = {
  base: '!text-secondary-800 ring-[2px] ring-secondary-400/80 hover:!text-secondary-800 hover:ring-secondary-500 hover:bg-secondary-50 dark:!text-secondary-100 dark:ring-secondary-500/80 dark:hover:!text-secondary-100 dark:hover:bg-secondary-500/25'
}
const actionButtonClass = 'shrink-0 px-2 text-sm cursor-pointer'
const deleteActionButtonUi = {
  base: 'text-error/90 ring-[2px] ring-error/70 hover:text-error hover:ring-error/85 dark:text-error dark:ring-error/85 dark:hover:text-error dark:hover:ring-error'
}
</script>

<template>
  <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <div class="min-w-0 space-y-1">
      <p class="text-muted text-sm">
        {{ props.committeeTitleLabel }}
      </p>
      <div class="flex flex-wrap items-center gap-3">
        <h2 class="text-xl font-semibold">
          {{ props.committeeLabel }}
        </h2>

        <div v-if="props.hasCommittee" class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-lucide-pencil"
            :label="props.renameCommitteeLabel"
            :aria-label="props.renameCommitteeAriaLabel"
            :class="renameActionButtonClass"
            :ui="renameActionButtonUi"
            @click="emit('renameCommittee')"
          />

          <UButton
            color="error"
            variant="ghost"
            size="sm"
            icon="i-lucide-trash-2"
            :label="props.deleteCommitteeLabel"
            :aria-label="props.deleteCommitteeAriaLabel"
            :class="actionButtonClass"
            :ui="deleteActionButtonUi"
            @click="emit('deleteCommittee')"
          />
        </div>
      </div>
    </div>

    <UBadge
      color="primary"
      variant="soft"
      leading-icon="i-lucide-users"
      class="shrink-0 self-start px-3 py-1 text-base font-semibold ring-2 ring-current/45 sm:self-center"
    >
      {{ props.studentsCountLabel }}
    </UBadge>
  </div>
</template>
