<script setup lang="ts">
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { formatPrice, ORDER_STATUS_LABELS } from '~~/app/lib/types/order'
import type { OrderWithClient, Order, Client, OrderStatus } from '~~/app/lib/types/order'

definePageMeta({
  layout: 'dashboard',
})

const route = useRoute()
const router = useRouter()
const orderId = route.params.id as string

// State
const order = ref<OrderWithClient | null>(null)
const loading = ref(true)
const updating = ref(false)
const downloadingInvoice = ref(false)

// Load order and client data
const loadOrder = async () => {
  loading.value = true

  try {
    const db = useFirestore()

    // Find order by orderId (6-digit ID)
    const ordersRef = collection(db, 'orders')
    const q = query(ordersRef, where('orderId', '==', orderId))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      useToast().add({
        title: 'Chyba',
        description: 'Objednávka nenájdená',
        color: 'error',
      })
      router.push('/dashboard/orders')
      return
    }

    const orderDoc = querySnapshot.docs[0]
    const orderData = {
      ...orderDoc.data(),
      firestoreId: orderDoc.id,
    } as Order

    // Load client data
    try {
      const clientRef = doc(db, 'clients', orderData.clientId)
      const clientDoc = await getDoc(clientRef)

      if (clientDoc.exists()) {
        const clientData = {
          ...clientDoc.data(),
          clientId: clientDoc.id,
        } as Client

        order.value = {
          ...orderData,
          client: clientData,
        } as OrderWithClient
      } else {
        order.value = orderData as OrderWithClient
      }
    } catch (error) {
      console.error('Error loading client:', error)
      order.value = orderData as OrderWithClient
    }
  } catch (error) {
    console.error('Error loading order:', error)
    useToast().add({
      title: 'Chyba',
      description: 'Nepodarilo sa načítať objednávku',
      color: 'error',
    })
  } finally {
    loading.value = false
  }
}

// Update order status
async function updateOrderStatus(newStatus: OrderStatus) {
  if (!order.value) return

  updating.value = true

  try {
    const db = useFirestore()
    const orderRef = doc(db, 'orders', order.value.firestoreId)
    await updateDoc(orderRef, {
      orderStatus: newStatus,
      updatedAt: new Date(),
    })

    // Update local state
    order.value.orderStatus = newStatus

    useToast().add({
      title: 'Úspech',
      description: 'Stav objednávky bol aktualizovaný',
      color: 'success',
    })
  } catch (error) {
    console.error('Error updating order status:', error)
    useToast().add({
      title: 'Chyba',
      description: 'Nepodarilo sa aktualizovať stav objednávky',
      color: 'error',
    })
  } finally {
    updating.value = false
  }
}

// Format date
function formatDate(timestamp: any): string {
  if (!timestamp) return '-'
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('sk-SK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Calculate age from birthdate
function calculateAge(birthDate?: string): number | null {
  if (!birthDate) return null
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

// Get delivery type label
const deliveryTypeLabel = computed(() => {
  if (!order.value) return '-'

  if (order.value.deliveryType === 'prevádzka') {
    return 'Prevádzka'
  }

  if (order.value.deliveryType === 'domov') {
    return order.value.package === 'OFFICE' ? 'Do práce' : 'Domov'
  }

  return '-'
})

// Download invoice PDF
async function downloadInvoice() {
  if (!order.value) return

  downloadingInvoice.value = true

  try {
    const response = await fetch(`/api/orders/${orderId}/invoice`)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || 'Nepodarilo sa stiahnuť faktúru')
    }

    // Get PDF blob
    const blob = await response.blob()

    // Create download link
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `faktura-${orderId}.pdf`
    document.body.appendChild(link)
    link.click()

    // Cleanup
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    useToast().add({
      title: 'Úspech',
      description: 'Faktúra bola stiahnutá',
      color: 'success',
    })
  } catch (error: any) {
    console.error('Error downloading invoice:', error)
    useToast().add({
      title: 'Chyba',
      description: error.message || 'Nepodarilo sa stiahnuť faktúru',
      color: 'error',
    })
  } finally {
    downloadingInvoice.value = false
  }
}

onMounted(() => {
  loadOrder()
})
</script>

<template>
  <div>
    <!-- Back Button -->
    <div class="mb-6">
      <UButton
        icon="i-heroicons-arrow-left"
        color="neutral"
        variant="ghost"
        @click="router.push('/dashboard/orders')"
      >
        Späť na objednávky
      </UButton>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin" style="color: var(--color-orange)" />
    </div>

    <!-- Order Details -->
    <div v-else-if="order" class="space-y-6">
      <!-- Header with Status and Actions -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-3xl font-bold text-slate-900">Objednávka #{{ order.orderId }}</h2>
          <p class="text-slate-600 mt-1">{{ formatDate(order.createdAt) }}</p>
        </div>

        <!-- Status and Actions -->
        <div class="flex items-center gap-4">
          <span
            class="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium"
            :class="{
              'text-white bg-orange': order.orderStatus === 'pending',
              'text-white bg-dark-green': order.orderStatus === 'approved',
              'text-dark-green bg-orange': order.orderStatus === 'cancelled',
            }"
          >
            {{ ORDER_STATUS_LABELS[order.orderStatus] }}
          </span>

          <!-- Action Buttons -->
          <div v-if="order.orderStatus === 'pending'" class="flex gap-2">
            <UButton
              color="green"
              class="cursor-pointer"
              :loading="updating"
              @click="updateOrderStatus('approved')"
            >
              Schváliť
            </UButton>
            <UButton
              color="red"
              class="cursor-pointer"
              variant="outline"
              :loading="updating"
              @click="updateOrderStatus('cancelled')"
            >
              Zrušiť
            </UButton>
          </div>
        </div>
      </div>

      <!-- Grid Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Client Information -->
        <UCard>
          <template #header>
            <h3 class="text-xl font-bold text-slate-900">Informácie o zákazníkovi</h3>
          </template>

          <div class="space-y-4">
            <div>
              <p class="text-sm text-slate-600">Meno</p>
              <p class="text-base font-medium text-slate-900">{{ order.client?.fullName || '-' }}</p>
            </div>

            <div>
              <p class="text-sm text-slate-600">Email</p>
              <p class="text-base font-medium text-slate-900">{{ order.client?.email || '-' }}</p>
            </div>

            <div>
              <p class="text-sm text-slate-600">Telefón</p>
              <p class="text-base font-medium text-slate-900">{{ order.client?.phone || '-' }}</p>
            </div>

            <div>
              <p class="text-sm text-slate-600">Typ doručenia</p>
              <p class="text-base font-medium text-slate-900">{{ deliveryTypeLabel }}</p>
            </div>

            <div v-if="order.deliveryType === 'domov' && order.deliveryCity">
              <p class="text-sm text-slate-600">Mesto/obec doručenia</p>
              <p class="text-base font-medium text-slate-900">{{ order.deliveryCity }}</p>
            </div>

            <div v-if="order.deliveryType === 'domov' && order.deliveryAddress">
              <p class="text-sm text-slate-600">Dodacia adresa</p>
              <p class="text-base font-medium text-slate-900">{{ order.deliveryAddress }}</p>
            </div>

            <div v-if="order.client">
              <p class="text-sm text-slate-600">Celkom objednávok</p>
              <p class="text-base font-medium text-slate-900">{{ order.client.totalOrders }}</p>
            </div>

            <div v-if="order.client">
              <p class="text-sm text-slate-600">Celková hodnota objednávok</p>
              <p class="text-base font-semibold" style="color: var(--color-dark-green)">
                {{ formatPrice(order.client.totalSpent) }}
              </p>
            </div>
          </div>
        </UCard>

        <!-- Personal Information -->
        <UCard v-if="order.client">
          <template #header>
            <h3 class="text-xl font-bold text-slate-900">Osobné údaje</h3>
          </template>

          <div class="space-y-4">
            <div v-if="order.client.birthDate">
              <p class="text-sm text-slate-600">Dátum narodenia / Vek</p>
              <p class="text-base font-medium text-slate-900">
                {{ new Date(order.client.birthDate).toLocaleDateString('sk-SK') }}
                <span v-if="calculateAge(order.client.birthDate)" class="text-slate-600">
                  ({{ calculateAge(order.client.birthDate) }} rokov)
                </span>
              </p>
            </div>

            <div v-if="order.client.height">
              <p class="text-sm text-slate-600">Výška</p>
              <p class="text-base font-medium text-slate-900">{{ order.client.height }} cm</p>
            </div>

            <div v-if="order.client.weight">
              <p class="text-sm text-slate-600">Hmotnosť</p>
              <p class="text-base font-medium text-slate-900">{{ order.client.weight }} kg</p>
            </div>

            <div v-if="order.client.physicalActivity">
              <p class="text-sm text-slate-600">Fyzická aktivita</p>
              <p class="text-base font-medium text-slate-900 capitalize">{{ order.client.physicalActivity }}</p>
            </div>

            <div v-if="order.client.workActivity">
              <p class="text-sm text-slate-600">Pracovná aktivita</p>
              <p class="text-base font-medium text-slate-900 capitalize">{{ order.client.workActivity }}</p>
            </div>

            <div v-if="order.client.stressLevel">
              <p class="text-sm text-slate-600">Úroveň stresu</p>
              <p class="text-base font-medium text-slate-900 capitalize">{{ order.client.stressLevel }}</p>
            </div>

            <div v-if="order.client.goal">
              <p class="text-sm text-slate-600">Cieľ</p>
              <p class="text-base font-medium text-slate-900">{{ order.client.goal }}</p>
            </div>

            <div v-if="!order.client.birthDate && !order.client.height && !order.client.weight && !order.client.goal">
              <p class="text-slate-500 italic">Žiadne osobné údaje</p>
            </div>
          </div>
        </UCard>

        <!-- Order Details -->
        <UCard>
          <template #header>
            <h3 class="text-xl font-bold text-slate-900">Detaily objednávky</h3>
          </template>

          <div class="space-y-4">
            <div>
              <p class="text-sm text-slate-600">Balíček</p>
              <span
                class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium text-white mt-1"
                :style="{ backgroundColor: 'var(--color-dark-green)' }"
              >
                {{ order.package }}
              </span>
            </div>

            <div>
              <p class="text-sm text-slate-600">Trvanie</p>
              <p class="text-base font-medium text-slate-900">{{ order.daysCount }} dní ({{ order.duration === '5' ? '4 týždne, 5 dní/týždeň' : '4 týždne, 6 dní/týždeň' }})</p>
            </div>

            <div>
              <p class="text-sm text-slate-600">Začiatok dodávky</p>
              <p class="text-base font-medium text-slate-900">{{ order.deliveryStartDate }}</p>
            </div>

            <div>
              <p class="text-sm text-slate-600">Celková cena</p>
              <p class="text-2xl font-bold" style="color: var(--color-dark-green)">
                {{ formatPrice(order.totalPrice) }}
              </p>
            </div>

            <div v-if="order.dietaryRequirements && order.dietaryRequirements.length > 0">
              <p class="text-sm text-slate-600 mb-2">Diétne požiadavky</p>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="req in order.dietaryRequirements"
                  :key="req"
                  class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium text-slate-900"
                  :style="{ backgroundColor: 'var(--color-beige)' }"
                >
                  {{ req }}
                </span>
              </div>
            </div>

            <div v-if="order.notes">
              <p class="text-sm text-slate-600">Poznámky k stravovaniu</p>
              <p class="text-base font-medium text-slate-900">{{ order.notes }}</p>
            </div>

            <div v-if="order.courierNotes">
              <p class="text-sm text-slate-600">Poznámky pre kuriéra</p>
              <p class="text-base font-medium text-slate-900">{{ order.courierNotes }}</p>
            </div>
          </div>
        </UCard>

        <!-- Payment Information -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-xl font-bold text-slate-900">Platobné informácie</h3>
              <UButton
                v-if="order.superfakturaInvoiceId"
                icon="i-heroicons-arrow-down-tray"
                color="orange"
                variant="soft"
                class="cursor-pointer bg-orange text-white"
                :loading="downloadingInvoice"
                @click="downloadInvoice"
              >
                Stiahnuť faktúru
              </UButton>
            </div>
          </template>

          <div class="space-y-4">
            <div>
              <p class="text-sm text-slate-600">Stav platby</p>
              <span
                class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium mt-1"
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
            </div>

            <div>
              <p class="text-sm text-slate-600">Zaplatená suma</p>
              <p class="text-base font-medium text-slate-900">{{ formatPrice(order.amountPaid) }}</p>
            </div>

            <div>
              <p class="text-sm text-slate-600">Mena</p>
              <p class="text-base font-medium text-slate-900">{{ order.currency.toUpperCase() }}</p>
            </div>

            <div v-if="order.paidAt">
              <p class="text-sm text-slate-600">Dátum platby</p>
              <p class="text-base font-medium text-slate-900">{{ formatDate(order.paidAt) }}</p>
            </div>

            <div v-if="order.superfakturaInvoiceNumber">
              <p class="text-sm text-slate-600">Číslo faktúry</p>
              <p class="text-base font-medium text-slate-900">{{ order.superfakturaInvoiceNumber }}</p>
            </div>

            <div>
              <p class="text-sm text-slate-600">Stripe Payment Intent ID</p>
              <p class="text-xs font-mono text-slate-600">{{ order.stripePaymentIntentId }}</p>
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Error State -->
    <div v-else class="text-center py-12">
      <UIcon name="i-heroicons-exclamation-circle" class="w-12 h-12 text-slate-400 mx-auto mb-4" />
      <p class="text-slate-600">Objednávka nenájdená</p>
    </div>
  </div>
</template>
