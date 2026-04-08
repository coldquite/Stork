<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open: boolean
    sideOffset?: number
  }>(),
  {
    sideOffset: 24
  }
)

const { t } = useI18n()

const popoverContentUi = {
  content: 'w-96 max-w-[calc(100vw-2rem)] p-0'
} as const

const warningAlertUi = {
  root: 'items-center',
  icon: 'self-center'
} as const
</script>

<template>
  <UPopover
    :open="props.open"
    :content="{ side: 'top', align: 'center', sideOffset: props.sideOffset }"
    :dismissible="false"
    :ui="popoverContentUi"
    class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
  >
    <span aria-hidden="true" class="block size-1 opacity-0" />

    <template #content>
      <UAlert
        icon="i-lucide-triangle-alert"
        color="error"
        variant="soft"
        orientation="horizontal"
        :ui="warningAlertUi"
        :description="t('editor.table.repeatTypeDurationOverwriteWarning')"
      />
    </template>
  </UPopover>
</template>
