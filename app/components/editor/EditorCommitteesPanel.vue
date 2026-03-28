<script setup lang="ts">
import { vAutoAnimate } from '@formkit/auto-animate/vue'
import type { CommitteeTabItem } from '~/types/editor'

const props = defineProps<{
  cardRootClass: string
  title: string
  sortHint: string
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
          <p class="text-muted text-xs">
            {{ props.sortHint }}
          </p>
        </div>
        <UBadge
          color="secondary"
          variant="outline"
          size="lg"
          leading-icon="i-lucide-scale"
          class="bg-default self-stretch px-2.5 text-base font-semibold ring-[2px] ring-current/45"
        >
          {{ props.committeesCount }}
        </UBadge>
      </div>
    </template>

    <div class="border-default bg-default border-y-2 p-0">
      <ul v-auto-animate role="listbox" :aria-label="props.title" class="w-full">
        <li v-for="item in props.committeeTabs" :key="item.value">
          <UButton
            :variant="item.value === selectedCommitteeIdModel ? 'soft' : 'ghost'"
            color="primary"
            size="lg"
            block
            role="option"
            :aria-selected="item.value === selectedCommitteeIdModel"
            class="focus-visible:ring-primary/50 w-full justify-between rounded-none px-3 py-3 text-base font-semibold ring-0 focus-visible:ring-2 focus-visible:ring-inset"
            :class="item.value === selectedCommitteeIdModel ? 'ring-primary/50 ring-2 ring-inset' : 'hover:bg-accented'"
            @click="selectCommittee(item.value)"
          >
            <span class="truncate text-left">
              {{ item.label }}
            </span>

            <UBadge
              color="primary"
              variant="outline"
              size="lg"
              leading-icon="i-lucide-users"
              class="bg-default px-2.5 py-1 text-base font-semibold ring-[2px] ring-current/45"
            >
              {{ item.studentsCount }}
            </UBadge>
          </UButton>
        </li>
      </ul>
    </div>

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
