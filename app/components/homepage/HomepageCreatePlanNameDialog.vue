<script setup lang="ts">
interface HomepageCreatePlanNameDialogProps {
  loading: boolean
  maxLength: number
  validationError: string | null
}

defineProps<HomepageCreatePlanNameDialogProps>()

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
    :title="$t('homepage.actions.create.nameDialogTitle')"
    :description="$t('homepage.actions.create.nameDialogDescription')"
    :dismissible="!loading"
    :close="{ disabled: loading }"
  >
    <template #body>
      <div class="space-y-2">
        <UInput
          v-model="name"
          autofocus
          :placeholder="$t('homepage.actions.create.namePlaceholder')"
          :disabled="loading"
          :maxlength="maxLength"
          @keydown.enter="handleSubmit"
        />

        <p class="text-muted text-xs">
          {{ $t('homepage.actions.create.validationHint', { max: maxLength }) }}
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
          {{ $t('homepage.actions.create.submitAction') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
