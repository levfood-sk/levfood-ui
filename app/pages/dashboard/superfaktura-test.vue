<!--
  Superfaktura Invoice Generation Test Page

  Test page for creating invoices via Superfaktura REST API.
-->

<script setup lang="ts">
import type { PackageType, DurationType } from '~/lib/types/order'

definePageMeta({
  layout: 'dashboard',
})

// Component state
const loading = ref(false)
const result = ref<any>(null)
const error = ref<string | null>(null)

// Package options for select
const packageOptions = [
  { label: 'EKONOMY', value: 'EKONOMY' },
  { label: 'ŠTANDARD (10% zľava)', value: 'ŠTANDARD' },
  { label: 'PREMIUM (10% zľava)', value: 'PREMIUM' },
  { label: 'OFFICE', value: 'OFFICE' },
]

const durationOptions = [
  { label: '5 dní (20 dní celkom)', value: '5' },
  { label: '6 dní (24 dní celkom)', value: '6' },
]

// Original prices BEFORE 10% discount (matching webhook.post.ts)
// Superfaktura applies the discount to get the final price
const ORIGINAL_PRICES: Record<PackageType, Record<DurationType, number>> = {
  'EKONOMY': { '5': 29900, '6': 33900 },
  'ŠTANDARD': { '5': 35900, '6': 39900 }, // 359→323, 399→359 after 10%
  'PREMIUM': { '5': 41900, '6': 45900 },  // 419→377, 459→413 after 10%
  'OFFICE': { '5': 24900, '6': 24900 },
}

// Final prices after discount (what customer pays) - rounded values
const FINAL_PRICES: Record<PackageType, Record<DurationType, number>> = {
  'EKONOMY': { '5': 29900, '6': 33900 },
  'ŠTANDARD': { '5': 32300, '6': 35900 }, // 359*0.9=323.1→323, 399*0.9=359.1→359
  'PREMIUM': { '5': 37700, '6': 41300 },  // 419*0.9=377.1→377, 459*0.9=413.1→413
  'OFFICE': { '5': 24900, '6': 24900 },
}

// Form data for package invoice creation
const packageForm = reactive({
  package: 'ŠTANDARD' as PackageType,
  duration: '5' as DurationType,
  clientName: 'Test Klient - Package',
  clientEmail: 'test@levfood.sk',
})

// Computed pricing info
const pricingInfo = computed(() => {
  const pkg = packageForm.package
  const dur = packageForm.duration
  const hasDiscount = pkg === 'ŠTANDARD' || pkg === 'PREMIUM'
  const originalPrice = ORIGINAL_PRICES[pkg][dur] / 100
  const finalPrice = FINAL_PRICES[pkg][dur] / 100
  const daysCount = dur === '5' ? 20 : 24

  return {
    hasDiscount,
    originalPrice,
    finalPrice,
    discountAmount: hasDiscount ? originalPrice - finalPrice : 0,
    daysCount,
  }
})

// Form data for manual invoice creation
const manualForm = reactive({
  clientName: 'Martin Hrasko',
  clientEmail: 'martinhrasko@tester.com',
  clientIco: '12345678',
  itemName: 'SuperBalik #2',
  itemDescription: 'Chutný SuperBalik #2',
  itemPrice: 100,
  itemTax: 20,
  currency: 'EUR',
})

// Form data for Stripe payment invoice
const stripeForm = reactive({
  paymentIntentId: '',
  customerName: '',
  customerEmail: '',
})

/**
 * Create package-based invoice
 */
const createPackageInvoice = async () => {
  loading.value = true
  error.value = null
  result.value = null

  try {
    const response = await $fetch('/api/test/superfaktura-package', {
      method: 'POST',
      body: {
        package: packageForm.package,
        duration: packageForm.duration,
        clientName: packageForm.clientName,
        clientEmail: packageForm.clientEmail,
      },
    })

    result.value = response
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Failed to create package invoice'
    console.error('Package invoice creation error:', e)
  } finally {
    loading.value = false
  }
}

/**
 * Download PDF from base64
 */
const downloadPdf = () => {
  if (!result.value?.invoicePdf) return

  const byteCharacters = atob(result.value.invoicePdf)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: 'application/pdf' })

  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `faktura-${result.value.invoiceNumber || result.value.invoiceId}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * Create manual invoice
 */
const createManualInvoice = async () => {
  loading.value = true
  error.value = null
  result.value = null

  try {
    const response = await $fetch('/api/superfaktura/create-invoice', {
      method: 'POST',
      body: {
        client: {
          name: manualForm.clientName,
          email: manualForm.clientEmail,
          ico: manualForm.clientIco,
        },
        items: [
          {
            name: manualForm.itemName,
            description: manualForm.itemDescription,
            unit_price: manualForm.itemPrice,
            tax: manualForm.itemTax,
            quantity: 1,
          },
        ],
        invoice: {
          currency: manualForm.currency,
          name: 'Test Invoice',
        },
      },
    })

    result.value = response
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Failed to create invoice'
    console.error('Invoice creation error:', e)
  } finally {
    loading.value = false
  }
}

/**
 * Create invoice from Stripe payment
 */
const createFromStripe = async () => {
  loading.value = true
  error.value = null
  result.value = null

  try {
    const response = await $fetch('/api/superfaktura/create-from-stripe', {
      method: 'POST',
      body: {
        paymentIntentId: stripeForm.paymentIntentId,
        customerData: {
          name: stripeForm.customerName || undefined,
          email: stripeForm.customerEmail || undefined,
        },
      },
    })

    result.value = response
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Failed to create invoice from Stripe'
    console.error('Stripe invoice creation error:', e)
  } finally {
    loading.value = false
  }
}

/**
 * Clear results
 */
const clearResults = () => {
  result.value = null
  error.value = null
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-slate-900">Superfaktura Test</h1>
        <p class="text-slate-600 mt-1">Test invoice generation via REST API</p>
      </div>
    </div>

    <!-- Package Invoice Test - NEW SECTION -->
    <UCard class="border-2 border-primary-200 bg-primary-50/30">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-cube" class="w-5 h-5 text-primary-500" />
          <h3 class="text-lg font-semibold">Package Invoice Test</h3>
          <UBadge color="primary" variant="soft">Debug Tool</UBadge>
        </div>
      </template>

      <form @submit.prevent="createPackageInvoice" class="space-y-4">
        <UAlert
          icon="i-heroicons-information-circle"
          color="info"
          variant="soft"
          title="Package Invoice Testing"
          description="Select a package and duration to create a test invoice with the same pricing logic as the production webhook."
        />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Package *</label>
            <USelect
              v-model="packageForm.package"
              :items="packageOptions"
              placeholder="Select package"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Duration *</label>
            <USelect
              v-model="packageForm.duration"
              :items="durationOptions"
              placeholder="Select duration"
            />
          </div>
        </div>

        <!-- Pricing Preview -->
        <div class="bg-white rounded-lg p-4 border border-slate-200">
          <h4 class="text-sm font-semibold text-slate-700 mb-3">Price Preview</h4>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p class="text-slate-500">Original Price</p>
              <p class="text-lg font-bold text-slate-900">{{ pricingInfo.originalPrice }}€</p>
            </div>
            <div v-if="pricingInfo.hasDiscount">
              <p class="text-slate-500">Discount (10%)</p>
              <p class="text-lg font-bold text-error-600">-{{ pricingInfo.discountAmount.toFixed(2) }}€</p>
            </div>
            <div>
              <p class="text-slate-500">Final Price</p>
              <p class="text-lg font-bold text-success-600">{{ pricingInfo.finalPrice }}€</p>
            </div>
            <div>
              <p class="text-slate-500">Days</p>
              <p class="text-lg font-bold text-slate-900">{{ pricingInfo.daysCount }} dní</p>
            </div>
          </div>
          <p v-if="pricingInfo.hasDiscount" class="mt-2 text-xs text-amber-600">
            ⚠️ ŠTANDARD and PREMIUM packages have 10% discount applied on invoice
          </p>
        </div>

        <UDivider label="Optional Client Data" />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Client Name</label>
            <UInput
              v-model="packageForm.clientName"
              placeholder="Test Client"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Client Email</label>
            <UInput
              v-model="packageForm.clientEmail"
              type="email"
              placeholder="test@levfood.sk"
            />
          </div>
        </div>

        <UButton
          type="submit"
          color="primary"
          block
          :loading="loading"
          :disabled="loading"
          icon="i-heroicons-document-plus"
        >
          Create Package Invoice
        </UButton>
      </form>
    </UCard>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Manual Invoice Creation -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-document-text" class="w-5 h-5 text-primary-500" />
            <h3 class="text-lg font-semibold">Create Manual Invoice</h3>
          </div>
        </template>

        <form @submit.prevent="createManualInvoice" class="space-y-4">
          <!-- Client Details -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Client Name *</label>
            <UInput
              v-model="manualForm.clientName"
              placeholder="Company Name"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Client Email</label>
            <UInput
              v-model="manualForm.clientEmail"
              type="email"
              placeholder="client@example.com"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">IČO (Company ID)</label>
            <UInput
              v-model="manualForm.clientIco"
              placeholder="12345678"
            />
          </div>

          <UDivider label="Invoice Item" />

          <!-- Item Details -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Item Name *</label>
            <UInput
              v-model="manualForm.itemName"
              placeholder="Product/Service name"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <UTextarea
              v-model="manualForm.itemDescription"
              placeholder="Item description"
              :rows="2"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Unit Price (€) *</label>
              <UInput
                v-model.number="manualForm.itemPrice"
                type="number"
                step="0.01"
                min="0"
                required
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Tax (%) *</label>
              <UInput
                v-model.number="manualForm.itemTax"
                type="number"
                min="0"
                max="100"
                required
              />
            </div>
          </div>

          <UButton
            type="submit"
            color="primary"
            block
            :loading="loading"
            :disabled="loading"
          >
            Create Invoice
          </UButton>
        </form>
      </UCard>

      <!-- Stripe Payment Invoice -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-credit-card" class="w-5 h-5 text-primary-500" />
            <h3 class="text-lg font-semibold">Create from Stripe Payment</h3>
          </div>
        </template>

        <form @submit.prevent="createFromStripe" class="space-y-4">
          <UAlert
            icon="i-heroicons-information-circle"
            color="primary"
            variant="soft"
            title="Payment Intent Required"
            description="First create a test payment in Stripe Test page, then copy the Payment Intent ID here."
          />

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Payment Intent ID *</label>
            <UInput
              v-model="stripeForm.paymentIntentId"
              placeholder="pi_xxxxxxxxxxxxx"
              required
            />
          </div>

          <UDivider label="Optional Customer Data" />

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Customer Name</label>
            <UInput
              v-model="stripeForm.customerName"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Customer Email</label>
            <UInput
              v-model="stripeForm.customerEmail"
              type="email"
              placeholder="customer@example.com"
            />
          </div>

          <div class="flex gap-2">
            <UButton
              type="submit"
              color="primary"
              class="flex-1"
              :loading="loading"
              :disabled="loading"
            >
              Create Invoice
            </UButton>
            <UButton
              color="neutral"
              variant="soft"
              to="/dashboard/stripe-test"
            >
              Stripe Test
            </UButton>
          </div>
        </form>
      </UCard>
    </div>

    <!-- Results Card -->
    <UCard v-if="result || error">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon
              :name="error ? 'i-heroicons-x-circle' : 'i-heroicons-check-circle'"
              class="w-5 h-5"
              :class="error ? 'text-error-500' : 'text-success-500'"
            />
            <h3 class="text-lg font-semibold">
              {{ error ? 'Error' : 'Success' }}
            </h3>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-heroicons-x-mark"
            @click="clearResults"
          />
        </div>
      </template>

      <!-- Error Message -->
      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        :title="error"
        icon="i-heroicons-exclamation-triangle"
      />

      <!-- Success Result -->
      <div v-else-if="result" class="space-y-4">
        <UAlert
          color="success"
          variant="soft"
          title="Invoice created successfully!"
          icon="i-heroicons-check-circle"
        />

        <!-- Package Invoice Details -->
        <div v-if="result.pricing" class="bg-slate-50 rounded-lg p-4 space-y-3">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p class="text-sm font-medium text-slate-500">Invoice Number</p>
              <p class="text-lg font-semibold text-slate-900">
                {{ result.invoiceNumber || result.invoiceId }}
              </p>
            </div>
            <div>
              <p class="text-sm font-medium text-slate-500">Package</p>
              <p class="text-lg font-semibold text-slate-900">
                {{ result.package }}
              </p>
            </div>
            <div>
              <p class="text-sm font-medium text-slate-500">Unit Price (on invoice)</p>
              <p class="text-lg font-semibold text-slate-900">
                {{ result.pricing.unitPriceOnInvoice }}€
              </p>
            </div>
            <div>
              <p class="text-sm font-medium text-slate-500">Expected Final</p>
              <p class="text-lg font-semibold text-success-600">
                {{ result.pricing.expectedFinalPrice }}€
              </p>
            </div>
          </div>

          <div v-if="result.pricing.hasDiscount" class="mt-2 p-2 bg-amber-50 rounded border border-amber-200">
            <p class="text-sm text-amber-800">
              <strong>Discount Applied:</strong> {{ result.pricing.discountPercent }}%
              ({{ result.pricing.originalPrice }}€ → {{ result.pricing.expectedFinalPrice }}€)
            </p>
          </div>

          <!-- PDF Download Button -->
          <div v-if="result.hasPdf" class="pt-3 border-t border-slate-200">
            <UButton
              color="primary"
              variant="soft"
              icon="i-heroicons-arrow-down-tray"
              @click="downloadPdf"
            >
              Download Invoice PDF
            </UButton>
            <p class="text-xs text-slate-500 mt-1">PDF size: {{ (result.pdfSize / 1024).toFixed(1) }} KB</p>
          </div>
        </div>

        <!-- Standard Invoice Details (for manual/stripe invoices) -->
        <div v-else-if="result.invoice" class="bg-slate-50 rounded-lg p-4 space-y-3">
          <div v-if="result.invoice.Invoice">
            <p class="text-sm font-medium text-slate-500">Invoice Number</p>
            <p class="text-lg font-semibold text-slate-900">
              {{ result.invoice.Invoice.invoice_no_formatted || result.invoice.Invoice.id }}
            </p>
          </div>

          <div v-if="result.invoice.Invoice">
            <p class="text-sm font-medium text-slate-500">Invoice ID</p>
            <p class="text-sm font-mono text-slate-900">
              {{ result.invoice.Invoice.id }}
            </p>
          </div>

          <div v-if="result.paymentIntent">
            <p class="text-sm font-medium text-slate-500">Payment Intent ID</p>
            <p class="text-sm font-mono text-slate-900">
              {{ result.paymentIntent.id }}
            </p>
          </div>
        </div>

        <!-- Raw Response -->
        <UAccordion :items="[{ label: 'View Raw Response', slot: 'raw' }]">
          <template #raw>
            <pre class="text-xs bg-slate-900 text-slate-100 p-4 rounded overflow-auto max-h-96">{{ JSON.stringify(result, null, 2) }}</pre>
          </template>
        </UAccordion>
      </div>
    </UCard>
  </div>
</template>
