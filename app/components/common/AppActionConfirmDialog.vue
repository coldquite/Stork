<script setup lang="ts">
const { t } = useI18n()
interface AppActionConfirmDialogProps {
  actionLabel: string
  title?: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  confirmColor?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
  loading?: boolean
  /**
   * When `false`, disables Nuxt UI modal enter/leave transitions. Use when this dialog opens on top of
   * another `UModal` to avoid a brief a11y race (focused node vs. `aria-hidden`) during close.
   */
  transition?: boolean
}

const props = withDefaults(defineProps<AppActionConfirmDialogProps>(), {
  confirmColor: 'error',
  loading: false,
  transition: true
})

const emit = defineEmits<{ confirm: []; cancel: [] }>()
const open = defineModel<boolean>('open', { default: false })

const resolvedTitle = computed(() => props.title ?? t('common.confirmDialog.title'))
const resolvedDescription = computed(() => props.description)
const resolvedConfirmLabel = computed(() => props.confirmLabel ?? t('common.confirmDialog.confirm'))
const resolvedCancelLabel = computed(() => props.cancelLabel ?? t('common.confirmDialog.cancel'))

function handleCancel(): void {
  if (props.loading) {
    return
  }

  open.value = false
  emit('cancel')
}

function handleConfirm(): void {
  if (props.loading) {
    return
  }

  emit('confirm')
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="resolvedTitle"
    :description="resolvedDescription"
    :dismissible="!props.loading"
    :close="{ disabled: props.loading }"
    :transition="props.transition"
  >
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" class="cursor-pointer" :disabled="props.loading" @click="handleCancel">
          {{ resolvedCancelLabel }}
        </UButton>

        <UButton
          :color="props.confirmColor"
          variant="solid"
          class="cursor-pointer"
          :loading="props.loading"
          @click="handleConfirm"
        >
          {{ resolvedConfirmLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
