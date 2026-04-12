<script setup lang="ts">
import EditorWarningAlert from '~/components/editor/shared/EditorWarningAlert.vue'

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
      <EditorWarningAlert :description="t('editor.table.repeatTypeDurationOverwriteWarning')" />
    </template>
  </UPopover>
</template>
