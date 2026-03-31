<script setup lang="ts">
interface AppBackToHomepageIconButtonProps {
  ariaLabel?: string
}

const props = defineProps<AppBackToHomepageIconButtonProps>()
const { t } = useI18n()

const resolvedAriaLabel = computed(() => {
  return props.ariaLabel ?? t('editor.navigation.backToHomepage')
})
</script>

<template>
  <UButton
    to="/"
    color="neutral"
    variant="ghost"
    icon="i-lucide-undo-2"
    :aria-label="resolvedAriaLabel"
    class="aspect-square min-h-12 shrink-0 cursor-pointer justify-center self-stretch p-0"
    :ui="{
      base: 'h-full text-muted ring-[2px] ring-current/45 hover:text-muted hover:ring-current/45 hover:bg-stork-50 dark:hover:bg-default'
    }"
  />
</template>
