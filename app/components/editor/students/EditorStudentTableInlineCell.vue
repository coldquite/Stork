<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    isEditing: boolean
    modelValue: string | number
    /** Outer wrapper classes (width, cursor, etc.) */
    cellWrapperClass: string
    inputClass: string
    mode: 'text' | 'number'
    /** Use wrapped layout for long thesis-style text in read-only mode */
    multiline?: boolean
    /** Shared read-only frame to keep cell geometry stable between readonly/edit modes. */
    displayFrameClass?: string
    /** Overlay classes for the interactive edit control layer. */
    editOverlayClass?: string
    /** When provided, text containing this marker is highlighted as an inline warning. */
    warningMarker?: string
  }>(),
  {
    displayFrameClass: 'w-full min-h-8 px-2.5 py-1.5',
    // Keep edit controls vertically centered when readonly placeholder is taller (e.g., wrapped thesis title)
    editOverlayClass: 'absolute inset-0 flex items-center'
  }
)

const emit = defineEmits<{
  activate: []
  'update:modelValue': [value: unknown]
}>()

function displayText(value: string): string {
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : '-'
}

const hasWarningMarker = computed(() => {
  if (props.mode !== 'text' || !props.warningMarker) {
    return false
  }

  return String(props.modelValue).includes(props.warningMarker)
})

const displayContentClass = computed(() => {
  if (props.mode === 'number') {
    return 'block text-sm whitespace-nowrap'
  }

  if (props.multiline) {
    return hasWarningMarker.value
      ? 'block text-sm break-words whitespace-normal text-error'
      : 'block text-sm break-words whitespace-normal'
  }

  return hasWarningMarker.value ? 'block text-sm whitespace-nowrap text-error' : 'block text-sm whitespace-nowrap'
})

const resolvedInputClass = computed(() => {
  if (!hasWarningMarker.value) {
    return props.inputClass
  }

  return `${props.inputClass} [&_input]:text-error`
})
</script>

<template>
  <div :class="cellWrapperClass" @click="emit('activate')">
    <div class="relative w-full">
      <div
        :class="[props.displayFrameClass, props.isEditing ? 'invisible' : null]"
        :aria-hidden="props.isEditing ? 'true' : undefined"
      >
        <slot name="display">
          <span v-if="props.mode === 'number'" :class="displayContentClass">{{ props.modelValue }}</span>
          <span v-else :class="displayContentClass">
            {{ displayText(String(props.modelValue)) }}
          </span>
        </slot>
      </div>

      <div v-if="props.isEditing" :class="props.editOverlayClass">
        <slot name="edit">
          <UInput
            v-if="props.mode === 'text'"
            :model-value="String(props.modelValue)"
            size="sm"
            :class="resolvedInputClass"
            @update:model-value="emit('update:modelValue', $event)"
          />
          <UInput
            v-else
            :model-value="String(props.modelValue)"
            type="number"
            min="0"
            size="sm"
            :class="props.inputClass"
            @update:model-value="emit('update:modelValue', $event)"
          />
        </slot>
      </div>
    </div>
  </div>
</template>
