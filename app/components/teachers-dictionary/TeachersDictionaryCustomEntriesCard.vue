<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { GetTeachersDictionaryResponseDto, TeachersDictionaryEntryDto } from '#shared/types/teachers-dictionary'

const { t } = useI18n()
const requestFetch = useRequestFetch()

const CUSTOM_METADATA_ASYNC_KEY = 'teachers-dictionary-custom-metadata'
const {
  metadata,
  refreshMetadata: refreshCustomMetadata,
  formatLastUpdatedAt
} = useTeachersDictionaryMetadata({
  asyncKey: CUSTOM_METADATA_ASYNC_KEY,
  isCustom: true,
  lastUpdatedNeverI18nKey: 'teachersDictionary.table.metadata.lastUpdatedNever'
})

const { data, status, refresh } = useAsyncData<GetTeachersDictionaryResponseDto>(
  'teachers-dictionary-custom-entries',
  () => requestFetch<GetTeachersDictionaryResponseDto>('/api/teachers-dictionary?isCustom=true')
)

const entries = computed<TeachersDictionaryEntryDto[]>(() => data.value ?? [])
const customLastUpdatedText = computed<string>(() => formatLastUpdatedAt(metadata.value.lastUpdatedAt))
const isLoading = computed(() => status.value === 'pending')
const hasLoadError = computed(() => status.value === 'error')
const isDeleteConfirmOpen = ref(false)
const isDeletingEntry = ref(false)
const pendingDeleteEntry = ref<TeachersDictionaryEntryDto | null>(null)
const deleteError = ref<string | null>(null)
const deleteActionButtonClass = 'shrink-0 px-2 cursor-pointer'
const deleteActionButtonUi = {
  base: 'text-error ring-[2px] ring-error/70 hover:text-error hover:ring-error/85 dark:text-error dark:ring-error/85 dark:hover:text-error dark:hover:ring-error'
}

const deleteConfirmDescription = computed(() => {
  return t('teachersDictionary.table.delete.confirmDescription', {
    name: pendingDeleteEntry.value?.canonicalName ?? '-'
  })
})

const columns = computed<TableColumn<TeachersDictionaryEntryDto>[]>(() => [
  {
    accessorKey: 'canonicalName',
    header: t('teachersDictionary.table.columns.canonicalName')
  },
  {
    accessorKey: 'normalizedLookupKey',
    header: t('teachersDictionary.table.columns.normalizedLookupKey')
  },
  {
    id: 'actions',
    header: '',
    meta: { class: { th: 'w-16 text-right', td: 'w-16 text-right' } }
  }
])

async function retryLoad(): Promise<void> {
  await Promise.all([refresh(), refreshCustomMetadata()])
}

function requestDeleteEntry(entry: TeachersDictionaryEntryDto): void {
  if (isDeletingEntry.value) {
    return
  }

  deleteError.value = null
  pendingDeleteEntry.value = entry
  isDeleteConfirmOpen.value = true
}

function cancelDeleteEntry(): void {
  if (isDeletingEntry.value) {
    return
  }

  isDeleteConfirmOpen.value = false
  pendingDeleteEntry.value = null
}

async function confirmDeleteEntry(): Promise<void> {
  const entry = pendingDeleteEntry.value
  if (!entry || isDeletingEntry.value) {
    return
  }

  isDeletingEntry.value = true
  deleteError.value = null

  try {
    await requestFetch(`/api/teachers-dictionary/${encodeURIComponent(entry.id)}`, {
      method: 'DELETE'
    })

    isDeleteConfirmOpen.value = false
    pendingDeleteEntry.value = null
    await Promise.all([refresh(), refreshCustomMetadata()])
  } catch (error: unknown) {
    deleteError.value =
      extractHttpErrorMessage(error) ?? t('teachersDictionary.table.delete.errorRequestFailedDescription')
  } finally {
    isDeletingEntry.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="text-lg font-semibold">
        {{ t('teachersDictionary.table.title') }}
      </h2>
    </template>

    <CommonAppLoadingState
      v-if="isLoading"
      :label="t('teachersDictionary.loading')"
      min-height-class="min-h-48"
      container-class="px-4"
    />

    <div v-else-if="hasLoadError" class="space-y-4">
      <UAlert
        color="error"
        variant="soft"
        icon="i-lucide-triangle-alert"
        :title="t('teachersDictionary.loadErrorTitle')"
        :description="t('teachersDictionary.loadErrorDescription')"
      />

      <UButton color="neutral" variant="outline" class="cursor-pointer" @click="retryLoad">
        {{ t('teachersDictionary.actions.retry') }}
      </UButton>
    </div>

    <div v-else class="space-y-4">
      <TeachersDictionaryMetadataCards
        :count="metadata.count"
        :last-updated-text="customLastUpdatedText"
        :count-label="t('teachersDictionary.table.metadata.countLabel')"
        :last-updated-label="t('teachersDictionary.table.metadata.lastUpdatedLabel')"
      />

      <UAlert
        v-if="deleteError"
        color="error"
        variant="soft"
        icon="i-lucide-triangle-alert"
        :title="t('teachersDictionary.table.delete.errorTitle')"
        :description="deleteError"
      />

      <UTable
        :data="entries"
        :columns="columns"
        :get-row-id="(row) => row.id"
        :ui="{
          separator: 'bg-default',
          tbody: 'divide-y divide-default [&_tr:nth-child(odd)]:bg-elevated [&_tr:nth-child(even)]:bg-default'
        }"
      >
        <template #actions-cell="{ row }">
          <UButton
            color="error"
            variant="ghost"
            size="sm"
            icon="i-lucide-trash-2"
            :aria-label="t('teachersDictionary.table.delete.openAriaLabel', { name: row.original.canonicalName })"
            :class="deleteActionButtonClass"
            :ui="deleteActionButtonUi"
            @click="requestDeleteEntry(row.original)"
          />
        </template>

        <template #empty>
          <UEmpty
            icon="i-lucide-book-user"
            :title="t('teachersDictionary.table.emptyTitle')"
            :description="t('teachersDictionary.table.emptyDescription')"
          />
        </template>
      </UTable>
    </div>
  </UCard>

  <CommonAppActionConfirmDialog
    v-model:open="isDeleteConfirmOpen"
    :action-label="t('teachersDictionary.table.delete.confirmAction')"
    :description="deleteConfirmDescription"
    :confirm-label="t('teachersDictionary.table.delete.confirmAction')"
    :loading="isDeletingEntry"
    @cancel="cancelDeleteEntry"
    @confirm="confirmDeleteEntry"
  />
</template>
