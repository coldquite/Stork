<script setup lang="ts">
import type { CommitteeTabItem } from '~/types/editor'

const props = defineProps<{
  cardRootClass: string
  title: string
  committeesCount: number
  selectedCommitteeId: string
  committeeTabs: CommitteeTabItem[]
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

function requestCreateCommittee(): void {
  emit('createCommittee')
}
</script>

<template>
  <UCard :ui="{ root: props.cardRootClass, header: 'sm:px-3 lg:px-3', body: 'p-0 sm:p-0' }">
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">
          {{ props.title }}
        </h2>
        <UBadge
          color="secondary"
          variant="outline"
          size="lg"
          leading-icon="i-lucide-scale"
          class="bg-default px-2.5 py-1 text-base font-semibold ring-[2px] ring-current/45"
        >
          {{ props.committeesCount }}
        </UBadge>
      </div>
    </template>

    <UTabs
      v-model="selectedCommitteeIdModel"
      :items="props.committeeTabs"
      orientation="vertical"
      :content="false"
      variant="pill"
      size="lg"
      :ui="{
        root: 'w-full',
        list: 'w-full items-stretch rounded-none border-y-2 border-default bg-default p-0',
        trigger:
          'w-full justify-between rounded-none text-base font-semibold transition-colors data-[state=inactive]:hover:bg-accented data-[state=inactive]:hover:ring-1 data-[state=inactive]:hover:ring-inset data-[state=inactive]:hover:ring-primary/30 data-[state=active]:hover:ring-2 data-[state=active]:hover:ring-inset data-[state=active]:hover:ring-white/25',
        indicator: 'inset-x-0 rounded-none',
        trailingBadgeSize: 'md',
        trailingBadge: 'px-2 py-0.5 text-sm font-semibold'
      }"
      class="w-full"
    >
      <template #trailing="{ item }">
        <UBadge
          color="primary"
          variant="outline"
          size="lg"
          leading-icon="i-lucide-users"
          class="bg-default px-2.5 py-1 text-base font-semibold ring-[2px] ring-current/45"
        >
          {{ item.studentsCount }}
        </UBadge>
      </template>
    </UTabs>

    <div class="border-default border-t-2 p-2">
      <UButton
        color="primary"
        variant="soft"
        size="lg"
        icon="i-lucide-plus"
        block
        class="ring-primary/35 hover:ring-primary/55 font-semibold ring-2"
        @click="requestCreateCommittee"
      >
        {{ props.createActionLabel }}
      </UButton>
    </div>
  </UCard>
</template>
