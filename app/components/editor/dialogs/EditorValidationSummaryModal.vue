<script setup lang="ts">
import EditorCommitteeValidationCard from '~/components/editor/committee/EditorCommitteeValidationCard.vue'
import EditorStudentValidationCard from '~/components/editor/students/EditorStudentValidationCard.vue'
import type { EditorValidationSummaryCommitteeView } from '~/types/editor'

const props = defineProps<{
  committees: EditorValidationSummaryCommitteeView[]
}>()

const emit = defineEmits<{
  openCommittee: [committeeId: string]
  openStudent: [payload: { committeeId: string; studentId: string }]
}>()

const open = defineModel<boolean>('open', { default: false })
const expandedCommitteeIds = ref<string[]>([])
const { t } = useI18n()
const successStateAlertUi = {
  root: 'border-2 border-success-600/65 bg-default dark:border-success-400/70',
  title: 'text-success-700 dark:text-success-100',
  description: 'text-success-700/95 dark:text-success-100/95',
  icon: 'text-success-700 dark:text-success-100'
} as const

watch(
  () => open.value,
  (isOpen) => {
    if (isOpen) {
      expandedCommitteeIds.value = []
    }
  }
)

watch(
  () => props.committees,
  (nextCommittees) => {
    const validCommitteeIds = new Set(nextCommittees.map((committee) => committee.committeeId))
    expandedCommitteeIds.value = expandedCommitteeIds.value.filter((committeeId) => validCommitteeIds.has(committeeId))
  },
  { deep: true }
)

function isCommitteeExpanded(committeeId: string): boolean {
  return expandedCommitteeIds.value.includes(committeeId)
}

function toggleCommitteeDetails(committeeId: string): void {
  if (isCommitteeExpanded(committeeId)) {
    expandedCommitteeIds.value = expandedCommitteeIds.value.filter((id) => id !== committeeId)
    return
  }

  expandedCommitteeIds.value = [...expandedCommitteeIds.value, committeeId]
}

function requestOpenCommittee(committeeId: string): void {
  emit('openCommittee', committeeId)
}

function requestOpenStudent(committeeId: string, studentId: string): void {
  emit('openStudent', { committeeId, studentId })
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('editor.schedule.validationSummary.modal.title')"
    :description="t('editor.schedule.validationSummary.modal.description')"
    :ui="{
      content: 'sm:max-w-3xl'
    }"
  >
    <template #body>
      <div v-if="props.committees.length > 0" class="space-y-4">
        <div class="border-default max-h-[44vh] overflow-y-auto rounded-md border-2">
          <div class="divide-default divide-y-2">
            <div v-for="committee in props.committees" :key="committee.committeeId" class="bg-default">
              <div class="flex items-stretch gap-2 p-2">
                <UTooltip
                  :text="t('editor.schedule.validationSummary.modal.openCommitteeTooltip')"
                  class="min-w-0 flex-1"
                >
                  <button
                    type="button"
                    class="focus-visible:ring-primary/50 w-full min-w-0 cursor-pointer rounded-md px-3 py-2.5 text-left ring-0 transition-colors focus-visible:ring-2 focus-visible:ring-inset"
                    :class="
                      isCommitteeExpanded(committee.committeeId)
                        ? 'bg-primary/5 hover:bg-accented dark:bg-primary/20'
                        : 'hover:bg-accented'
                    "
                    @click="requestOpenCommittee(committee.committeeId)"
                  >
                    <div class="min-w-0 space-y-0.5">
                      <div class="flex min-w-0 flex-wrap items-center gap-2">
                        <span class="min-w-0 truncate text-left text-base font-semibold">
                          {{ committee.committeeLabel }}
                        </span>

                        <UBadge v-if="committee.committeeErrorCount > 0" color="error" variant="soft" size="sm">
                          {{
                            t('editor.schedule.validationSummary.modal.committeeErrorsCount', {
                              count: committee.committeeErrorCount
                            })
                          }}
                        </UBadge>
                        <UBadge v-if="committee.studentErrorCount > 0" color="error" variant="soft" size="sm">
                          {{
                            t('editor.schedule.validationSummary.modal.studentErrorsCount', {
                              count: committee.studentErrorCount
                            })
                          }}
                        </UBadge>
                      </div>

                      <span class="text-muted block truncate text-xs font-medium">
                        {{ committee.committeeDescription }}
                      </span>
                    </div>
                  </button>
                </UTooltip>

                <UTooltip :text="t('editor.schedule.validationSummary.modal.totalErrorsTooltip')">
                  <UBadge
                    color="error"
                    variant="outline"
                    size="lg"
                    leading-icon="i-lucide-triangle-alert"
                    class="bg-default self-center px-2 py-1 text-sm font-semibold ring-2 ring-current/45"
                  >
                    {{ committee.totalErrorCount }}
                  </UBadge>
                </UTooltip>

                <UButton
                  color="neutral"
                  variant="ghost"
                  size="md"
                  :icon="isCommitteeExpanded(committee.committeeId) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                  :aria-label="
                    isCommitteeExpanded(committee.committeeId)
                      ? t('editor.schedule.validationSummary.modal.collapseAriaLabel')
                      : t('editor.schedule.validationSummary.modal.expandAriaLabel')
                  "
                  class="border-default bg-default hover:bg-accented w-16 cursor-pointer justify-center self-stretch rounded-md border"
                  @click="toggleCommitteeDetails(committee.committeeId)"
                />
              </div>

              <div v-if="isCommitteeExpanded(committee.committeeId)" class="border-default border-t-2 p-3">
                <div class="flex flex-col gap-1.5 xl:flex-row xl:items-stretch xl:justify-between">
                  <EditorCommitteeValidationCard
                    v-if="committee.committeeErrorCount > 0"
                    :title="t('editor.committee.validation.title')"
                    :error-count="committee.committeeErrorCount"
                    :sections="committee.committeeSections"
                    class="!w-full self-stretch xl:!w-[49%]"
                  />
                  <UAlert
                    v-else
                    color="success"
                    variant="outline"
                    icon="i-lucide-check"
                    :title="t('editor.committee.validation.title')"
                    :description="t('editor.schedule.validationSummary.modal.committeeErrorsEmpty')"
                    :ui="successStateAlertUi"
                    class="w-full self-stretch xl:w-[49%]"
                  />

                  <EditorStudentValidationCard
                    v-if="committee.studentErrorCount > 0"
                    :title="t('editor.student.validation.title')"
                    :error-count="committee.studentErrorCount"
                    :students="committee.studentGroups"
                    class="!w-full self-stretch xl:!w-[49%]"
                    @focus-student="requestOpenStudent(committee.committeeId, $event)"
                  />
                  <UAlert
                    v-else
                    color="success"
                    variant="outline"
                    icon="i-lucide-check"
                    :title="t('editor.student.validation.title')"
                    :description="t('editor.schedule.validationSummary.modal.studentErrorsEmpty')"
                    :ui="successStateAlertUi"
                    class="w-full self-stretch xl:w-[49%]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="py-4">
        <UEmpty
          icon="i-lucide-circle-check"
          :title="t('editor.schedule.validationSummary.modal.emptyTitle')"
          :description="t('editor.schedule.validationSummary.modal.emptyDescription')"
        />
      </div>
    </template>

    <template #footer>
      <div class="ml-auto">
        <UButton color="primary" variant="solid" class="cursor-pointer" @click="open = false">
          {{ t('editor.schedule.validationSummary.modal.close') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
