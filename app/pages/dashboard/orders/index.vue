<script setup lang="ts">
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc, type Unsubscribe } from 'firebase/firestore'
import { formatPrice, ORDER_STATUS_LABELS, DELIVERY_CITIES } from '~~/app/lib/types/order'
import type { Order, OrderWithClient, OrderStatus, Client, PackageType, DurationType, DeliveryType, DeliveryCity } from '~~/app/lib/types/order'

const { exportToPdf } = usePdfExport()
const config = useRuntimeConfig()

// Testing features flag
const enableTestingFeatures = computed(() => config.public.enableTestingFeatures ?? false)

definePageMeta({
  layout: 'dashboard',
})

// State
const orders = ref<OrderWithClient[]>([])
const loading = ref(true)
const searchQuery = ref('')
const selectedStatus = ref<OrderStatus | 'all'>('all')
const dateFrom = ref('')
const dateTo = ref('')
const showAdvancedFilters = ref(false)
const selectedRevenueMonth = ref<number | null>(new Date().getMonth()) // null = all time, 0-11 = month index

// Column visibility
interface ColumnConfig {
  key: string
  label: string
}

const allColumns: ColumnConfig[] = [
  { key: 'orderId', label: 'ID objednávky' },
  { key: 'fullName', label: 'Meno' },
  { key: 'email', label: 'Email' },
  { key: 'package', label: 'Balíček' },
  { key: 'totalPrice', label: 'Cena' },
  { key: 'discountCode', label: 'Zľavový kód' },
  { key: 'discountedPrice', label: 'Cena po zľave' },
  { key: 'orderStatus', label: 'Stav' },
  { key: 'paymentStatus', label: 'Platba' },
  { key: 'createdAt', label: 'Vytvorené' },
]

const selectedColumns = ref<ColumnConfig[]>(
  allColumns.filter(col => col.key !== 'discountCode' && col.key !== 'discountedPrice')
)

const isColumnVisible = (key: string) => selectedColumns.value.some(col => col.key === key)

// Real-time Firestore listener
let unsubscribe: Unsubscribe | null = null

const loadOrders = async () => {
  loading.value = true

  const db = useFirestore()
  const ordersRef = collection(db, 'orders')
  const q = query(ordersRef, orderBy('createdAt', 'desc'))

  unsubscribe = onSnapshot(q, async (snapshot) => {
    // Load orders with their client data
    const ordersWithClients = await Promise.all(
      snapshot.docs.map(async (orderDoc) => {
        const orderData = {
          ...orderDoc.data(),
          firestoreId: orderDoc.id,
        } as Order

        // Fetch client data only if clientId exists
        if (orderData.clientId) {
          try {
            const clientRef = doc(db, 'clients', orderData.clientId)
            const clientDoc = await getDoc(clientRef)

            if (clientDoc.exists()) {
              const clientData = {
                ...clientDoc.data(),
                clientId: clientDoc.id,
              } as Client

              return {
                ...orderData,
                client: clientData,
              } as OrderWithClient
            }
          } catch (error) {
            console.error('Error loading client:', error)
          }
        }

        return orderData as OrderWithClient
      })
    )

    orders.value = ordersWithClients
    loading.value = false
  }, (error) => {
    console.error('Error loading orders:', error)
    useToast().add({
      title: 'Chyba',
      description: 'Nepodarilo sa načítať objednávky',
      color: 'error',
    })
    loading.value = false
  })
}

// Cleanup on unmount
onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})

// Load orders on mount (client-side only)
onMounted(() => {
  loadOrders()
})

// Filtered and sorted orders
const filteredOrders = computed(() => {
  let result = orders.value

  // Filter by date range
  if (dateFrom.value || dateTo.value) {
    result = result.filter(order => {
      if (!order.createdAt) return false

      const orderDate = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt)
      const fromDate = dateFrom.value ? new Date(dateFrom.value) : null
      const toDate = dateTo.value ? new Date(dateTo.value) : null

      // Set toDate to end of day (23:59:59)
      if (toDate) {
        toDate.setHours(23, 59, 59, 999)
      }

      if (fromDate && orderDate < fromDate) return false
      if (toDate && orderDate > toDate) return false

      return true
    })
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(order =>
      order.orderId.toLowerCase().includes(query) ||
      (order.client?.fullName || '').toLowerCase().includes(query) ||
      (order.client?.email || '').toLowerCase().includes(query) ||
      (order.client?.phone || '').includes(query)
    )
  }

  // Filter by status
  if (selectedStatus.value !== 'all') {
    result = result.filter(order => order.orderStatus === selectedStatus.value)
  }

  return result
})


// Status filter options
const statusOptions = [
  { label: 'Všetky', value: 'all' },
  { label: 'Čakajúce', value: 'pending' },
  { label: 'Schválené', value: 'approved' },
  { label: 'Zrušené', value: 'cancelled' },
]

// Slovak month names
const slovakMonths = [
  'Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún',
  'Júl', 'August', 'September', 'Október', 'November', 'December'
]

// Get current month index (0-11)
const currentMonth = new Date().getMonth()
const currentYear = new Date().getFullYear()

// Month options for revenue filter (only past months in current year)
const revenueMonthOptions = computed(() => {
  const options: Array<{ label: string; value: number | null; disabled: boolean }> = [
    { label: 'Celý rok', value: null, disabled: false }
  ]

  slovakMonths.forEach((month, index) => {
    options.push({
      label: month,
      value: index as number,
      disabled: index > currentMonth // Disable future months
    })
  })

  return options
})

// Format date
function formatDate(timestamp: any): string {
  if (!timestamp) return '-'
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('sk-SK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Navigate to order detail page
function viewOrderDetails(order: OrderWithClient) {
  navigateTo(`/dashboard/orders/${order.orderId}`)
}

// Statistics (based on filtered orders)
const stats = computed(() => ({
  total: filteredOrders.value.length,
  pending: filteredOrders.value.filter(o => o.orderStatus === 'pending').length,
  approved: filteredOrders.value.filter(o => o.orderStatus === 'approved').length,
  cancelled: filteredOrders.value.filter(o => o.orderStatus === 'cancelled').length,
  totalRevenue: filteredOrders.value.reduce((sum, o) => sum + o.totalPrice, 0),
}))

// Monthly filtered revenue
const monthlyRevenue = computed(() => {
  if (selectedRevenueMonth.value === null) {
    // Show all orders from current year
    return orders.value
      .filter(order => {
        if (!order.createdAt) return false
        const orderDate = typeof order.createdAt.toDate === 'function'
          ? order.createdAt.toDate()
          : new Date(order.createdAt as any)
        return orderDate.getFullYear() === currentYear
      })
      .reduce((sum, o) => sum + o.totalPrice, 0)
  } else {
    // Filter by selected month in current year
    return orders.value
      .filter(order => {
        if (!order.createdAt) return false
        const orderDate = typeof order.createdAt.toDate === 'function'
          ? order.createdAt.toDate()
          : new Date(order.createdAt as any)
        return orderDate.getMonth() === selectedRevenueMonth.value && orderDate.getFullYear() === currentYear
      })
      .reduce((sum, o) => sum + o.totalPrice, 0)
  }
})

// Clear date filters
const clearDateFilters = () => {
  dateFrom.value = ''
  dateTo.value = ''
}

// PDF Export
const exportingPdf = ref(false)

// Demo order modal state
const showDemoOrderModal = ref(false)
const demoOrderLoading = ref(false)
const demoOrderForm = ref({
  fullName: 'Testovací užívateľ',
  email: '',
  phone: '+421900000000',
  package: 'ŠTANDARD' as PackageType,
  duration: '6' as DurationType,
  deliveryType: 'prevádzka' as DeliveryType,
  deliveryCity: undefined as DeliveryCity | undefined,
  deliveryAddress: 'Testovacia adresa 123, 934 01 Levice',
  notes: '',
})

// Package options for select
const packageOptions = [
  { label: 'EKONOMY', value: 'EKONOMY' },
  { label: 'ŠTANDARD', value: 'ŠTANDARD' },
  { label: 'PREMIUM', value: 'PREMIUM' },
  { label: 'OFFICE', value: 'OFFICE' },
]

// Duration options for select
const durationOptions = [
  { label: '5 dní (20 porcií)', value: '5' },
  { label: '6 dní (24 porcií)', value: '6' },
]

// Delivery type options for select
const deliveryTypeOptions = [
  { label: 'Prevádzka', value: 'prevádzka' },
  { label: 'Domov', value: 'domov' },
]

// Delivery city options for select
const deliveryCityOptions = DELIVERY_CITIES.map(city => ({ label: city, value: city }))

// Generate random email for demo
const generateRandomEmail = () => {
  const timestamp = Date.now()
  demoOrderForm.value.email = `demo.${timestamp}@test.com`
}

// Reset demo order form
const resetDemoOrderForm = () => {
  demoOrderForm.value = {
    fullName: 'Test User',
    email: '',
    phone: '+421900000000',
    package: 'ŠTANDARD' as PackageType,
    duration: '5' as DurationType,
    deliveryType: 'prevádzka' as DeliveryType,
    deliveryCity: undefined,
    deliveryAddress: 'Testovacia adresa 123, 934 01 Levice',
    notes: '',
  }
}

// Open demo order modal
const openDemoOrderModal = () => {
  resetDemoOrderForm()
  generateRandomEmail()
  showDemoOrderModal.value = true
}

// Create demo order
const createDemoOrder = async () => {
  // Validate required fields
  if (!demoOrderForm.value.fullName || !demoOrderForm.value.email || !demoOrderForm.value.phone) {
    useToast().add({
      title: 'Chyba',
      description: 'Vyplňte všetky povinné polia',
      color: 'error',
    })
    return
  }

  // Validate delivery city for home delivery
  if (demoOrderForm.value.deliveryType === 'domov' && !demoOrderForm.value.deliveryCity) {
    useToast().add({
      title: 'Chyba',
      description: 'Vyberte mesto/obec pre doručenie domov',
      color: 'error',
    })
    return
  }

  demoOrderLoading.value = true

  try {
    const response = await $fetch('/api/orders/create-demo', {
      method: 'POST',
      body: {
        fullName: demoOrderForm.value.fullName,
        email: demoOrderForm.value.email,
        phone: demoOrderForm.value.phone,
        package: demoOrderForm.value.package,
        duration: demoOrderForm.value.duration,
        deliveryType: demoOrderForm.value.deliveryType,
        deliveryCity: demoOrderForm.value.deliveryType === 'domov' ? demoOrderForm.value.deliveryCity : undefined,
        deliveryAddress: demoOrderForm.value.deliveryAddress,
        notes: demoOrderForm.value.notes,
      },
    })

    useToast().add({
      title: 'Úspech',
      description: `Demo objednávka #${response.orderId} bola vytvorená`,
      color: 'success',
    })

    showDemoOrderModal.value = false
    // Orders list will auto-refresh via Firestore listener
  } catch (error: any) {
    console.error('Demo order creation error:', error)
    useToast().add({
      title: 'Chyba',
      description: error.data?.message || error.message || 'Nepodarilo sa vytvoriť demo objednávku',
      color: 'error',
    })
  } finally {
    demoOrderLoading.value = false
  }
}

const exportOrdersToPdf = async () => {
  if (filteredOrders.value.length === 0) {
    useToast().add({
      title: 'Upozornenie',
      description: 'Nie sú žiadne dáta na export',
      color: 'warning',
    })
    return
  }

  exportingPdf.value = true

  try {
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const filename = `objednavky-${dateStr}.pdf`

    // All possible columns with their mapping
    const allPossibleColumns: Record<string, { header: string; dataKey: string }> = {
      orderId: { header: 'ID objednávky', dataKey: 'orderId' },
      fullName: { header: 'Meno', dataKey: 'fullName' },
      email: { header: 'Email', dataKey: 'email' },
      package: { header: 'Balíček', dataKey: 'package' },
      totalPrice: { header: 'Cena', dataKey: 'totalPrice' },
      discountCode: { header: 'Zľavový kód', dataKey: 'discountCode' },
      discountedPrice: { header: 'Cena po zľave', dataKey: 'discountedPrice' },
      orderStatus: { header: 'Stav', dataKey: 'orderStatus' },
      paymentStatus: { header: 'Platba', dataKey: 'paymentStatus' },
      createdAt: { header: 'Vytvorené', dataKey: 'createdAt' },
    }

    // Filter columns based on selected columns
    const columns = selectedColumns.value
      .map(col => allPossibleColumns[col.key])
      .filter((col): col is { header: string; dataKey: string } => col !== undefined)

    // Build rows with only selected columns
    const rows = filteredOrders.value.map(order => {
      const row: Record<string, any> = {}

      selectedColumns.value.forEach(col => {
        switch (col.key) {
          case 'orderId':
            row.orderId = `#${order.orderId}`
            break
          case 'fullName':
            row.fullName = order.client?.fullName || '-'
            break
          case 'email':
            row.email = order.client?.email || '-'
            break
          case 'package':
            row.package = order.package
            break
          case 'totalPrice':
            row.totalPrice = formatPrice(order.totalPrice)
            break
          case 'discountCode':
            row.discountCode = '-' // TODO: Add discount code field when implemented
            break
          case 'discountedPrice':
            row.discountedPrice = '-' // TODO: Add discounted price when implemented
            break
          case 'orderStatus':
            row.orderStatus = ORDER_STATUS_LABELS[order.orderStatus]
            break
          case 'paymentStatus':
            row.paymentStatus = order.paymentStatus === 'succeeded' ? 'Úspešná' : order.paymentStatus === 'pending' ? 'Čaká' : 'Neúspešná'
            break
          case 'createdAt':
            row.createdAt = order.createdAt
            break
        }
      })

      return row
    })

    await exportToPdf({
      title: 'Zoznam objednávok',
      columns,
      rows,
      filename,
      orientation: 'landscape',
    })

    useToast().add({
      title: 'Úspech',
      description: 'PDF bol úspešne vygenerovaný',
      color: 'success',
    })
  } catch (error: any) {
    console.error('PDF export error:', error)
    useToast().add({
      title: 'Chyba',
      description: error.message || 'Nepodarilo sa vytvoriť PDF',
      color: 'error',
    })
  } finally {
    exportingPdf.value = false
  }
}
</script>

<template>
  <div>
    <div class="mb-8 flex items-start justify-between">
      <div>
        <h2 class="text-3xl font-bold text-slate-900">Objednávky</h2>
        <p class="text-slate-600 mt-2">Spravuj všetky objednávky</p>
      </div>
      <!-- Testing Features Button -->
      <UButton
        v-if="enableTestingFeatures"
        icon="i-lucide-plus"
        color="neutral"
        size="md"
        class="bg-orange text-dark-green hover:bg-dark-green hover:text-beige cursor-pointer"
        @click="openDemoOrderModal"
      >
        Demo Objednávka
      </UButton>
    </div>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
      <UCard>
        <div class="space-y-1">
          <p class="text-sm text-slate-500">Celkom objednávok</p>
          <p class="text-2xl font-bold text-slate-900">{{ stats.total }}</p>
        </div>
      </UCard>
      <UCard>
        <div class="space-y-1">
          <p class="text-sm text-slate-500">Čakajúce</p>
          <p class="text-2xl font-bold text-amber-600">{{ stats.pending }}</p>
        </div>
      </UCard>
      <UCard>
        <div class="space-y-1">
          <p class="text-sm text-slate-500">Schválené</p>
          <p class="text-2xl font-bold text-green-600">{{ stats.approved }}</p>
        </div>
      </UCard>
      <UCard>
        <div class="space-y-1">
          <p class="text-sm text-slate-500">Zrušené</p>
          <p class="text-2xl font-bold text-orange">{{ stats.cancelled }}</p>
        </div>
      </UCard>
      <UCard>
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-slate-500">Tržby</p>
            <USelect
              v-model="selectedRevenueMonth"
              :items="revenueMonthOptions"
              size="xs"
              class="w-32 h-[2.5rem]"
            />
          </div>
          <p class="text-2xl font-bold text-slate-900">{{ formatPrice(monthlyRevenue) }}</p>
        </div>
      </UCard>
    </div>

    <!-- Filters and Search -->
    <UCard class="mb-6">
      <div class="flex flex-col md:flex-row gap-4 items-end">
        <!-- Search -->
        <div class="flex-1 w-full">
          <UInput
            v-model="searchQuery"
            placeholder="Hľadať podľa ID, mena, emailu alebo telefónu..."
            icon="i-heroicons-magnifying-glass"
            size="lg"
            class="w-full"
          />
        </div>

        <!-- Status Filter -->
        <div class="w-full md:w-48">
          <USelect
            v-model="selectedStatus"
            :items="statusOptions"
            placeholder="Filter podľa stavu"
            size="lg"
            class="w-full"
          />
        </div>

        <!-- Filter Toggle Button -->
        <UButton
          icon="i-lucide-sliders-horizontal"
          class="w-full md:w-auto flex items-center justify-center gap-2 h-[3.5rem] md:h-[3.5rem] md:w-[3.5rem] text-dark-green hover:bg-orange hover:text-dark-green cursor-pointer"
          :class="showAdvancedFilters ? 'bg-orange' : 'bg-beige'"
          color="neutral"
          size="lg"
          @click="showAdvancedFilters = !showAdvancedFilters"
        >
          <span class="md:hidden">{{ showAdvancedFilters ? 'Skryť filtre' : 'Zobraziť filtre' }}</span>
        </UButton>

        <!-- Export Button -->
        <UButton
          :disabled="exportingPdf || filteredOrders.length === 0"
          :loading="exportingPdf"
          icon="i-lucide-file-down"
          class="w-full md:w-auto flex items-center justify-center gap-2 bg-beige h-[3.5rem] md:h-[3.5rem] md:w-[3.5rem] text-dark-green hover:bg-orange hover:text-dark-green cursor-pointer disabled:bg-beige disabled:text-dark-green disabled:cursor-not-allowed"
          color="neutral"
          size="lg"
          @click="exportOrdersToPdf"
        >
          <span class="md:hidden">Exportovať do PDF</span>
        </UButton>
      </div>
    </UCard>

    <!-- Advanced Filters -->
    <UCard v-if="showAdvancedFilters" class="mb-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Date Range Filter -->
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Časové obdobie - Od">
              <UInput
                v-model="dateFrom"
                type="date"
                size="md"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Časové obdobie - Do">
              <UInput
                v-model="dateTo"
                type="date"
                size="md"
                class="w-full"
              />
            </UFormField>
          </div>
          <UButton
            v-if="dateFrom || dateTo"
            size="xs"
            color="neutral"
            variant="ghost"
            @click="clearDateFilters"
            class="cursor-pointer text-dark-green hover:text-beige hover:bg-dark-green"
          >
            Vymazať
          </UButton>
        </div>

        <!-- Column Visibility -->
        <div class="space-y-3">
          <UFormField label="Zobrazené stĺpce">
            <USelectMenu
            label="Zobrazené stĺpce"
            v-model="selectedColumns"
            :items="allColumns"
            multiple
            value-attribute="key"
            option-attribute="label"
            size="md"
            class="w-full h-[3.5rem]"
            :search-input="{
              placeholder: 'Vyber stĺpce...',
              icon: 'i-lucide-search',
              class: 'h-10'
            }"
          >
            <template #empty>
              <p class="text-slate-500">Žiadne stĺpce</p>
            </template>
          </USelectMenu>
            </UFormField>
        </div>
      </div>
    </UCard>

    <!-- Orders Table -->
    <UCard>
      <div v-if="loading" class="flex items-center justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-orange-500" />
      </div>

      <div v-else-if="filteredOrders.length === 0" class="text-center py-12">
        <UIcon name="i-heroicons-inbox" class="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <p class="text-slate-600">Žiadne objednávky</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-slate-200">
              <th v-if="isColumnVisible('orderId')" class="text-left px-4 py-3 text-sm font-semibold text-slate-700">ID objednávky</th>
              <th v-if="isColumnVisible('fullName')" class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Meno</th>
              <th v-if="isColumnVisible('email')" class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Email</th>
              <th v-if="isColumnVisible('package')" class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Balíček</th>
              <th v-if="isColumnVisible('totalPrice')" class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Cena</th>
              <th v-if="isColumnVisible('discountCode')" class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Zľavový kód</th>
              <th v-if="isColumnVisible('discountedPrice')" class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Cena po zľave</th>
              <th v-if="isColumnVisible('orderStatus')" class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Stav</th>
              <th v-if="isColumnVisible('paymentStatus')" class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Platba</th>
              <th v-if="isColumnVisible('createdAt')" class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Vytvorené</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="order in filteredOrders"
              :key="order.firestoreId"
              class="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
              @click="viewOrderDetails(order)"
            >
              <!-- Order ID -->
              <td v-if="isColumnVisible('orderId')" class="px-4 py-3">
                <span class="font-mono font-semibold text-slate-900">#{{ order.orderId }}</span>
              </td>

              <!-- Full Name -->
              <td v-if="isColumnVisible('fullName')" class="px-4 py-3">
                <span class="text-slate-900">{{ order.client?.fullName || '-' }}</span>
              </td>

              <!-- Email -->
              <td v-if="isColumnVisible('email')" class="px-4 py-3">
                <span class="text-slate-600 text-sm">{{ order.client?.email || '-' }}</span>
              </td>

              <!-- Package -->
              <td v-if="isColumnVisible('package')" class="px-4 py-3">
                <span
                  class="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium text-white"
                  :style="{ backgroundColor: 'var(--color-dark-green)' }"
                >
                  {{ order.package }}
                </span>
              </td>

              <!-- Price -->
              <td v-if="isColumnVisible('totalPrice')" class="px-4 py-3">
                <span class="font-semibold text-slate-900">{{ formatPrice(order.totalPrice) }}</span>
              </td>

              <!-- Discount Code -->
              <td v-if="isColumnVisible('discountCode')" class="px-4 py-3">
                <span class="text-slate-600 text-sm">-</span>
              </td>

              <!-- Discounted Price -->
              <td v-if="isColumnVisible('discountedPrice')" class="px-4 py-3">
                <span class="text-slate-600 text-sm">-</span>
              </td>

              <!-- Order Status -->
              <td v-if="isColumnVisible('orderStatus')" class="px-4 py-3">
                <!-- Demo order: show Testovacia -->
                <span
                  v-if="order.isDemo"
                  class="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium text-dark-green bg-beige"
                >
                  Testovacia
                </span>
                <!-- Regular order: show normal status -->
                <span
                  v-else
                  class="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium"
                  :class="{
                    'text-slate-900': order.orderStatus === 'pending',
                    'text-beige bg-orange': order.orderStatus === 'approved',
                    'text-beige bg-dark-green': order.orderStatus === 'cancelled',
                  }"
                >
                  {{ ORDER_STATUS_LABELS[order.orderStatus] }}
                </span>
              </td>

              <!-- Payment Status -->
              <td v-if="isColumnVisible('paymentStatus')" class="px-4 py-3">
                <span
                  class="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium"
                  :class="{
                    'text-white': order.paymentStatus === 'succeeded',
                    'text-slate-900': order.paymentStatus === 'pending' || order.paymentStatus === 'failed',
                  }"
                  :style="{
                    backgroundColor: order.paymentStatus === 'succeeded' ? 'var(--color-dark-green)' :
                                   order.paymentStatus === 'pending' ? 'var(--color-beige)' :
                                   'var(--color-orange)'
                  }"
                >
                  {{ order.paymentStatus === 'succeeded' ? 'Úspešná' : order.paymentStatus === 'pending' ? 'Čaká' : 'Neúspešná' }}
                </span>
              </td>

              <!-- Created At -->
              <td v-if="isColumnVisible('createdAt')" class="px-4 py-3">
                <span class="text-slate-600 text-sm">{{ formatDate(order.createdAt) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Demo Order Modal -->
    <UModal v-model:open="showDemoOrderModal">
      <template #content>
        <div class="p-6 max-h-[85vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-6 sticky top-0 bg-white pb-2 -mt-2 pt-2">
            <h3 class="text-xl font-bold text-slate-900">Vytvoriť Demo Objednávku</h3>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="showDemoOrderModal = false"
            />
          </div>

          <div class="space-y-4">
            <!-- Full Name -->
            <UFormField label="Meno a priezvisko">
              <UInput
                v-model="demoOrderForm.fullName"
                placeholder="Meno a priezvisko"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <!-- Email -->
            <UFormField label="Email">
              <div class="flex gap-2">
                <UInput
                  v-model="demoOrderForm.email"
                  type="email"
                  placeholder="Email"
                  size="lg"
                  class="flex-1"
                />
                <UButton
                  icon="i-lucide-refresh-cw"
                  color="neutral"
                  variant="outline"
                  size="lg"
                  @click="generateRandomEmail"
                  title="Vygenerovať náhodný email"
                />
              </div>
            </UFormField>

            <!-- Phone -->
            <UFormField label="Telefón">
              <UInput
                v-model="demoOrderForm.phone"
                placeholder="+421900000000"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <!-- Package & Duration -->
            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Balíček">
                <USelect
                  v-model="demoOrderForm.package"
                  :items="packageOptions"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Trvanie">
                <USelect
                  v-model="demoOrderForm.duration"
                  :items="durationOptions"
                  size="lg"
                  class="w-full"
                />
              </UFormField>
            </div>

            <!-- Delivery Type -->
            <UFormField label="Typ doručenia">
              <USelect
                v-model="demoOrderForm.deliveryType"
                :items="deliveryTypeOptions"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <!-- Delivery City (only for home delivery) -->
            <UFormField v-if="demoOrderForm.deliveryType === 'domov'" label="Mesto/obec">
              <USelect
                v-model="demoOrderForm.deliveryCity"
                :items="deliveryCityOptions"
                placeholder="Vyberte mesto/obec"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <!-- Delivery Address -->
            <UFormField label="Adresa">
              <UInput
                v-model="demoOrderForm.deliveryAddress"
                placeholder="Adresa"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <!-- Notes -->
            <UFormField label="Poznámky (voliteľné)">
              <UTextarea
                v-model="demoOrderForm.notes"
                placeholder="Poznámky k objednávke..."
                :rows="2"
                class="w-full"
              />
            </UFormField>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
            <UButton
              color="neutral"
              variant="outline"
              size="lg"
              @click="showDemoOrderModal = false"
            >
              Zrušiť
            </UButton>
            <UButton
              :loading="demoOrderLoading"
              :disabled="demoOrderLoading"
              class="bg-orange text-dark-green hover:bg-dark-green hover:text-beige"
              size="lg"
              @click="createDemoOrder"
            >
              Vytvoriť Demo Objednávku
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
