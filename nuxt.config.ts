// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxt/icon', '@unlok-co/nuxt-stripe'],
  css: ['~/assets/css/main.css'],

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
      appUrl: process.env.APP_URL || 'http://localhost:3000',
    },
    firebaseServiceAccount: process.env.FIREBASE_SERVICE_ACCOUNT,
    goPayClientId: process.env.GOPAY_CLIENT_ID,
    goPayClientSecret: process.env.GOPAY_CLIENT_SECRET,
    goPayMerchantId: process.env.GOPAY_MERCHANT_ID,
    goPayIsProduction: process.env.GOPAY_IS_PRODUCTION || 'false',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    superfakturaEmail: process.env.SUPERFAKTURA_EMAIL,
    superfakturaApiKey: process.env.SUPERFAKTURA_API_KEY,
    superfakturaCompanyId: process.env.SUPERFAKTURA_COMPANY_ID,
    superfakturaIsSandbox: process.env.SUPERFAKTURA_IS_SANDBOX || 'true',
  }
})