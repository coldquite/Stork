<script setup lang="ts">
import EditorCommitteeSidebarList from '~/components/editor/committee/EditorCommitteeSidebarList.vue'
import type { CommitteeSidebarItem } from '~/types/editor'

const props = defineProps<{
  cardRootClass: string
  title: string
  sortHint: string
  committeesCount: number
  selectedCommitteeId: string
  committeeSidebarItems: CommitteeSidebarItem[]
  createActionLabel: string
}>()

const emit = defineEmits<{
  (event: 'update:selectedCommitteeId', value: string): void
  (event: 'createCommittee'): void
}>()

const selectedCommitteeIdModel = computed({
  get: () => props.selectedCommitteeId,
  set: (value: string) => emit('update:selectedCommitteeId', value)
})

function selectCommittee(committeeId: string): void {
  selectedCommitteeIdModel.value = committeeId
}

function requestCreateCommittee(): void {
  emit('createCommittee')
}
</script>

<template>
  <UCard :ui="{ root: props.cardRootClass, header: 'sm:px-3 lg:px-3', body: 'p-0 sm:p-0' }">
    <template #header>
      <div class="flex items-stretch justify-between gap-3">
        <div class="flex min-w-0 flex-col">
          <h2 class="text-lg font-semibold">
            {{ props.title }}
          </h2>
          <p class="text-muted text-sm">
            {{ props.sortHint }}
          </p>
        </div>
        <UBadge
          color="neutral"
          variant="outline"
          size="lg"
          leading-icon="i-lucide-scale"
          class="bg-default text-secondary-800! ring-secondary-400/80 dark:text-secondary-100! dark:ring-secondary-500/80 self-stretch px-2.5 text-base font-semibold ring-2"
        >
          {{ props.committeesCount }}
        </UBadge>
      </div>
    </template>

    <div class="border-default bg-default border-y-2 p-0">
      <div class="border-default border-b-2 p-2">
        <UButton
          color="primary"
          variant="soft"
          size="lg"
          icon="i-lucide-plus"
          block
          class="ring-primary/35 hover:ring-primary/55 cursor-pointer font-semibold ring-2"
          @click="requestCreateCommittee"
        >
          {{ props.createActionLabel }}
        </UButton>
      </div>

      <EditorCommitteeSidebarList
        :items="props.committeeSidebarItems"
        :list-aria-label="props.title"
        :selected-committee-id="selectedCommitteeIdModel"
        @select-committee="selectCommittee"
      />
    </div>
  </UCard>
</template>
