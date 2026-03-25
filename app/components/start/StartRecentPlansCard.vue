<script setup lang="ts">
import { format, isValid, parseISO } from 'date-fns'
import type { TimeScheduleListItemDto } from '#shared/types/time-schedules'

interface StartRecentPlansCardProps {
  recentPlans: TimeScheduleListItemDto[]
  isRecentPlansLoading: boolean
  hasRecentPlansError: boolean
  recentPlanOpenError: string | null
}

defineProps<StartRecentPlansCardProps>()
const emit = defineEmits<{ openPlan: [plan: TimeScheduleListItemDto] }>()

function formatPlanDate(value: string): string {
  const date = parseISO(value)

  if (!isValid(date)) {
    return '-'
  }

  return format(date, 'dd.MM.yyyy')
}

function handleOpenPlan(plan: TimeScheduleListItemDto): void {
  emit('openPlan', plan)
}
</script>

<template>
  <section>
    <UCard>
      <template #header>
        <div class="space-y-2">
          <h2 class="flex items-center gap-2 text-lg font-semibold">
            <UIcon name="i-lucide-clock-3" class="text-muted size-5" />
            {{ $t('start.recent.title') }}
          </h2>
          <p class="text-muted">
            {{ $t('start.recent.description') }}
          </p>
        </div>
      </template>

      <div v-if="isRecentPlansLoading" class="space-y-3">
        <USkeleton v-for="skeletonIndex in 7" :key="skeletonIndex" class="h-16 w-full rounded-lg" />
      </div>

      <UAlert
        v-else-if="hasRecentPlansError"
        color="error"
        variant="soft"
        icon="i-lucide-triangle-alert"
        :title="$t('start.recent.errorTitle')"
        :description="$t('start.recent.errorDescription')"
      />

      <template v-else>
        <UAlert
          v-if="recentPlanOpenError"
          class="mb-4"
          color="error"
          variant="soft"
          icon="i-lucide-triangle-alert"
          :title="$t('start.recent.openPlanErrorTitle')"
          :description="recentPlanOpenError"
        />

        <UEmpty
          v-if="recentPlans.length === 0"
          icon="i-lucide-calendar"
          :title="$t('start.recent.emptyTitle')"
          :description="$t('start.recent.emptyDescription')"
        />

        <div v-else class="space-y-2">
          <div
            v-for="plan in recentPlans"
            :key="plan.id"
            class="group hover:bg-primary/10 flex w-full cursor-pointer items-center justify-between rounded-lg p-3 transition-colors"
            @click="handleOpenPlan(plan)"
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
                  {{ $t('start.recent.committees', { count: plan.counts.committees }) }}
                </span>
                <span>{{ $t('start.recent.students', { count: plan.counts.students }) }}</span>
              </div>
              <UIcon
                name="i-lucide-chevron-right"
                class="text-muted size-5 opacity-0 transition-opacity group-hover:opacity-100"
              />
            </div>
          </div>
        </div>
      </template>
    </UCard>
  </section>
</template>
