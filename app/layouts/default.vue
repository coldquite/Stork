<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const { t } = useI18n()
const authStore = useAuthStore()
const isLogoutDialogOpen = ref(false)

const usernameLabel = computed(() => authStore.username || '-')

const logoutButtonLabel = computed(() => {
  return `${t('dashboard.logoutButton')}: ${usernameLabel.value}`
})

function openLogoutDialog(): void {
  if (authStore.isLogoutLoading) {
    return
  }

  isLogoutDialogOpen.value = true
}

async function confirmLogout(): Promise<void> {
  isLogoutDialogOpen.value = false
  await authStore.logout()
}
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
        <UButton
          color="primary"
          variant="subtle"
          icon="i-lucide-log-out"
          :aria-label="logoutButtonLabel"
          :loading="authStore.isLogoutLoading"
          @click="openLogoutDialog"
        >
          <span>{{ `${t('dashboard.logoutButton')}:` }}</span>
          <span class="text-toned">{{ usernameLabel }}</span>
        </UButton>

        <UColorModeButton />
      </template>
    </UHeader>

    <CommonAppActionConfirmDialog
      v-model:open="isLogoutDialogOpen"
      :action-label="t('dashboard.logoutButton')"
      :description="t('dashboard.logoutConfirmDescription')"
      :loading="authStore.isLogoutLoading"
      @confirm="confirmLogout"
    />

    <div class="relative">
      <HeroBackground />
      <UMain class="relative z-10">
        <slot />
      </UMain>
    </div>

    <LayoutAppSiteFooter class="mt-12" />
  </div>
</template>
