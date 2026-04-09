<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const { t } = useI18n()
</script>

<template>
  <UContainer class="max-w-6xl py-10">
    <section class="space-y-2">
      <h1>
        {{ t('userManual.page.title') }}
      </h1>
      <p class="text-muted text-lg">
        {{ t('userManual.page.placeholder') }}
      </p>
    </section>
  </UContainer>
</template>
