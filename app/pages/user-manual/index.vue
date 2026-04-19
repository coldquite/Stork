<script setup lang="ts">
definePageMeta({
  layout: 'default',
  key: (route) => route.path,
  alias: '/user-manual'
})
</script>

<template>
  <UserManualPageContent />
</template>
