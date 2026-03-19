<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const { t } = useI18n()
const authStore = useAuthStore()

await callOnce('auth-session-index', () => authStore.fetchSession())

const username = computed(() => authStore.username || '-')
</script>

<template>
  <UContainer class="max-w-3xl py-14">
    <UCard>
      <template #header>
        <h1 class="text-2xl font-semibold">
          {{ t('dashboard.title') }}
        </h1>
        <p class="text-muted mt-2">
          {{ t('dashboard.description') }}
        </p>
      </template>

      <div class="space-y-4">
        <p class="text-muted">
          {{ t('dashboard.signedInAs', { username }) }}
        </p>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-log-out"
          :loading="authStore.isLogoutLoading"
          @click="authStore.logout"
        >
          {{ t('dashboard.logoutButton') }}
        </UButton>
      </div>
    </UCard>
  </UContainer>
</template>
