<script setup lang="ts">
import { differenceInSeconds, format, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns'
import { cs } from 'date-fns/locale'
import { useScheduleDraftStore } from '~/stores/schedule-draft'
import { useStartStore } from '~/stores/start'

const { t } = useI18n()
const startStore = useStartStore()
const scheduleDraftStore = useScheduleDraftStore()

await startStore.fetchRecentPlans()

function formatPlanDate(value: string): string {
  const date = parseISO(value)

  if (!isValid(date)) {
    return '-'
  }

  return format(date, 'dd.MM.yyyy')
}

function formatRelativeTimeCz(value: string | null): string {
  if (!value) {
    return t('start.actions.restore.justNow')
  }

  const timestamp = parseISO(value)
  if (!isValid(timestamp)) {
    return t('start.actions.restore.justNow')
  }

  const diffSeconds = Math.abs(differenceInSeconds(new Date(), timestamp))
  if (diffSeconds < 60) {
    return t('start.actions.restore.justNow')
  }

  return formatDistanceToNowStrict(timestamp, {
    addSuffix: true,
    locale: cs,
    roundingMethod: 'floor'
  })
}

const restoreDraftStatus = computed(() => {
  const draftName = scheduleDraftStore.draft?.name ?? ''
  const relativeTime = formatRelativeTimeCz(scheduleDraftStore.lastSavedAt)

  return t('start.actions.restore.status', {
    name: draftName,
    relativeTime
  })
})
</script>

<template>
  <UContainer class="max-w-5xl py-14">
    <header class="mb-12 text-center">
      <h1 class="mx-auto mb-3 max-w-[20ch]">
        {{ t('start.title') }}
      </h1>
      <p class="text-muted mx-auto max-w-3xl text-lg">
        {{ t('start.description') }}
      </p>
    </header>

    <section class="mb-8 grid gap-6 md:grid-cols-2">
      <UCard
        class="group border-primary/50 hover:border-primary hover:bg-primary/5 cursor-pointer border-2 border-dashed transition-colors duration-300 ease-out"
      >
        <div class="flex flex-col items-center py-6 text-center">
          <div
            class="bg-primary/20 group-hover:bg-primary/30 dark:bg-primary/10 dark:group-hover:bg-primary/20 mb-4 flex size-16 items-center justify-center rounded-full transition-colors duration-300 ease-out"
          >
            <UIcon name="i-lucide-plus" class="text-primary size-8" />
          </div>
          <h2 class="mb-2 text-xl font-semibold">
            {{ t('start.actions.create.title') }}
          </h2>
          <p class="text-muted">
            {{ t('start.actions.create.description') }}
          </p>
        </div>
      </UCard>

      <UCard
        class="group border-capaccent-300 hover:border-capaccent-500 hover:bg-capaccent-50 dark:hover:bg-capaccent-500/25 cursor-pointer border-2 transition-colors duration-300 ease-out"
      >
        <div class="flex flex-col items-center py-6 text-center">
          <div
            class="bg-capaccent-200 group-hover:bg-capaccent-300 dark:bg-capaccent-100 dark:group-hover:bg-capaccent-300 mb-4 flex size-16 items-center justify-center rounded-full transition-colors duration-300 ease-out"
          >
            <UIcon name="i-lucide-folder-open" class="text-capaccent-800 size-8" />
          </div>
          <h2 class="mb-2 text-xl font-semibold transition-colors duration-300 ease-out">
            {{ t('start.actions.browse.title') }}
          </h2>
          <p class="text-muted group-hover:text-default transition-colors duration-300 ease-out">
            {{ t('start.actions.browse.description') }}
          </p>
        </div>
      </UCard>
    </section>

    <section v-if="scheduleDraftStore.hasDraft" class="mb-8">
      <UCard
        class="group bg-success/10 border-success/80 hover:border-success hover:bg-success/15 cursor-pointer border-2 transition-colors duration-300 ease-out"
      >
        <div class="flex flex-col items-center py-6 text-center">
          <div
            class="bg-success/25 group-hover:bg-success/35 dark:bg-success/15 dark:group-hover:bg-success/25 mb-4 flex size-16 items-center justify-center rounded-full transition-colors duration-300 ease-in-out"
          >
            <UIcon
              name="i-lucide-rotate-ccw"
              class="text-success size-8 drop-shadow-[0_1px_0_rgba(10,74,43,0.35)] dark:drop-shadow-none"
            />
          </div>
          <h2 class="mb-2 text-xl font-semibold">
            {{ t('start.actions.restore.title') }}
          </h2>
          <p class="text-sm">
            {{ restoreDraftStatus }}
          </p>
        </div>
      </UCard>
    </section>

    <section>
      <UCard>
        <template #header>
          <div class="space-y-2">
            <h2 class="flex items-center gap-2 text-lg font-semibold">
              <UIcon name="i-lucide-clock-3" class="text-muted size-5" />
              {{ t('start.recent.title') }}
            </h2>
            <p class="text-muted">
              {{ t('start.recent.description') }}
            </p>
          </div>
        </template>

        <div v-if="startStore.isRecentPlansLoading" class="space-y-3">
          <USkeleton v-for="skeletonIndex in 7" :key="skeletonIndex" class="h-16 w-full rounded-lg" />
        </div>

        <UAlert
          v-else-if="startStore.hasRecentPlansError"
          color="error"
          variant="soft"
          icon="i-lucide-triangle-alert"
          :title="t('start.recent.errorTitle')"
          :description="t('start.recent.errorDescription')"
        />

        <UEmpty
          v-else-if="startStore.recentPlans.length === 0"
          icon="i-lucide-calendar"
          :title="t('start.recent.emptyTitle')"
          :description="t('start.recent.emptyDescription')"
        />

        <div v-else class="space-y-2">
          <div
            v-for="plan in startStore.recentPlans"
            :key="plan.id"
            class="group hover:bg-primary/10 flex w-full cursor-pointer items-center justify-between rounded-lg p-3 transition-colors"
          >
            <div class="flex min-w-0 items-center gap-4">
              <div class="bg-primary/10 flex size-10 items-center justify-center rounded-lg">
                <UIcon name="i-lucide-calendar" class="size-5" />
              </div>
              <div class="min-w-0">
                <p class="truncate font-medium">
                  {{ plan.name }}
                </p>
                <p class="text-muted text-sm">
                  {{ formatPlanDate(plan.createdAt) }}
                </p>
              </div>
            </div>

            <div class="flex shrink-0 items-center gap-5 pl-4">
              <div class="text-muted flex items-center gap-4 text-sm">
                <span class="flex items-center gap-1">
                  <UIcon name="i-lucide-users" class="size-4" />
                  {{ t('start.recent.committees', { count: plan.counts.committees }) }}
                </span>
                <span>{{ t('start.recent.students', { count: plan.counts.students }) }}</span>
              </div>
              <UIcon
                name="i-lucide-chevron-right"
                class="text-muted size-5 opacity-0 transition-opacity group-hover:opacity-100"
              />
            </div>
          </div>
        </div>
      </UCard>
    </section>
  </UContainer>
</template>
