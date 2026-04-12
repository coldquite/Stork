<script setup lang="ts">
import type { EditorCommitteeValidationSectionView } from '~/types/editor'

const props = defineProps<{
  title: string
  errorCount: number
  sections: EditorCommitteeValidationSectionView[]
}>()
const { t } = useI18n()
</script>

<template>
  <div
    class="border-error/60 bg-error/5 w-fit max-w-full min-w-58 space-y-3 rounded-md border p-2"
    role="alert"
    aria-live="polite"
  >
    <div class="flex flex-wrap items-center gap-2">
      <UTooltip :text="t('editor.committee.validation.sidebarBadgeAriaLabel', { count: props.errorCount })">
        <UBadge
          color="error"
          variant="outline"
          size="lg"
          leading-icon="i-lucide-triangle-alert"
          :aria-label="t('editor.committee.validation.sidebarBadgeAriaLabel', { count: props.errorCount })"
          class="bg-default px-2.5 py-1 text-base font-semibold ring-2 ring-current/45"
        >
          {{ props.errorCount }}
        </UBadge>
      </UTooltip>

      <h3 class="text-highlighted text-base font-semibold">
        {{ props.title }}
      </h3>
    </div>

    <div v-for="section in props.sections" :key="section.section" class="space-y-1.5">
      <p class="text-highlighted text-sm font-semibold">
        {{ section.label }}
      </p>

      <ul class="text-error list-disc space-y-1 ps-5 text-sm leading-snug">
        <li
          v-for="issue in section.issues"
          :key="issue.issueId"
          :data-issue-id="issue.issueId"
          :data-field-key="issue.fieldKey"
        >
          {{ issue.message }}
        </li>
      </ul>
    </div>
  </div>
</template>
