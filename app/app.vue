<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useScheduleAutoSaveToasts } from '~/composables/editor/useScheduleAutoSaveToasts'

const { locale, t } = useI18n()
const authStore = useAuthStore()
const localeHead = useLocaleHead()

if (import.meta.client) {
  useScheduleAutoSaveToasts()
}

await callOnce('auth-session', () => authStore.fetchSession())

useHead(() => ({
  htmlAttrs: {
    lang: localeHead.value.htmlAttrs?.lang || locale.value
  },
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [{ rel: 'icon', href: '/favicon.ico' }]
}))

useSeoMeta({
  title: () => t('meta.title'),
  description: () => t('meta.description'),
  ogTitle: () => t('meta.title'),
  ogDescription: () => t('meta.description'),
  ogType: 'website',
  ogLocale: () => locale.value
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
