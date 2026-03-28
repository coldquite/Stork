<script setup lang="ts">
withDefaults(
  defineProps<{
    starCount?: number
  }>(),
  {
    starCount: 1000
  }
)
</script>

<template>
  <div aria-hidden="true" class="pointer-events-none relative -mt-6 h-150 overflow-hidden rounded-b-[3rem]">
    <div
      class="bg-primary/15 absolute inset-x-0 top-0 h-full mask-[radial-gradient(110%_58%_at_50%_0%,black_0%,transparent_45%)]"
    />
    <LazyCommonStarsBg direction="down" :star-count="starCount" class="editor-stars-bg !z-0 opacity-90" />
  </div>
</template>
