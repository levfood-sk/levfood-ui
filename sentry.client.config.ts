import * as Sentry from "@sentry/nuxt";

// Only initialize Sentry in production
if (process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn: "https://7d59d0a3531672ef42367fda212aa0bf@o4506667891032064.ingest.us.sentry.io/4510666175741952",

    // Environment tag for filtering in Sentry dashboard
    environment: "production",

    // Session Replay for debugging user interactions
    integrations: [Sentry.replayIntegration()],

    // Capture 10% of sessions, 100% of sessions with errors
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Disable performance tracing (error tracking only)
    tracesSampleRate: 0,
  });
}
