<!--
  Stripe Payment Success Page

  This page shows after a successful payment is completed.
  Stripe redirects here with payment_intent parameter.
-->

<script setup lang="ts">
// Get Stripe client
const { stripe } = useClientStripe()
const route = useRoute()

// Component state
const loading = ref(true)
const error = ref<string | null>(null)
const paymentIntent = ref<any>(null)

/**
 * Retrieve payment intent details from Stripe
 */
const retrievePaymentIntent = async () => {
  const clientSecret = route.query.payment_intent_client_secret as string

  if (!clientSecret) {
    error.value = 'No payment information found'
    loading.value = false
    return
  }

  // Wait for Stripe to be ready
  if (!stripe.value) {
    await new Promise(resolve => {
      const unwatch = watch(stripe, (newStripe) => {
        if (newStripe) {
          unwatch()
          resolve(true)
        }
      })
    })
  }

  try {
    // Retrieve payment intent from Stripe
    const { paymentIntent: pi, error: retrieveError } = await stripe.value!.retrievePaymentIntent(clientSecret)

    if (retrieveError) {
      error.value = retrieveError.message || 'Failed to retrieve payment'
      return
    }

    paymentIntent.value = pi
    console.log('Payment intent retrieved:', pi)
  } catch (e: any) {
    console.error('Payment retrieval error:', e)
    error.value = 'Failed to verify payment'
  } finally {
    loading.value = false
  }
}

/**
 * Format amount from cents to dollars
 */
const formatAmount = (amount: number): string => {
  return `$${(amount / 100).toFixed(2)}`
}

/**
 * Get user-friendly status message
 */
const getStatusMessage = (status: string): string => {
  const messages: Record<string, string> = {
    'succeeded': 'Payment completed successfully!',
    'processing': 'Payment is being processed',
    'requires_payment_method': 'Payment requires a payment method',
    'requires_confirmation': 'Payment requires confirmation',
    'requires_action': 'Payment requires additional action',
    'canceled': 'Payment was canceled',
  }
  return messages[status] || `Payment status: ${status}`
}

// Retrieve payment on mount
onMounted(() => {
  retrievePaymentIntent()
})
</script>

<template>
  <div class="min-h-screen bg-gradient-professional flex items-center justify-center px-4">
    <div class="max-w-lg w-full">
      <!-- Loading State -->
      <UCard v-if="loading">
        <div class="flex flex-col items-center justify-center py-12">
          <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 text-primary-500 animate-spin mb-4" />
          <p class="text-lg font-medium text-slate-900">Verifying payment...</p>
          <p class="text-sm text-slate-600 mt-2">Please wait while we confirm your payment</p>
        </div>
      </UCard>

      <!-- Error State -->
      <UCard v-else-if="error">
        <div class="flex flex-col items-center justify-center py-12">
          <div class="w-16 h-16 rounded-full bg-error-100 flex items-center justify-center mb-4">
            <UIcon name="i-heroicons-x-mark" class="w-10 h-10 text-error-600" />
          </div>
          <h2 class="text-2xl font-bold text-slate-900 mb-2">Error</h2>
          <p class="text-slate-600 text-center mb-6">{{ error }}</p>
          <UButton
            color="primary"
            to="/dashboard/stripe-test"
          >
            Try Again
          </UButton>
        </div>
      </UCard>

      <!-- Success State -->
      <UCard v-else-if="paymentIntent && paymentIntent.status === 'succeeded'">
        <div class="flex flex-col items-center justify-center py-12">
          <!-- Success Icon -->
          <div class="w-16 h-16 rounded-full bg-success-100 flex items-center justify-center mb-4">
            <UIcon name="i-heroicons-check" class="w-10 h-10 text-success-600" />
          </div>

          <!-- Success Message -->
          <h2 class="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h2>
          <p class="text-slate-600 text-center mb-8">
            {{ getStatusMessage(paymentIntent.status) }}
          </p>

          <!-- Payment Details -->
          <div class="w-full space-y-4 mb-8">
            <div class="flex justify-between items-center py-3 border-b border-gray-200">
              <span class="text-sm font-medium text-slate-500">Amount</span>
              <span class="text-lg font-bold text-slate-900">{{ formatAmount(paymentIntent.amount) }}</span>
            </div>
            <div class="flex justify-between items-center py-3 border-b border-gray-200">
              <span class="text-sm font-medium text-slate-500">Currency</span>
              <span class="text-sm text-slate-900 uppercase">{{ paymentIntent.currency }}</span>
            </div>
            <div class="flex justify-between items-center py-3 border-b border-gray-200">
              <span class="text-sm font-medium text-slate-500">Payment ID</span>
              <span class="text-sm text-slate-900 font-mono">{{ paymentIntent.id }}</span>
            </div>
            <div v-if="paymentIntent.payment_method" class="flex justify-between items-center py-3 border-b border-gray-200">
              <span class="text-sm font-medium text-slate-500">Method</span>
              <span class="text-sm text-slate-900 capitalize">{{ paymentIntent.payment_method }}</span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3 w-full">
            <UButton
              color="primary"
              to="/dashboard"
              class="flex-1"
            >
              Back to Dashboard
            </UButton>
            <UButton
              color="neutral"
              variant="soft"
              to="/dashboard/stripe-test"
              class="flex-1"
            >
              Test Again
            </UButton>
          </div>
        </div>
      </UCard>

      <!-- Other Status State -->
      <UCard v-else-if="paymentIntent">
        <div class="flex flex-col items-center justify-center py-12">
          <!-- Warning Icon -->
          <div class="w-16 h-16 rounded-full bg-warning-100 flex items-center justify-center mb-4">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-10 h-10 text-warning-600" />
          </div>

          <!-- Status Message -->
          <h2 class="text-2xl font-bold text-slate-900 mb-2">Payment Status</h2>
          <p class="text-slate-600 text-center mb-8">
            {{ getStatusMessage(paymentIntent.status) }}
          </p>

          <!-- Payment Details -->
          <div class="w-full space-y-4 mb-8">
            <div class="flex justify-between items-center py-3 border-b border-gray-200">
              <span class="text-sm font-medium text-slate-500">Status</span>
              <span class="text-sm font-semibold text-warning-700 capitalize">{{ paymentIntent.status }}</span>
            </div>
            <div class="flex justify-between items-center py-3 border-b border-gray-200">
              <span class="text-sm font-medium text-slate-500">Payment ID</span>
              <span class="text-sm text-slate-900 font-mono">{{ paymentIntent.id }}</span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3 w-full">
            <UButton
              color="primary"
              to="/dashboard/stripe-test"
              class="flex-1"
            >
              Try Again
            </UButton>
            <UButton
              color="neutral"
              variant="soft"
              to="/dashboard"
              class="flex-1"
            >
              Back to Dashboard
            </UButton>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
