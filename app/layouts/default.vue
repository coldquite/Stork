<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const { t } = useI18n()
const authStore = useAuthStore()
const route = useRoute()
const isLogoutDialogOpen = ref(false)
const editorHeaderUi = {
  container: 'max-w-[98vw]'
}

const usernameLabel = computed(() => authStore.username || '-')
const isEditorRoute = computed(() => route.path.startsWith('/editor'))
const headerUi = computed(() => (isEditorRoute.value ? editorHeaderUi : undefined))
const editorBackToHomepageLabel = computed(() => t('editor.navigation.backToHomepage'))

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
    <UHeader class="border-b-2" :ui="headerUi">
      <template #left>
        <div class="flex items-center gap-44">
          <NuxtLink to="/">
            <AppLogo />
          </NuxtLink>

          <UButton
            v-if="isEditorRoute"
            to="/"
            color="primary"
            variant="subtle"
            icon="i-lucide-house"
            :aria-label="editorBackToHomepageLabel"
            :ui="{ leadingIcon: 'text-toned' }"
          >
            {{ editorBackToHomepageLabel }}
          </UButton>
        </div>
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
