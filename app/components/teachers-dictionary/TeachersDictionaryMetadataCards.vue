<script setup lang="ts">
interface TeachersDictionaryMetadataCardsProps {
  count: number
  lastUpdatedText: string
  countLabel: string
  lastUpdatedLabel: string
}

defineProps<TeachersDictionaryMetadataCardsProps>()
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2">
    <div class="border-default rounded-lg border p-3">
      <p class="text-muted text-sm">
        {{ countLabel }}
      </p>
      <p class="text-highlighted mt-1 font-semibold">
        {{ count }}
      </p>
    </div>

    <div class="border-default rounded-lg border p-3">
      <p class="text-muted text-sm">
        {{ lastUpdatedLabel }}
      </p>
      <p class="text-highlighted mt-1 font-semibold">
        {{ lastUpdatedText }}
      </p>
    </div>
  </div>
</template>
