<script setup lang="ts">
import type { AuthFailureReason } from '#shared/types/auth'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: 'auth'
})

const { t } = useI18n()
const route = useRoute()
const authStore = useAuthStore()
const authFailureReasons: readonly AuthFailureReason[] = ['state', 'config', 'forbidden']

function isAuthFailureReason(value: string): value is AuthFailureReason {
  return authFailureReasons.some((reason) => reason === value)
}

const hasLoginError = computed(() => route.query.login === 'failed')
const loginErrorReason = computed<AuthFailureReason | null>(() => {
  if (typeof route.query.reason !== 'string') {
    return null
  }

  return isAuthFailureReason(route.query.reason) ? route.query.reason : null
})

const loginErrorDescription = computed(() => {
  switch (loginErrorReason.value) {
    case 'state':
      return t('login.errorState')
    case 'config':
      return t('login.errorConfig')
    case 'forbidden':
      return t('login.errorForbidden')
    default:
      return t('login.errorDefault')
  }
})
</script>

<template>
  <UContainer class="max-w-4xl py-14">
    <AuthLoginHero />
    <AuthLoginCta
      :has-login-error="hasLoginError"
      :login-error-description="loginErrorDescription"
      :is-session-loading="authStore.isSessionLoading"
      @start-login="authStore.startFitLogin"
    />
  </UContainer>
</template>
