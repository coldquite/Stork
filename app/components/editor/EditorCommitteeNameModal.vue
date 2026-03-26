<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open: boolean
    name: string
    title: string
    description: string
    placeholder: string
    hint: string
    submitLabel: string
    cancelLabel: string
    validationError?: string | null
  }>(),
  {
    validationError: null
  }
)

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'update:name', value: string): void
  (event: 'submit' | 'cancel'): void
}>()

function updateName(value: string | number): void {
  emit('update:name', String(value))
}

function submit(): void {
  emit('submit')
}

function cancel(): void {
  emit('cancel')
}
</script>

<template>
  <UModal
    :open="props.open"
    :title="props.title"
    :description="props.description"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="w-full space-y-2">
        <UInput
          :model-value="props.name"
          class="w-full"
          autofocus
          :placeholder="props.placeholder"
          @update:model-value="updateName"
          @keydown.enter="submit"
        />

        <p class="text-muted text-base">
          {{ props.hint }}
        </p>

        <p v-if="props.validationError" class="text-error text-base">
          {{ props.validationError }}
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="cancel">
          {{ props.cancelLabel }}
        </UButton>

        <UButton color="primary" variant="solid" @click="submit">
          {{ props.submitLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
