// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";
import svgLoader from "vite-svg-loader";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  modules: [
    "@nuxt/eslint",
    "@nuxt/ui",
    "@nuxt/icon",
    "@unlok-co/nuxt-stripe",
    "@nuxt/scripts",
    "@sentry/nuxt/module",
  ],

  css: ["~/assets/css/main.css"],

  ui: {
    colorMode: false,
  },

  // Google Analytics configuration
  scripts: {
    registry: {
      googleAnalytics: {
        id: process.env.GOOGLE_ANALYTICS_ID || "",
      },
    },
  },

  // App metadata
  app: {
    head: {
      title: "Levfood Web",
      meta: [
        { name: "description", content: "Levfood web & Admin Panel" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
      ],
    },
  },

  // Route rules for specific paths
  routeRules: {
    // Disable strict COOP for client auth pages to allow Firebase OAuth popup
    "/client/**": {
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      },
    },
    // Client login page (moved from /client/login to /login)
    "/login": {
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      },
    },
  },

  // Stripe configuration
  stripe: {
    server: {
      key: process.env.STRIPE_SECRET_KEY,
    },
    client: {
      key: process.env.STRIPE_PUBLIC_KEY,
    },
  },

  vite: {
    plugins: [
      tailwindcss(),
      svgLoader({
        defaultImport: "url", // Default import without query is treated as URL
      }),
    ],
  },

  runtimeConfig: {
    public: {
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID,
      firebaseVapidKey: process.env.FIREBASE_VAPID_KEY,
      appUrl: process.env.APP_URL || "http://localhost:3000",
      googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID,
      enableTestingFeatures: process.env.ENABLE_TESTING_FEATURES === "true",
    },
    firebaseServiceAccount: process.env.FIREBASE_SERVICE_ACCOUNT,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    superfakturaEmail: process.env.SUPERFAKTURA_EMAIL,
    superfakturaApiKey: process.env.SUPERFAKTURA_API_KEY,
    superfakturaCompanyId: process.env.SUPERFAKTURA_COMPANY_ID,
    superfakturaIsSandbox: process.env.SUPERFAKTURA_IS_SANDBOX || "true",
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT || "587",
    smtpUser: process.env.SMTP_USER,
    smtpPassword: process.env.SMTP_PASSWORD,
    smtpFromEmail: process.env.SMTP_FROM_EMAIL,
    smtpFromName: process.env.SMTP_FROM_NAME || "LevFood",
    smtpSecure: process.env.SMTP_SECURE || "false",

    adminNotificationEmails: process.env.ADMIN_NOTIFICATION_EMAIL
      ? process.env.ADMIN_NOTIFICATION_EMAIL.split(",").map((email) =>
          email.trim(),
        )
      : ["info@levfood.sk"],
  },

  sentry: {
    org: "martin-kocisek",
    project: "levfood",
  },

  sourcemap: {
    client: "hidden",
  },
});