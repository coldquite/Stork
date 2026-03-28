<script setup lang="ts">
import { getYear } from 'date-fns'

const appConfig = useAppConfig()
const { t } = useI18n()
const currentYear = getYear(new Date())
</script>

<template>
  <UFooter class="relative overflow-hidden">
    <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 top-0 bottom-0">
      <USeparator />
      <LazyCommonStarsBg :star-count="2800" class="footer-stars-bg" />
    </div>

    <div
      class="text-muted relative z-10 flex items-center justify-center gap-3 pt-3 pb-1 text-center text-sm font-normal"
    >
      <ULink :to="appConfig.project.sourceCodeUrl" external target="_blank" rel="noopener" class="text-primary">
        {{ t('layout.footer.sourceCode') }}
      </ULink>
      <span aria-hidden="true">•</span>
      <span>{{ t('layout.footer.copy', { year: currentYear }) }}</span>
      <span aria-hidden="true">•</span>
      <ULink to="/licenses.txt" external target="_blank" rel="noopener" class="text-primary">
        {{ t('layout.footer.licenses') }}
      </ULink>
    </div>
  </UFooter>
</template>
