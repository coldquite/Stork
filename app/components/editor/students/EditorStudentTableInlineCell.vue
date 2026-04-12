<script setup lang="ts">
import {
  EDITOR_INVALID_INPUT_PLACEHOLDER_CLASS,
  EDITOR_INVALID_INPUT_TEXT_CLASS,
  EDITOR_INVALID_INPUT_UI
} from '~/constants/editor-validation-ui'

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
    /** Validation state controlled by parent table-level validation map. */
    invalid?: boolean
  }>(),
  {
    displayFrameClass: 'w-full min-h-8 px-2.5 py-1.5 overflow-hidden',
    // Keep edit controls vertically centered when readonly placeholder is taller (e.g., wrapped thesis title)
    editOverlayClass: 'absolute inset-0 flex items-center',
    invalid: false
  }
)

const emit = defineEmits<{
  activate: []
  commit: []
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

const hasInvalidState = computed(() => props.invalid || hasWarningMarker.value)
const isTextValueBlank = computed(() => props.mode === 'text' && String(props.modelValue).trim().length < 1)

const displayContentClass = computed(() => {
  if (props.mode === 'number') {
    return hasInvalidState.value
      ? 'block text-sm whitespace-nowrap overflow-hidden text-ellipsis text-error'
      : 'block text-sm whitespace-nowrap overflow-hidden text-ellipsis'
  }

  if (props.multiline) {
    return hasInvalidState.value
      ? 'block text-sm whitespace-normal [overflow-wrap:anywhere] text-error'
      : 'block text-sm whitespace-normal [overflow-wrap:anywhere]'
  }

  return hasInvalidState.value
    ? 'block text-sm whitespace-nowrap overflow-hidden text-ellipsis text-error'
    : 'block text-sm whitespace-nowrap overflow-hidden text-ellipsis'
})

const resolvedInputClass = computed(() => {
  if (!hasInvalidState.value) {
    return props.inputClass
  }

  const placeholderClass =
    props.mode === 'text' && isTextValueBlank.value ? ` ${EDITOR_INVALID_INPUT_PLACEHOLDER_CLASS}` : ''

  // Keep edit mode focused on outline (ring). Red text is shown in readonly state.
  if (props.isEditing) {
    return `${props.inputClass}${placeholderClass}`
  }

  return `${props.inputClass} ${EDITOR_INVALID_INPUT_TEXT_CLASS}${placeholderClass}`
})

const resolvedInputUi = computed(() => {
  return hasInvalidState.value ? EDITOR_INVALID_INPUT_UI : undefined
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
            placeholder="—"
            :class="resolvedInputClass"
            :ui="resolvedInputUi"
            @update:model-value="emit('update:modelValue', $event)"
            @blur="emit('commit')"
            @keydown.enter="emit('commit')"
          />
          <UInput
            v-else
            :model-value="String(props.modelValue)"
            type="number"
            min="0"
            size="sm"
            :class="resolvedInputClass"
            :ui="resolvedInputUi"
            @update:model-value="emit('update:modelValue', $event)"
            @blur="emit('commit')"
            @keydown.enter="emit('commit')"
          />
        </slot>
      </div>
    </div>
  </div>
</template>
