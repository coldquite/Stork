<script setup lang="ts">
defineProps<{
  isEditing: boolean
  modelValue: string | number
  /** Outer wrapper classes (width, cursor, etc.) */
  cellWrapperClass: string
  inputClass: string
  mode: 'text' | 'number'
  /** Use wrapped layout for long thesis-style text in read-only mode */
  multiline?: boolean
}>()

const emit = defineEmits<{
  activate: []
  'update:modelValue': [value: unknown]
}>()

function displayText(value: string): string {
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : '-'
}
</script>

<template>
  <div :class="cellWrapperClass" @click="emit('activate')">
    <UInput
      v-if="isEditing && mode === 'text'"
      :model-value="String(modelValue)"
      size="sm"
      :class="inputClass"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <UInput
      v-else-if="isEditing && mode === 'number'"
      :model-value="String(modelValue)"
      type="number"
      min="0"
      size="sm"
      :class="inputClass"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <span v-else-if="mode === 'number'" class="text-sm whitespace-nowrap">{{ modelValue }}</span>
    <span v-else-if="multiline" class="block text-sm break-words whitespace-normal">
      {{ displayText(String(modelValue)) }}
    </span>
    <span v-else class="text-sm whitespace-nowrap">
      {{ displayText(String(modelValue)) }}
    </span>
  </div>
</template>
