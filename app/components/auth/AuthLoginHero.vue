<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <UPageHero
    :description="t('meta.description')"
    :ui="{
      title: 'text-6xl sm:text-7xl lg:text-8xl',
      description: 'text-xl sm:text-2xl'
    }"
  >
    <template #title>
      <span class="inline-flex flex-wrap items-center justify-center gap-4">
        <span>{{ t('login.welcomeTitle') }}</span>
        <AppLogoSimple class="h-[1.15em] w-[1.15em] shrink-0" />
      </span>
    </template>
  </UPageHero>
</template>
