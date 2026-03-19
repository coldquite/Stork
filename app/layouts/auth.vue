<template>
  <div class="flex min-h-dvh flex-col">
    <div class="relative flex-1">
      <HeroBackground />
      <main class="relative z-10">
        <slot />
      </main>
    </div>

    <LayoutAppSiteFooter class="mt-auto" />
  </div>
</template>
