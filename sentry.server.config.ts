import * as Sentry from '@sentry/nuxt'

Sentry.init({
  dsn: 'https://9eec3fe8af3ead18786c1052d7f55d1b@sentry.ksi.fit.cvut.cz/18',

  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 1.0,

  initialScope: {
    tags: {
      runtime: 'server'
    }
  },

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending of user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nuxt/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false
})
