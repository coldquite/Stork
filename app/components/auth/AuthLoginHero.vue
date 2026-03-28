<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <UPageHero
    :description="t('meta.description')"
    :ui="{
      container: 'pt-24 pb-0 sm:pt-32 sm:pb-0 lg:pt-60 lg:pb-0',
      title: 'text-6xl sm:text-7xl lg:text-8xl',
      description: 'text-xl sm:text-2xl'
    }"
  >
    <template #title>
      <span class="inline-flex flex-wrap items-center justify-center gap-4">
        <span>{{ t('login.welcomeTitle') }}</span>
        <CommonAppLogoSimple class="h-[1.15em] w-[1.15em] shrink-0" />
      </span>
    </template>
  </UPageHero>
</template>
