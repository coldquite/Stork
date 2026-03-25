<script setup lang="ts">
interface StartCreatePlanNameDialogProps {
  loading: boolean
  maxLength: number
  validationError: string | null
}

defineProps<StartCreatePlanNameDialogProps>()

const open = defineModel<boolean>('open', { default: false })
const name = defineModel<string>('name', { default: '' })

const emit = defineEmits<{ submit: []; cancel: [] }>()

function handleCancel(): void {
  emit('cancel')
}

function handleSubmit(): void {
  emit('submit')
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="$t('start.actions.create.nameDialogTitle')"
    :description="$t('start.actions.create.nameDialogDescription')"
    :dismissible="!loading"
    :close="{ disabled: loading }"
  >
    <template #body>
      <div class="space-y-2">
        <UInput
          v-model="name"
          autofocus
          :placeholder="$t('start.actions.create.namePlaceholder')"
          :disabled="loading"
          :maxlength="maxLength"
          @keydown.enter="handleSubmit"
        />

        <p class="text-muted text-xs">
          {{ $t('start.actions.create.validationHint', { max: maxLength }) }}
        </p>

        <p v-if="validationError" class="text-error text-sm">
          {{ validationError }}
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" :disabled="loading" @click="handleCancel">
          {{ $t('common.confirmDialog.cancel') }}
        </UButton>

        <UButton color="primary" variant="solid" :loading="loading" @click="handleSubmit">
          {{ $t('start.actions.create.submitAction') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
