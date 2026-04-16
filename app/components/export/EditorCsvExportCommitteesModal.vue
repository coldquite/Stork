<script setup lang="ts">
import {
  EXPORT_CHECKBOX_GROUP_UI,
  EXPORT_CLEAR_ALL_BUTTON_UI,
  EXPORT_LOADING_OVERLAY_CLASS,
  EXPORT_SELECT_ALL_BUTTON_UI
} from '~/constants/export-modal-ui'
import type {
  QuestionsEnvelopeCsvStudyLanguageFilter,
  QuestionsEnvelopeCsvStudyProgramTypeFilter
} from '~/utils/export/questions-envelope-csv-export'

interface EditorCsvExportCommitteeItem {
  id: string
  label: string
  description: string
}

const props = withDefaults(
  defineProps<{
    title: string
    description: string
    committees: EditorCsvExportCommitteeItem[]
    selectedCommitteeIds: string[]
    selectedCountLabel: string
    orderingHintLabel: string
    showCsvStudentFilters?: boolean
    studyProgramTypeFilter?: QuestionsEnvelopeCsvStudyProgramTypeFilter
    studyProgramTypeFilterLabel?: string
    studyProgramTypeFilterAllLabel?: string
    studyProgramTypeFilterBachelorLabel?: string
    studyProgramTypeFilterMasterLabel?: string
    studyLanguageFilter?: QuestionsEnvelopeCsvStudyLanguageFilter
    studyLanguageFilterLabel?: string
    studyLanguageFilterAllLabel?: string
    studyLanguageFilterEnglishLabel?: string
    studyLanguageFilterCzechLabel?: string
    checklistAriaLabel: string
    selectAllLabel: string
    clearAllLabel: string
    cancelLabel: string
    submitLabel: string
    loading?: boolean
    loadingLabel?: string
    emptyTitle: string
    emptyDescription: string
    errorTitle?: string
    errorDescription?: string
    errorItems?: string[]
    submitDisabled: boolean
  }>(),
  {
    loading: false,
    loadingLabel: '',
    showCsvStudentFilters: false,
    studyProgramTypeFilter: 'ALL',
    studyProgramTypeFilterLabel: '',
    studyProgramTypeFilterAllLabel: '',
    studyProgramTypeFilterBachelorLabel: '',
    studyProgramTypeFilterMasterLabel: '',
    studyLanguageFilter: 'ALL',
    studyLanguageFilterLabel: '',
    studyLanguageFilterAllLabel: '',
    studyLanguageFilterEnglishLabel: '',
    studyLanguageFilterCzechLabel: '',
    errorTitle: '',
    errorDescription: '',
    errorItems: () => []
  }
)

const emit = defineEmits<{
  cancel: []
  submit: []
  selectAll: []
  clearAll: []
  updateSelectedCommitteeIds: [value: string[]]
  updateStudyProgramTypeFilter: [value: QuestionsEnvelopeCsvStudyProgramTypeFilter]
  updateStudyLanguageFilter: [value: QuestionsEnvelopeCsvStudyLanguageFilter]
}>()

const open = defineModel<boolean>('open', { default: false })
const loading = computed(() => props.loading)
const submitDisabled = computed(() => props.submitDisabled)
const loadingLabel = computed(() => props.loadingLabel)

const {
  isLoading,
  isSubmitDisabled,
  dimmedContainerClass,
  resolvedLoadingLabel,
  handleCancel,
  handleSubmit,
  handleSelectAll,
  handleClearAll
} = useExportModalControls({
  loading,
  submitDisabled,
  loadingLabel,
  open,
  emitCancel: () => emit('cancel'),
  emitSubmit: () => emit('submit'),
  emitSelectAll: () => emit('selectAll'),
  emitClearAll: () => emit('clearAll')
})

const selectedCommitteeIdsModel = computed({
  get: () => props.selectedCommitteeIds,
  set: (value: string[]) => {
    if (isLoading.value) {
      return
    }

    emit('updateSelectedCommitteeIds', value)
  }
})

const studyProgramTypeFilterModel = computed(() => props.studyProgramTypeFilter)
const studyLanguageFilterModel = computed(() => props.studyLanguageFilter)
const showCsvStudentFilters = computed(() => props.showCsvStudentFilters)
const hasCommittees = computed(() => props.committees.length > 0)

function setStudyProgramTypeFilter(nextFilter: QuestionsEnvelopeCsvStudyProgramTypeFilter): void {
  if (isLoading.value) {
    return
  }

  emit('updateStudyProgramTypeFilter', nextFilter)
}

function setStudyLanguageFilter(nextFilter: QuestionsEnvelopeCsvStudyLanguageFilter): void {
  if (isLoading.value) {
    return
  }

  emit('updateStudyLanguageFilter', nextFilter)
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="props.title"
    :description="props.description"
    :dismissible="!isLoading"
    :close="{ disabled: isLoading }"
    :ui="{
      content: 'sm:max-w-3xl'
    }"
  >
    <template #body>
      <div class="relative">
        <div :class="dimmedContainerClass">
          <div v-if="hasCommittees" class="space-y-4">
            <div
              v-if="props.errorItems.length > 0"
              class="border-error/50 bg-error/10 space-y-2 rounded-md border p-3"
              role="alert"
              aria-live="assertive"
            >
              <p class="text-error text-sm font-semibold">
                {{ props.errorTitle }}
              </p>
              <p v-if="props.errorDescription" class="text-error text-sm leading-snug">
                {{ props.errorDescription }}
              </p>
              <ul class="text-error list-disc space-y-1.5 ps-5 text-sm leading-snug">
                <li v-for="(item, index) in props.errorItems" :key="`${index}-${item}`">
                  {{ item }}
                </li>
              </ul>
            </div>

            <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div class="max-w-2xl min-w-0 space-y-1">
                <p class="text-muted text-xl font-semibold">
                  {{ props.selectedCountLabel }}
                </p>
                <p class="text-muted text-sm leading-snug">
                  {{ props.orderingHintLabel }}
                </p>
              </div>

              <div class="grid shrink-0 grid-cols-1 gap-2 justify-self-end">
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-list-checks"
                  class="w-full cursor-pointer justify-center"
                  :disabled="isLoading"
                  :ui="EXPORT_SELECT_ALL_BUTTON_UI"
                  @click="handleSelectAll"
                >
                  {{ props.selectAllLabel }}
                </UButton>
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-brush-cleaning"
                  class="w-full cursor-pointer justify-center"
                  :disabled="isLoading"
                  :ui="EXPORT_CLEAR_ALL_BUTTON_UI"
                  @click="handleClearAll"
                >
                  {{ props.clearAllLabel }}
                </UButton>
              </div>
            </div>

            <div v-if="showCsvStudentFilters" class="space-y-3">
              <div class="w-full min-w-0 space-y-1">
                <p class="text-muted text-sm font-medium">
                  {{ props.studyProgramTypeFilterLabel }}
                </p>
                <div class="border-default flex w-full min-w-0 items-center gap-1 rounded-md border p-1">
                  <UButton
                    color="primary"
                    size="xs"
                    :variant="studyProgramTypeFilterModel === 'BACHELOR' ? 'solid' : 'ghost'"
                    :disabled="isLoading"
                    class="min-w-0 flex-1 cursor-pointer justify-center"
                    @click="setStudyProgramTypeFilter('BACHELOR')"
                  >
                    {{ props.studyProgramTypeFilterBachelorLabel }}
                  </UButton>
                  <UButton
                    color="primary"
                    size="xs"
                    :variant="studyProgramTypeFilterModel === 'ALL' ? 'solid' : 'ghost'"
                    :disabled="isLoading"
                    class="min-w-0 flex-1 cursor-pointer justify-center"
                    @click="setStudyProgramTypeFilter('ALL')"
                  >
                    {{ props.studyProgramTypeFilterAllLabel }}
                  </UButton>
                  <UButton
                    color="primary"
                    size="xs"
                    :variant="studyProgramTypeFilterModel === 'MASTER' ? 'solid' : 'ghost'"
                    :disabled="isLoading"
                    class="min-w-0 flex-1 cursor-pointer justify-center"
                    @click="setStudyProgramTypeFilter('MASTER')"
                  >
                    {{ props.studyProgramTypeFilterMasterLabel }}
                  </UButton>
                </div>
              </div>

              <div class="w-full min-w-0 space-y-1">
                <p class="text-muted text-sm font-medium">
                  {{ props.studyLanguageFilterLabel }}
                </p>
                <div class="border-default flex w-full min-w-0 items-center gap-1 rounded-md border p-1">
                  <UButton
                    color="primary"
                    size="xs"
                    :variant="studyLanguageFilterModel === 'CZECH' ? 'solid' : 'ghost'"
                    :disabled="isLoading"
                    class="min-w-0 flex-1 cursor-pointer justify-center"
                    @click="setStudyLanguageFilter('CZECH')"
                  >
                    {{ props.studyLanguageFilterCzechLabel }}
                  </UButton>
                  <UButton
                    color="primary"
                    size="xs"
                    :variant="studyLanguageFilterModel === 'ALL' ? 'solid' : 'ghost'"
                    :disabled="isLoading"
                    class="min-w-0 flex-1 cursor-pointer justify-center"
                    @click="setStudyLanguageFilter('ALL')"
                  >
                    {{ props.studyLanguageFilterAllLabel }}
                  </UButton>
                  <UButton
                    color="primary"
                    size="xs"
                    :variant="studyLanguageFilterModel === 'ENGLISH' ? 'solid' : 'ghost'"
                    :disabled="isLoading"
                    class="min-w-0 flex-1 cursor-pointer justify-center"
                    @click="setStudyLanguageFilter('ENGLISH')"
                  >
                    {{ props.studyLanguageFilterEnglishLabel }}
                  </UButton>
                </div>
              </div>
            </div>

            <div class="border-default max-h-[40vh] overflow-y-auto rounded-md border-2 p-3">
              <UCheckboxGroup
                v-model="selectedCommitteeIdsModel"
                :items="props.committees"
                value-key="id"
                label-key="label"
                description-key="description"
                :legend="props.checklistAriaLabel"
                :ui="EXPORT_CHECKBOX_GROUP_UI"
              />
            </div>
          </div>

          <div v-else class="py-4">
            <UEmpty icon="i-lucide-circle-slash-2" :title="props.emptyTitle" :description="props.emptyDescription" />
          </div>
        </div>

        <div v-show="isLoading" :class="EXPORT_LOADING_OVERLAY_CLASS" aria-busy="true" aria-live="polite">
          <CommonAppLoadingState :label="resolvedLoadingLabel" min-height-class="min-h-0" />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" class="cursor-pointer" :disabled="isLoading" @click="handleCancel">
          {{ props.cancelLabel }}
        </UButton>

        <UButton
          color="primary"
          variant="solid"
          class="cursor-pointer"
          :loading="isLoading"
          :disabled="isSubmitDisabled"
          @click="handleSubmit"
        >
          {{ props.submitLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
