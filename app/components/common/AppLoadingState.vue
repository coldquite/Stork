<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string
    minHeightClass?: string
    spinnerSizeClass?: string
    containerClass?: string
  }>(),
  {
    minHeightClass: 'min-h-[60vh]',
    spinnerSizeClass: 'size-10',
    containerClass: ''
  }
)

const rootClass = computed(() => {
  return ['flex flex-col items-center justify-center gap-3', props.minHeightClass, props.containerClass]
})
</script>

<template>
  <div :class="rootClass">
    <UIcon name="i-lucide-loader-circle" :class="['text-primary animate-spin', props.spinnerSizeClass]" />
    <p class="text-muted text-sm">
      {{ props.label }}
    </p>
  </div>
</template>
