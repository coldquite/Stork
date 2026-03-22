import * as Sentry from '@sentry/nuxt'

const isProduction = process.env.NODE_ENV === 'production'

Sentry.init({
  // If set up, you can use your runtime config here
  // dsn: useRuntimeConfig().public.sentry.dsn,
  dsn: isProduction ? 'https://9eec3fe8af3ead18786c1052d7f55d1b@sentry.ksi.fit.cvut.cz/18' : undefined,
  enabled: isProduction,

  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: isProduction ? 1.0 : 0,

  profilesSampleRate: isProduction ? 1.0 : 0,

  tracePropagationTargets: ['localhost', /^\/api\//, /^https:\/\/cap\.ksi\.in\.fit\.cvut\.cz\/api/],

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: isProduction ? 0.1 : 0,

  // If the entire session is not sampled, use the below sample rate to sample
  // sessions when an error occurs.
  replaysOnErrorSampleRate: isProduction ? 1.0 : 0,

  integrations: [Sentry.browserTracingIntegration(), Sentry.browserProfilingIntegration(), Sentry.replayIntegration()],

  initialScope: {
    tags: {
      runtime: 'client'
    }
  },

  // Enable logs to be sent to Sentry
  enableLogs: isProduction,

  // Enable sending of user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nuxt/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false
})
