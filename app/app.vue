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
    <UHeader>
      <template #left>
        <NuxtLink to="/">
          <AppLogo class="h-6 w-auto shrink-0" />
        </NuxtLink>

        <TemplateMenu />
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

    <UMain>
      <NuxtPage />
    </UMain>

    <USeparator icon="i-simple-icons-nuxtdotjs" />

    <UFooter>
      <div class="text-muted flex items-center justify-center gap-3 text-center text-sm">
        <span>{{ t('layout.footer.copy', { year: currentYear }) }}</span>
        <span aria-hidden="true">•</span>
        <ULink :to="appConfig.project.sourceCodeUrl" target="_blank" class="text-primary">
          {{ t('layout.footer.sourceCode') }}
        </ULink>
      </div>
    </UFooter>
  </UApp>
</template>
