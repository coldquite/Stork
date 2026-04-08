<script setup lang="ts">
import type { EditorStudentSearchResult } from '~/types/editor'

const props = defineProps<{
  results: EditorStudentSearchResult[]
  searchQuery: string
  isLoading: boolean
}>()

const emit = defineEmits<{
  searchChange: [query: string]
  selectResult: [result: EditorStudentSearchResult]
}>()

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()

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

function handleSelectResult(result: EditorStudentSearchResult): void {
  emit('selectResult', result)
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('editor.studentSearch.dialog.title')"
    :description="t('editor.studentSearch.dialog.description')"
    :ui="{
      content: 'sm:max-w-4xl'
    }"
  >
    <template #body>
      <div class="mb-5 w-full">
        <p class="text-highlighted mb-2 text-base font-medium">
          {{ t('editor.studentSearch.dialog.searchLabel') }}
        </p>
        <UInput
          v-model="searchInputValue"
          icon="i-lucide-search"
          size="xl"
          class="w-full"
          :placeholder="t('editor.studentSearch.dialog.searchPlaceholder')"
        />
      </div>

      <div class="relative">
        <div v-if="props.results.length < 1" class="py-6">
          <UEmpty
            icon="i-lucide-user-search"
            :title="t('editor.studentSearch.dialog.emptyTitle')"
            :description="t('editor.studentSearch.dialog.emptyDescription')"
          />
        </div>

        <div v-else class="box-border max-h-[56vh] space-y-3 overflow-y-auto px-1 py-1 pr-3">
          <UCard
            v-for="result in props.results"
            :key="`${result.committeeId}-${result.studentId}`"
            class="hover:bg-primary/5 w-full cursor-pointer transition-colors"
            @click="handleSelectResult(result)"
          >
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0">
                <h3 class="truncate text-base font-semibold">
                  {{ result.fullName }}
                </h3>
                <p class="text-muted text-sm">
                  {{ result.email || '-' }}
                </p>
              </div>

              <div class="text-muted flex shrink-0 flex-wrap items-center gap-3 text-sm">
                <span class="flex items-center gap-1">
                  <UIcon name="i-lucide-users" class="size-4" />
                  {{ result.committeeLabel }}
                </span>
                <span class="flex items-center gap-1">
                  <UIcon name="i-lucide-calendar-days" class="size-4" />
                  {{ result.committeeDateLabel }}
                </span>
                <span class="flex items-center gap-1">
                  <UIcon name="i-lucide-hash" class="size-4" />
                  {{ result.orderLabel }}
                </span>
              </div>
            </div>
          </UCard>
        </div>

        <div
          v-show="props.isLoading"
          class="bg-default/80 absolute inset-0 z-10 flex items-center justify-center rounded-lg"
          aria-busy="true"
          aria-live="polite"
        >
          <CommonAppLoadingState :label="t('editor.studentSearch.dialog.loading')" min-height-class="min-h-0" />
        </div>
      </div>
    </template>
  </UModal>
</template>
