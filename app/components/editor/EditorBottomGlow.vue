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
  <div
    aria-hidden="true"
    class="editor-bottom-glow pointer-events-none relative -mt-6 h-50 overflow-hidden rounded-b-[3rem]"
  >
    <div
      class="bg-primary/15 absolute inset-x-0 top-0 h-full mask-[radial-gradient(110%_58%_at_50%_0%,black_0%,transparent_45%)]"
    />
    <LazyCommonStarsBg direction="down" :star-count="starCount" class="editor-stars-bg z-0! opacity-90" />
  </div>
</template>

<style scoped>
.editor-bottom-glow {
  -webkit-mask-image: linear-gradient(180deg, #000 0%, #000 82%, transparent 100%);
  mask-image: linear-gradient(180deg, #000 0%, #000 62%, transparent 100%);
}
</style>
