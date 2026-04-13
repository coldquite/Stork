<script setup lang="ts">
type EditorExportDialogTarget = 'CSV' | 'PDF_PUBLIC' | 'PDF_INVIGILATORS'

const props = defineProps<{
  target: EditorExportDialogTarget | null
}>()

const emit = defineEmits<{
  cancel: []
  openValidation: []
  continueExport: []
}>()

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()

const exportTargetLabel = computed(() => {
  switch (props.target) {
    case 'CSV':
      return t('editor.schedule.export.options.questionsEnvelopeCsv')
    case 'PDF_PUBLIC':
      return t('editor.schedule.export.options.publicPdf')
    case 'PDF_INVIGILATORS':
      return t('editor.schedule.export.options.invigilatorsPdf')
    default:
      return t('editor.schedule.export.action')
  }
})

function handleCancel(): void {
  open.value = false
  emit('cancel')
}

function handleOpenValidation(): void {
  open.value = false
  emit('openValidation')
}

function handleContinueExport(): void {
  emit('continueExport')
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('editor.schedule.export.validationWarning.title')"
    :description="t('editor.schedule.export.validationWarning.description', { target: exportTargetLabel })"
  >
    <template #body>
      <UAlert
        color="warning"
        variant="soft"
        icon="i-lucide-triangle-alert"
        :title="t('editor.schedule.export.validationWarning.alertTitle')"
        :description="t('editor.schedule.export.validationWarning.alertDescription')"
      />
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" class="cursor-pointer" @click="handleCancel">
          {{ t('common.confirmDialog.cancel') }}
        </UButton>
        <UButton color="neutral" variant="outline" class="cursor-pointer" @click="handleOpenValidation">
          {{ t('editor.schedule.export.validationWarning.openErrors') }}
        </UButton>
        <UButton color="primary" variant="solid" class="cursor-pointer" @click="handleContinueExport">
          {{ t('editor.schedule.export.validationWarning.continueExport') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
