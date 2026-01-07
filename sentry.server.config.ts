import * as Sentry from "@sentry/nuxt";

// Only initialize Sentry in production to avoid noise from development
if (process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn: "https://7d59d0a3531672ef42367fda212aa0bf@o4506667891032064.ingest.us.sentry.io/4510666175741952",

    // Environment tag for filtering in Sentry dashboard
    environment: "production",

    // Capture 100% of errors (adjust if high volume causes issues)
    sampleRate: 1.0,

    // Disable performance tracing (error tracking only as requested)
    tracesSampleRate: 0,

    // Disable logs (error tracking only)
    enableLogs: false,

    // Enable sending of request headers and IP for debugging context
    // https://docs.sentry.io/platforms/javascript/guides/nuxt/configuration/options/#sendDefaultPii
    sendDefaultPii: true,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
  });
}
