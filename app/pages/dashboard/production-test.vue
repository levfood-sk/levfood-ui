<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
})

const activeTab = ref(0)

const tabs = [{
  label: 'Auto-výber jedál',
  icon: 'i-lucide-utensils',
}, {
  label: 'Stripe',
  icon: 'i-lucide-credit-card',
}, {
  label: 'Superfaktura',
  icon: 'i-lucide-file-text',
}, {
  label: 'Email',
  icon: 'i-lucide-mail',
}, {
  label: 'Migrácia',
  icon: 'i-lucide-database',
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
const emailType = ref<'smtp' | 'client'>('smtp')
const includeAttachment = ref(false)
const clientEmailName = ref('')
const clientEmailOrderId = ref('')

// Auto-fill meal selections state
interface AutoFillClient {
  clientId: string
  clientName: string
  email: string
  orderId: string
  packageTier: string
}

interface DateResult {
  date: string
  clientsToFill: number
  clientsFilled: number
  clients: AutoFillClient[]
}

interface AutoFillResult {
  success: boolean
  dateFrom: string
  dateTo: string
  dryRun: boolean
  totalClientsToFill: number
  totalClientsFilled: number
  byDate: DateResult[]
  errors?: Array<{
    clientId: string
    date: string
    error: string
  }>
}

const autoFillLoading = ref(false)
const autoFillResult = ref<AutoFillResult | null>(null)
const autoFillError = ref<string | null>(null)
const autoFillDateFrom = ref('')
const autoFillDateTo = ref('')
const autoFillDryRun = ref(true)

// Migration state
const migrationLoading = ref(false)
const migrationResult = ref<any>(null)
const migrationError = ref<string | null>(null)
const migrationDryRun = ref(true)

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

// Auto-fill meal selections function
async function runAutoFill() {
  autoFillLoading.value = true
  autoFillError.value = null
  autoFillResult.value = null

  try {
    const response = await useAuthFetch<AutoFillResult>('/api/admin/auto-fill-meals', {
      method: 'POST',
      body: {
        dateFrom: autoFillDateFrom.value || undefined,
        dateTo: autoFillDateTo.value || undefined,
        dryRun: autoFillDryRun.value,
      },
    })

    autoFillResult.value = response
  } catch (e: any) {
    autoFillError.value = e.data?.message || e.message || 'Nepodarilo sa načítať klientov'
  } finally {
    autoFillLoading.value = false
  }
}

// Helper to format date as YYYY-MM-DD
function formatDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Set default date range (3 days before cutoff to cutoff)
function setDefaultDateRange() {
  // Calculate first modifiable date (4-5 days ahead based on current day)
  const now = new Date()
  const dayOfWeek = now.getDay()
  const daysToAdd: Record<number, number> = {
    0: 4, // Sunday -> Thursday
    1: 4, // Monday -> Friday
    2: 4, // Tuesday -> Saturday
    3: 5, // Wednesday -> Monday
    4: 5, // Thursday -> Tuesday
    5: 5, // Friday -> Wednesday
    6: 5, // Saturday -> Thursday
  }

  const cutoffDate = new Date(now)
  cutoffDate.setDate(cutoffDate.getDate() + (daysToAdd[dayOfWeek] || 4))

  // Set range: 3 days before cutoff to cutoff
  const fromDate = new Date(cutoffDate)
  fromDate.setDate(fromDate.getDate() - 3)

  autoFillDateFrom.value = formatDateYYYYMMDD(fromDate)
  autoFillDateTo.value = formatDateYYYYMMDD(cutoffDate)
}

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
    emailError.value = 'Prosím zadajte email príjemcu'
    return
  }

  // Validate client email fields
  if (emailType.value === 'client') {
    if (!clientEmailName.value) {
      emailError.value = 'Prosím zadajte meno klienta'
      return
    }
    if (!clientEmailOrderId.value) {
      emailError.value = 'Prosím zadajte číslo objednávky'
      return
    }
  }

  emailLoading.value = true
  emailError.value = null
  emailResult.value = null

  try {
    let response

    if (emailType.value === 'client') {
      // Send client order confirmation email
      response = await $fetch('/api/test/client-email-production', {
        method: 'POST',
        body: {
          to: emailRecipient.value,
          clientName: clientEmailName.value,
          orderId: clientEmailOrderId.value,
          includeInvoice: includeAttachment.value,
          invoicePdfBase64: includeAttachment.value && superfakturaResult.value?.invoicePdf
            ? superfakturaResult.value.invoicePdf
            : undefined,
        },
      })
    } else {
      // Send generic SMTP test email
      response = await $fetch('/api/test/email-production', {
        method: 'POST',
        body: {
          to: emailRecipient.value,
          includeAttachment: includeAttachment.value,
          pdfBase64: includeAttachment.value && superfakturaResult.value?.invoicePdf
            ? superfakturaResult.value.invoicePdf
            : undefined,
        },
      })
    }

    emailResult.value = response
  } catch (e: any) {
    emailError.value = e.data?.message || e.message || 'Nepodarilo sa odoslať email'
  } finally {
    emailLoading.value = false
  }
}

// Run account status migration
async function runMigration() {
  migrationLoading.value = true
  migrationError.value = null
  migrationResult.value = null

  try {
    const response = await $fetch('/api/test/migrate-account-status', {
      method: 'POST',
      body: {
        dryRun: migrationDryRun.value,
      },
    })

    migrationResult.value = response
  } catch (e: any) {
    migrationError.value = e.data?.message || e.message || 'Migrácia zlyhala'
  } finally {
    migrationLoading.value = false
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
      <!-- Auto-fill Meal Selections Tab -->
      <template #content="{ item }">
        <div v-if="item.label === 'Auto-výber jedál'" class="pt-4 space-y-4">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold">Auto-výber jedál pre klientov</h3>
                <UBadge :color="autoFillDryRun ? 'warning' : 'primary'" variant="soft">
                  {{ autoFillDryRun ? 'Náhľad' : 'Ostrý režim' }}
                </UBadge>
              </div>
            </template>

            <div class="space-y-4">
              <p class="text-sm text-gray-600">
                Automaticky vyplní výber A pre raňajky aj obed pre klientov, ktorí si ešte nevybrali.
                Táto funkcia bude v budúcnosti spúšťaná automaticky cez cron job.
              </p>

              <div class="flex gap-4 items-end flex-wrap">
                <UFormField label="Od" class="flex-1 min-w-[140px]">
                  <UInput
                    v-model="autoFillDateFrom"
                    type="date"
                    size="lg"
                  />
                </UFormField>
                <UFormField label="Do" class="flex-1 min-w-[140px]">
                  <UInput
                    v-model="autoFillDateTo"
                    type="date"
                    size="lg"
                  />
                </UFormField>
                <UButton
                  @click="setDefaultDateRange"
                  variant="outline"
                  size="lg"
                >
                  Predvolený rozsah
                </UButton>
              </div>

              <UFormField>
                <UCheckbox
                  v-model="autoFillDryRun"
                  label="Dry Run (iba náhľad, žiadne zmeny)"
                />
              </UFormField>

              <UButton
                @click="runAutoFill"
                :loading="autoFillLoading"
                size="lg"
                :color="autoFillDryRun ? 'primary' : 'warning'"
                block
              >
                {{ autoFillDryRun ? 'Načítať klientov bez výberu' : 'Vyplniť výber A pre všetkých' }}
              </UButton>

              <!-- Error -->
              <UAlert
                v-if="autoFillError"
                icon="i-lucide-x-circle"
                color="error"
                variant="soft"
                :title="autoFillError"
              />

              <!-- Results -->
              <div v-if="autoFillResult" class="space-y-4">
                <UAlert
                  v-if="autoFillResult.dryRun && autoFillResult.totalClientsToFill === 0"
                  icon="i-lucide-check-circle"
                  color="success"
                  variant="soft"
                  title="Všetci klienti už majú výber!"
                  :description="`Pre rozsah ${autoFillResult.dateFrom} - ${autoFillResult.dateTo} nie sú žiadni klienti bez výberu.`"
                />
                <UAlert
                  v-else-if="autoFillResult.dryRun"
                  icon="i-lucide-alert-circle"
                  color="warning"
                  variant="soft"
                  :title="`Nájdených ${autoFillResult.totalClientsToFill} klientov bez výberu`"
                  :description="`Toto bol iba náhľad. Odškrtnite 'Dry Run' a spustite znova pre aplikovanie zmien.`"
                />
                <UAlert
                  v-else-if="autoFillResult.success"
                  icon="i-lucide-check-circle"
                  color="success"
                  variant="soft"
                  :title="`Úspešne vyplnených ${autoFillResult.totalClientsFilled} klientov`"
                  :description="`Výber A bol nastavený pre raňajky aj obed.`"
                />
                <UAlert
                  v-else
                  icon="i-lucide-x-circle"
                  color="error"
                  variant="soft"
                  title="Vyplnenie zlyhalo"
                  :description="`Vyplnených: ${autoFillResult.totalClientsFilled}/${autoFillResult.totalClientsToFill}`"
                />

                <!-- Results by date -->
                <div v-for="dateResult in autoFillResult.byDate" :key="dateResult.date" class="space-y-2">
                  <UCard v-if="dateResult.clients.length > 0">
                    <template #header>
                      <h4 class="font-semibold">
                        {{ dateResult.date }} - {{ dateResult.clients.length }} {{ autoFillResult.dryRun ? 'na vyplnenie' : 'vyplnených' }}
                      </h4>
                    </template>
                    <div class="overflow-x-auto">
                      <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                          <tr>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Klient</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Balíček</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                          <tr v-for="client in dateResult.clients" :key="client.clientId">
                            <td class="px-4 py-2 text-sm">{{ client.clientName }}</td>
                            <td class="px-4 py-2 text-sm text-gray-600">{{ client.email }}</td>
                            <td class="px-4 py-2 text-sm">
                              <UBadge variant="soft" color="neutral">{{ client.packageTier }}</UBadge>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </UCard>
                </div>

                <!-- Errors list -->
                <UCard v-if="autoFillResult.errors && autoFillResult.errors.length > 0">
                  <template #header>
                    <h4 class="font-semibold text-red-600">Chyby ({{ autoFillResult.errors.length }})</h4>
                  </template>
                  <div class="space-y-1 font-mono text-xs max-h-64 overflow-y-auto text-red-600">
                    <div v-for="(err, idx) in autoFillResult.errors" :key="idx">
                      {{ err.date }} - {{ err.clientId }}: {{ err.error }}
                    </div>
                  </div>
                </UCard>
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
                Odošlite testovací email pomocou produkčného SMTP
              </p>

              <UFormField label="Typ emailu">
                <URadioGroup
                  v-model="emailType"
                  :items="[
                    { value: 'smtp', label: 'Generic SMTP Test', description: 'Jednoduchý testovací email' },
                    { value: 'client', label: 'Klientský email', description: 'Email s potvrdením objednávky (ako dostane klient)' },
                  ]"
                  variant="table"
                  color="orange"
                />
              </UFormField>

              <UFormField label="Email príjemcu" required>
                <UInput
                  v-model="emailRecipient"
                  type="email"
                  placeholder="vas-email@example.com"
                  size="lg"
                />
              </UFormField>

              <!-- Client email specific fields -->
              <div v-if="emailType === 'client'" class="space-y-4 p-4 bg-orange/10 rounded-lg border border-orange/20">
                <UFormField label="Meno klienta" required>
                  <UInput
                    v-model="clientEmailName"
                    type="text"
                    placeholder="Ján Novák"
                    size="lg"
                  />
                </UFormField>

                <UFormField label="Číslo objednávky" required>
                  <UInput
                    v-model="clientEmailOrderId"
                    type="text"
                    placeholder="123456"
                    size="lg"
                  />
                </UFormField>
              </div>

              <UFormField>
                <UCheckbox
                  v-model="includeAttachment"
                  :label="emailType === 'client' ? 'Priložiť faktúru PDF (vyžaduje najprv Superfaktura test)' : 'Priložiť PDF (vyžaduje najprv Superfaktura test)'"
                  :disabled="!superfakturaResult?.invoicePdf"
                />
              </UFormField>

              <UButton
                @click="testEmail"
                :loading="emailLoading"
                :disabled="!emailRecipient || (emailType === 'client' && (!clientEmailName || !clientEmailOrderId))"
                size="lg"
                color="primary"
                block
              >
                {{ emailType === 'client' ? 'Odoslať email klientovi' : 'Odoslať testovací email' }}
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

        <!-- Migrácia Tab -->
        <div v-else-if="item.label === 'Migrácia'" class="pt-4 space-y-4">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold">Migrácia accountStatus</h3>
                <UBadge :color="migrationDryRun ? 'warning' : 'error'" variant="soft">
                  {{ migrationDryRun ? 'Dry Run' : 'Ostrá migrácia' }}
                </UBadge>
              </div>
            </template>

            <div class="space-y-4">
              <p class="text-sm text-gray-600">
                Nájde všetkých klientov s firebaseUid (prepojení cez mobilnú appku), ktorí majú accountStatus iný ako 'aktívny', a nastaví im status na 'aktívny'.
              </p>

              <UAlert
                icon="i-lucide-info"
                color="info"
                variant="soft"
                title="Prečo je to potrebné?"
                description="Predtým endpoint link-account nenastavoval accountStatus na 'aktívny'. Táto migrácia opraví existujúcich klientov."
              />

              <UFormField>
                <UCheckbox
                  v-model="migrationDryRun"
                  label="Dry Run (iba náhľad, žiadne zmeny)"
                />
              </UFormField>

              <UButton
                @click="runMigration"
                :loading="migrationLoading"
                size="lg"
                :color="migrationDryRun ? 'primary' : 'error'"
                block
              >
                {{ migrationDryRun ? 'Spustiť náhľad' : 'Spustiť migráciu' }}
              </UButton>

              <!-- Error -->
              <UAlert
                v-if="migrationError"
                icon="i-lucide-x-circle"
                color="error"
                variant="soft"
                :title="migrationError"
              />

              <!-- Results -->
              <div v-if="migrationResult" class="space-y-4">
                <UAlert
                  v-if="migrationResult.success && migrationResult.clientsNeedingUpdate === 0"
                  icon="i-lucide-check-circle"
                  color="success"
                  variant="soft"
                  title="Všetci klienti sú už aktívni!"
                  description="Žiadni klienti nepotrebujú aktualizáciu."
                />
                <UAlert
                  v-else-if="migrationResult.success && migrationResult.dryRun"
                  icon="i-lucide-alert-circle"
                  color="warning"
                  variant="soft"
                  :title="`Nájdených ${migrationResult.clientsNeedingUpdate} klientov na aktualizáciu`"
                  description="Toto bol iba náhľad. Odškrtnite 'Dry Run' a spustite znova pre aplikovanie zmien."
                />
                <UAlert
                  v-else-if="migrationResult.success"
                  icon="i-lucide-check-circle"
                  color="success"
                  variant="soft"
                  :title="`Úspešne aktualizovaných ${migrationResult.clientsUpdated} klientov`"
                />

                <UCard>
                  <template #header>
                    <h4 class="font-semibold">Výsledky migrácie</h4>
                  </template>
                  <div class="space-y-2 text-sm">
                    <div><strong>Dry Run:</strong> {{ migrationResult.dryRun ? 'Áno' : 'Nie' }}</div>
                    <div><strong>Celkovo skontrolovaných:</strong> {{ migrationResult.totalClientsChecked }}</div>
                    <div><strong>Potrebujúcich aktualizáciu:</strong> {{ migrationResult.clientsNeedingUpdate }}</div>
                    <div><strong>Aktualizovaných:</strong> {{ migrationResult.clientsUpdated }}</div>
                    <div><strong>Trvanie:</strong> {{ migrationResult.duration }}ms</div>
                  </div>
                </UCard>

                <!-- List of clients to update -->
                <UCard v-if="migrationResult.updatedClients?.length > 0">
                  <template #header>
                    <h4 class="font-semibold">Klienti {{ migrationResult.dryRun ? 'na aktualizáciu' : 'aktualizovaní' }}</h4>
                  </template>
                  <div class="space-y-1 font-mono text-xs max-h-64 overflow-y-auto">
                    <div v-for="client in migrationResult.updatedClients" :key="client.clientId" class="text-gray-700">
                      {{ client.email }} ({{ client.previousStatus }} → aktívny)
                    </div>
                  </div>
                </UCard>

                <!-- Errors -->
                <UCard v-if="migrationResult.errors?.length > 0">
                  <template #header>
                    <h4 class="font-semibold text-red-600">Chyby</h4>
                  </template>
                  <div class="space-y-1 font-mono text-xs max-h-64 overflow-y-auto text-red-600">
                    <div v-for="err in migrationResult.errors" :key="err.clientId">
                      {{ err.clientId }}: {{ err.error }}
                    </div>
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
