<script setup lang="ts">
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { formatPrice, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, DELIVERY_CITIES } from '~~/app/lib/types/order'
import type { OrderWithClient, Order, Client, OrderStatus, PaymentMethod, DeliveryType, DeliveryCity } from '~~/app/lib/types/order'

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
const resendingEmail = ref(false)
const deleting = ref(false)
const showDeleteConfirm = ref(false)

// Custom invoice feature (testing only)
const config = useRuntimeConfig()
const enableTestingFeatures = computed(() => config.public.enableTestingFeatures ?? false)
const showCustomInvoiceModal = ref(false)
const customPrice = ref<number | null>(null)
const creatingCustomInvoice = ref(false)

// Edit delivery start date feature
const showEditStartDateModal = ref(false)
const newStartDate = ref('')
const updatingStartDate = ref(false)
const startDateError = ref('')

// Edit delivery info feature
const showEditDeliveryModal = ref(false)
const updatingDelivery = ref(false)
const deliveryError = ref('')
const editDeliveryForm = ref({
  deliveryType: 'prevádzka' as DeliveryType,
  deliveryCity: undefined as DeliveryCity | undefined,
  deliveryAddress: '',
})

// Delivery type options for select
const deliveryTypeOptions = [
  { label: 'Prevádzka', value: 'prevádzka' },
  { label: 'Domov', value: 'domov' },
]

// Delivery city options for select
const deliveryCityOptions = DELIVERY_CITIES.map(city => ({ label: city, value: city }))

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

// Parse Slovak date format "DD.MM.YYYY"
function parseSlovakDate(dateStr: string): Date | null {
  const parts = dateStr.split('.')
  if (parts.length !== 3) return null
  const day = Number(parts[0])
  const month = Number(parts[1])
  const year = Number(parts[2])
  return new Date(year, month - 1, day)
}

// Calculate age from birthdate
function calculateAge(birthDate?: string): number | null {
  if (!birthDate) return null
  const birth = parseSlovakDate(birthDate)
  if (!birth) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

// Helper to get payment method (with lazy fallback for legacy orders)
const getPaymentMethod = (order: Order): PaymentMethod => {
  if (order.paymentMethod) return order.paymentMethod
  return order.stripePaymentIntentId?.startsWith('cash_payment_') ? 'cash' : 'card'
}

// Check if order has already started (today >= deliveryStartDate)
const orderHasStarted = computed(() => {
  if (!order.value?.deliveryStartDate) return false
  const startDate = parseSlovakDate(order.value.deliveryStartDate)
  if (!startDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  startDate.setHours(0, 0, 0, 0)
  return today >= startDate
})

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

// Format pending change date (YYYY-MM-DD to Slovak format)
function formatPendingChangeDate(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('sk-SK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

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

// Resend client confirmation email with invoice
async function resendConfirmationEmail() {
  if (!order.value) return

  resendingEmail.value = true

  try {
    const response = await fetch(`/api/orders/${orderId}/resend-email`, {
      method: 'POST',
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Nepodarilo sa odoslať email')
    }

    useToast().add({
      title: 'Úspech',
      description: `Email bol odoslaný na ${data.email}`,
      color: 'success',
    })

    // Reload order to update email status
    await loadOrder()
  } catch (error: any) {
    console.error('Error resending email:', error)
    useToast().add({
      title: 'Chyba',
      description: error.message || 'Nepodarilo sa odoslať email',
      color: 'error',
    })
  } finally {
    resendingEmail.value = false
  }
}

// Delete order (any order type)
async function deleteOrder() {
  if (!order.value) return

  deleting.value = true

  try {
    await $fetch(`/api/orders/${orderId}/delete`, {
      method: 'DELETE',
    })

    useToast().add({
      title: 'Úspech',
      description: order.value.isDemo ? 'Demo objednávka bola vymazaná' : 'Objednávka bola vymazaná',
      color: 'success',
    })

    // Navigate back to orders list
    router.push('/dashboard/orders')
  } catch (error: any) {
    console.error('Error deleting order:', error)
    useToast().add({
      title: 'Chyba',
      description: error.data?.message || error.message || 'Nepodarilo sa vymazať objednávku',
      color: 'error',
    })
  } finally {
    deleting.value = false
    showDeleteConfirm.value = false
  }
}

// Create custom invoice with custom price (testing feature)
async function createCustomInvoice() {
  if (!order.value || !customPrice.value) return

  creatingCustomInvoice.value = true

  try {
    await $fetch('/api/orders/custom-invoice', {
      method: 'POST',
      body: {
        orderId: order.value.orderId,
        customPrice: customPrice.value * 100, // Convert EUR to cents
      },
    })

    useToast().add({
      title: 'Úspech',
      description: 'Faktúra bola vytvorená a email bol odoslaný',
      color: 'success',
    })

    showCustomInvoiceModal.value = false
    customPrice.value = null
  } catch (error: any) {
    console.error('Error creating custom invoice:', error)
    useToast().add({
      title: 'Chyba',
      description: error.data?.message || 'Nepodarilo sa vytvoriť faktúru',
      color: 'error',
    })
  } finally {
    creatingCustomInvoice.value = false
  }
}

// Open edit start date modal
function openEditStartDateModal() {
  if (!order.value) return
  newStartDate.value = order.value.deliveryStartDate
  startDateError.value = ''
  showEditStartDateModal.value = true
}

// Open edit delivery modal
function openEditDeliveryModal() {
  if (!order.value) return
  editDeliveryForm.value = {
    deliveryType: order.value.deliveryType,
    deliveryCity: order.value.deliveryCity,
    deliveryAddress: order.value.deliveryAddress || '',
  }
  deliveryError.value = ''
  showEditDeliveryModal.value = true
}

// Update delivery info
async function updateDeliveryInfo() {
  if (!order.value) return

  // Client-side validation for home delivery
  if (editDeliveryForm.value.deliveryType === 'domov') {
    if (!editDeliveryForm.value.deliveryCity) {
      deliveryError.value = 'Mesto/obec je povinné pre doručenie domov'
      return
    }
    if (!editDeliveryForm.value.deliveryAddress || editDeliveryForm.value.deliveryAddress.trim().length < 5) {
      deliveryError.value = 'Adresa doručenia je povinná (minimálne 5 znakov)'
      return
    }
  }

  updatingDelivery.value = true
  deliveryError.value = ''

  try {
    await $fetch(`/api/orders/${orderId}/update-delivery`, {
      method: 'POST',
      body: {
        deliveryType: editDeliveryForm.value.deliveryType,
        deliveryCity: editDeliveryForm.value.deliveryType === 'domov' ? editDeliveryForm.value.deliveryCity : undefined,
        deliveryAddress: editDeliveryForm.value.deliveryType === 'domov' ? editDeliveryForm.value.deliveryAddress : '',
      },
    })

    useToast().add({
      title: 'Úspech',
      description: 'Informácie o doručení boli aktualizované',
      color: 'success',
    })

    showEditDeliveryModal.value = false

    // Reload order to get updated data
    await loadOrder()
  } catch (error: any) {
    console.error('Error updating delivery info:', error)
    deliveryError.value = error.data?.message || 'Nepodarilo sa aktualizovať informácie o doručení'
    useToast().add({
      title: 'Chyba',
      description: error.data?.message || 'Nepodarilo sa aktualizovať informácie o doručení',
      color: 'error',
    })
  } finally {
    updatingDelivery.value = false
  }
}

// Validate delivery day on client side
function isValidDeliveryDay(dateStr: string, duration: string): { valid: boolean; error: string } {
  const parsed = parseSlovakDate(dateStr)
  if (!parsed) return { valid: false, error: 'Neplatný formát dátumu' }

  const dayOfWeek = parsed.getDay() // 0=Sunday, 6=Saturday

  if (dayOfWeek === 0) {
    return { valid: false, error: 'Nedeľa nie je platný deň doručenia' }
  }

  if (dayOfWeek === 6 && duration === '5') {
    return { valid: false, error: 'Sobota nie je platný deň doručenia pre 5-dňový balíček (Po-Pi)' }
  }

  return { valid: true, error: '' }
}

// Update delivery start date
async function updateDeliveryStartDate() {
  if (!order.value || !newStartDate.value) return

  // Client-side validation
  const validation = isValidDeliveryDay(newStartDate.value, order.value.duration)
  if (!validation.valid) {
    startDateError.value = validation.error
    return
  }

  updatingStartDate.value = true
  startDateError.value = ''

  try {
    await $fetch(`/api/orders/${orderId}/update-start-date`, {
      method: 'POST',
      body: {
        newStartDate: newStartDate.value,
      },
    })

    useToast().add({
      title: 'Úspech',
      description: 'Dátum začiatku dodávky bol aktualizovaný',
      color: 'success',
    })

    showEditStartDateModal.value = false

    // Reload order to get updated end date
    await loadOrder()
  } catch (error: any) {
    console.error('Error updating start date:', error)
    startDateError.value = error.data?.message || 'Nepodarilo sa aktualizovať dátum'
    useToast().add({
      title: 'Chyba',
      description: error.data?.message || 'Nepodarilo sa aktualizovať dátum začiatku',
      color: 'error',
    })
  } finally {
    updatingStartDate.value = false
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
          <!-- Delete button for all orders (non-demo have separate button) -->
          <UButton
            v-if="!order.isDemo"
            icon="i-heroicons-trash"
            color="error"
            variant="soft"
            class="cursor-pointer"
            :loading="deleting"
            @click="showDeleteConfirm = true"
          />

          <!-- Demo order: show Testovacia status -->
          <span
            v-if="order.isDemo"
            class="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-dark-green bg-beige"
          >
            Testovacia
          </span>
          <!-- Regular order: show normal status -->
          <span
            v-else
            class="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium"
            :class="{
              'text-white bg-orange': order.orderStatus === 'pending',
              'text-white bg-dark-green': order.orderStatus === 'approved',
              'text-dark-green bg-orange': order.orderStatus === 'cancelled',
            }"
          >
            {{ ORDER_STATUS_LABELS[order.orderStatus] }}
          </span>

          <!-- Action Buttons for regular orders -->
          <div v-if="!order.isDemo && order.orderStatus === 'pending'" class="flex gap-2">
            <UButton
              color="neutral"
              class="cursor-pointer text-white"
              :style="{ backgroundColor: '#16a34a' }"
              :loading="updating"
              @click="updateOrderStatus('approved')"
            >
              Schváliť
            </UButton>
            <UButton
              color="error"
              class="cursor-pointer"
              variant="outline"
              :loading="updating"
              @click="updateOrderStatus('cancelled')"
            >
              Zrušiť
            </UButton>
          </div>

          <!-- Delete Button for demo orders -->
          <UButton
            v-if="order.isDemo"
            color="error"
            size="sm"
            class="cursor-pointer px-4 py-2 text-sm"
            :loading="deleting"
            @click="showDeleteConfirm = true"
          >
            Vymazať objednávku
          </UButton>
        </div>
      </div>

      <!-- Grid Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Client Information -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-xl font-bold text-slate-900">Informácie o zákazníkovi</h3>
              <UButton
                icon="i-heroicons-pencil-square"
                size="sm"
                color="neutral"
                variant="soft"
                class="cursor-pointer"
                @click="openEditDeliveryModal"
              >
                Zmeniť doručenie
              </UButton>
            </div>
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

            <!-- Pending Delivery Change Notice -->
            <div v-if="order.pendingDeliveryChange" class="rounded-lg bg-amber-50 p-3 border border-amber-200">
              <div class="flex items-start gap-2">
                <UIcon name="i-heroicons-clock" class="mt-0.5 w-4 h-4 text-amber-600 flex-shrink-0" />
                <div class="flex-1">
                  <p class="text-sm font-medium text-amber-800">
                    Naplánovaná zmena doručenia
                  </p>
                  <p class="text-xs text-amber-700 mt-1">
                    Od: {{ formatPendingChangeDate(order.pendingDeliveryChange.effectiveDate) }}
                  </p>
                  <div class="mt-2 text-sm text-amber-900">
                    <p>
                      <span class="font-medium">Typ:</span>
                      {{ order.pendingDeliveryChange.deliveryType === 'prevádzka' ? 'Prevádzka' : 'Domov' }}
                    </p>
                    <p v-if="order.pendingDeliveryChange.deliveryCity">
                      <span class="font-medium">Mesto:</span>
                      {{ order.pendingDeliveryChange.deliveryCity }}
                    </p>
                    <p v-if="order.pendingDeliveryChange.deliveryAddress">
                      <span class="font-medium">Adresa:</span>
                      {{ order.pendingDeliveryChange.deliveryAddress }}
                    </p>
                  </div>
                  <p class="text-xs text-amber-600 mt-2">
                    Požiadané: {{ order.pendingDeliveryChange.requestedBy === 'client' ? 'zákazníkom' : 'administrátorom' }}
                  </p>
                </div>
              </div>
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
                {{ order.client.birthDate }}
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
            <div class="flex items-center justify-between">
              <h3 class="text-xl font-bold text-slate-900">Detaily objednávky</h3>
              <UButton
                v-if="!orderHasStarted"
                icon="i-heroicons-pencil-square"
                size="sm"
                color="neutral"
                variant="soft"
                class="cursor-pointer"
                @click="openEditStartDateModal"
              >
                Zmeniť začiatok dodávky
              </UButton>
            </div>
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

            <!-- Discount Info (if coupon was applied) -->
            <div v-if="order.couponCode" class="p-4 rounded-lg" style="background-color: var(--color-beige)">
              <p class="text-sm font-medium text-slate-700 mb-3">Aplikovaná zľava</p>
              <div class="space-y-2">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-slate-600">Zľavový kód</span>
                  <span class="font-mono font-medium text-slate-900">{{ order.couponCode }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm text-slate-600">Zľava</span>
                  <span class="font-medium text-slate-900">{{ order.discountPercentage }}%</span>
                </div>
                <div v-if="order.originalPrice" class="flex justify-between items-center">
                  <span class="text-sm text-slate-600">Pôvodná cena</span>
                  <span class="font-medium text-slate-500 line-through">{{ formatPrice(order.originalPrice) }}</span>
                </div>
              </div>
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
              <div class="flex gap-2">
                <UButton
                  icon="i-heroicons-envelope"
                  color="neutral"
                  variant="soft"
                  class="cursor-pointer"
                  :loading="resendingEmail"
                  @click="resendConfirmationEmail"
                >
                  Odoslať email
                </UButton>
                <UButton
                  v-if="order.superfakturaInvoiceId"
                  icon="i-heroicons-arrow-down-tray"
                  color="neutral"
                  variant="soft"
                  class="cursor-pointer bg-orange text-white"
                  :loading="downloadingInvoice"
                  @click="downloadInvoice"
                >
                  Stiahnuť faktúru
                </UButton>
                <!-- Testing Feature: Custom Invoice -->
                <UButton
                  v-if="enableTestingFeatures"
                  icon="i-heroicons-document-plus"
                  color="neutral"
                  variant="soft"
                  class="cursor-pointer"
                  @click="showCustomInvoiceModal = true"
                >
                  Vlastná faktúra
                </UButton>
              </div>
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
              <p class="text-sm text-slate-600">Spôsob platby</p>
              <span
                class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium mt-1 text-white"
                :style="{
                  backgroundColor: getPaymentMethod(order) === 'card' ? '#2563eb' : '#16a34a'
                }"
              >
                {{ PAYMENT_METHOD_LABELS[getPaymentMethod(order)] }}
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

            <!-- Email Status -->
            <div>
              <p class="text-sm text-slate-600">Potvrdzovací email</p>
              <div class="flex items-center gap-2 mt-1">
                <span
                  v-if="(order as any).confirmationEmailSent === true"
                  class="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium text-white bg-green-600"
                >
                  <UIcon name="i-heroicons-check" class="w-3 h-3 mr-1" />
                  Odoslaný
                </span>
                <span
                  v-else-if="(order as any).confirmationEmailSent === false"
                  class="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium text-white bg-red-600"
                >
                  <UIcon name="i-heroicons-x-mark" class="w-3 h-3 mr-1" />
                  Zlyhalo
                </span>
                <span
                  v-else
                  class="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium text-slate-700 bg-slate-200"
                >
                  Neznámy stav
                </span>
              </div>
              <p v-if="(order as any).confirmationEmailError" class="text-xs text-red-600 mt-1">
                {{ (order as any).confirmationEmailError }}
              </p>
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

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteConfirm">
      <template #content>
        <div class="p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-600" />
            </div>
            <h3 class="text-lg font-semibold text-slate-900">Vymazať objednávku?</h3>
          </div>

          <!-- Order summary for confirmation -->
          <div v-if="order" class="mb-4 p-3 bg-slate-50 rounded-lg text-sm space-y-1">
            <p><span class="font-medium">Objednávka:</span> #{{ order.orderId }}</p>
            <p><span class="font-medium">Zákazník:</span> {{ order.client?.fullName || '-' }}</p>
            <p><span class="font-medium">Suma:</span> {{ formatPrice(order.totalPrice) }}</p>
            <p>
              <span class="font-medium">Platba:</span>
              <span
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ml-1"
                :class="getPaymentMethod(order) === 'card' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'"
              >
                {{ PAYMENT_METHOD_LABELS[getPaymentMethod(order)] }}
              </span>
            </p>
          </div>

          <p class="text-slate-600 mb-2">
            Naozaj chcete vymazať túto objednávku?
          </p>

          <p class="text-slate-500 text-sm mb-4">
            <template v-if="order?.isDemo">
              Ak zákazník nemá žiadne iné objednávky, bude vymazaný aj jeho profil.
            </template>
            <template v-else>
              Štatistiky zákazníka budú aktualizované (počet objednávok a celková útrata).
              Dáta objednávky budú zalogované pre prípad potreby obnovenia.
            </template>
          </p>

          <div class="flex justify-end gap-3">
            <UButton
              color="neutral"
              variant="outline"
              @click="showDeleteConfirm = false"
            >
              Zrušiť
            </UButton>
            <UButton
              color="error"
              :loading="deleting"
              @click="deleteOrder"
            >
              Vymazať objednávku
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Custom Invoice Modal (Testing Feature) -->
    <UModal v-model:open="showCustomInvoiceModal">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-semibold text-slate-900 mb-4">Vytvoriť vlastnú faktúru</h3>
          <p class="text-sm text-slate-600 mb-4">
            Zadajte vlastnú cenu pre faktúru (v EUR). Faktúra bude vytvorená v SuperFaktura
            a odoslaná zákazníkovi na email.
          </p>

          <div class="mb-6">
            <label class="text-sm text-slate-600 block mb-1">Cena (EUR)</label>
            <UInput
              v-model.number="customPrice"
              type="number"
              placeholder="napr. 199"
              size="lg"
            />
          </div>

          <div class="flex justify-end gap-3">
            <UButton
              color="neutral"
              variant="outline"
              @click="showCustomInvoiceModal = false"
            >
              Zrušiť
            </UButton>
            <UButton
              class="bg-orange text-white"
              :loading="creatingCustomInvoice"
              :disabled="!customPrice || customPrice <= 0"
              @click="createCustomInvoice"
            >
              Vytvoriť a odoslať
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Edit Delivery Start Date Modal -->
    <UModal v-model:open="showEditStartDateModal">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-semibold text-slate-900 mb-4">Zmeniť dátum začiatku dodávky</h3>
          <p class="text-sm text-slate-600 mb-4">
            Zadajte nový dátum začiatku dodávky. Dátum konca bude automaticky prepočítaný.
            <br>
            <span class="font-medium">
              Platné dni: {{ order?.duration === '5' ? 'Pondelok - Piatok' : 'Pondelok - Sobota' }}
            </span>
          </p>

          <div class="mb-4">
            <label class="text-sm text-slate-600 block mb-1">Nový dátum (DD.MM.YYYY)</label>
            <UInput
              v-model="newStartDate"
              type="text"
              placeholder="napr. 20.01.2026"
              size="lg"
              :color="startDateError ? 'error' : undefined"
            />
            <p v-if="startDateError" class="text-sm text-red-600 mt-1">
              {{ startDateError }}
            </p>
          </div>

          <div class="flex justify-end gap-3">
            <UButton
              color="neutral"
              variant="outline"
              @click="showEditStartDateModal = false"
            >
              Zrušiť
            </UButton>
            <UButton
              class="bg-orange text-white"
              :loading="updatingStartDate"
              :disabled="!newStartDate"
              @click="updateDeliveryStartDate"
            >
              Uložiť
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Edit Delivery Info Modal -->
    <UModal v-model:open="showEditDeliveryModal">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-semibold text-slate-900 mb-4">Zmeniť doručenie</h3>
          <p class="text-sm text-slate-600 mb-4">
            Zmeňte typ doručenia a adresu pre túto objednávku.
          </p>

          <div class="space-y-4">
            <!-- Delivery Type -->
            <div>
              <label class="text-sm text-slate-600 block mb-1">Typ doručenia</label>
              <USelect
                v-model="editDeliveryForm.deliveryType"
                :items="deliveryTypeOptions"
                size="lg"
                class="w-full"
              />
            </div>

            <!-- Delivery City (only for home delivery) -->
            <div v-if="editDeliveryForm.deliveryType === 'domov'">
              <label class="text-sm text-slate-600 block mb-1">Mesto/obec *</label>
              <USelect
                v-model="editDeliveryForm.deliveryCity"
                :items="deliveryCityOptions"
                placeholder="Vyberte mesto/obec"
                size="lg"
                class="w-full"
              />
            </div>

            <!-- Delivery Address (only for home delivery) -->
            <div v-if="editDeliveryForm.deliveryType === 'domov'">
              <label class="text-sm text-slate-600 block mb-1">Dodacia adresa *</label>
              <UInput
                v-model="editDeliveryForm.deliveryAddress"
                type="text"
                placeholder="Ulica, číslo, PSČ, Mesto"
                size="lg"
                class="w-full"
              />
            </div>

            <!-- Info for prevádzka -->
            <div v-if="editDeliveryForm.deliveryType === 'prevádzka'" class="bg-slate-50 rounded-lg p-3 text-sm">
              <p class="text-slate-600">
                Pri odbere na prevádzke nie je potrebná adresa doručenia.
              </p>
            </div>

            <!-- Error message -->
            <p v-if="deliveryError" class="text-sm text-red-600">
              {{ deliveryError }}
            </p>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <UButton
              color="neutral"
              variant="outline"
              @click="showEditDeliveryModal = false"
            >
              Zrušiť
            </UButton>
            <UButton
              class="bg-orange text-white"
              :loading="updatingDelivery"
              @click="updateDeliveryInfo"
            >
              Uložiť
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
