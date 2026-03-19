<script setup lang="ts">
const appConfig = useAppConfig()
</script>

<template>
  <div>
    <UHeader class="border-b-2">
      <template #left>
        <NuxtLink to="/">
          <AppLogo />
        </NuxtLink>
      </template>

      <template #right>
        <UColorModeButton />

        <UButton
          :to="appConfig.project.sourceCodeUrl"
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
        <slot />
      </UMain>
    </div>

    <LayoutAppSiteFooter class="mt-12" />
  </div>
</template>
