<script setup lang="ts">
const appConfig = useAppConfig()
const { locale, t } = useI18n()
const localeHead = useLocaleHead()
const currentYear = new Date().getFullYear()

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
    <UHeader class="border-b-2">
      <template #left>
        <NuxtLink to="/">
          <AppLogo />
        </NuxtLink>
      </template>

      <template #right>
        <UColorModeButton />

        <UButton
          to="https://github.com/nuxt-ui-templates/starter"
          target="_blank"
          icon="i-simple-icons-github"
          aria-label="GitHub"
          color="neutral"
          variant="ghost"
        />
      </template>
    </UHeader>

    <div class="relative">
      <HeroBackground />
      <UMain class="relative z-10">
        <NuxtPage />
      </UMain>
    </div>

    <UFooter class="relative mt-12 overflow-hidden">
      <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 top-0 h-20">
        <USeparator />
        <LazyStarsBg />
      </div>

      <div class="text-muted relative z-10 flex items-center justify-center gap-3 pt-3 pb-1 text-center text-sm">
        <span>{{ t('layout.footer.copy', { year: currentYear }) }}</span>
        <span aria-hidden="true">•</span>
        <ULink :to="appConfig.project.sourceCodeUrl" target="_blank" class="text-primary">
          {{ t('layout.footer.sourceCode') }}
        </ULink>
      </div>
    </UFooter>
  </UApp>
</template>
