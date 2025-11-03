<script setup lang="ts">
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc, type Unsubscribe } from 'firebase/firestore'
import { formatPrice, ORDER_STATUS_LABELS } from '~~/app/lib/types/order'
import type { Order, OrderWithClient, OrderStatus, Client } from '~~/app/lib/types/order'

const { exportToPdf } = usePdfExport()

definePageMeta({
  layout: 'dashboard',
})

// State
const orders = ref<OrderWithClient[]>([])
const loading = ref(true)
const searchQuery = ref('')
const selectedStatus = ref<OrderStatus | 'all'>('all')

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
  navigateTo(`/cms/orders/${order.orderId}`)
}

// Statistics
const stats = computed(() => ({
  total: orders.value.length,
  pending: orders.value.filter(o => o.orderStatus === 'pending').length,
  approved: orders.value.filter(o => o.orderStatus === 'approved').length,
  cancelled: orders.value.filter(o => o.orderStatus === 'cancelled').length,
  totalRevenue: orders.value.reduce((sum, o) => sum + o.totalPrice, 0),
}))

// PDF Export
const exportingPdf = ref(false)

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

    const columns = [
      { header: 'ID objednávky', dataKey: 'orderId' },
      { header: 'Meno', dataKey: 'fullName' },
      { header: 'Email', dataKey: 'email' },
      { header: 'Balíček', dataKey: 'package' },
      { header: 'Cena', dataKey: 'totalPrice' },
      { header: 'Stav', dataKey: 'orderStatus' },
      { header: 'Platba', dataKey: 'paymentStatus' },
      { header: 'Vytvorené', dataKey: 'createdAt' },
    ]

    const rows = filteredOrders.value.map(order => ({
      orderId: `#${order.orderId}`,
      fullName: order.client?.fullName || '-',
      email: order.client?.email || '-',
      package: order.package,
      totalPrice: formatPrice(order.totalPrice),
      orderStatus: ORDER_STATUS_LABELS[order.orderStatus],
      paymentStatus: order.paymentStatus === 'succeeded' ? 'Úspešná' : order.paymentStatus === 'pending' ? 'Čaká' : 'Neúspešná',
      createdAt: order.createdAt,
    }))

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
    <div class="mb-8">
      <h2 class="text-3xl font-bold text-slate-900">Objednávky</h2>
      <p class="text-slate-600 mt-2">Spravuj všetky objednávky</p>
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
        <div class="space-y-1">
          <p class="text-sm text-slate-500">Celkové tržby</p>
          <p class="text-2xl font-bold text-slate-900">{{ formatPrice(stats.totalRevenue) }}</p>
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
              <th class="text-left px-4 py-3 text-sm font-semibold text-slate-700">ID objednávky</th>
              <th class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Meno</th>
              <th class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Email</th>
              <th class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Balíček</th>
              <th class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Cena</th>
              <th class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Stav</th>
              <th class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Platba</th>
              <th class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Vytvorené</th>
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
              <td class="px-4 py-3">
                <span class="font-mono font-semibold text-slate-900">#{{ order.orderId }}</span>
              </td>

              <!-- Full Name -->
              <td class="px-4 py-3">
                <span class="text-slate-900">{{ order.client?.fullName || '-' }}</span>
              </td>

              <!-- Email -->
              <td class="px-4 py-3">
                <span class="text-slate-600 text-sm">{{ order.client?.email || '-' }}</span>
              </td>

              <!-- Package -->
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium text-white"
                  :style="{ backgroundColor: 'var(--color-dark-green)' }"
                >
                  {{ order.package }}
                </span>
              </td>

              <!-- Price -->
              <td class="px-4 py-3">
                <span class="font-semibold text-slate-900">{{ formatPrice(order.totalPrice) }}</span>
              </td>

              <!-- Order Status -->
              <td class="px-4 py-3">
                <span
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
              <td class="px-4 py-3">
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
              <td class="px-4 py-3">
                <span class="text-slate-600 text-sm">{{ formatDate(order.createdAt) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </div>
</template>
