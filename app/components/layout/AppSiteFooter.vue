<script setup lang="ts">
const appConfig = useAppConfig()
const { t } = useI18n()
const currentYear = new Date().getFullYear()
</script>

<template>
  <UFooter class="relative overflow-hidden">
    <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 top-0 bottom-0">
      <USeparator />
      <LazyStarsBg />
    </div>

    <div class="text-muted relative z-10 flex items-center justify-center gap-3 pt-3 pb-1 text-center text-sm">
      <ULink :to="appConfig.project.sourceCodeUrl" target="_blank" class="text-primary">
        {{ t('layout.footer.sourceCode') }}
      </ULink>
      <span aria-hidden="true">•</span>
      <span>{{ t('layout.footer.copy', { year: currentYear }) }}</span>
      <span aria-hidden="true">•</span>
      <a href="/licenses.txt" target="_blank" class="text-primary">
        {{ t('layout.footer.licenses') }}
      </a>
    </div>
  </UFooter>
</template>
