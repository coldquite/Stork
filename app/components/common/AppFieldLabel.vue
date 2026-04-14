<script setup lang="ts">
type FieldLabelElement = 'span' | 'label' | 'p'

const props = withDefaults(
  defineProps<{
    as?: FieldLabelElement
    required?: boolean
    forId?: string
  }>(),
  {
    as: 'span',
    required: false,
    forId: undefined
  }
)

const resolvedFor = computed(() => (props.as === 'label' ? props.forId : undefined))
</script>

<template>
  <component :is="props.as" :for="resolvedFor" class="inline-flex items-center gap-0.5">
    <slot />
    <span v-if="props.required" class="text-error" aria-hidden="true">*</span>
  </component>
</template>
