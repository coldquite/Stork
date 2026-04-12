<script setup lang="ts">
import type { EditorStudentValidationStudentGroupView } from '~/types/editor'

const props = defineProps<{
  title: string
  errorCount: number
  students: EditorStudentValidationStudentGroupView[]
}>()

const emit = defineEmits<{
  (event: 'focusStudent', studentId: string): void
}>()

const { t } = useI18n()

function focusStudent(studentId: string): void {
  emit('focusStudent', studentId)
}

function handleStudentGroupKeydown(event: KeyboardEvent, studentId: string): void {
  if (event.key !== 'Enter' && event.key !== ' ') {
    return
  }

  event.preventDefault()
  focusStudent(studentId)
}
</script>

<template>
  <div
    class="border-error/60 bg-error/5 w-fit max-w-full min-w-58 space-y-3 rounded-md border p-2"
    role="alert"
    aria-live="polite"
  >
    <div class="flex flex-wrap items-center gap-2">
      <UTooltip :text="t('editor.student.validation.sidebarBadgeAriaLabel', { count: props.errorCount })">
        <UBadge
          color="error"
          variant="outline"
          size="lg"
          leading-icon="i-lucide-triangle-alert"
          :aria-label="t('editor.student.validation.sidebarBadgeAriaLabel', { count: props.errorCount })"
          class="bg-default px-2.5 py-1 text-base font-semibold ring-2 ring-current/45"
        >
          {{ props.errorCount }}
        </UBadge>
      </UTooltip>

      <h3 class="text-highlighted text-base font-semibold">
        {{ props.title }}
      </h3>
    </div>

    <UTooltip
      v-for="student in props.students"
      :key="student.studentId"
      :text="t('editor.student.validation.focusStudentTooltip')"
    >
      <div
        class="border-error/30 hover:bg-warning/15 focus-visible:bg-warning/15 bg-default cursor-pointer rounded-md border p-2 transition-colors focus-visible:outline-none"
        role="button"
        tabindex="0"
        @click="focusStudent(student.studentId)"
        @keydown="handleStudentGroupKeydown($event, student.studentId)"
      >
        <p class="text-highlighted text-sm font-semibold">
          {{ student.studentLabel }}
        </p>

        <ul class="text-error list-disc space-y-1 ps-5 text-sm leading-snug">
          <li
            v-for="issue in student.issues"
            :key="issue.issueId"
            :data-issue-id="issue.issueId"
            :data-field-key="issue.fieldKey"
          >
            {{ issue.message }}
          </li>
        </ul>
      </div>
    </UTooltip>
  </div>
</template>
