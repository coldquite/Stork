<script setup lang="ts">
import type { TimeScheduleListItemDto } from '#shared/types/time-schedules'

interface HomepageRecentPlansCardProps {
  recentPlans: TimeScheduleListItemDto[]
  isRecentPlansLoading: boolean
  hasRecentPlansError: boolean
  recentPlanOpenError: string | null
}

defineProps<HomepageRecentPlansCardProps>()
const emit = defineEmits<{ openPlan: [plan: TimeScheduleListItemDto] }>()

const dateFormatter = new Intl.DateTimeFormat('cs-CZ', {
  timeZone: 'Europe/Prague',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
})

function formatDateInPrague(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return dateFormatter.format(date)
}

function formatPlanDate(value: string): string {
  return formatDateInPrague(value)
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
            {{ $t('homepage.recent.title') }}
          </h2>
          <p class="text-muted">
            {{ $t('homepage.recent.description') }}
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
        :title="$t('homepage.recent.errorTitle')"
        :description="$t('homepage.recent.errorDescription')"
      />

      <template v-else>
        <UAlert
          v-if="recentPlanOpenError"
          class="mb-4"
          color="error"
          variant="soft"
          icon="i-lucide-triangle-alert"
          :title="$t('homepage.recent.openPlanErrorTitle')"
          :description="recentPlanOpenError"
        />

        <UEmpty
          v-if="recentPlans.length === 0"
          icon="i-lucide-calendar"
          :title="$t('homepage.recent.emptyTitle')"
          :description="$t('homepage.recent.emptyDescription')"
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
                <div class="flex items-center gap-2">
                  <p class="truncate font-medium">
                    {{ plan.name }}
                  </p>
                  <UBadge
                    v-if="plan.type === 'AUTO'"
                    color="secondary"
                    variant="soft"
                    class="auto-save-badge shrink-0 text-[11px]"
                  >
                    {{ $t('homepage.plansModal.autoBadge') }}
                  </UBadge>
                </div>
                <p class="text-muted text-sm">
                  {{ formatPlanDate(plan.createdAt) }}
                </p>
              </div>
            </div>

            <div class="flex shrink-0 items-center gap-5 pl-4">
              <div class="text-muted flex items-center gap-4 text-sm">
                <span class="flex items-center gap-1">
                  <UIcon name="i-lucide-users" class="size-4" />
                  {{ $t('homepage.recent.committees', { count: plan.counts.committees }) }}
                </span>
                <span>{{ $t('homepage.recent.students', { count: plan.counts.students }) }}</span>
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
