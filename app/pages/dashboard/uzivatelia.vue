<script setup lang="ts">
import { collection, query, orderBy, onSnapshot, doc, updateDoc, type Unsubscribe } from 'firebase/firestore'
import { formatPrice } from '~~/app/lib/types/order'
import type { Client, AccountStatus, OrderWithClient } from '~~/app/lib/types/order'

const { exportToPdf } = usePdfExport()

definePageMeta({
  layout: 'dashboard',
})

// State
const clients = ref<Client[]>([])
const loading = ref(true)
const searchQuery = ref('')
const selectedStatus = ref<AccountStatus | 'all'>('all')
const selectedPlan = ref<string>('all')

// Real-time Firestore listener
let unsubscribe: Unsubscribe | null = null

const loadClients = async () => {
  loading.value = true

  const db = useFirestore()
  const clientsRef = collection(db, 'clients')
  const q = query(clientsRef, orderBy('createdAt', 'desc'))

  unsubscribe = onSnapshot(q, (snapshot) => {
    clients.value = snapshot.docs.map(doc => ({
      ...doc.data(),
      clientId: doc.id,
    } as Client))

    loading.value = false
  }, (error) => {
    console.error('Error loading clients:', error)
    useToast().add({
      title: 'Chyba',
      description: 'Nepodarilo sa načítať používateľov',
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

// Load clients on mount
onMounted(() => {
  loadClients()
})

// Filtered clients
const filteredClients = computed(() => {
  let result = clients.value

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(client =>
      client.fullName.toLowerCase().includes(query) ||
      client.email.toLowerCase().includes(query) ||
      client.phone.includes(query)
    )
  }

  // Filter by status
  if (selectedStatus.value !== 'all') {
    result = result.filter(client => client.accountStatus === selectedStatus.value)
  }

  // Filter by plan
  if (selectedPlan.value !== 'all') {
    result = result.filter(client => client.currentPlan === selectedPlan.value)
  }

  return result
})

// Status filter options
const statusOptions = [
  { label: 'Všetky', value: 'all' },
  { label: 'Aktívny', value: 'aktívny' },
  { label: 'Neaktívny', value: 'neaktívny' },
]

// Plan filter options
const planOptions = [
  { label: 'Všetky', value: 'all' },
  { label: 'EKONOMY', value: 'EKONOMY' },
  { label: 'ŠTANDARD', value: 'ŠTANDARD' },
  { label: 'PREMIUM', value: 'PREMIUM' },
]

// Check if subscription is ending soon (within 7 days)
function isSubscriptionEndingSoon(client: Client): boolean {
  if (!client.subscriptionEndDate) return false

  const endDate = client.subscriptionEndDate.toDate()
  const today = new Date()
  const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  return daysUntilEnd <= 7 && daysUntilEnd >= 0
}

// Check if subscription has ended
function hasSubscriptionEnded(client: Client): boolean {
  if (!client.subscriptionEndDate) return false

  const endDate = client.subscriptionEndDate.toDate()
  const today = new Date()

  return endDate < today
}

// Format date
function formatDate(timestamp: any): string {
  if (!timestamp) return '-'
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('sk-SK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Selected client for details modal
const selectedClient = ref<Client | null>(null)
const showClientDetails = ref(false)

function viewClientDetails(client: Client) {
  selectedClient.value = client
  showClientDetails.value = true
}


// Statistics
const stats = computed(() => ({
  total: clients.value.length,
  active: clients.value.filter(c => c.accountStatus === 'aktívny').length,
  inactive: clients.value.filter(c => c.accountStatus === 'neaktívny').length,
  endingSoon: clients.value.filter(c => isSubscriptionEndingSoon(c)).length,
  totalRevenue: clients.value.reduce((sum, c) => sum + c.totalSpent, 0),
}))

// PDF Export
const exportingPdf = ref(false)

const exportClientsToPdf = async () => {
  if (filteredClients.value.length === 0) {
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
    const filename = `pouzivatelia-${dateStr}.pdf`

    const columns = [
      { header: 'Meno', dataKey: 'fullName' },
      { header: 'Email', dataKey: 'email' },
      { header: 'Telefón', dataKey: 'phone' },
      { header: 'Aktuálny plán', dataKey: 'currentPlan' },
      { header: 'Dátum registrácie', dataKey: 'createdAt' },
      { header: 'Stav účtu', dataKey: 'accountStatus' },
      { header: 'Posledná platba', dataKey: 'lastPaymentDate' },
      { header: 'Suma platby', dataKey: 'lastPaymentAmount' },
      { header: 'Koniec predplatného', dataKey: 'subscriptionEndDate' },
      { header: 'Objednávky', dataKey: 'totalOrders' },
    ]

    const rows = filteredClients.value.map(client => ({
      fullName: client.fullName,
      email: client.email,
      phone: client.phone,
      currentPlan: client.currentPlan || '-',
      createdAt: client.createdAt,
      accountStatus: client.accountStatus,
      lastPaymentDate: client.lastPaymentDate,
      lastPaymentAmount: client.lastPaymentAmount ? formatPrice(client.lastPaymentAmount) : '-',
      subscriptionEndDate: client.subscriptionEndDate,
      totalOrders: client.totalOrders,
    }))

    await exportToPdf({
      title: 'Zoznam používateľov',
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
      <h2 class="text-3xl font-bold text-slate-900">Užívatelia</h2>
      <p class="text-slate-600 mt-2">Prehľad a správa všetkých používateľov</p>
    </div>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
      <UCard>
        <div class="space-y-1">
          <p class="text-sm text-slate-500">Celkom používateľov</p>
          <p class="text-2xl font-bold text-slate-900">{{ stats.total }}</p>
        </div>
      </UCard>
      <UCard>
        <div class="space-y-1">
          <p class="text-sm text-slate-500">Aktívny</p>
          <p class="text-2xl font-bold text-green-600">{{ stats.active }}</p>
        </div>
      </UCard>
      <UCard>
        <div class="space-y-1">
          <p class="text-sm text-slate-500">Neaktívny</p>
          <p class="text-2xl font-bold text-slate-600">{{ stats.inactive }}</p>
        </div>
      </UCard>
      <UCard>
        <div class="space-y-1">
          <p class="text-sm text-slate-500">Končiace predplatné</p>
          <p class="text-2xl font-bold text-amber-600">{{ stats.endingSoon }}</p>
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
        <div class="flex-1">
          <UInput
            v-model="searchQuery"
            placeholder="Hľadať podľa mena, emailu alebo telefónu..."
            icon="i-heroicons-magnifying-glass"
            size="lg"
          />
        </div>

        <!-- Status Filter -->
        <USelect
          v-model="selectedStatus"
          :items="statusOptions"
          placeholder="Filter podľa stavu"
          size="lg"
          class="w-full md:w-48"
        />

        <!-- Plan Filter -->
        <USelect
          v-model="selectedPlan"
          :items="planOptions"
          placeholder="Filter podľa plánu"
          size="lg"
          class="w-full md:w-48"
        />

        <!-- Export Button -->
        <UButton
          :disabled="exportingPdf || filteredClients.length === 0"
          :loading="exportingPdf"
          icon="i-lucide-file-down"
          class="flex items-center justify-center bg-beige h-[3.5rem] w-[3.5rem] text-dark-green hover:bg-orange hover:text-dark-green cursor-pointer disabled:bg-beige disabled:text-dark-green disabled:cursor-not-allowed"
          color="neutral"
          size="lg"
          @click="exportClientsToPdf"
        ></UButton>
      </div>
    </UCard>

    <!-- Clients Table -->
    <UCard>
      <div v-if="loading" class="flex items-center justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-orange-500" />
      </div>

      <div v-else-if="filteredClients.length === 0" class="text-center py-12">
        <UIcon name="i-heroicons-users" class="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <p class="text-slate-600">Žiadni používatelia</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-slate-200">
              <th class="text-left px-4 py-3 text-sm font-semibold text-slate-700">ID / Meno</th>
              <th class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Kontakt</th>
              <th class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Aktuálny plán</th>
              <th class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Dátum registrácie</th>
              <th class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Stav účtu</th>
              <th class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Posledná platba</th>
              <th class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Koniec predplatného</th>
              <th class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Objednávky</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="client in filteredClients"
              :key="client.clientId"
              class="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
              @click="viewClientDetails(client)"
            >
              <!-- ID / Name -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <span class="text-slate-900 font-medium">{{ client.fullName }}</span>
                  <UIcon
                    v-if="isSubscriptionEndingSoon(client)"
                    name="i-heroicons-exclamation-triangle"
                    class="w-4 h-4"
                    style="color: var(--color-orange)"
                    title="Končiace predplatné"
                  />
                  <UIcon
                    v-if="hasSubscriptionEnded(client)"
                    name="i-heroicons-x-circle"
                    class="w-4 h-4"
                    style="color: var(--color-orange)"
                    title="Predplatné skončilo"
                  />
                </div>
              </td>

              <!-- Contact -->
              <td class="px-4 py-3">
                <div class="text-sm">
                  <div class="text-slate-900">{{ client.email }}</div>
                  <div class="text-slate-500">{{ client.phone }}</div>
                </div>
              </td>

              <!-- Current Plan -->
              <td class="px-4 py-3">
                <span
                  v-if="client.currentPlan"
                  class="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium text-white"
                  :style="{ backgroundColor: 'var(--color-dark-green)' }"
                >
                  {{ client.currentPlan }}
                </span>
                <span v-else class="text-slate-400">-</span>
              </td>

              <!-- Registration Date -->
              <td class="px-4 py-3">
                <span class="text-slate-600 text-sm">{{ formatDate(client.createdAt) }}</span>
              </td>

              <!-- Account Status -->
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium"
                  :class="{
                    'text-white': client.accountStatus === 'aktívny',
                    'text-slate-900': client.accountStatus === 'neaktívny',
                  }"
                  :style="{
                    backgroundColor: client.accountStatus === 'aktívny' ? 'var(--color-dark-green)' : 'var(--color-beige)'
                  }"
                >
                  {{ client.accountStatus }}
                </span>
              </td>

              <!-- Last Payment -->
              <td class="px-4 py-3">
                <div class="text-sm">
                  <div class="text-slate-900">{{ formatDate(client.lastPaymentDate) }}</div>
                  <div class="text-slate-500">{{ formatPrice(client.lastPaymentAmount) }}</div>
                </div>
              </td>

              <!-- Subscription End Date -->
              <td class="px-4 py-3">
                <span
                  class="text-sm"
                  :style="{
                    color: hasSubscriptionEnded(client) ? 'var(--color-orange)' :
                           isSubscriptionEndingSoon(client) ? 'var(--color-orange)' :
                           '',
                    fontWeight: hasSubscriptionEnded(client) || isSubscriptionEndingSoon(client) ? '600' : '400'
                  }"
                  :class="{
                    'text-slate-600': !isSubscriptionEndingSoon(client) && !hasSubscriptionEnded(client)
                  }"
                >
                  {{ formatDate(client.subscriptionEndDate) }}
                </span>
              </td>

              <!-- Order Count -->
              <td class="px-4 py-3">
                <span class="text-slate-900 font-medium">{{ client.totalOrders }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </div>
</template>
