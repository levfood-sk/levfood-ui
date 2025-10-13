<script setup lang="ts">
// Get route to access query parameters
const route = useRoute()

// Component state
const loading = ref(true)
const error = ref<string | null>(null)
const payment = ref<any>(null)

/**
 * Fetch payment status from our API
 * GoPay redirects with 'id' query parameter containing payment ID
 */
const checkPaymentStatus = async () => {
  // Get payment ID from query parameter
  const paymentId = route.query.id

  if (!paymentId) {
    error.value = 'No payment ID provided'
    loading.value = false
    return
  }

  try {
    // Call our API to check payment status
    const response = await $fetch(`/api/payments/${paymentId}/status`, {
      method: 'GET',
    })

    // Store payment details
    payment.value = response.payment

    console.log('Payment status:', response.payment)
  } catch (e: any) {
    console.error('Payment status check error:', e)
    error.value = e.data?.message || e.message || 'Failed to check payment status'
  } finally {
    loading.value = false
  }
}

/**
 * Check if payment was successful
 * GoPay payment state 'PAID' means payment completed
 */
const isPaymentSuccessful = computed(() => {
  return payment.value?.state === 'PAID'
})

/**
 * Get user-friendly payment state description
 */
const getPaymentStateMessage = (state: string): string => {
  const messages: Record<string, string> = {
    'PAID': 'Payment completed successfully',
    'CANCELED': 'Payment was canceled',
    'TIMEOUTED': 'Payment timed out',
    'CREATED': 'Payment is waiting to be processed',
    'PAYMENT_METHOD_CHOSEN': 'Payment method selected',
    'REFUNDED': 'Payment was refunded',
  }
  return messages[state] || `Payment status: ${state}`
}

/**
 * Format amount from cents to euros
 */
const formatAmount = (amount: number): string => {
  return `€${(amount / 100).toFixed(2)}`
}

// Check payment status when component is mounted
onMounted(() => {
  checkPaymentStatus()
})
</script>

<template>
  <div class="min-h-screen bg-gradient-professional flex items-center justify-center px-4">
    <div class="max-w-lg w-full">
      <!-- Loading State -->
      <UCard v-if="loading">
        <div class="flex flex-col items-center justify-center py-12">
          <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 text-primary-500 animate-spin mb-4" />
          <p class="text-lg font-medium text-slate-900">Checking payment status...</p>
          <p class="text-sm text-slate-600 mt-2">Please wait while we verify your payment</p>
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
            to="/dashboard/gopay-test"
          >
            Try Again
          </UButton>
        </div>
      </UCard>

      <!-- Success State -->
      <UCard v-else-if="payment && isPaymentSuccessful">
        <div class="flex flex-col items-center justify-center py-12">
          <!-- Success Icon -->
          <div class="w-16 h-16 rounded-full bg-success-100 flex items-center justify-center mb-4">
            <UIcon name="i-heroicons-check" class="w-10 h-10 text-success-600" />
          </div>

          <!-- Success Message -->
          <h2 class="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h2>
          <p class="text-slate-600 text-center mb-8">
            {{ getPaymentStateMessage(payment.state) }}
          </p>

          <!-- Payment Details -->
          <div class="w-full space-y-4 mb-8">
            <div class="flex justify-between items-center py-3 border-b border-gray-200">
              <span class="text-sm font-medium text-slate-500">Amount</span>
              <span class="text-lg font-bold text-slate-900">{{ formatAmount(payment.amount) }}</span>
            </div>
            <div class="flex justify-between items-center py-3 border-b border-gray-200">
              <span class="text-sm font-medium text-slate-500">Order Number</span>
              <span class="text-sm text-slate-900 font-mono">{{ payment.orderNumber }}</span>
            </div>
            <div class="flex justify-between items-center py-3 border-b border-gray-200">
              <span class="text-sm font-medium text-slate-500">Payment ID</span>
              <span class="text-sm text-slate-900 font-mono">{{ payment.id }}</span>
            </div>
            <div class="flex justify-between items-center py-3 border-b border-gray-200">
              <span class="text-sm font-medium text-slate-500">Currency</span>
              <span class="text-sm text-slate-900">{{ payment.currency }}</span>
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
              to="/dashboard/gopay-test"
              class="flex-1"
            >
              Test Again
            </UButton>
          </div>
        </div>
      </UCard>

      <!-- Failed/Canceled Payment State -->
      <UCard v-else-if="payment">
        <div class="flex flex-col items-center justify-center py-12">
          <!-- Warning Icon -->
          <div class="w-16 h-16 rounded-full bg-warning-100 flex items-center justify-center mb-4">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-10 h-10 text-warning-600" />
          </div>

          <!-- Failed Message -->
          <h2 class="text-2xl font-bold text-slate-900 mb-2">Payment Not Completed</h2>
          <p class="text-slate-600 text-center mb-8">
            {{ getPaymentStateMessage(payment.state) }}
          </p>

          <!-- Payment Details -->
          <div class="w-full space-y-4 mb-8">
            <div class="flex justify-between items-center py-3 border-b border-gray-200">
              <span class="text-sm font-medium text-slate-500">Status</span>
              <span class="text-sm font-semibold text-warning-700">{{ payment.state }}</span>
            </div>
            <div class="flex justify-between items-center py-3 border-b border-gray-200">
              <span class="text-sm font-medium text-slate-500">Order Number</span>
              <span class="text-sm text-slate-900 font-mono">{{ payment.orderNumber }}</span>
            </div>
            <div class="flex justify-between items-center py-3 border-b border-gray-200">
              <span class="text-sm font-medium text-slate-500">Payment ID</span>
              <span class="text-sm text-slate-900 font-mono">{{ payment.id }}</span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3 w-full">
            <UButton
              color="primary"
              to="/dashboard/gopay-test"
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
