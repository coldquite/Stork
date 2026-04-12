<script setup lang="ts">
import EditorCommitteeSidebarList from '~/components/editor/committee/EditorCommitteeSidebarList.vue'
import EditorWarningAlert from '~/components/editor/shared/EditorWarningAlert.vue'
import type { CommitteeSidebarItem } from '~/types/editor'
import type {
  StudentCommitteeRewriteFieldKey,
  StudentCommitteeRewritePreviewList
} from '~/utils/editor/student-committee-rewrite'

const props = defineProps<{
  title: string
  description: string
  committeeSidebarItems: CommitteeSidebarItem[]
  selectedTargetCommitteeId: string | null
  disabledCommitteeId: string | null
  currentCommitteeBadgeLabel: string
  cancelLabel: string
  submitLabel: string
  submitDisabled: boolean
  hasRewriteChanges: boolean
  rewritePreview: StudentCommitteeRewritePreviewList | null
}>()

const emit = defineEmits<{
  cancel: []
  selectCommittee: [committeeId: string]
  submit: []
}>()

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const skeletonRowCount = 7

const hasSelectableCommittee = computed(() => {
  return props.committeeSidebarItems.some(
    (item) => item.kind === 'committee' && item.value !== props.disabledCommitteeId
  )
})

function handleCancel(): void {
  open.value = false
  emit('cancel')
}

function handleSelectCommittee(committeeId: string): void {
  emit('selectCommittee', committeeId)
}

function handleSubmit(): void {
  emit('submit')
}

function resolveRewriteFieldLabel(field: StudentCommitteeRewriteFieldKey): string {
  return t(`editor.items.move.preview.fields.${field}`)
}

function resolveStudyProgramTypeLabel(value: string): string {
  if (value === 'BACHELOR') {
    return t('editor.table.studyProgramTypeOptions.bachelor')
  }

  if (value === 'MASTER') {
    return t('editor.table.studyProgramTypeOptions.master')
  }

  return value
}

function resolveStudyLanguageLabel(value: string): string {
  if (value === 'CZECH') {
    return t('editor.table.studyLanguageOptions.czech')
  }

  if (value === 'ENGLISH') {
    return t('editor.table.studyLanguageOptions.english')
  }

  return value
}

function displayTextValue(value: string): string {
  return value.length > 0 ? value : '-'
}

function resolveRewriteFieldDisplayValue(field: StudentCommitteeRewriteFieldKey, value: string | number): string {
  if (field === 'studyProgramType') {
    return resolveStudyProgramTypeLabel(String(value))
  }

  if (field === 'studyLanguage') {
    return resolveStudyLanguageLabel(String(value))
  }

  if (typeof value === 'number') {
    return String(value)
  }

  return displayTextValue(value)
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="props.title"
    :description="props.description"
    :ui="{
      content: 'sm:max-w-3xl'
    }"
  >
    <template #body>
      <div v-if="hasSelectableCommittee" class="space-y-4">
        <div class="border-default max-h-[32vh] overflow-y-auto rounded-md border-2">
          <EditorCommitteeSidebarList
            :items="props.committeeSidebarItems"
            :list-aria-label="props.title"
            :selected-committee-id="props.selectedTargetCommitteeId"
            :disabled-committee-id="props.disabledCommitteeId"
            :current-committee-badge-label="props.currentCommitteeBadgeLabel"
            @select-committee="handleSelectCommittee"
          />
        </div>

        <div class="border-default bg-default space-y-3 rounded-md border-2 p-3">
          <h3 class="text-sm font-semibold">
            {{ t('editor.items.move.preview.title') }}
          </h3>

          <div v-if="props.rewritePreview === null" class="space-y-3">
            <div v-for="index in skeletonRowCount" :key="index" class="space-y-2">
              <USkeleton class="h-4 w-48 rounded" />
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <USkeleton class="h-8 w-full rounded" />
                <USkeleton class="h-4 w-6 rounded" />
                <USkeleton class="h-8 w-full rounded" />
              </div>
            </div>
          </div>

          <div v-else class="space-y-2">
            <div v-for="entry in props.rewritePreview" :key="entry.field" class="space-y-1">
              <div class="text-sm font-medium">
                {{ resolveRewriteFieldLabel(entry.field) }}
              </div>

              <div class="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <span class="bg-muted/40 text-muted-foreground rounded-md px-2 py-1.5 text-sm">
                  {{ resolveRewriteFieldDisplayValue(entry.field, entry.currentValue) }}
                </span>

                <UIcon name="i-lucide-arrow-right" class="text-muted-foreground h-4 w-4 justify-self-center" />

                <span
                  class="rounded-md px-2 py-1.5 text-sm"
                  :class="
                    entry.willChange ? 'bg-error/15 text-error font-semibold' : 'bg-muted/40 text-muted-foreground'
                  "
                >
                  {{ resolveRewriteFieldDisplayValue(entry.field, entry.nextValue) }}
                </span>
              </div>
            </div>

            <EditorWarningAlert
              v-if="props.hasRewriteChanges"
              :title="t('editor.items.move.warning.title')"
              :description="t('editor.items.move.warning.description')"
            />
          </div>
        </div>
      </div>

      <div v-else class="py-4">
        <UEmpty
          icon="i-lucide-circle-slash-2"
          :title="t('editor.items.move.emptyTitle')"
          :description="t('editor.items.move.emptyDescription')"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" class="cursor-pointer" @click="handleCancel">
          {{ props.cancelLabel }}
        </UButton>

        <UButton
          color="primary"
          variant="solid"
          class="cursor-pointer"
          :disabled="props.submitDisabled"
          @click="handleSubmit"
        >
          {{ props.submitLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
