<template>
  <div class="container max-w-7xl">
    <!-- Page Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-[var(--color-dark-green)] mb-2">Objednávky Jedál</h1>
      <p class="text-[var(--color-dark-green)]/60">Prehľad výberu jedál pre produkciu</p>
    </div>

    <div class="space-y-6">
      <!-- Date Navigation -->
      <div class="bg-white rounded-2xl shadow-sm border border-[var(--color-dark-green)]/10 p-4">
        <div class="flex flex-col md:flex-row items-center gap-4">
          <div class="flex items-center gap-1">
            <button 
              class="p-2 rounded-lg hover:bg-[var(--color-beige)] transition-colors"
              @click="goToPreviousDay"
            >
              <UIcon name="i-heroicons-chevron-left" class="w-5 h-5 text-[var(--color-dark-green)]" />
            </button>
            <input
              v-model="selectedDate"
              type="date"
              class="px-4 py-2 rounded-xl border border-[var(--color-dark-green)]/20 bg-[var(--color-beige)]/50 text-[var(--color-dark-green)] font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/50"
            />
            <button 
              class="p-2 rounded-lg hover:bg-[var(--color-beige)] transition-colors"
              @click="goToNextDay"
            >
              <UIcon name="i-heroicons-chevron-right" class="w-5 h-5 text-[var(--color-dark-green)]" />
            </button>
          </div>
          <div class="flex gap-2">
            <button
              class="px-4 py-2 rounded-xl border-2 border-[var(--color-dark-green)]/20 text-[var(--color-dark-green)] font-medium hover:bg-[var(--color-beige)] transition-colors"
              @click="goToToday"
            >
              Dnes
            </button>
            <button
              class="px-4 py-2 rounded-xl border-2 border-[var(--color-dark-green)]/20 text-[var(--color-dark-green)] font-medium hover:bg-[var(--color-beige)] transition-colors"
              @click="goToTomorrow"
            >
              Zajtra
            </button>
          </div>
          <div class="flex-1" />
          <button
            class="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-orange)] text-[var(--color-dark-green)] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            :disabled="isLoading"
            @click="fetchMealOrders"
          >
            <UIcon 
              name="i-heroicons-arrow-path" 
              class="w-5 h-5" 
              :class="{ 'animate-spin': isLoading }" 
            />
            Obnoviť
          </button>
        </div>
        
        <!-- Formatted date display -->
        <div class="mt-3 text-center md:text-left">
          <span class="text-lg font-semibold text-[var(--color-dark-green)]">{{ formattedDate }}</span>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-16">
        <div class="w-16 h-16 rounded-full bg-[var(--color-beige)] flex items-center justify-center mb-4">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-[var(--color-orange)]" />
        </div>
        <p class="text-[var(--color-dark-green)]/60">Načítavam objednávky...</p>
      </div>

      <!-- No Data -->
      <div v-else-if="!mealOrders || mealOrders.totalOrders === 0" class="bg-white rounded-2xl shadow-sm border border-[var(--color-dark-green)]/10 p-12">
        <div class="text-center">
          <div class="w-20 h-20 rounded-full bg-[var(--color-beige)] flex items-center justify-center mx-auto mb-4">
            <UIcon name="i-heroicons-calendar" class="w-10 h-10 text-[var(--color-dark-green)]/40" />
          </div>
          <h3 class="text-xl font-semibold text-[var(--color-dark-green)] mb-2">Žiadne objednávky</h3>
          <p class="text-[var(--color-dark-green)]/60 max-w-md mx-auto">
            {{ mealOrders?.message || 'Pre tento deň zatiaľ nie sú žiadne objednávky jedál.' }}
          </p>
        </div>
      </div>

      <template v-else>
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Total Orders Card -->
          <div class="bg-[var(--color-dark-green)] rounded-2xl p-6 text-white">
            <p class="text-white/70 text-sm mb-1">Celkom objednávok</p>
            <p class="text-4xl font-bold">{{ mealOrders.totalOrders }}</p>
          </div>
          
          <!-- Quick Stats Card -->
          <div class="md:col-span-3 bg-white rounded-2xl shadow-sm border border-[var(--color-dark-green)]/10 p-6">
            <div class="grid grid-cols-2 gap-6">
              <!-- Ranajky Summary -->
              <div>
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-8 h-8 rounded-lg bg-[var(--color-orange)]/20 flex items-center justify-center">
                    <UIcon name="i-heroicons-sun" class="w-4 h-4 text-[var(--color-orange)]" />
                  </div>
                  <span class="font-semibold text-[var(--color-dark-green)]">Raňajky</span>
                </div>
                <div class="space-y-2">
                  <div class="flex justify-between items-center p-2 rounded-lg bg-[var(--color-beige)]/50">
                    <span class="text-sm text-[var(--color-dark-green)]/70 truncate flex-1" :title="mealOrders.ranajkyCounts?.optionA?.name">
                      <span class="font-semibold text-[var(--color-dark-green)]">A:</span> {{ truncate(mealOrders.ranajkyCounts?.optionA?.name, 18) }}
                    </span>
                    <span class="font-bold text-[var(--color-dark-green)] ml-2">{{ mealOrders.ranajkyCounts?.optionA?.count || 0 }}×</span>
                  </div>
                  <div class="flex justify-between items-center p-2 rounded-lg bg-[var(--color-beige)]/50">
                    <span class="text-sm text-[var(--color-dark-green)]/70 truncate flex-1" :title="mealOrders.ranajkyCounts?.optionB?.name">
                      <span class="font-semibold text-[var(--color-dark-green)]">B:</span> {{ truncate(mealOrders.ranajkyCounts?.optionB?.name, 18) }}
                    </span>
                    <span class="font-bold text-[var(--color-dark-green)] ml-2">{{ mealOrders.ranajkyCounts?.optionB?.count || 0 }}×</span>
                  </div>
                </div>
              </div>
              <!-- Obed Summary -->
              <div>
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-8 h-8 rounded-lg bg-[var(--color-dark-green)]/10 flex items-center justify-center">
                    <UIcon name="i-heroicons-fire" class="w-4 h-4 text-[var(--color-dark-green)]" />
                  </div>
                  <span class="font-semibold text-[var(--color-dark-green)]">Obed</span>
                </div>
                <div class="space-y-2">
                  <div class="flex justify-between items-center p-2 rounded-lg bg-[var(--color-beige)]/50">
                    <span class="text-sm text-[var(--color-dark-green)]/70 truncate flex-1" :title="mealOrders.obedCounts?.optionA?.name">
                      <span class="font-semibold text-[var(--color-dark-green)]">A:</span> {{ truncate(mealOrders.obedCounts?.optionA?.name, 18) }}
                    </span>
                    <span class="font-bold text-[var(--color-dark-green)] ml-2">{{ mealOrders.obedCounts?.optionA?.count || 0 }}×</span>
                  </div>
                  <div class="flex justify-between items-center p-2 rounded-lg bg-[var(--color-beige)]/50">
                    <span class="text-sm text-[var(--color-dark-green)]/70 truncate flex-1" :title="mealOrders.obedCounts?.optionB?.name">
                      <span class="font-semibold text-[var(--color-dark-green)]">B:</span> {{ truncate(mealOrders.obedCounts?.optionB?.name, 18) }}
                    </span>
                    <span class="font-bold text-[var(--color-dark-green)] ml-2">{{ mealOrders.obedCounts?.optionB?.count || 0 }}×</span>
                  </div>
                  <div class="flex justify-between items-center p-2 rounded-lg bg-[var(--color-beige)]/50">
                    <span class="text-sm text-[var(--color-dark-green)]/70 truncate flex-1" :title="mealOrders.obedCounts?.optionC?.name">
                      <span class="font-semibold text-[var(--color-dark-green)]">C:</span> {{ truncate(mealOrders.obedCounts?.optionC?.name, 18) }}
                    </span>
                    <span class="font-bold text-[var(--color-dark-green)] ml-2">{{ mealOrders.obedCounts?.optionC?.count || 0 }}×</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Production Summary -->
        <div class="bg-[var(--color-beige)] rounded-2xl p-6">
          <h2 class="text-xl font-bold text-[var(--color-dark-green)] mb-4 flex items-center gap-2">
            <UIcon name="i-heroicons-clipboard-document-list" class="w-6 h-6" />
            Súhrn pre produkciu
          </h2>
          
          <div class="grid md:grid-cols-2 gap-6">
            <!-- Ranajky Production -->
            <div class="bg-white rounded-xl p-5">
              <h3 class="font-semibold text-[var(--color-dark-green)] mb-4 flex items-center gap-2">
                <UIcon name="i-heroicons-sun" class="w-5 h-5 text-[var(--color-orange)]" />
                Raňajky
              </h3>
              <div class="space-y-3">
                <div class="flex items-center gap-4 p-4 bg-[var(--color-orange)]/10 rounded-xl border-2 border-[var(--color-orange)]/20">
                  <div class="w-12 h-12 rounded-full bg-[var(--color-orange)] text-white flex items-center justify-center font-bold text-lg">A</div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-[var(--color-dark-green)] truncate">{{ mealOrders.ranajkyCounts?.optionA?.name || 'Variant A' }}</p>
                  </div>
                  <span class="text-3xl font-bold text-[var(--color-orange)]">{{ mealOrders.ranajkyCounts?.optionA?.count || 0 }}</span>
                </div>
                <div class="flex items-center gap-4 p-4 bg-[var(--color-dark-green)]/5 rounded-xl border-2 border-[var(--color-dark-green)]/10">
                  <div class="w-12 h-12 rounded-full bg-[var(--color-dark-green)] text-white flex items-center justify-center font-bold text-lg">B</div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-[var(--color-dark-green)] truncate">{{ mealOrders.ranajkyCounts?.optionB?.name || 'Variant B' }}</p>
                  </div>
                  <span class="text-3xl font-bold text-[var(--color-dark-green)]">{{ mealOrders.ranajkyCounts?.optionB?.count || 0 }}</span>
                </div>
              </div>
            </div>

            <!-- Obed Production -->
            <div class="bg-white rounded-xl p-5">
              <h3 class="font-semibold text-[var(--color-dark-green)] mb-4 flex items-center gap-2">
                <UIcon name="i-heroicons-fire" class="w-5 h-5 text-[var(--color-dark-green)]" />
                Obed
              </h3>
              <div class="space-y-3">
                <div class="flex items-center gap-4 p-4 bg-[var(--color-orange)]/10 rounded-xl border-2 border-[var(--color-orange)]/20">
                  <div class="w-12 h-12 rounded-full bg-[var(--color-orange)] text-white flex items-center justify-center font-bold text-lg">A</div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-[var(--color-dark-green)] truncate">{{ mealOrders.obedCounts?.optionA?.name || 'Variant A' }}</p>
                  </div>
                  <span class="text-3xl font-bold text-[var(--color-orange)]">{{ mealOrders.obedCounts?.optionA?.count || 0 }}</span>
                </div>
                <div class="flex items-center gap-4 p-4 bg-[var(--color-dark-green)]/5 rounded-xl border-2 border-[var(--color-dark-green)]/10">
                  <div class="w-12 h-12 rounded-full bg-[var(--color-dark-green)] text-white flex items-center justify-center font-bold text-lg">B</div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-[var(--color-dark-green)] truncate">{{ mealOrders.obedCounts?.optionB?.name || 'Variant B' }}</p>
                  </div>
                  <span class="text-3xl font-bold text-[var(--color-dark-green)]">{{ mealOrders.obedCounts?.optionB?.count || 0 }}</span>
                </div>
                <div class="flex items-center gap-4 p-4 bg-[var(--color-beige)] rounded-xl border-2 border-[var(--color-dark-green)]/10">
                  <div class="w-12 h-12 rounded-full bg-[var(--color-dark-green)]/70 text-white flex items-center justify-center font-bold text-lg">C</div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-[var(--color-dark-green)] truncate">{{ mealOrders.obedCounts?.optionC?.name || 'Variant C' }}</p>
                  </div>
                  <span class="text-3xl font-bold text-[var(--color-dark-green)]/70">{{ mealOrders.obedCounts?.optionC?.count || 0 }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Orders by Package -->
        <div class="space-y-4">
          <h2 class="text-xl font-bold text-[var(--color-dark-green)] flex items-center gap-2">
            <UIcon name="i-heroicons-users" class="w-6 h-6" />
            Podľa balíčka
          </h2>
          
          <template v-for="(packageData, packageName) in mealOrders.byPackage" :key="packageName">
            <div class="bg-white rounded-2xl shadow-sm border border-[var(--color-dark-green)]/10 overflow-hidden">
              <div class="px-6 py-4 bg-[var(--color-dark-green)] text-white flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="text-lg font-bold">{{ packageName }}</span>
                  <span class="px-3 py-1 rounded-full bg-white/20 text-sm font-medium">
                    {{ packageData.count }} {{ packageData.count === 1 ? 'klient' : 'klientov' }}
                  </span>
                </div>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead>
                    <tr class="border-b border-[var(--color-dark-green)]/10 bg-[var(--color-beige)]/30">
                      <th class="text-left px-6 py-3 text-sm font-semibold text-[var(--color-dark-green)]">Klient</th>
                      <th class="text-left px-6 py-3 text-sm font-semibold text-[var(--color-dark-green)]">Objednávka</th>
                      <th class="text-left px-6 py-3 text-sm font-semibold text-[var(--color-dark-green)]">Raňajky</th>
                      <th class="text-left px-6 py-3 text-sm font-semibold text-[var(--color-dark-green)]">Obed</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr 
                      v-for="(client, idx) in packageData.clients" 
                      :key="client.clientId"
                      class="border-b border-[var(--color-dark-green)]/5 hover:bg-[var(--color-beige)]/30 transition-colors"
                      :class="{ 'bg-[var(--color-beige)]/20': idx % 2 === 1 }"
                    >
                      <td class="px-6 py-4">
                        <span class="font-medium text-[var(--color-dark-green)]">{{ client.clientName }}</span>
                      </td>
                      <td class="px-6 py-4">
                        <span class="text-[var(--color-dark-green)]/60 font-mono text-sm">#{{ client.orderId }}</span>
                      </td>
                      <td class="px-6 py-4">
                        <div class="flex items-center gap-2">
                          <span 
                            class="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
                            :class="client.selectedRanajky === 'A' ? 'bg-[var(--color-orange)] text-white' : 'bg-[var(--color-dark-green)] text-white'"
                          >
                            {{ client.selectedRanajky }}
                          </span>
                          <span class="text-sm text-[var(--color-dark-green)]/70 truncate max-w-40">{{ client.ranajkyName }}</span>
                        </div>
                      </td>
                      <td class="px-6 py-4">
                        <div class="flex items-center gap-2">
                          <span 
                            class="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
                            :class="{
                              'bg-[var(--color-orange)] text-white': client.selectedObed === 'A',
                              'bg-[var(--color-dark-green)] text-white': client.selectedObed === 'B',
                              'bg-[var(--color-dark-green)]/70 text-white': client.selectedObed === 'C'
                            }"
                          >
                            {{ client.selectedObed }}
                          </span>
                          <span class="text-sm text-[var(--color-dark-green)]/70 truncate max-w-40">{{ client.obedName }}</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

interface ClientSelection {
  clientId: string
  clientName: string
  orderId: string
  selectedRanajky: 'A' | 'B'
  ranajkyName: string
  selectedObed: 'A' | 'B' | 'C'
  obedName: string
}

interface PackageGroup {
  count: number
  clients: ClientSelection[]
}

interface MealOrderSummary {
  date: string
  totalOrders: number
  message?: string
  byPackage: Record<string, PackageGroup>
  ranajkyCounts: {
    optionA: { name: string; count: number }
    optionB: { name: string; count: number }
  }
  obedCounts: {
    optionA: { name: string; count: number }
    optionB: { name: string; count: number }
    optionC: { name: string; count: number }
  }
}

const toast = useToast()

// State
const isLoading = ref(false)
const mealOrders = ref<MealOrderSummary | null>(null)

// Default to tomorrow + 2 days (typical production lead time)
const getDefaultDate = () => {
  const date = new Date()
  date.setDate(date.getDate() + 2) // 2 days ahead for production
  return date.toISOString().split('T')[0]
}

const selectedDate = ref(getDefaultDate())

// Formatted date for display
const formattedDate = computed(() => {
  const [year, month, day] = selectedDate.value.split('-').map(Number)
  const dateObj = new Date(year, month - 1, day)
  const dayNames = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota']
  const months = ['januára', 'februára', 'marca', 'apríla', 'mája', 'júna', 'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra']
  return `${dayNames[dateObj.getDay()]}, ${day}. ${months[month - 1]} ${year}`
})

// Helpers
const truncate = (str: string | undefined, maxLength: number) => {
  if (!str) return '-'
  return str.length > maxLength ? str.slice(0, maxLength) + '...' : str
}

const goToPreviousDay = () => {
  const date = new Date(selectedDate.value)
  date.setDate(date.getDate() - 1)
  selectedDate.value = date.toISOString().split('T')[0]
}

const goToNextDay = () => {
  const date = new Date(selectedDate.value)
  date.setDate(date.getDate() + 1)
  selectedDate.value = date.toISOString().split('T')[0]
}

const goToToday = () => {
  selectedDate.value = new Date().toISOString().split('T')[0]
}

const goToTomorrow = () => {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  selectedDate.value = date.toISOString().split('T')[0]
}

// Fetch data
const fetchMealOrders = async () => {
  isLoading.value = true
  try {
    const response = await useAuthFetch(`/api/admin/meal-orders/${selectedDate.value}`)
    mealOrders.value = response as MealOrderSummary
  } catch (error: any) {
    console.error('Error fetching meal orders:', error)
    toast.add({
      title: 'Chyba',
      description: error.data?.message || 'Nepodarilo sa načítať objednávky',
      color: 'error',
    })
    mealOrders.value = null
  } finally {
    isLoading.value = false
  }
}

// Watch for date changes
watch(selectedDate, () => {
  fetchMealOrders()
})

// Initial load
onMounted(async () => {
  const { isAuthenticated, loading: authLoading } = useAuth()
  
  if (authLoading.value) {
    await new Promise<void>((resolve) => {
      const unwatch = watch(authLoading, (loading) => {
        if (!loading) {
          unwatch()
          resolve()
        }
      }, { immediate: true })
    })
  }

  if (isAuthenticated.value) {
    fetchMealOrders()
  }
})
</script>
