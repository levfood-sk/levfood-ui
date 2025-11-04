<!--
  Superfaktura Invoice Generation Test Page

  Test page for creating invoices via Superfaktura REST API.
-->

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
})

// Component state
const loading = ref(false)
const result = ref<any>(null)
const error = ref<string | null>(null)

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

        <!-- Invoice Details -->
        <div v-if="result.invoice" class="bg-slate-50 rounded-lg p-4 space-y-3">
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
