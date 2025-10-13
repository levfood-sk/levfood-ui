<!--
  Stripe Test Page

  This page demonstrates Stripe payment integration with:
  - Payment Elements (embedded payment form)
  - Test product ($1.99)
  - Secure server-side payment intent creation
  - Real-time payment status
  - Production-ready implementation

  Uses Stripe TEST mode for safe testing.
-->

<script setup lang="ts">
// Use dashboard layout
definePageMeta({
  layout: 'dashboard',
})

// Get Stripe client instance
const { stripe } = useClientStripe()

// Component state
const loading = ref(false)
const processing = ref(false)
const error = ref<string | null>(null)
const success = ref(false)
const clientSecret = ref<string | null>(null)
const paymentIntentId = ref<string | null>(null)

// Stripe Elements instances
const elements = ref<any>(null)
const paymentElement = ref<any>(null)

// Test product details
const testProduct = {
  name: 'Test Product',
  description: 'Stripe Payment Integration Test',
  price: 199, // Price in cents ($1.99)
  priceFormatted: '$1.99',
}

/**
 * Initialize payment - creates payment intent and loads Stripe Elements
 */
const initializePayment = async () => {
  loading.value = true
  error.value = null

  try {
    // Call server endpoint to create payment intent
    const response = await $fetch('/api/stripe/create-payment-intent', {
      method: 'POST',
      body: {
        amount: testProduct.price,
        currency: 'usd',
        description: testProduct.description,
      },
    })

    clientSecret.value = response.clientSecret
    paymentIntentId.value = response.paymentIntentId

    console.log('Payment intent created:', paymentIntentId.value)
  } catch (e: any) {
    console.error('Payment initialization error:', e)
    error.value = e.data?.message || e.message || 'Failed to initialize payment'
  } finally {
    loading.value = false
  }
}

/**
 * Initialize Stripe Elements when stripe and clientSecret are ready
 */
watch([stripe, clientSecret], async () => {
  if (stripe.value && clientSecret.value) {
    try {
      // Create Elements instance with client secret
      elements.value = stripe.value.elements({
        clientSecret: clientSecret.value,
        appearance: {
          theme: 'stripe', // Use Stripe's default theme
          variables: {
            colorPrimary: '#6366f1', // Primary color (indigo)
            colorBackground: '#ffffff',
            colorText: '#1e293b',
            colorDanger: '#ef4444',
            fontFamily: 'system-ui, sans-serif',
            borderRadius: '8px',
          },
        },
      })

      // Create and mount Payment Element
      paymentElement.value = elements.value.create('payment', {
        layout: 'tabs', // Show payment methods as tabs
      })

      // Mount to DOM (wait for next tick to ensure element exists)
      await nextTick()
      const container = document.getElementById('payment-element')
      if (container) {
        paymentElement.value.mount('#payment-element')
      }
    } catch (e: any) {
      console.error('Elements initialization error:', e)
      error.value = 'Failed to load payment form'
    }
  }
})

/**
 * Handle payment submission
 */
const handleSubmit = async () => {
  if (!stripe.value || !elements.value) {
    error.value = 'Payment system not ready'
    return
  }

  processing.value = true
  error.value = null

  try {
    // Confirm payment with Stripe
    const { error: submitError } = await stripe.value.confirmPayment({
      elements: elements.value,
      confirmParams: {
        return_url: `${window.location.origin}/stripe/success`,
      },
    })

    if (submitError) {
      // Show error to customer (e.g., insufficient funds)
      error.value = submitError.message || 'Payment failed'
      processing.value = false
    }
    // If no error, Stripe will redirect to return_url
  } catch (e: any) {
    console.error('Payment confirmation error:', e)
    error.value = 'Payment processing failed'
    processing.value = false
  }
}

// Initialize payment on mount
onMounted(() => {
  initializePayment()
})
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <!-- Page Header -->
    <div class="mb-8">
      <h2 class="text-3xl font-bold text-slate-900">Stripe Payment Test</h2>
      <p class="text-slate-600 mt-2">
        Test Stripe payment integration in test mode
      </p>
    </div>

    <!-- Information Card -->
    <UCard class="mb-6">
      <div class="space-y-3">
        <div class="flex items-start gap-3">
          <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p class="font-medium text-slate-900">Test Mode</p>
            <p class="text-sm text-slate-600 mt-1">
              This integration uses Stripe's test environment. No real money will be charged.
            </p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <UIcon name="i-heroicons-credit-card" class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
          <div>
            <p class="font-medium text-slate-900">Test Cards</p>
            <p class="text-sm text-slate-600 mt-1">
              Use card number <code class="px-1.5 py-0.5 bg-slate-100 rounded text-xs">4242 4242 4242 4242</code>
              with any future expiry date and any 3-digit CVC.
            </p>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Product and Payment Card -->
    <UCard>
      <template #header>
        <h3 class="text-xl font-semibold text-slate-900">Checkout</h3>
      </template>

      <div class="space-y-6">
        <!-- Product Details -->
        <div class="flex items-center justify-between pb-6 border-b border-gray-200">
          <div>
            <h4 class="text-lg font-medium text-slate-900">{{ testProduct.name }}</h4>
            <p class="text-sm text-slate-600 mt-1">{{ testProduct.description }}</p>
          </div>
          <div class="text-right">
            <p class="text-2xl font-bold text-slate-900">{{ testProduct.priceFormatted }}</p>
            <p class="text-xs text-slate-500 mt-1">USD</p>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex flex-col items-center justify-center py-12">
          <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 text-primary-500 animate-spin mb-4" />
          <p class="text-sm text-slate-600">Initializing payment...</p>
        </div>

        <!-- Error Alert -->
        <UAlert
          v-if="error && !loading"
          color="error"
          variant="soft"
          :title="error"
          :close-button="{ icon: 'i-heroicons-x-mark-20-solid', color: 'gray', variant: 'link' }"
          @close="error = null"
        />

        <!-- Payment Form -->
        <div v-if="clientSecret && !loading" class="space-y-6">
          <!-- Stripe Payment Element Container -->
          <div id="payment-element" class="min-h-[200px]"></div>

          <!-- Submit Button -->
          <UButton
            color="primary"
            size="xl"
            :loading="processing"
            :disabled="processing || loading"
            @click="handleSubmit"
            class="w-full justify-center"
            block
          >
            <template #leading>
              <UIcon name="i-heroicons-lock-closed" class="w-5 h-5" />
            </template>
            {{ processing ? 'Processing...' : `Pay ${testProduct.priceFormatted}` }}
          </UButton>

          <p class="text-xs text-center text-slate-500">
            Secured by Stripe. Your payment information is encrypted.
          </p>
        </div>

        <!-- Payment Instructions -->
        <div v-if="!loading" class="pt-6 border-t border-gray-200">
          <p class="text-sm font-medium text-slate-900 mb-3">How to Test:</p>
          <ol class="space-y-2 text-sm text-slate-600">
            <li class="flex items-start gap-2">
              <span class="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-medium">1</span>
              <span>Enter test card number: 4242 4242 4242 4242</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-medium">2</span>
              <span>Use any future expiry date (e.g., 12/34)</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-medium">3</span>
              <span>Enter any 3-digit CVC (e.g., 123)</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-medium">4</span>
              <span>Click "Pay" button to complete test payment</span>
            </li>
          </ol>
        </div>
      </div>
    </UCard>
  </div>
</template>
