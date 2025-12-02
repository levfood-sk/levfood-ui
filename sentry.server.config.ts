import * as Sentry from "@sentry/nuxt";
 
Sentry.init({
  dsn: "https://fae0dc01abe4c960541b48fcb223cb69@o4506667891032064.ingest.us.sentry.io/4510396598190080",

  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending of user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nuxt/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
