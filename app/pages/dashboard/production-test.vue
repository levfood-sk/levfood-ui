<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
})

const activeTab = ref(0)

const tabs = [{
  label: 'Full Integration',
  icon: 'i-lucide-workflow',
}, {
  label: 'Stripe',
  icon: 'i-lucide-credit-card',
}, {
  label: 'Superfaktura',
  icon: 'i-lucide-file-text',
}, {
  label: 'Email',
  icon: 'i-lucide-mail',
}]

// Stripe test state
const stripeLoading = ref(false)
const stripeResult = ref<any>(null)
const stripeError = ref<string | null>(null)
const { stripe } = useClientStripe()
const stripeClientSecret = ref<string | null>(null)
const stripeElements = ref<any>(null)
const stripePaymentElement = ref<any>(null)

// Superfaktura test state
const superfakturaLoading = ref(false)
const superfakturaResult = ref<any>(null)
const superfakturaError = ref<string | null>(null)

// Email test state
const emailLoading = ref(false)
const emailResult = ref<any>(null)
const emailError = ref<string | null>(null)
const emailRecipient = ref('')
const includeAttachment = ref(false)

// Full integration test state
const fullIntegrationLoading = ref(false)
const fullIntegrationResult = ref<any>(null)
const fullIntegrationError = ref<string | null>(null)
const fullIntegrationEmail = ref('')

// Initialize Stripe payment element when client secret is available
watch([stripe, stripeClientSecret], async () => {
  if (stripe.value && stripeClientSecret.value && !stripePaymentElement.value) {
    try {
      await nextTick()

      const container = document.getElementById('stripe-payment-element')
      if (!container) {
        console.error('Payment element container not found')
        return
      }

      stripeElements.value = stripe.value.elements({
        clientSecret: stripeClientSecret.value,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#f97316',
            borderRadius: '8px',
          },
        },
      })

      stripePaymentElement.value = stripeElements.value.create('payment', {
        layout: 'tabs',
      })

      stripePaymentElement.value.mount('#stripe-payment-element')
    } catch (e: any) {
      console.error('Stripe Elements error:', e)
      stripeError.value = 'Failed to load payment form'
    }
  }
})

// Test Stripe payment
async function testStripe() {
  stripeLoading.value = true
  stripeError.value = null
  stripeResult.value = null

  try {
    // Create payment intent
    const response = await $fetch('/api/test/stripe-production', {
      method: 'POST',
    })

    stripeClientSecret.value = response.clientSecret
    stripeResult.value = {
      paymentIntentId: response.paymentIntentId,
      amount: response.amount,
      currency: response.currency,
      status: 'Payment form loaded. Complete payment below.',
    }
  } catch (e: any) {
    stripeError.value = e.data?.message || e.message || 'Failed to create payment intent'
  } finally {
    stripeLoading.value = false
  }
}

// Complete Stripe payment
async function completeStripePayment() {
  if (!stripe.value || !stripeElements.value) {
    stripeError.value = 'Payment system not ready'
    return
  }

  stripeLoading.value = true
  stripeError.value = null

  try {
    const { error: submitError, paymentIntent } = await stripe.value.confirmPayment({
      elements: stripeElements.value,
      redirect: 'if_required',
    })

    if (submitError) {
      stripeError.value = submitError.message || 'Payment failed'
      return
    }

    if (paymentIntent && paymentIntent.status === 'succeeded') {
      stripeResult.value = {
        ...stripeResult.value,
        status: 'succeeded',
        paymentIntentId: paymentIntent.id,
        message: '✅ Payment completed successfully!',
      }
    }
  } catch (e: any) {
    stripeError.value = e.message || 'Payment processing failed'
  } finally {
    stripeLoading.value = false
  }
}

// Test Superfaktura
async function testSuperfaktura() {
  superfakturaLoading.value = true
  superfakturaError.value = null
  superfakturaResult.value = null

  try {
    const response = await $fetch<any>('/api/test/superfaktura-production', {
      method: 'POST',
    })

    superfakturaResult.value = response

    // Download PDF if available
    if (response.invoicePdf && response.invoiceNumber) {
      const pdfBlob = new Blob(
        [Uint8Array.from(atob(response.invoicePdf), c => c.charCodeAt(0))],
        { type: 'application/pdf' }
      )
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Test-Invoice-${response.invoiceNumber}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    }
  } catch (e: any) {
    superfakturaError.value = e.data?.message || e.message || 'Failed to create invoice'
  } finally {
    superfakturaLoading.value = false
  }
}

// Test Email
async function testEmail() {
  if (!emailRecipient.value) {
    emailError.value = 'Please enter recipient email'
    return
  }

  emailLoading.value = true
  emailError.value = null
  emailResult.value = null

  try {
    const response = await $fetch('/api/test/email-production', {
      method: 'POST',
      body: {
        to: emailRecipient.value,
        includeAttachment: includeAttachment.value,
        pdfBase64: includeAttachment.value && superfakturaResult.value?.invoicePdf
          ? superfakturaResult.value.invoicePdf
          : undefined,
      },
    })

    emailResult.value = response
  } catch (e: any) {
    emailError.value = e.data?.message || e.message || 'Failed to send email'
  } finally {
    emailLoading.value = false
  }
}

// Test Full Integration
async function testFullIntegration() {
  if (!fullIntegrationEmail.value) {
    fullIntegrationError.value = 'Please enter email address'
    return
  }

  fullIntegrationLoading.value = true
  fullIntegrationError.value = null
  fullIntegrationResult.value = null

  try {
    const response = await $fetch('/api/test/full-integration', {
      method: 'POST',
      body: {
        email: fullIntegrationEmail.value,
      },
    })

    fullIntegrationResult.value = response
  } catch (e: any) {
    fullIntegrationError.value = e.data?.message || e.message || 'Integration test failed'
  } finally {
    fullIntegrationLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Production Integration Testing</h1>
        <p class="text-sm text-gray-600 mt-1">Test Stripe, Superfaktura, and Email integrations with production credentials</p>
      </div>
    </div>

    <!-- Warning Banner -->
    <UAlert
      icon="i-lucide-alert-triangle"
      color="warning"
      variant="soft"
      title="Production Testing"
      description="These tests use PRODUCTION credentials. Stripe tests charge 1 cent (€0.01). Superfaktura creates real invoices."
    />

    <!-- Tabs -->
    <UTabs v-model="activeTab" :items="tabs" class="w-full">
      <!-- Full Integration Tab -->
      <template #content="{ item }">
        <div v-if="item.label === 'Full Integration'" class="pt-4 space-y-4">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold">Full Integration Test</h3>
                <UBadge color="primary" variant="soft">Complete Workflow</UBadge>
              </div>
            </template>

            <div class="space-y-4">
              <p class="text-sm text-gray-600">
                Tests complete production workflow: Stripe payment (€0.01) → Superfaktura invoice → Email with PDF attachment
              </p>

              <UFormField label="Recipient Email" required>
                <UInput
                  v-model="fullIntegrationEmail"
                  type="email"
                  placeholder="your-email@example.com"
                  size="lg"
                />
              </UFormField>

              <UButton
                @click="testFullIntegration"
                :loading="fullIntegrationLoading"
                :disabled="!fullIntegrationEmail"
                size="lg"
                color="primary"
                block
              >
                Run Full Integration Test
              </UButton>

              <!-- Error -->
              <UAlert
                v-if="fullIntegrationError"
                icon="i-lucide-x-circle"
                color="error"
                variant="soft"
                :title="fullIntegrationError"
              />

              <!-- Results -->
              <div v-if="fullIntegrationResult" class="space-y-4">
                <UAlert
                  v-if="fullIntegrationResult.success"
                  icon="i-lucide-check-circle"
                  color="success"
                  variant="soft"
                  title="All tests passed!"
                  description="Full integration test completed successfully"
                />
                <UAlert
                  v-else
                  icon="i-lucide-x-circle"
                  color="error"
                  variant="soft"
                  title="Test failed"
                  :description="fullIntegrationResult.error"
                />

                <!-- Logs -->
                <UCard>
                  <template #header>
                    <h4 class="font-semibold">Test Logs</h4>
                  </template>
                  <div class="space-y-1 font-mono text-xs max-h-96 overflow-y-auto">
                    <div v-for="(log, index) in fullIntegrationResult.logs" :key="index" class="text-gray-700">
                      {{ log }}
                    </div>
                  </div>
                </UCard>

                <!-- Results Details -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <UCard>
                    <template #header>
                      <div class="flex items-center gap-2">
                        <UIcon name="i-lucide-credit-card" class="w-4 h-4" />
                        <span class="font-semibold">Stripe</span>
                      </div>
                    </template>
                    <div v-if="fullIntegrationResult.results?.stripe" class="text-sm space-y-1">
                      <div><strong>ID:</strong> <span class="text-xs">{{ fullIntegrationResult.results.stripe.paymentIntentId }}</span></div>
                      <div><strong>Status:</strong> {{ fullIntegrationResult.results.stripe.status }}</div>
                    </div>
                  </UCard>

                  <UCard>
                    <template #header>
                      <div class="flex items-center gap-2">
                        <UIcon name="i-lucide-file-text" class="w-4 h-4" />
                        <span class="font-semibold">Superfaktura</span>
                      </div>
                    </template>
                    <div v-if="fullIntegrationResult.results?.superfaktura" class="text-sm space-y-1">
                      <div><strong>Number:</strong> {{ fullIntegrationResult.results.superfaktura.invoiceNumber }}</div>
                      <div><strong>PDF:</strong> {{ Math.round(fullIntegrationResult.results.superfaktura.pdfSize / 1024) }}KB</div>
                    </div>
                  </UCard>

                  <UCard>
                    <template #header>
                      <div class="flex items-center gap-2">
                        <UIcon name="i-lucide-mail" class="w-4 h-4" />
                        <span class="font-semibold">Email</span>
                      </div>
                    </template>
                    <div v-if="fullIntegrationResult.results?.email" class="text-sm space-y-1">
                      <div><strong>To:</strong> {{ fullIntegrationResult.results.email.to }}</div>
                      <div v-if="fullIntegrationResult.results.email.messageId"><strong>ID:</strong> <span class="text-xs">{{ fullIntegrationResult.results.email.messageId.substring(0, 20) }}...</span></div>
                    </div>
                  </UCard>
                </div>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Stripe Tab -->
        <div v-else-if="item.label === 'Stripe'" class="pt-4 space-y-4">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold">Stripe Payment Test</h3>
                <UBadge color="primary" variant="soft">€0.01</UBadge>
              </div>
            </template>

            <div class="space-y-4">
              <p class="text-sm text-gray-600">
                Create and complete a 1 cent payment using production Stripe credentials
              </p>

              <UButton
                v-if="!stripeClientSecret"
                @click="testStripe"
                :loading="stripeLoading"
                size="lg"
                color="primary"
                block
              >
                Create Payment Intent
              </UButton>

              <!-- Error -->
              <UAlert
                v-if="stripeError"
                icon="i-lucide-x-circle"
                color="error"
                variant="soft"
                :title="stripeError"
              />

              <!-- Payment Form -->
              <div v-if="stripeClientSecret" class="space-y-4">
                <UAlert
                  icon="i-lucide-check-circle"
                  color="success"
                  variant="soft"
                  title="Payment intent created"
                  :description="`ID: ${stripeResult?.paymentIntentId}`"
                />

                <div class="bg-white rounded-lg border p-6">
                  <div id="stripe-payment-element" class="min-h-[200px]"></div>
                </div>

                <UButton
                  @click="completeStripePayment"
                  :loading="stripeLoading"
                  size="lg"
                  color="primary"
                  block
                >
                  Complete Payment (€0.01)
                </UButton>

                <UAlert
                  v-if="stripeResult?.status === 'succeeded'"
                  icon="i-lucide-check-circle"
                  color="success"
                  variant="soft"
                  title="Payment successful!"
                  :description="`Payment ID: ${stripeResult.paymentIntentId}`"
                />
              </div>
            </div>
          </UCard>
        </div>

        <!-- Superfaktura Tab -->
        <div v-else-if="item.label === 'Superfaktura'" class="pt-4 space-y-4">
          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">Superfaktura Invoice Test</h3>
            </template>

            <div class="space-y-4">
              <p class="text-sm text-gray-600">
                Create a test invoice (€0.01) in production Superfaktura and download PDF
              </p>

              <UButton
                @click="testSuperfaktura"
                :loading="superfakturaLoading"
                size="lg"
                color="primary"
                block
              >
                Create Test Invoice
              </UButton>

              <!-- Error -->
              <UAlert
                v-if="superfakturaError"
                icon="i-lucide-x-circle"
                color="error"
                variant="soft"
                :title="superfakturaError"
              />

              <!-- Results -->
              <div v-if="superfakturaResult" class="space-y-4">
                <UAlert
                  icon="i-lucide-check-circle"
                  color="success"
                  variant="soft"
                  title="Invoice created successfully!"
                />

                <UCard>
                  <div class="space-y-2 text-sm">
                    <div><strong>Invoice Number:</strong> {{ superfakturaResult.invoiceNumber }}</div>
                    <div><strong>Invoice ID:</strong> {{ superfakturaResult.invoiceId }}</div>
                    <div><strong>PDF Size:</strong> {{ Math.round(superfakturaResult.pdfSize / 1024) }}KB</div>
                    <div><strong>PDF Downloaded:</strong> {{ superfakturaResult.hasPdf ? 'Yes ✅' : 'No ❌' }}</div>
                  </div>
                </UCard>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Email Tab -->
        <div v-else-if="item.label === 'Email'" class="pt-4 space-y-4">
          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">Email Test</h3>
            </template>

            <div class="space-y-4">
              <p class="text-sm text-gray-600">
                Send a test email using production SMTP with optional PDF attachment
              </p>

              <UFormField label="Recipient Email" required>
                <UInput
                  v-model="emailRecipient"
                  type="email"
                  placeholder="your-email@example.com"
                  size="lg"
                />
              </UFormField>

              <UFormField>
                <UCheckbox
                  v-model="includeAttachment"
                  label="Include PDF attachment (requires Superfaktura test first)"
                  :disabled="!superfakturaResult?.invoicePdf"
                />
              </UFormField>

              <UButton
                @click="testEmail"
                :loading="emailLoading"
                :disabled="!emailRecipient"
                size="lg"
                color="primary"
                block
              >
                Send Test Email
              </UButton>

              <!-- Error -->
              <UAlert
                v-if="emailError"
                icon="i-lucide-x-circle"
                color="error"
                variant="soft"
                :title="emailError"
              />

              <!-- Results -->
              <div v-if="emailResult" class="space-y-4">
                <UAlert
                  v-if="emailResult.success"
                  icon="i-lucide-check-circle"
                  color="success"
                  variant="soft"
                  title="Email sent successfully!"
                />
                <UAlert
                  v-else
                  icon="i-lucide-x-circle"
                  color="error"
                  variant="soft"
                  title="Email failed"
                  :description="emailResult.error"
                />

                <UCard v-if="emailResult.success">
                  <div class="space-y-2 text-sm">
                    <div><strong>To:</strong> {{ emailResult.to }}</div>
                    <div v-if="emailResult.messageId"><strong>Message ID:</strong> {{ emailResult.messageId }}</div>
                    <div><strong>Has Attachment:</strong> {{ emailResult.hasAttachment ? 'Yes ✅' : 'No ❌' }}</div>
                  </div>
                </UCard>
              </div>
            </div>
          </UCard>
        </div>
      </template>
    </UTabs>
  </div>
</template>
