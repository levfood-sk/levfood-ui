<script setup lang="ts">
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { z } from 'zod'
import { formatPrice, ORDER_STATUS_LABELS } from '~~/app/lib/types/order'
import type {
  Client,
  Order,
  AccountStatus,
  PhysicalActivity,
  WorkActivity,
  StressLevel,
} from '~~/app/lib/types/order'

definePageMeta({
  layout: 'dashboard',
})

const route = useRoute()
const router = useRouter()
const clientId = route.params.id as string

// Main state
const client = ref<Client | null>(null)
const clientOrders = ref<Order[]>([])
const loading = ref(true)
const saving = ref(false)
const isEditing = ref(false)
const deleting = ref(false)
const showDeleteConfirm = ref(false)

// Form state (for editing)
const formData = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  accountStatus: 'aktívny' as AccountStatus,
  birthDate: '',
  height: null as number | null,
  weight: null as number | null,
  physicalActivity: null as PhysicalActivity | null,
  workActivity: null as WorkActivity | null,
  stressLevel: null as StressLevel | null,
  goal: '',
})

// Validation errors
const validationErrors = ref<Record<string, string>>({})

// Zod validation schema
const clientUpdateSchema = z.object({
  firstName: z.string().min(1, 'Meno je povinné').max(100, 'Meno je príliš dlhé'),
  lastName: z.string().min(1, 'Priezvisko je povinné').max(100, 'Priezvisko je príliš dlhé'),
  email: z.string().email('Neplatná emailová adresa'),
  phone: z.string()
    .min(1, 'Telefónne číslo je povinné')
    .regex(/^(\+421|0)?[0-9]{9,10}$/, { message: 'Neplatné telefónne číslo' }),
  accountStatus: z.enum(['aktívny', 'neaktívny']),
  birthDate: z.string().optional(),
  height: z.number().min(50, 'Minimálna výška je 50 cm').max(250, 'Maximálna výška je 250 cm').nullable().optional(),
  weight: z.number().min(20, 'Minimálna hmotnosť je 20 kg').max(300, 'Maximálna hmotnosť je 300 kg').nullable().optional(),
  physicalActivity: z.enum(['nízka', 'stredná', 'vysoká']).nullable().optional(),
  workActivity: z.enum(['ľahká', 'mierne náročná', 'náročná']).nullable().optional(),
  stressLevel: z.enum(['nízky', 'stredný', 'vysoký']).nullable().optional(),
  goal: z.string().max(500, 'Cieľ je príliš dlhý').optional(),
})

// Select options
const accountStatusOptions = [
  { label: 'Aktívny', value: 'aktívny' },
  { label: 'Neaktívny', value: 'neaktívny' },
]

const physicalActivityOptions = [
  { label: 'Nízka', value: 'nízka' },
  { label: 'Stredná', value: 'stredná' },
  { label: 'Vysoká', value: 'vysoká' },
]

const workActivityOptions = [
  { label: 'Ľahká', value: 'ľahká' },
  { label: 'Mierne náročná', value: 'mierne náročná' },
  { label: 'Náročná', value: 'náročná' },
]

const stressLevelOptions = [
  { label: 'Nízky', value: 'nízky' },
  { label: 'Stredný', value: 'stredný' },
  { label: 'Vysoký', value: 'vysoký' },
]

// Populate form data from client
const populateFormData = () => {
  if (!client.value) return

  formData.value = {
    firstName: client.value.firstName,
    lastName: client.value.lastName,
    email: client.value.email,
    phone: client.value.phone,
    accountStatus: client.value.accountStatus,
    birthDate: client.value.birthDate || '',
    height: client.value.height ?? null,
    weight: client.value.weight ?? null,
    physicalActivity: client.value.physicalActivity ?? null,
    workActivity: client.value.workActivity ?? null,
    stressLevel: client.value.stressLevel ?? null,
    goal: client.value.goal || '',
  }
}

// Load client orders
const loadClientOrders = async () => {
  try {
    const db = useFirestore()
    const ordersRef = collection(db, 'orders')
    const q = query(
      ordersRef,
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc')
    )
    const querySnapshot = await getDocs(q)

    clientOrders.value = querySnapshot.docs.map(docSnap => ({
      ...docSnap.data(),
      firestoreId: docSnap.id,
    } as Order))
  } catch (error) {
    console.error('Error loading client orders:', error)
  }
}

// Load client
const loadClient = async () => {
  loading.value = true

  try {
    const db = useFirestore()

    // Load client by document ID
    const clientRef = doc(db, 'clients', clientId)
    const clientDoc = await getDoc(clientRef)

    if (!clientDoc.exists()) {
      useToast().add({
        title: 'Chyba',
        description: 'Používateľ nenájdený',
        color: 'error',
      })
      router.push('/dashboard/uzivatelia')
      return
    }

    client.value = {
      ...clientDoc.data(),
      clientId: clientDoc.id,
    } as Client

    // Initialize form data
    populateFormData()

    // Load client's orders
    await loadClientOrders()
  } catch (error) {
    console.error('Error loading client:', error)
    useToast().add({
      title: 'Chyba',
      description: 'Nepodarilo sa načítať používateľa',
      color: 'error',
    })
  } finally {
    loading.value = false
  }
}

// Toggle edit mode
const toggleEditMode = () => {
  if (isEditing.value) {
    // Cancel editing - reset form data
    populateFormData()
    validationErrors.value = {}
  }
  isEditing.value = !isEditing.value
}

// Save client
const saveClient = async () => {
  // Validate with Zod
  const result = clientUpdateSchema.safeParse(formData.value)

  if (!result.success) {
    validationErrors.value = {}
    result.error.issues.forEach(issue => {
      validationErrors.value[issue.path[0] as string] = issue.message
    })
    useToast().add({
      title: 'Chyba validácie',
      description: 'Skontrolujte prosím vyplnené údaje',
      color: 'error',
    })
    return
  }

  saving.value = true
  validationErrors.value = {}

  try {
    const db = useFirestore()
    const clientRef = doc(db, 'clients', clientId)

    // Prepare update data
    const updateData = {
      firstName: formData.value.firstName,
      lastName: formData.value.lastName,
      fullName: `${formData.value.firstName} ${formData.value.lastName}`,
      email: formData.value.email.toLowerCase(),
      phone: formData.value.phone,
      accountStatus: formData.value.accountStatus,
      birthDate: formData.value.birthDate || null,
      height: formData.value.height,
      weight: formData.value.weight,
      physicalActivity: formData.value.physicalActivity,
      workActivity: formData.value.workActivity,
      stressLevel: formData.value.stressLevel,
      goal: formData.value.goal || null,
      updatedAt: new Date(),
    }

    await updateDoc(clientRef, updateData)

    // Update local state
    if (client.value) {
      client.value = {
        ...client.value,
        ...updateData,
      }
    }

    isEditing.value = false

    useToast().add({
      title: 'Úspech',
      description: 'Údaje boli úspešne uložené',
      color: 'success',
    })
  } catch (error) {
    console.error('Error saving client:', error)
    useToast().add({
      title: 'Chyba',
      description: 'Nepodarilo sa uložiť zmeny',
      color: 'error',
    })
  } finally {
    saving.value = false
  }
}

// Delete client
async function deleteClient() {
  if (!client.value) return

  deleting.value = true

  try {
    await $fetch(`/api/clients/${clientId}/delete`, {
      method: 'DELETE',
    })

    useToast().add({
      title: 'Úspech',
      description: 'Zákazník bol vymazaný',
      color: 'success',
    })

    // Navigate back to users list
    router.push('/dashboard/uzivatelia')
  } catch (error: any) {
    console.error('Error deleting client:', error)
    useToast().add({
      title: 'Chyba',
      description: error.data?.message || error.message || 'Nepodarilo sa vymazať zákazníka',
      color: 'error',
    })
  } finally {
    deleting.value = false
    showDeleteConfirm.value = false
  }
}

// Check if client can be deleted (no card payment orders)
const canDeleteClient = computed(() => {
  if (!clientOrders.value.length) return true

  // Check if all orders are cash or demo
  return clientOrders.value.every(order => {
    const isCashOrder = order.paymentMethod === 'cash' ||
      order.stripePaymentIntentId?.startsWith('cash_payment_')
    const isDemo = order.isDemo === true
    return isCashOrder || isDemo
  })
})

// Format date from Firestore timestamp
function formatDate(timestamp: any): string {
  if (!timestamp) return '-'
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('sk-SK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Format date with time
function formatDateTime(timestamp: any): string {
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

// Calculate age from birth date
function calculateAge(birthDate?: string): number | null {
  if (!birthDate) return null
  const parts = birthDate.split('.')
  if (parts.length !== 3) return null
  const birth = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]))
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

// Navigate to order detail
function viewOrder(orderId: string) {
  router.push(`/dashboard/orders/${orderId}`)
}

onMounted(() => {
  loadClient()
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
        @click="router.push('/dashboard/uzivatelia')"
      >
        Späť na používateľov
      </UButton>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin" style="color: var(--color-orange)" />
    </div>

    <!-- Client Details -->
    <div v-else-if="client" class="space-y-6">
      <!-- Header with Edit Toggle -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-3xl font-bold text-slate-900">{{ client.fullName }}</h2>
          <p class="text-slate-600 mt-1">Registrovaný: {{ formatDate(client.createdAt) }}</p>
        </div>

        <div class="flex items-center gap-4">
          <!-- Delete button -->
          <UButton
            v-if="canDeleteClient"
            icon="i-heroicons-trash"
            color="error"
            variant="soft"
            class="cursor-pointer"
            :loading="deleting"
            @click="showDeleteConfirm = true"
          />

          <!-- Account Status Badge -->
          <span
            class="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium"
            :class="{
              'text-white': client.accountStatus === 'aktívny',
              'text-slate-900': client.accountStatus === 'neaktívny',
            }"
            :style="{
              backgroundColor: client.accountStatus === 'aktívny'
                ? 'var(--color-dark-green)'
                : 'var(--color-beige)'
            }"
          >
            {{ client.accountStatus }}
          </span>

          <!-- Edit / Save Buttons -->
          <div class="flex gap-2">
            <UButton
              v-if="!isEditing"
              icon="i-heroicons-pencil"
              class="cursor-pointer bg-orange text-white hover:bg-dark-green"
              @click="toggleEditMode"
            >
              Upraviť
            </UButton>
            <template v-else>
              <UButton
                color="neutral"
                variant="outline"
                class="cursor-pointer"
                :disabled="saving"
                @click="toggleEditMode"
              >
                Zrušiť
              </UButton>
              <UButton
                color="success"
                class="cursor-pointer"
                :loading="saving"
                @click="saveClient"
              >
                Uložiť zmeny
              </UButton>
            </template>
          </div>
        </div>
      </div>

      <!-- Two Column Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Card 1: Informácie o zákazníkovi -->
        <UCard>
          <template #header>
            <h3 class="text-xl font-bold text-slate-900">Informácie o zákazníkovi</h3>
          </template>

          <div class="space-y-4">
            <!-- Name Fields -->
            <template v-if="isEditing">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="text-sm text-slate-600 block mb-1">Meno</label>
                  <UInput
                    v-model="formData.firstName"
                    size="lg"
                    :color="validationErrors.firstName ? 'error' : undefined"
                  />
                  <p v-if="validationErrors.firstName" class="text-xs text-red-500 mt-1">
                    {{ validationErrors.firstName }}
                  </p>
                </div>
                <div>
                  <label class="text-sm text-slate-600 block mb-1">Priezvisko</label>
                  <UInput
                    v-model="formData.lastName"
                    size="lg"
                    :color="validationErrors.lastName ? 'error' : undefined"
                  />
                  <p v-if="validationErrors.lastName" class="text-xs text-red-500 mt-1">
                    {{ validationErrors.lastName }}
                  </p>
                </div>
              </div>
            </template>
            <div v-else>
              <p class="text-sm text-slate-600">Meno</p>
              <p class="text-base font-medium text-slate-900">{{ client.fullName }}</p>
            </div>

            <!-- Email -->
            <div>
              <label class="text-sm text-slate-600 block mb-1">Email</label>
              <UInput
                v-if="isEditing"
                v-model="formData.email"
                type="email"
                size="lg"
                :color="validationErrors.email ? 'error' : undefined"
              />
              <p v-else class="text-base font-medium text-slate-900">{{ client.email }}</p>
              <p v-if="validationErrors.email" class="text-xs text-red-500 mt-1">
                {{ validationErrors.email }}
              </p>
            </div>

            <!-- Phone -->
            <div>
              <label class="text-sm text-slate-600 block mb-1">Telefón</label>
              <UInput
                v-if="isEditing"
                v-model="formData.phone"
                size="lg"
                :color="validationErrors.phone ? 'error' : undefined"
              />
              <p v-else class="text-base font-medium text-slate-900">{{ client.phone }}</p>
              <p v-if="validationErrors.phone" class="text-xs text-red-500 mt-1">
                {{ validationErrors.phone }}
              </p>
            </div>

            <!-- Account Status -->
            <div>
              <label class="text-sm text-slate-600 block mb-1">Stav účtu</label>
              <USelect
                v-if="isEditing"
                v-model="formData.accountStatus"
                :items="accountStatusOptions"
                size="lg"
              />
              <p v-else class="text-base font-medium text-slate-900 capitalize">
                {{ client.accountStatus }}
              </p>
            </div>

            <!-- Current Plan (read-only) -->
            <div>
              <p class="text-sm text-slate-600">Aktuálny plán</p>
              <span
                v-if="client.currentPlan"
                class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium text-white mt-1"
                :style="{ backgroundColor: 'var(--color-dark-green)' }"
              >
                {{ client.currentPlan }}
              </span>
              <p v-else class="text-slate-400">-</p>
            </div>

            <!-- Statistics (read-only) -->
            <div>
              <p class="text-sm text-slate-600">Celkom objednávok</p>
              <p class="text-base font-medium text-slate-900">{{ client.totalOrders }}</p>
            </div>

            <div>
              <p class="text-sm text-slate-600">Celková hodnota objednávok</p>
              <p class="text-base font-semibold" style="color: var(--color-dark-green)">
                {{ formatPrice(client.totalSpent) }}
              </p>
            </div>

            <div v-if="client.subscriptionEndDate">
              <p class="text-sm text-slate-600">Koniec predplatného</p>
              <p class="text-base font-medium text-slate-900">
                {{ formatDate(client.subscriptionEndDate) }}
              </p>
            </div>
          </div>
        </UCard>

        <!-- Card 2: Osobné údaje -->
        <UCard>
          <template #header>
            <h3 class="text-xl font-bold text-slate-900">Osobné údaje</h3>
          </template>

          <div class="space-y-4">
            <!-- Birth Date -->
            <div>
              <label class="text-sm text-slate-600 block mb-1">Dátum narodenia</label>
              <UInput
                v-if="isEditing"
                v-model="formData.birthDate"
                placeholder="DD.MM.YYYY"
                size="lg"
              />
              <template v-else>
                <p v-if="client.birthDate" class="text-base font-medium text-slate-900">
                  {{ client.birthDate }}
                  <span v-if="calculateAge(client.birthDate)" class="text-slate-600">
                    ({{ calculateAge(client.birthDate) }} rokov)
                  </span>
                </p>
                <p v-else class="text-slate-400">-</p>
              </template>
            </div>

            <!-- Height -->
            <div>
              <label class="text-sm text-slate-600 block mb-1">Výška (cm)</label>
              <UInput
                v-if="isEditing"
                v-model.number="formData.height"
                type="number"
                placeholder="napr. 175"
                size="lg"
                :color="validationErrors.height ? 'error' : undefined"
              />
              <template v-else>
                <p v-if="client.height" class="text-base font-medium text-slate-900">
                  {{ client.height }} cm
                </p>
                <p v-else class="text-slate-400">-</p>
              </template>
              <p v-if="validationErrors.height" class="text-xs text-red-500 mt-1">
                {{ validationErrors.height }}
              </p>
            </div>

            <!-- Weight -->
            <div>
              <label class="text-sm text-slate-600 block mb-1">Hmotnosť (kg)</label>
              <UInput
                v-if="isEditing"
                v-model.number="formData.weight"
                type="number"
                placeholder="napr. 70"
                size="lg"
                :color="validationErrors.weight ? 'error' : undefined"
              />
              <template v-else>
                <p v-if="client.weight" class="text-base font-medium text-slate-900">
                  {{ client.weight }} kg
                </p>
                <p v-else class="text-slate-400">-</p>
              </template>
              <p v-if="validationErrors.weight" class="text-xs text-red-500 mt-1">
                {{ validationErrors.weight }}
              </p>
            </div>

            <!-- Physical Activity -->
            <div>
              <label class="text-sm text-slate-600 block mb-1">Fyzická aktivita</label>
              <USelect
                v-if="isEditing"
                v-model="formData.physicalActivity"
                :items="physicalActivityOptions"
                placeholder="Vyberte úroveň"
                size="lg"
              />
              <template v-else>
                <p v-if="client.physicalActivity" class="text-base font-medium text-slate-900 capitalize">
                  {{ client.physicalActivity }}
                </p>
                <p v-else class="text-slate-400">-</p>
              </template>
            </div>

            <!-- Work Activity -->
            <div>
              <label class="text-sm text-slate-600 block mb-1">Pracovná aktivita</label>
              <USelect
                v-if="isEditing"
                v-model="formData.workActivity"
                :items="workActivityOptions"
                placeholder="Vyberte úroveň"
                size="lg"
              />
              <template v-else>
                <p v-if="client.workActivity" class="text-base font-medium text-slate-900 capitalize">
                  {{ client.workActivity }}
                </p>
                <p v-else class="text-slate-400">-</p>
              </template>
            </div>

            <!-- Stress Level -->
            <div>
              <label class="text-sm text-slate-600 block mb-1">Úroveň stresu</label>
              <USelect
                v-if="isEditing"
                v-model="formData.stressLevel"
                :items="stressLevelOptions"
                placeholder="Vyberte úroveň"
                size="lg"
              />
              <template v-else>
                <p v-if="client.stressLevel" class="text-base font-medium text-slate-900 capitalize">
                  {{ client.stressLevel }}
                </p>
                <p v-else class="text-slate-400">-</p>
              </template>
            </div>

            <!-- Goal -->
            <div>
              <label class="text-sm text-slate-600 block mb-1">Cieľ</label>
              <UTextarea
                v-if="isEditing"
                v-model="formData.goal"
                placeholder="Cieľ zákazníka..."
                :rows="3"
                :color="validationErrors.goal ? 'error' : undefined"
              />
              <template v-else>
                <p v-if="client.goal" class="text-base font-medium text-slate-900">
                  {{ client.goal }}
                </p>
                <p v-else class="text-slate-400">-</p>
              </template>
              <p v-if="validationErrors.goal" class="text-xs text-red-500 mt-1">
                {{ validationErrors.goal }}
              </p>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Orders History Section -->
      <UCard>
        <template #header>
          <h3 class="text-xl font-bold text-slate-900">História objednávok</h3>
        </template>

        <div v-if="clientOrders.length === 0" class="text-center py-8">
          <UIcon name="i-heroicons-shopping-bag" class="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p class="text-slate-600">Žiadne objednávky</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-slate-200">
                <th class="text-left px-4 py-3 text-sm font-semibold text-slate-700">ID</th>
                <th class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Balíček</th>
                <th class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Cena</th>
                <th class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Stav</th>
                <th class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Vytvorené</th>
                <th class="text-right px-4 py-3 text-sm font-semibold text-slate-700">Akcia</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="order in clientOrders"
                :key="order.firestoreId"
                class="border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <td class="px-4 py-3">
                  <span class="font-mono text-sm">#{{ order.orderId }}</span>
                </td>
                <td class="px-4 py-3">
                  <span
                    class="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium text-white"
                    :style="{ backgroundColor: 'var(--color-dark-green)' }"
                  >
                    {{ order.package }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span class="font-medium" style="color: var(--color-dark-green)">
                    {{ formatPrice(order.totalPrice) }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span
                    class="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium"
                    :class="{
                      'text-white': order.orderStatus === 'pending' || order.orderStatus === 'approved',
                      'text-dark-green': order.orderStatus === 'cancelled',
                    }"
                    :style="{
                      backgroundColor: order.orderStatus === 'pending' ? 'var(--color-orange)' :
                                       order.orderStatus === 'approved' ? 'var(--color-dark-green)' :
                                       'var(--color-beige)'
                    }"
                  >
                    {{ ORDER_STATUS_LABELS[order.orderStatus] }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span class="text-sm text-slate-600">{{ formatDateTime(order.createdAt) }}</span>
                </td>
                <td class="px-4 py-3 text-right">
                  <UButton
                    size="sm"
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-eye"
                    class="cursor-pointer"
                    @click="viewOrder(order.orderId)"
                  >
                    Detail
                  </UButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </div>

    <!-- Error State -->
    <div v-else class="text-center py-12">
      <UIcon name="i-heroicons-exclamation-circle" class="w-12 h-12 text-slate-400 mx-auto mb-4" />
      <p class="text-slate-600">Používateľ nenájdený</p>
    </div>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteConfirm">
      <template #content>
        <div class="p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-600" />
            </div>
            <h3 class="text-lg font-semibold text-slate-900">Vymazať zákazníka?</h3>
          </div>

          <p class="text-slate-600 mb-6">
            Naozaj chcete vymazať tohto zákazníka? Táto akcia je nevratná.
            <template v-if="clientOrders.length > 0">
              Spolu s ním bude vymazaných {{ clientOrders.length }} objednávok.
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
              @click="deleteClient"
            >
              Vymazať
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
