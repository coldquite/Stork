<script setup lang="ts">
import type { CommitteeSidebarItem } from '~/types/editor'

const props = defineProps<{
  title: string
  description: string
  committeeSidebarItems: CommitteeSidebarItem[]
  selectedCommitteeId: string
  disabledCommitteeId: string | null
  currentCommitteeBadgeLabel: string
  cancelLabel: string
}>()

const emit = defineEmits<{
  cancel: []
  selectCommittee: [committeeId: string]
}>()

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()

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
      <div v-if="hasSelectableCommittee" class="border-default max-h-[56vh] overflow-y-auto rounded-md border-2">
        <EditorCommitteeSidebarList
          :items="props.committeeSidebarItems"
          :list-aria-label="props.title"
          :selected-committee-id="props.selectedCommitteeId"
          :disabled-committee-id="props.disabledCommitteeId"
          :current-committee-badge-label="props.currentCommitteeBadgeLabel"
          @select-committee="handleSelectCommittee"
        />
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
      <div class="flex w-full justify-end">
        <UButton color="neutral" variant="ghost" class="cursor-pointer" @click="handleCancel">
          {{ props.cancelLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
