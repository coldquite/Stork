// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@pinia/nuxt', '@nuxtjs/i18n'],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2025-01-15',
  typescript: {
    typeCheck: true
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },
  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'cs',
    detectBrowserLanguage: false,
    langDir: 'locales',
    locales: [{ code: 'cs', name: 'Čeština', language: 'cs-CZ', file: 'cs.json' }]
  },
  pinia: {
    storesDirs: ['app/stores/**']
  }
})
