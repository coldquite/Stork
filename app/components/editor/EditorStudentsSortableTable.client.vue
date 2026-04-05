<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { useSortable } from '@vueuse/integrations/useSortable'
import type { EditorStudentsPanelStudentsEmptyLabels, StudentRow } from '~/types/editor'

const props = defineProps<{
  /** Stable key when the parent committee changes (resets local row order). */
  committeeLocalId: string
  modelValue: StudentRow[]
  columns: TableColumn<StudentRow>[]
  emptyLabels: EditorStudentsPanelStudentsEmptyLabels
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: StudentRow[]): void
}>()

const tableWrapper = ref<HTMLElement | null>(null)
const localStudents = ref<StudentRow[]>([])

function syncFromParent(): void {
  localStudents.value = props.modelValue.slice()
}

watch(
  () => props.committeeLocalId,
  () => {
    syncFromParent()
  },
  { immediate: true }
)

watch(
  () => props.modelValue,
  () => {
    syncFromParent()
  },
  { flush: 'post' }
)

const sortableTarget = computed(() => {
  return (tableWrapper.value?.querySelector('tbody') as HTMLElement | null) ?? null
})

const sortable = useSortable(sortableTarget, localStudents)

onMounted(() => {
  sortable.option('animation', 150)
  sortable.option('handle', '.drag-handle')
  sortable.option('draggable', 'tr')
  sortable.option('onEnd', () => {
    emit('update:modelValue', localStudents.value.slice())
  })
})
</script>

<template>
  <div ref="tableWrapper" class="overflow-x-auto">
    <UTable
      :data="localStudents"
      :columns="props.columns"
      :get-row-id="(row) => row.id"
      :ui="{
        tbody: 'editor-students-tbody divide-y divide-default',
        separator: 'bg-default'
      }"
    >
      <template #drag-cell>
        <UButton
          icon="i-lucide-grip-vertical"
          variant="ghost"
          color="neutral"
          size="xs"
          class="drag-handle text-muted cursor-grab active:cursor-grabbing"
        />
      </template>

      <template #order-cell="{ row }">
        <span class="text-muted text-xs font-semibold">
          {{ row.index + 1 }}
        </span>
      </template>

      <template #empty>
        <UEmpty
          icon="i-lucide-users"
          :title="props.emptyLabels.emptyTitle"
          :description="props.emptyLabels.emptyDescription"
        />
      </template>
    </UTable>
  </div>
</template>
