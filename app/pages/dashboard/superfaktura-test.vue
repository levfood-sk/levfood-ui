<!--
  Superfaktura Test - Testovacia stránka pre generovanie faktúr
-->

<script setup lang="ts">
import type { PackageType, DurationType } from '~/lib/types/order'
import { PACKAGE_PRICES } from '~/lib/types/order'

definePageMeta({
  layout: 'dashboard',
})

// Component state
const loading = ref(false)
const result = ref<any>(null)
const error = ref<string | null>(null)

// Invoice list state
const invoicesLoading = ref(false)
const invoices = ref<any[]>([])
const invoicesError = ref<string | null>(null)
const deletingId = ref<number | null>(null)

// Package options for select
const packageOptions = [
  { label: 'EKONOMY', value: 'EKONOMY' },
  { label: 'ŠTANDARD', value: 'ŠTANDARD' },
  { label: 'PREMIUM', value: 'PREMIUM' },
  { label: 'OFFICE', value: 'OFFICE' },
]

const durationOptions = [
  { label: '5 dní (20 dní celkom)', value: '5' },
  { label: '6 dní (24 dní celkom)', value: '6' },
]

// Form data for package invoice creation
const packageForm = reactive({
  package: 'ŠTANDARD' as PackageType,
  duration: '5' as DurationType,
  clientName: 'Test Klient',
  clientEmail: 'test@levfood.sk',
})

// Computed pricing info (using single source of truth)
const pricingInfo = computed(() => {
  const pkg = packageForm.package
  const dur = packageForm.duration
  const finalPrice = PACKAGE_PRICES[pkg][dur] / 100
  const daysCount = dur === '5' ? 20 : 24

  return {
    finalPrice,
    daysCount,
  }
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
    error.value = e.data?.message || e.message || 'Nepodarilo sa vytvoriť faktúru'
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
 * Clear results
 */
const clearResults = () => {
  result.value = null
  error.value = null
}

/**
 * Load invoices from Superfaktura
 */
const loadInvoices = async () => {
  invoicesLoading.value = true
  invoicesError.value = null

  try {
    const response = await $fetch('/api/test/superfaktura-invoices')
    invoices.value = Array.isArray(response.invoices) ? response.invoices : []
  } catch (e: any) {
    invoicesError.value = e.data?.message || e.message || 'Nepodarilo sa načítať faktúry'
    console.error('Load invoices error:', e)
  } finally {
    invoicesLoading.value = false
  }
}

/**
 * Delete invoice
 */
const deleteInvoice = async (invoiceId: number) => {
  if (!confirm(`Naozaj chcete vymazať faktúru ${invoiceId}?`)) return

  deletingId.value = invoiceId

  try {
    await $fetch(`/api/test/superfaktura-invoices/${invoiceId}`, {
      method: 'DELETE',
    })
    invoices.value = invoices.value.filter(inv => inv.Invoice?.id !== invoiceId)
  } catch (e: any) {
    alert(e.data?.message || e.message || 'Nepodarilo sa vymazať faktúru')
    console.error('Delete invoice error:', e)
  } finally {
    deletingId.value = null
  }
}

// Load invoices on mount
onMounted(() => {
  loadInvoices()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-slate-900">Test Superfaktura</h1>
        <p class="text-slate-600 mt-1">Testovanie generovania faktúr cez REST API</p>
      </div>
    </div>

    <!-- Package Invoice Test -->
    <UCard class="border-2 border-primary-200 bg-primary-50/30">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-cube" class="w-5 h-5 text-primary-500" />
          <h3 class="text-lg font-semibold">Test faktúry podľa balíka</h3>
          <UBadge color="primary" variant="soft">Debug nástroj</UBadge>
        </div>
      </template>

      <form @submit.prevent="createPackageInvoice" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Balík *</label>
            <USelect
              v-model="packageForm.package"
              :items="packageOptions"
              placeholder="Vyberte balík"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Doba trvania *</label>
            <USelect
              v-model="packageForm.duration"
              :items="durationOptions"
              placeholder="Vyberte dobu trvania"
            />
          </div>
        </div>

        <!-- Pricing Preview -->
        <div class="bg-white rounded-lg p-4 border border-slate-200">
          <h4 class="text-sm font-semibold text-slate-700 mb-3">Náhľad ceny na faktúre</h4>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-slate-500">Cena na faktúre</p>
              <p class="text-lg font-bold text-success-600">{{ pricingInfo.finalPrice }}€</p>
            </div>
            <div>
              <p class="text-slate-500">Počet dní</p>
              <p class="text-lg font-bold text-slate-900">{{ pricingInfo.daysCount }} dní</p>
            </div>
          </div>
        </div>

        <UDivider label="Voliteľné údaje klienta" />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Meno klienta</label>
            <UInput
              v-model="packageForm.clientName"
              placeholder="Test Klient"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Email klienta</label>
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
          Vytvoriť testovaciu faktúru
        </UButton>
      </form>
    </UCard>

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
              {{ error ? 'Chyba' : 'Úspech' }}
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
          title="Faktúra bola úspešne vytvorená!"
          icon="i-heroicons-check-circle"
        />

        <!-- Package Invoice Details -->
        <div v-if="result.pricing" class="bg-slate-50 rounded-lg p-4 space-y-3">
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p class="text-sm font-medium text-slate-500">Číslo faktúry</p>
              <p class="text-lg font-semibold text-slate-900">
                {{ result.invoiceNumber || result.invoiceId }}
              </p>
            </div>
            <div>
              <p class="text-sm font-medium text-slate-500">Balík</p>
              <p class="text-lg font-semibold text-slate-900">
                {{ result.package }}
              </p>
            </div>
            <div>
              <p class="text-sm font-medium text-slate-500">Cena na faktúre</p>
              <p class="text-lg font-semibold text-success-600">
                {{ result.pricing.finalPrice }}€
              </p>
            </div>
          </div>

          <!-- PDF Download Button -->
          <div v-if="result.hasPdf" class="pt-3 border-t border-slate-200">
            <UButton
              color="primary"
              variant="soft"
              icon="i-heroicons-arrow-down-tray"
              @click="downloadPdf"
            >
              Stiahnuť faktúru PDF
            </UButton>
            <p class="text-xs text-slate-500 mt-1">Veľkosť PDF: {{ (result.pdfSize / 1024).toFixed(1) }} KB</p>
          </div>
        </div>

        <!-- Raw Response -->
        <UAccordion :items="[{ label: 'Zobraziť raw odpoveď', slot: 'raw' }]">
          <template #raw>
            <pre class="text-xs bg-slate-900 text-slate-100 p-4 rounded overflow-auto max-h-96">{{ JSON.stringify(result, null, 2) }}</pre>
          </template>
        </UAccordion>
      </div>
    </UCard>

    <!-- Existing Invoices List -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-document-duplicate" class="w-5 h-5 text-primary-500" />
            <h3 class="text-lg font-semibold">Existujúce faktúry</h3>
            <UBadge color="warning" variant="soft">Sandbox/Produkcia</UBadge>
          </div>
          <UButton
            color="neutral"
            variant="soft"
            size="sm"
            icon="i-heroicons-arrow-path"
            :loading="invoicesLoading"
            @click="loadInvoices"
          >
            Obnoviť
          </UButton>
        </div>
      </template>

      <!-- Error -->
      <UAlert
        v-if="invoicesError"
        color="error"
        variant="soft"
        :title="invoicesError"
        icon="i-heroicons-exclamation-triangle"
        class="mb-4"
      />

      <!-- Loading -->
      <div v-if="invoicesLoading" class="flex items-center justify-center py-8">
        <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-primary-500" />
        <span class="ml-2 text-slate-600">Načítavam faktúry...</span>
      </div>

      <!-- Empty state -->
      <div v-else-if="invoices.length === 0" class="text-center py-8 text-slate-500">
        Žiadne faktúry nenájdené
      </div>

      <!-- Invoice Table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-4 py-2 text-left font-medium text-slate-700">ID</th>
              <th class="px-4 py-2 text-left font-medium text-slate-700">Číslo</th>
              <th class="px-4 py-2 text-left font-medium text-slate-700">Názov</th>
              <th class="px-4 py-2 text-left font-medium text-slate-700">Klient</th>
              <th class="px-4 py-2 text-right font-medium text-slate-700">Suma</th>
              <th class="px-4 py-2 text-left font-medium text-slate-700">Vytvorené</th>
              <th class="px-4 py-2 text-center font-medium text-slate-700">Akcie</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="inv in invoices" :key="inv.Invoice?.id" class="hover:bg-slate-50">
              <td class="px-4 py-2 font-mono text-xs">{{ inv.Invoice?.id }}</td>
              <td class="px-4 py-2 font-semibold">{{ inv.Invoice?.invoice_no_formatted }}</td>
              <td class="px-4 py-2">{{ inv.Invoice?.name }}</td>
              <td class="px-4 py-2">{{ inv.Client?.name }}</td>
              <td class="px-4 py-2 text-right font-medium">
                {{ inv.Invoice?.amount }}€
              </td>
              <td class="px-4 py-2 text-slate-600">
                {{ inv.Invoice?.created?.split(' ')[0] }}
              </td>
              <td class="px-4 py-2 text-center">
                <UButton
                  color="error"
                  variant="soft"
                  size="xs"
                  icon="i-heroicons-trash"
                  :loading="deletingId === inv.Invoice?.id"
                  :disabled="deletingId !== null"
                  @click="deleteInvoice(inv.Invoice?.id)"
                >
                  Vymazať
                </UButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <template #footer>
        <p class="text-xs text-slate-500">
          ⚠️ Pozor! Vymazanie faktúr je nevratné. Vymazávajte iba testovacie faktúry.
        </p>
      </template>
    </UCard>
  </div>
</template>
