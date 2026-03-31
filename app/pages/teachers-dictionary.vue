<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { GetTeachersDictionaryResponseDto, TeachersDictionaryEntryDto } from '#shared/types/teachers-dictionary'

definePageMeta({
  layout: 'default'
})

const { t } = useI18n()
const requestFetch = useRequestFetch()

const { data, status, refresh } = await useAsyncData<GetTeachersDictionaryResponseDto>(
  'teachers-dictionary-custom-entries',
  () => requestFetch<GetTeachersDictionaryResponseDto>('/api/teachers-dictionary?isCustom=true')
)

const entries = computed<TeachersDictionaryEntryDto[]>(() => data.value ?? [])
const isLoading = computed(() => status.value === 'pending')
const hasLoadError = computed(() => status.value === 'error')
const isDeleteConfirmOpen = ref(false)
const isDeletingEntry = ref(false)
const pendingDeleteEntry = ref<TeachersDictionaryEntryDto | null>(null)
const deleteError = ref<string | null>(null)
const deleteActionButtonClass = 'shrink-0 px-2 cursor-pointer'
const deleteActionButtonUi = {
  base: 'text-error/80 ring-[2px] ring-current/45 hover:text-error hover:ring-current/80'
}
const pageDescriptionParagraphs = computed<string[]>(() => [
  t('teachersDictionary.page.descriptionParagraph1'),
  t('teachersDictionary.page.descriptionParagraph2'),
  t('teachersDictionary.page.descriptionParagraph3')
])
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
  await refresh()
}

function resolveDeleteErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== 'object') {
    return null
  }

  const candidate = error as {
    data?: {
      statusMessage?: string
      message?: string
    }
    statusMessage?: string
    message?: string
  }

  return (
    candidate.data?.statusMessage ?? candidate.data?.message ?? candidate.statusMessage ?? candidate.message ?? null
  )
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
    await refresh()
  } catch (error: unknown) {
    deleteError.value =
      resolveDeleteErrorMessage(error) ?? t('teachersDictionary.table.delete.errorRequestFailedDescription')
  } finally {
    isDeletingEntry.value = false
  }
}
</script>

<template>
  <UContainer class="max-w-6xl py-10">
    <section class="space-y-6">
      <header class="space-y-2">
        <div class="flex min-w-0 items-end gap-3">
          <div class="shrink-0 self-center">
            <CommonAppBackToHomepageIconButton :aria-label="t('editor.navigation.backToHomepage')" />
          </div>
          <div class="min-w-0 flex-1">
            <h1 class="whitespace-nowrap">
              {{ t('teachersDictionary.page.title') }}
            </h1>
          </div>
        </div>
        <div class="space-y-3">
          <p v-for="paragraph in pageDescriptionParagraphs" :key="paragraph" class="text-muted text-lg">
            {{ paragraph }}
          </p>
        </div>
      </header>

      <TeachersDictionaryCsvImportCard />

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
    </section>
  </UContainer>
</template>
