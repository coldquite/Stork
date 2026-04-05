<script setup lang="ts">
const props = defineProps<{
  committeeTitleLabel: string
  committeeLabel?: string
  studentsCountLabel: string
  renameCommitteeAriaLabel: string
  deleteCommitteeAriaLabel: string
  hasCommittee: boolean
}>()

const emit = defineEmits<{
  (e: 'renameCommittee' | 'deleteCommittee'): void
}>()

const renameActionButtonClass = 'shrink-0 px-2 cursor-pointer'
const renameActionButtonUi = {
  base: '!text-capaccent-800 ring-[2px] ring-capaccent-300/80 hover:!text-capaccent-800 hover:ring-capaccent-500 hover:bg-capaccent-50 dark:!text-capaccent-100 dark:ring-capaccent-400/80 dark:hover:!text-capaccent-100 dark:hover:bg-capaccent-500/25'
}
const actionButtonClass = 'shrink-0 px-2 cursor-pointer'
const deleteActionButtonUi = {
  base: 'text-error/80 ring-[2px] ring-current/45 hover:text-error hover:ring-current/80'
}
</script>

<template>
  <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <div class="min-w-0 space-y-1">
      <p class="text-muted text-sm">
        {{ props.committeeTitleLabel }}
      </p>
      <div class="flex flex-wrap items-center gap-2">
        <h2 class="text-lg font-semibold">
          {{ props.committeeLabel }}
        </h2>

        <div v-if="props.hasCommittee" class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-lucide-pencil"
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
      class="shrink-0 self-start px-3 py-1 text-base font-semibold ring-[2px] ring-current/45 sm:self-center"
    >
      {{ props.studentsCountLabel }}
    </UBadge>
  </div>
</template>
