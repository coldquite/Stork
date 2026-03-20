import license from 'rollup-plugin-license'
import { buildLicensesReport, generatedLicensesOutputPath } from './non_dependecy_third_party_licenses/licenses-report'

const shouldDisableSentrySourceMapsUpload =
  process.env.CI === 'true' && process.env.SENTRY_DISABLE_SOURCEMAPS_UPLOAD === '1'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@pinia/nuxt', '@nuxtjs/i18n', '@sentry/nuxt/module'],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    fitAuthClientId: '',
    fitAuthClientSecret: '',
    fitAuthTokenUrl: 'https://auth.fit.cvut.cz/oauth/token',
    fitAuthCheckTokenUrl: 'https://auth.fit.cvut.cz/oauth/check_token',
    fitAuthAllowedUsers: '',
    authSessionSecret: '',
    authSessionMaxAgeSeconds: 43200, // 12h
    authSessionAbsoluteMaxAgeSeconds: 604800, // 7d
    authOAuthStateMaxAgeSeconds: 600, // 10m
    public: {
      i18n: {
        baseUrl: 'http://localhost:3000'
      },
      fitAuthRedirectUri: 'http://localhost:3000/api/auth/callback',
      fitAuthAuthorizeUrl: 'https://auth.fit.cvut.cz/oauth/authorize',
      fitAuthScope: 'cvut:umapi:read' // Minimal required scope; recommended by ICT CVUT for this application
    }
  },

  routeRules: {
    '/**': {
      headers: {
        'Document-Policy': 'js-profiling'
      }
    }
  },

  sourcemap: {
    client: 'hidden'
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
    baseUrl: '',
    langDir: 'locales',
    locales: [{ code: 'cs', name: 'Čeština', language: 'cs-CZ', file: 'cs.json' }]
  },

  pinia: {
    storesDirs: ['app/stores/**']
  },

  sentry: {
    org: process.env.SENTRY_ORG ?? 'stork',
    project: process.env.SENTRY_PROJECT ?? 'stork-app',
    sentryUrl: process.env.SENTRY_URL ?? 'https://sentry.ksi.fit.cvut.cz',
    authToken: process.env.SENTRY_AUTH_TOKEN,
    sourcemaps: {
      disable: shouldDisableSentrySourceMapsUpload
    }
  }
})
