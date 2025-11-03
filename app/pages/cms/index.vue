<script setup lang="ts">

definePageMeta({
  layout: 'dashboard',
})

// State
const stats = ref({
  activeSubscribers: 0,
  newOrdersWeek: 0,
  approvedOrders: 0,
  pendingOrders: 0,
})

const chartData = ref({
  clientCount: [] as Array<{ month: string; count: number }>,
  orderTrend: [] as Array<{ package: string; count: number }>,
})

const loading = ref(true)
const clientCountView = ref<'year' | 'month'>('month')

// View options for select
const viewOptions = [
  { label: 'Rok', value: 'year' },
  { label: 'Mesiac', value: 'month' },
]

// Transform chart data based on selected view
const transformedClientCountData = computed(() => {
  if (!chartData.value.clientCount.length) return []

  const data = chartData.value.clientCount

  if (clientCountView.value === 'month') {
    return data
  }

  if (clientCountView.value === 'year') {
    const yearMap = new Map<string, number>()
    data.forEach(item => {
      const parts = item.month.split('-')
      const year = parts[0]
      if (year) {
        yearMap.set(year, (yearMap.get(year) || 0) + item.count)
      }
    })
    return Array.from(yearMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, count]) => ({ month: year, count }))
  }

  return data
})

// Load statistics
const loadStats = async () => {
  try {
    const response = await useAuthFetch<{
      success: boolean
      stats: typeof stats.value
    }>('/api/cms/stats')

    if (response.success) {
      stats.value = response.stats
    }
  } catch (error) {
    console.error('Error loading stats:', error)
    useToast().add({
      title: 'Chyba',
      description: 'Nepodarilo sa načítať štatistiky',
      color: 'error',
    })
  }
}

// Load chart data
const loadCharts = async () => {
  try {
    const response = await useAuthFetch<{
      success: boolean
      charts: typeof chartData.value
    }>('/api/cms/charts')

    if (response.success) {
      chartData.value = response.charts
    }
  } catch (error) {
    console.error('Error loading charts:', error)
    useToast().add({
      title: 'Chyba',
      description: 'Nepodarilo sa načítať dáta pre grafy',
      color: 'error',
    })
  }
}

// Load all data
const loadData = async () => {
  loading.value = true
  await Promise.all([loadStats(), loadCharts()])
  loading.value = false
}

// Load on mount
onMounted(() => {
  loadData()
})
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="mb-8">
      <h2 class="text-3xl font-bold text-slate-900">Dashboard</h2>
      <p class="text-slate-600 mt-2">Prehľad štatistík a trendov</p>
    </div>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <!-- Active Subscribers -->
      <UCard>
        <div class="space-y-1">
          <p class="text-sm text-slate-500">Počet aktívnych predplatiteľov</p>
          <p class="text-2xl font-bold text-slate-900">{{ stats.activeSubscribers }}</p>
        </div>
      </UCard>

      <!-- New Orders -->
      <UCard>
        <div class="space-y-1">
          <p class="text-sm text-slate-500">Nové objednávky (týždeň)</p>
          <p class="text-2xl font-bold text-slate-900">{{ stats.newOrdersWeek }}</p>
        </div>
      </UCard>

      <!-- Pending Orders -->
      <UCard>
        <div class="space-y-1">
          <p class="text-sm text-slate-500">Čakajúce objednávky</p>
          <p class="text-2xl font-bold text-amber-600">{{ stats.pendingOrders }}</p>
        </div>
      </UCard>

      <!-- Approved Orders -->
      <UCard>
        <div class="space-y-1">
          <p class="text-sm text-slate-500">Schválené objednávky</p>
          <p class="text-2xl font-bold text-green-600">{{ stats.approvedOrders }}</p>
        </div>
      </UCard>
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Client Count Chart -->
      <UCard>
        <template #header>
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold text-slate-900">Vývoj počtu klientov</h3>
            <USelect
              v-model="clientCountView"
              :items="viewOptions"
              class="w-32"
              size="sm"
            />
          </div>
        </template>
        <div v-if="loading" class="flex items-center justify-center h-64">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-orange-500" />
        </div>
        <div v-else-if="chartData.clientCount.length === 0" class="flex items-center justify-center h-64 text-slate-500">
          <p>Žiadne dáta</p>
        </div>
        <div v-else class="h-64">
          <CmsClientCountChart :key="`client-${clientCountView}-${transformedClientCountData.length}`" :data="transformedClientCountData" :view-type="clientCountView" />
        </div>
      </UCard>

      <!-- Order Trend Chart -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-slate-900">Trend objednávok</h3>
        </template>
        <div v-if="loading" class="flex items-center justify-center h-64">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-orange-500" />
        </div>
        <div v-else-if="chartData.orderTrend.length === 0" class="flex items-center justify-center h-64 text-slate-500">
          <p>Žiadne dáta</p>
        </div>
        <div v-else class="h-64">
          <CmsOrderTrendChart :key="`order-${chartData.orderTrend.length}`" :data="chartData.orderTrend" />
        </div>
      </UCard>
    </div>
  </div>
</template>
