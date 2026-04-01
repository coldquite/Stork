<script setup lang="ts">
import type { HomepageScheduleListItem } from '~/types/homepage'

interface HomepageSchedulesDialogProps {
  manualSchedules: HomepageScheduleListItem[]
  autoSchedules: HomepageScheduleListItem[]
  isLoading: boolean
  searchQuery: string
  hasMoreManualSchedules: boolean
  hasMoreAutoSchedules: boolean
  isManualLoadMoreLoading: boolean
  isAutoLoadMoreLoading: boolean
}

const props = defineProps<HomepageSchedulesDialogProps>()
const emit = defineEmits<{
  openSchedule: [schedule: HomepageScheduleListItem]
  searchChange: [query: string]
  loadMoreManual: []
  loadMoreAuto: []
}>()

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()

const dateTimeFormatter = new Intl.DateTimeFormat('cs-CZ', {
  timeZone: 'Europe/Prague',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
})

const tabs = computed(() => [
  { key: 'manual', label: t('homepage.schedulesModal.tabs.manual'), slot: 'manual' },
  { key: 'auto', label: t('homepage.schedulesModal.tabs.auto'), slot: 'auto' }
])
const searchInputValue = ref(props.searchQuery)

watch(
  () => props.searchQuery,
  (nextSearchQuery) => {
    if (searchInputValue.value !== nextSearchQuery) {
      searchInputValue.value = nextSearchQuery
    }
  }
)

watch(searchInputValue, (nextSearchQuery) => {
  emit('searchChange', nextSearchQuery)
})

function formatUpdatedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return dateTimeFormatter.format(date)
}

function handleOpenSchedule(schedule: HomepageScheduleListItem): void {
  emit('openSchedule', schedule)
}

function handleLoadMoreManual(): void {
  emit('loadMoreManual')
}

function handleLoadMoreAuto(): void {
  emit('loadMoreAuto')
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('homepage.schedulesModal.title')"
    :ui="{
      content: 'sm:max-w-5xl'
    }"
  >
    <template #body>
      <div class="mb-5 w-full">
        <p class="text-highlighted mb-2 text-base font-medium">
          {{ t('homepage.schedulesModal.searchPlaceholder') }}
        </p>
        <UInput
          v-model="searchInputValue"
          icon="i-lucide-search"
          size="xl"
          class="w-full"
          :placeholder="t('homepage.schedulesModal.searchPlaceholder')"
        />
      </div>

      <CommonAppLoadingState
        v-if="isLoading"
        :label="t('homepage.schedulesModal.loading')"
        min-height-class="min-h-90"
      />

      <UTabs v-else :items="tabs" class="homepage-schedules-tabs border-default mb-2 border-b pb-3">
        <template #manual>
          <div v-if="manualSchedules.length === 0" class="py-6">
            <UEmpty
              icon="i-lucide-folder-open"
              :title="t('homepage.schedulesModal.emptyTitle')"
              :description="t('homepage.schedulesModal.emptyDescription')"
            />
          </div>

          <div v-else class="box-border max-h-[56vh] space-y-3 overflow-y-auto px-1 py-1 pr-3">
            <UCard
              v-for="draft in manualSchedules"
              :key="draft.id"
              class="hover:bg-primary/5 w-full cursor-pointer transition-colors"
              @click="handleOpenSchedule(draft)"
            >
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div class="min-w-0">
                  <h3 class="truncate text-sm font-semibold">
                    {{ draft.name }}
                  </h3>
                  <p class="text-muted text-xs">
                    {{ t('homepage.schedulesModal.updatedAt') }} {{ formatUpdatedAt(draft.updatedAt) }}
                  </p>
                </div>
                <div class="text-muted flex shrink-0 items-center gap-4 text-xs">
                  <span class="flex items-center gap-1">
                    <UIcon name="i-lucide-users" class="size-3.5" />
                    {{ t('homepage.recent.committees', { count: draft.committeesCount }) }}
                  </span>
                  <span>{{ t('homepage.recent.students', { count: draft.studentsCount }) }}</span>
                </div>
              </div>
            </UCard>

            <div v-if="hasMoreManualSchedules" class="flex justify-center pt-2">
              <UButton
                color="primary"
                variant="solid"
                size="lg"
                class="min-w-50 cursor-pointer justify-center px-4"
                :loading="isManualLoadMoreLoading"
                :disabled="isManualLoadMoreLoading"
                @click="handleLoadMoreManual"
              >
                {{ t('homepage.schedulesModal.loadMore') }}
              </UButton>
            </div>
          </div>
        </template>

        <template #auto>
          <div v-if="autoSchedules.length === 0" class="py-6">
            <UEmpty
              icon="i-lucide-folder-open"
              :title="t('homepage.schedulesModal.emptyTitle')"
              :description="t('homepage.schedulesModal.emptyDescription')"
            />
          </div>

          <div v-else class="box-border max-h-[56vh] space-y-3 overflow-y-auto px-2 py-1 pr-3">
            <UCard
              v-for="draft in autoSchedules"
              :key="draft.id"
              class="hover:bg-warning/10 w-full cursor-pointer transition-colors"
              @click="handleOpenSchedule(draft)"
            >
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div class="min-w-0 space-y-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <h3 class="truncate text-sm font-semibold">
                      {{ draft.name }}
                    </h3>
                    <UBadge color="secondary" variant="soft" class="auto-save-badge text-[11px]">
                      {{ t('homepage.schedulesModal.autoBadge') }}
                    </UBadge>
                  </div>
                  <p class="text-muted text-xs">
                    {{ t('homepage.schedulesModal.updatedAt') }} {{ formatUpdatedAt(draft.updatedAt) }}
                  </p>
                </div>
                <div class="text-muted flex shrink-0 items-center gap-4 text-xs">
                  <span class="flex items-center gap-1">
                    <UIcon name="i-lucide-users" class="size-3.5" />
                    {{ t('homepage.recent.committees', { count: draft.committeesCount }) }}
                  </span>
                  <span>{{ t('homepage.recent.students', { count: draft.studentsCount }) }}</span>
                </div>
              </div>
            </UCard>

            <div v-if="hasMoreAutoSchedules" class="flex justify-center pt-2">
              <UButton
                color="primary"
                variant="solid"
                size="lg"
                class="min-w-56 cursor-pointer justify-center px-6"
                :loading="isAutoLoadMoreLoading"
                :disabled="isAutoLoadMoreLoading"
                @click="handleLoadMoreAuto"
              >
                {{ t('homepage.schedulesModal.loadMore') }}
              </UButton>
            </div>
          </div>
        </template>
      </UTabs>
    </template>
  </UModal>
</template>

<style scoped>
.homepage-schedules-tabs :deep([role='tab']) {
  cursor: pointer;
}
</style>
