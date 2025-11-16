<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
})

const activeTab = ref(0)

const tabs = [{
  label: 'Kompletný test',
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
const fullIntegrationClientSecret = ref<string | null>(null)
const fullIntegrationElements = ref<any>(null)
const fullIntegrationPaymentElement = ref<any>(null)

// Initialize Stripe payment element when client secret is available (Stripe tab)
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
        wallets: {
          applePay: 'auto',
          googlePay: 'auto',
        },
      })

      stripePaymentElement.value.mount('#stripe-payment-element')
    } catch (e: any) {
      console.error('Stripe Elements error:', e)
      stripeError.value = 'Failed to load payment form'
    }
  }
})

// Initialize Stripe payment element for Full Integration tab
watch([stripe, fullIntegrationClientSecret], async () => {
  if (stripe.value && fullIntegrationClientSecret.value && !fullIntegrationPaymentElement.value) {
    try {
      await nextTick()

      const container = document.getElementById('full-integration-payment-element')
      if (!container) {
        console.error('Full integration payment element container not found')
        return
      }

      fullIntegrationElements.value = stripe.value.elements({
        clientSecret: fullIntegrationClientSecret.value,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#f97316',
            borderRadius: '8px',
          },
        },
      })

      fullIntegrationPaymentElement.value = fullIntegrationElements.value.create('payment', {
        layout: 'tabs',
        wallets: {
          applePay: 'auto',
          googlePay: 'auto',
        },
      })

      fullIntegrationPaymentElement.value.mount('#full-integration-payment-element')
    } catch (e: any) {
      console.error('Full integration Stripe Elements error:', e)
      fullIntegrationError.value = 'Nepodarilo sa načítať platobný formulár'
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

// Initialize Full Integration (create payment intent)
async function initializeFullIntegration() {
  if (!fullIntegrationEmail.value) {
    fullIntegrationError.value = 'Prosím zadajte emailovú adresu'
    return
  }

  fullIntegrationLoading.value = true
  fullIntegrationError.value = null
  fullIntegrationResult.value = null

  try {
    // Create Stripe payment intent first
    const response = await $fetch('/api/test/stripe-production', {
      method: 'POST',
    })

    fullIntegrationClientSecret.value = response.clientSecret
  } catch (e: any) {
    fullIntegrationError.value = e.data?.message || e.message || 'Nepodarilo sa inicializovať platbu'
  } finally {
    fullIntegrationLoading.value = false
  }
}

// Complete Full Integration Test (after payment)
async function completeFullIntegration() {
  if (!fullIntegrationElements.value || !fullIntegrationEmail.value) {
    fullIntegrationError.value = 'Prosím zadajte emailovú adresu a dokončite platbu'
    return
  }

  fullIntegrationLoading.value = true
  fullIntegrationError.value = null

  try {
    // Confirm payment
    const { error: stripeError } = await stripe.value!.confirmPayment({
      elements: fullIntegrationElements.value,
      redirect: 'if_required',
    })

    if (stripeError) {
      throw new Error(stripeError.message || 'Platba zlyhala')
    }

    // Run full integration test
    const response = await $fetch('/api/test/full-integration', {
      method: 'POST',
      body: {
        email: fullIntegrationEmail.value,
      },
    })

    fullIntegrationResult.value = response
  } catch (e: any) {
    fullIntegrationError.value = e.data?.message || e.message || 'Integračný test zlyhal'
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
        <h1 class="text-2xl font-bold text-gray-900">Testovanie produkčných integrácií</h1>
        <p class="text-sm text-gray-600 mt-1">Testujte Stripe, Superfaktura a Email integrácie s produkčnými prihlasovacími údajmi</p>
      </div>
    </div>

    <!-- Tabs -->
    <UTabs v-model="activeTab" :items="tabs" class="w-full">
      <!-- Full Integration Tab -->
      <template #content="{ item }">
        <div v-if="item.label === 'Kompletný test'" class="pt-4 space-y-4">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold">Kompletný integračný test</h3>
                <UBadge color="primary" variant="soft">Celý workflow</UBadge>
              </div>
            </template>

            <div class="space-y-4">
              <p class="text-sm text-gray-600">
                Testuje kompletný produkčný workflow: Stripe platba (€0.50) → Superfaktura faktúra → Email s PDF prílohou
              </p>

              <UFormField label="Email príjemcu" required>
                <UInput
                  v-model="fullIntegrationEmail"
                  type="email"
                  placeholder="vas-email@example.com"
                  size="lg"
                />
              </UFormField>

              <!-- Step 1: Initialize Payment -->
              <UButton
                v-if="!fullIntegrationClientSecret"
                @click="initializeFullIntegration"
                :loading="fullIntegrationLoading"
                :disabled="!fullIntegrationEmail"
                size="lg"
                color="primary"
                block
              >
                Inicializovať test
              </UButton>

              <!-- Step 2: Show payment form and complete button -->
              <div v-if="fullIntegrationClientSecret && !fullIntegrationResult" class="space-y-4">
                <div id="full-integration-payment-element" class="p-4 border border-gray-200 rounded-lg"></div>

                <UButton
                  @click="completeFullIntegration"
                  :loading="fullIntegrationLoading"
                  size="lg"
                  color="primary"
                  block
                >
                  Dokončiť platbu a spustiť test
                </UButton>
              </div>

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
                  title="Všetky testy úspešné!"
                  description="Kompletný integračný test bol úspešne dokončený"
                />
                <UAlert
                  v-else
                  icon="i-lucide-x-circle"
                  color="error"
                  variant="soft"
                  title="Test zlyhal"
                  :description="fullIntegrationResult.error"
                />

                <!-- Logs -->
                <UCard>
                  <template #header>
                    <h4 class="font-semibold">Logy testovania</h4>
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
                <h3 class="text-lg font-semibold">Test Stripe platby</h3>
                <UBadge color="primary" variant="soft">€0.50</UBadge>
              </div>
            </template>

            <div class="space-y-4">
              <p class="text-sm text-gray-600">
                Vytvorte a dokončite platbu €0.50 pomocou produkčných Stripe prihlasovacích údajov
              </p>

              <UButton
                v-if="!stripeClientSecret"
                @click="testStripe"
                :loading="stripeLoading"
                size="lg"
                color="primary"
                block
              >
                Vytvoriť platobnú požiadavku
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
                  title="Platobná požiadavka vytvorená"
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
                  Dokončiť platbu (€0.50)
                </UButton>

                <UAlert
                  v-if="stripeResult?.status === 'succeeded'"
                  icon="i-lucide-check-circle"
                  color="success"
                  variant="soft"
                  title="Platba úspešná!"
                  :description="`ID platby: ${stripeResult.paymentIntentId}`"
                />
              </div>
            </div>
          </UCard>
        </div>

        <!-- Superfaktura Tab -->
        <div v-else-if="item.label === 'Superfaktura'" class="pt-4 space-y-4">
          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">Test Superfaktura faktúry</h3>
            </template>

            <div class="space-y-4">
              <p class="text-sm text-gray-600">
                Vytvorte testovaciu faktúru (€0.50) v produkčnej Superfaktúre a stiahnite PDF
              </p>

              <UButton
                @click="testSuperfaktura"
                :loading="superfakturaLoading"
                size="lg"
                color="primary"
                block
              >
                Vytvoriť testovaciu faktúru
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
                  title="Faktúra úspešne vytvorená!"
                />

                <UCard>
                  <div class="space-y-2 text-sm">
                    <div><strong>Číslo faktúry:</strong> {{ superfakturaResult.invoiceNumber }}</div>
                    <div><strong>ID faktúry:</strong> {{ superfakturaResult.invoiceId }}</div>
                    <div><strong>Veľkosť PDF:</strong> {{ Math.round(superfakturaResult.pdfSize / 1024) }}KB</div>
                    <div><strong>PDF stiahnuté:</strong> {{ superfakturaResult.hasPdf ? 'Áno ✅' : 'Nie ❌' }}</div>
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
              <h3 class="text-lg font-semibold">Test emailu</h3>
            </template>

            <div class="space-y-4">
              <p class="text-sm text-gray-600">
                Odošlite testovací email pomocou produkčného SMTP s voliteľnou PDF prílohou
              </p>

              <UFormField label="Email príjemcu" required>
                <UInput
                  v-model="emailRecipient"
                  type="email"
                  placeholder="vas-email@example.com"
                  size="lg"
                />
              </UFormField>

              <UFormField>
                <UCheckbox
                  v-model="includeAttachment"
                  label="Priložiť PDF (vyžaduje najprv Superfaktura test)"
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
                Odoslať testovací email
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
                  title="Email úspešne odoslaný!"
                />
                <UAlert
                  v-else
                  icon="i-lucide-x-circle"
                  color="error"
                  variant="soft"
                  title="Email zlyhal"
                  :description="emailResult.error"
                />

                <UCard v-if="emailResult.success">
                  <div class="space-y-2 text-sm">
                    <div><strong>Komu:</strong> {{ emailResult.to }}</div>
                    <div v-if="emailResult.messageId"><strong>ID správy:</strong> {{ emailResult.messageId }}</div>
                    <div><strong>S prílohou:</strong> {{ emailResult.hasAttachment ? 'Áno ✅' : 'Nie ❌' }}</div>
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
