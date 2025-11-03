<script setup lang="ts">
// Use dashboard layout
definePageMeta({
  layout: 'dashboard',
})

// Component state
const loading = ref(false)
const error = ref<string | null>(null)

// Test product details
const testProduct = {
  name: 'Test Product',
  description: 'GoPay Payment Integration Test',
  price: 199, // Price in cents (€1.99)
  priceFormatted: '€1.99',
}

/**
 * Create payment and redirect to GoPay gateway
 * This handler:
 * 1. Calls our API to create a payment in GoPay
 * 2. Receives payment URL from GoPay
 * 3. Redirects user to GoPay payment gateway
 */
const handlePayment = async () => {
  loading.value = true
  error.value = null

  try {
    // Call our API to create payment
    const response = await $fetch('/api/payments/create', {
      method: 'POST',
      body: {
        amount: testProduct.price,
        description: testProduct.description,
      },
    })

    // Log payment creation for debugging
    console.log('Payment created:', response)

    // Redirect to GoPay payment gateway
    if (response.paymentUrl) {
      // Use window.location to redirect to external GoPay URL
      window.location.href = response.paymentUrl
    } else {
      throw new Error('Payment URL not received from server')
    }
  } catch (e: any) {
    // Handle and display error
    console.error('Payment creation error:', e)
    error.value = e.data?.message || e.message || 'Failed to create payment'
    loading.value = false
  }
  // Note: loading.value stays true during redirect
}
</script>

<template>
  <div class="max-w-4xl">
    <!-- Page Header -->
    <div class="mb-8">
      <h2 class="text-3xl font-bold text-slate-900">GoPay Payment Test</h2>
    </div>

    <!-- Information Card -->
    <UCard class="mb-6">
      <div class="space-y-3">
        <div class="flex items-start gap-3">
          <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <p class="font-medium text-slate-900">Sandbox Mode</p>
            <p class="text-sm text-slate-600 mt-1">
              This integration uses GoPay's sandbox environment. No real money will be charged.
            </p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <UIcon name="i-heroicons-credit-card" class="w-5 h-5 text-green-500 mt-0.5" />
          <div>
            <p class="font-medium text-slate-900">Test Cards</p>
            <p class="text-sm text-slate-600 mt-1">
              Use card number <code class="px-1.5 py-0.5 bg-slate-100 rounded text-xs">4111111111111111</code>
              with any future expiry date and CVC to test successful payment.
            </p>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Product Card -->
    <UCard>
      <template #header>
        <h3 class="text-xl font-semibold text-slate-900">Test Product</h3>
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
            <p class="text-xs text-slate-500 mt-1">Including VAT</p>
          </div>
        </div>

        <!-- Error Alert -->
        <UAlert
          v-if="error"
          color="error"
          variant="soft"
          :title="error"
          :close-button="{ icon: 'i-heroicons-x-mark-20-solid', color: 'gray', variant: 'link' }"
          @close="error = null"
        />

        <!-- Payment Button -->
        <div class="flex flex-col gap-3">
          <UButton
            color="primary"
            size="xl"
            :loading="loading"
            :disabled="loading"
            @click="handlePayment"
            class="w-full justify-center"
          >
            <template #leading>
              <UIcon name="i-heroicons-credit-card" class="w-5 h-5" />
            </template>
            {{ loading ? 'Creating Payment...' : 'Pay with GoPay' }}
          </UButton>

          <p class="text-xs text-center text-slate-500">
            You will be redirected to GoPay's secure payment gateway
          </p>
        </div>

        <!-- Payment Flow Info -->
        <div class="pt-6 border-t border-gray-200">
          <p class="text-sm font-medium text-slate-900 mb-3">Testing payment Flow:</p>
          <ol class="space-y-2 text-sm text-slate-600">
            <li class="flex items-start gap-2">
              <span class="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-medium">1</span>
              <span>Click "Pay with GoPay" button to create payment</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-medium">2</span>
              <span>You'll be redirected to GoPay's payment gateway</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-medium">3</span>
              <span>Enter test card details and complete payment</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-medium">4</span>
              <span>Return to our site to see payment result</span>
            </li>
          </ol>
        </div>
      </div>
    </UCard>
  </div>
</template>
