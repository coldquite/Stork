<script setup lang="ts">
import { vAutoAnimate } from '@formkit/auto-animate/vue'
import type { CommitteeSidebarCommitteeItem, CommitteeSidebarItem } from '~/types/editor'

const props = withDefaults(
  defineProps<{
    items: CommitteeSidebarItem[]
    listAriaLabel: string
    selectedCommitteeId?: string | null
    disabledCommitteeId?: string | null
    currentCommitteeBadgeLabel?: string
  }>(),
  {
    selectedCommitteeId: null,
    disabledCommitteeId: null,
    currentCommitteeBadgeLabel: ''
  }
)

const emit = defineEmits<{
  (event: 'selectCommittee', committeeId: string): void
}>()
const { t } = useI18n()

function resolveSidebarItemKey(item: CommitteeSidebarItem): string {
  return item.kind === 'day-bookmark' ? item.id : item.value
}

function isCommitteeSelected(item: CommitteeSidebarCommitteeItem): boolean {
  return item.value === props.selectedCommitteeId
}

function isCommitteeDisabled(item: CommitteeSidebarCommitteeItem): boolean {
  return item.value === props.disabledCommitteeId
}

function resolveCommitteeVariant(item: CommitteeSidebarCommitteeItem): 'soft' | 'ghost' {
  if (isCommitteeSelected(item) && !isCommitteeDisabled(item)) {
    return 'soft'
  }

  return 'ghost'
}

function resolveCommitteeClass(item: CommitteeSidebarCommitteeItem): string {
  if (isCommitteeDisabled(item)) {
    return 'disabled:!bg-slate-200/70 disabled:!text-slate-700 disabled:!opacity-100 disabled:!ring-2 disabled:!ring-inset disabled:!ring-slate-400/45 disabled:!cursor-not-allowed dark:disabled:!bg-slate-700/45 dark:disabled:!text-slate-200 dark:disabled:!ring-slate-500/45'
  }

  if (isCommitteeSelected(item)) {
    return 'ring-primary/50 ring-2 ring-inset'
  }

  return 'cursor-pointer hover:bg-accented'
}

function handleCommitteeSelect(committeeId: string): void {
  if (committeeId === props.disabledCommitteeId) {
    return
  }

  emit('selectCommittee', committeeId)
}
</script>

<template>
  <ul v-auto-animate role="list" :aria-label="props.listAriaLabel" class="w-full">
    <li v-for="item in props.items" :key="resolveSidebarItemKey(item)">
      <div
        v-if="item.kind === 'day-bookmark'"
        class="border-secondary-400/80 dark:border-secondary-500/80 bg-secondary/10 text-secondary-900 dark:text-secondary-100 border-y-2 px-3 py-2 text-sm font-semibold"
      >
        {{ item.dayLabel }}
      </div>

      <UButton
        v-else
        :variant="resolveCommitteeVariant(item)"
        color="primary"
        size="lg"
        block
        :disabled="isCommitteeDisabled(item)"
        :aria-current="isCommitteeSelected(item) ? 'true' : undefined"
        class="focus-visible:ring-primary/50 w-full justify-between rounded-none px-3 py-3 text-base font-semibold ring-0 focus-visible:ring-2 focus-visible:ring-inset"
        :class="resolveCommitteeClass(item)"
        @click="handleCommitteeSelect(item.value)"
      >
        <div class="min-w-0 text-left">
          <span class="block truncate text-left">
            {{ item.label }}
          </span>
          <span class="text-muted mt-0.5 block truncate text-xs font-medium">
            {{
              t('editor.committees.sidebar.details', {
                room: item.roomLabel,
                start: item.timelineStartLabel,
                end: item.timelineEndLabel
              })
            }}
          </span>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <UBadge
            v-if="isCommitteeDisabled(item) && props.currentCommitteeBadgeLabel.trim().length > 0"
            color="neutral"
            variant="outline"
            size="lg"
            class="bg-default px-2.5 py-1 text-base font-semibold ring-2 ring-current/45"
          >
            {{ props.currentCommitteeBadgeLabel }}
          </UBadge>

          <UBadge
            color="primary"
            variant="outline"
            size="lg"
            leading-icon="i-lucide-users"
            class="bg-default px-2.5 py-1 text-base font-semibold ring-2 ring-current/45"
          >
            {{ item.studentsCount }}
          </UBadge>
        </div>
      </UButton>
    </li>
  </ul>
</template>
