import license from 'rollup-plugin-license'
import { buildLicensesReport, generatedLicensesOutputPath } from './non_dependecy_third_party_licenses/licenses-report'

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

  vite: {
    plugins: [
      license({
        // Generates a third-party licenses report for the project
        thirdParty: {
          multipleVersions: true,
          output: {
            file: generatedLicensesOutputPath,
            template(dependencies) {
              return buildLicensesReport(dependencies)
            }
          },
          allow: {
            test: '(Apache-2.0 OR MIT OR BSD-2-Clause OR BSD-3-Clause OR ISC OR CC0-1.0 OR 0BSD OR Unlicense)',
            failOnViolation: true
          }
        }
      })
    ]
  },

  typescript: {
    typeCheck: 'build'
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  fonts: {
    provider: 'google',
    families: [
      { name: 'Inter', provider: 'google' },
      { name: 'Roboto', provider: 'google' }
    ],
    defaults: { weights: [400, 500, 700], styles: ['normal', 'italic'] }
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
