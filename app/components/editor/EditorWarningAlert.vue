<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    description: string
    title?: string
    icon?: string
  }>(),
  {
    title: '',
    icon: 'i-lucide-triangle-alert'
  }
)

const warningAlertUi = {
  root: 'items-center',
  icon: 'self-center'
} as const
</script>

<template>
  <UAlert
    :icon="props.icon"
    color="error"
    variant="soft"
    orientation="horizontal"
    :title="props.title || undefined"
    :description="props.description"
    :ui="warningAlertUi"
  />
</template>
