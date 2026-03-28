<script setup lang="ts">
interface Props {
  hasLoginError: boolean
  loginErrorDescription: string
  isSessionLoading: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (event: 'start-login'): void
}>()

const { t } = useI18n()
</script>

<template>
  <UPageSection>
    <UPageCTA
      :title="t('login.description')"
      variant="outline"
      :ui="{
        title: 'text-base sm:text-2xl'
      }"
    >
      <template #body>
        <UAlert
          v-if="hasLoginError"
          color="error"
          variant="soft"
          icon="i-lucide-shield-alert"
          class="mx-auto w-fit"
          :title="t('login.errorTitle')"
          :description="loginErrorDescription"
        />
      </template>

      <template #links>
        <div class="flex flex-wrap items-center justify-center gap-4">
          <UColorModeButton
            :label="t('login.themeHelper')"
            color="neutral"
            variant="solid"
            size="lg"
            class="bg-black text-white ring-1 ring-black hover:bg-black/90 dark:bg-white dark:text-black dark:ring-white dark:hover:bg-white/90"
          />

          <UButton
            icon="i-lucide-log-in"
            color="primary"
            size="lg"
            :loading="isSessionLoading"
            @click="emit('start-login')"
          >
            {{ t('login.button') }}
          </UButton>
        </div>
      </template>
    </UPageCTA>
  </UPageSection>
</template>
