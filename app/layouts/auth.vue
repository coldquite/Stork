<template>
  <div class="flex min-h-screen flex-col">
    <div class="relative flex-1">
      <CommonHeroBackground />
      <main class="relative z-10">
        <slot />
      </main>
    </div>

    <LayoutAppSiteFooter class="mt-auto" />
  </div>
</template>
