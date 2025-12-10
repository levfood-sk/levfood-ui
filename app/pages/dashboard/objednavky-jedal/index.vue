<template>
  <div class="container max-w-7xl">
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-2">Objednávky Jedál</h1>
      <p class="text-gray-600">Prehľad výberu jedál pre produkciu</p>
    </div>

    <div class="space-y-6">
      <!-- Date Navigation -->
      <UCard>
        <div class="flex flex-col md:flex-row items-center gap-4">
          <div class="flex items-center gap-2">
            <UButton
              icon="i-heroicons-chevron-left"
              color="neutral"
              variant="ghost"
              @click="goToPreviousDay"
            />
            <UInput
              v-model="selectedDate"
              type="date"
              class="w-48"
            />
            <UButton
              icon="i-heroicons-chevron-right"
              color="neutral"
              variant="ghost"
              @click="goToNextDay"
            />
          </div>
          <div class="flex gap-2">
            <UButton
              color="neutral"
              variant="outline"
              @click="goToToday"
            >
              Dnes
            </UButton>
            <UButton
              color="neutral"
              variant="outline"
              @click="goToTomorrow"
            >
              Zajtra
            </UButton>
          </div>
          <div class="flex-1" />
          <UButton
            icon="i-heroicons-arrow-path"
            color="neutral"
            variant="ghost"
            :loading="isLoading"
            @click="fetchMealOrders"
          >
            Obnoviť
          </UButton>
        </div>
      </UCard>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-[var(--color-orange)]" />
      </div>

      <!-- No Data -->
      <UCard v-else-if="!mealOrders || mealOrders.totalOrders === 0">
        <div class="text-center py-12">
          <UIcon name="i-heroicons-calendar" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 class="text-xl font-semibold text-gray-600 mb-2">Žiadne objednávky</h3>
          <p class="text-gray-500">
            {{ mealOrders?.message || 'Pre tento deň zatiaľ nie sú žiadne objednávky jedál.' }}
          </p>
        </div>
      </UCard>

      <template v-else>
        <!-- Summary Cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <UCard>
            <div class="text-center">
              <p class="text-sm text-gray-500 mb-1">Celkom objednávok</p>
              <p class="text-3xl font-bold text-[var(--color-dark-green)]">{{ mealOrders.totalOrders }}</p>
            </div>
          </UCard>
          <UCard class="col-span-2 md:col-span-3">
            <div class="grid grid-cols-2 gap-4">
              <!-- Ranajky Summary -->
              <div>
                <p class="text-sm font-medium text-gray-700 mb-2">Raňajky</p>
                <div class="space-y-1">
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600 truncate max-w-32" :title="mealOrders.ranajkyCounts?.optionA?.name">
                      A: {{ truncate(mealOrders.ranajkyCounts?.optionA?.name, 20) }}
                    </span>
                    <span class="font-semibold">{{ mealOrders.ranajkyCounts?.optionA?.count || 0 }}x</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600 truncate max-w-32" :title="mealOrders.ranajkyCounts?.optionB?.name">
                      B: {{ truncate(mealOrders.ranajkyCounts?.optionB?.name, 20) }}
                    </span>
                    <span class="font-semibold">{{ mealOrders.ranajkyCounts?.optionB?.count || 0 }}x</span>
                  </div>
                </div>
              </div>
              <!-- Obed Summary -->
              <div>
                <p class="text-sm font-medium text-gray-700 mb-2">Obed</p>
                <div class="space-y-1">
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600 truncate max-w-32" :title="mealOrders.obedCounts?.optionA?.name">
                      A: {{ truncate(mealOrders.obedCounts?.optionA?.name, 20) }}
                    </span>
                    <span class="font-semibold">{{ mealOrders.obedCounts?.optionA?.count || 0 }}x</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600 truncate max-w-32" :title="mealOrders.obedCounts?.optionB?.name">
                      B: {{ truncate(mealOrders.obedCounts?.optionB?.name, 20) }}
                    </span>
                    <span class="font-semibold">{{ mealOrders.obedCounts?.optionB?.count || 0 }}x</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600 truncate max-w-32" :title="mealOrders.obedCounts?.optionC?.name">
                      C: {{ truncate(mealOrders.obedCounts?.optionC?.name, 20) }}
                    </span>
                    <span class="font-semibold">{{ mealOrders.obedCounts?.optionC?.count || 0 }}x</span>
                  </div>
                </div>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Orders by Package -->
        <div class="space-y-4">
          <h2 class="text-xl font-semibold">Podľa balíčka</h2>
          
          <template v-for="(packageData, packageName) in mealOrders.byPackage" :key="packageName">
            <UCard>
              <template #header>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span 
                      class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium text-white"
                      style="background-color: var(--color-dark-green)"
                    >
                      {{ packageName }}
                    </span>
                    <span class="text-gray-500">{{ packageData.count }} objednávok</span>
                  </div>
                </div>
              </template>

              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead>
                    <tr class="border-b border-gray-200">
                      <th class="text-left px-4 py-2 text-sm font-semibold text-gray-700">Klient</th>
                      <th class="text-left px-4 py-2 text-sm font-semibold text-gray-700">Objednávka</th>
                      <th class="text-left px-4 py-2 text-sm font-semibold text-gray-700">Raňajky</th>
                      <th class="text-left px-4 py-2 text-sm font-semibold text-gray-700">Obed</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr 
                      v-for="client in packageData.clients" 
                      :key="client.clientId"
                      class="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td class="px-4 py-3">
                        <span class="font-medium text-gray-900">{{ client.clientName }}</span>
                      </td>
                      <td class="px-4 py-3">
                        <span class="text-gray-600 font-mono text-sm">#{{ client.orderId }}</span>
                      </td>
                      <td class="px-4 py-3">
                        <span 
                          class="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                          :class="client.selectedRanajky === 'A' ? 'bg-pink-100 text-pink-800' : 'bg-yellow-100 text-yellow-800'"
                        >
                          Variant {{ client.selectedRanajky }}
                        </span>
                        <p class="text-sm text-gray-500 mt-1">{{ client.ranajkyName }}</p>
                      </td>
                      <td class="px-4 py-3">
                        <span 
                          class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          Variant {{ client.selectedObed }}
                        </span>
                        <p class="text-sm text-gray-500 mt-1">{{ client.obedName }}</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </UCard>
          </template>
        </div>

        <!-- Production Summary -->
        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold">Súhrn pre produkciu</h2>
          </template>
          
          <div class="grid md:grid-cols-2 gap-6">
            <!-- Ranajky Production -->
            <div>
              <h3 class="font-medium text-gray-700 mb-3">Raňajky - potrebné pripraviť</h3>
              <div class="space-y-2">
                <div class="flex items-center justify-between p-3 bg-pink-50 rounded-lg">
                  <div>
                    <span class="font-medium">Variant A</span>
                    <p class="text-sm text-gray-500">{{ mealOrders.ranajkyCounts?.optionA?.name }}</p>
                  </div>
                  <span class="text-2xl font-bold text-pink-600">{{ mealOrders.ranajkyCounts?.optionA?.count || 0 }}</span>
                </div>
                <div class="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div>
                    <span class="font-medium">Variant B</span>
                    <p class="text-sm text-gray-500">{{ mealOrders.ranajkyCounts?.optionB?.name }}</p>
                  </div>
                  <span class="text-2xl font-bold text-yellow-600">{{ mealOrders.ranajkyCounts?.optionB?.count || 0 }}</span>
                </div>
              </div>
            </div>

            <!-- Obed Production -->
            <div>
              <h3 class="font-medium text-gray-700 mb-3">Obed - potrebné pripraviť</h3>
              <div class="space-y-2">
                <div class="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <span class="font-medium">Variant A</span>
                    <p class="text-sm text-gray-500">{{ mealOrders.obedCounts?.optionA?.name }}</p>
                  </div>
                  <span class="text-2xl font-bold text-blue-600">{{ mealOrders.obedCounts?.optionA?.count || 0 }}</span>
                </div>
                <div class="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <span class="font-medium">Variant B</span>
                    <p class="text-sm text-gray-500">{{ mealOrders.obedCounts?.optionB?.name }}</p>
                  </div>
                  <span class="text-2xl font-bold text-green-600">{{ mealOrders.obedCounts?.optionB?.count || 0 }}</span>
                </div>
                <div class="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div>
                    <span class="font-medium">Variant C</span>
                    <p class="text-sm text-gray-500">{{ mealOrders.obedCounts?.optionC?.name }}</p>
                  </div>
                  <span class="text-2xl font-bold text-purple-600">{{ mealOrders.obedCounts?.optionC?.count || 0 }}</span>
                </div>
              </div>
            </div>
          </div>
        </UCard>
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
