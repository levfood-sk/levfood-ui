<script setup lang="ts">
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

// Ensure Chart.js is registered
if (typeof window !== 'undefined') {
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
  )
}

interface ChartData {
  month: string
  count: number
}

type ViewType = 'year' | 'month'

interface Props {
  data: ChartData[]
  viewType?: ViewType
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  viewType: 'month'
})


const chartData = computed(() => {
  if (!props.data || props.data.length === 0) {
    return {
      labels: [],
      datasets: []
    }
  }

  const labels = props.data.map(d => {
    if (props.viewType === 'year') {
      return d.month
    }

    // Default: month view
    const parts = d.month.split('-')
    const year = parts[0]
    const month = parts[1]
    if (year && month) {
      const date = new Date(parseInt(year), parseInt(month) - 1, 1)
      return date.toLocaleDateString('sk-SK', { month: 'short', year: 'numeric' })
    }
    return d.month
  })

  const dataValues = props.data.map(d => d.count)

  return {
    labels,
    datasets: [
      {
        label: 'Počet klientov',
        data: dataValues,
        borderColor: '#0E2825',
        backgroundColor: 'rgba(14, 40, 37, 0.1)',
        tension: 0.4,
        fill: true,
        borderWidth: 2,
        pointBackgroundColor: '#0E2825',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#F28E7A',
        pointHoverBorderColor: '#FFFFFF',
      },
    ],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: 'rgba(14, 40, 37, 0.95)',
      padding: 12,
      titleFont: { 
        size: 13,
        weight: '600',
      },
      bodyFont: { 
        size: 12,
        weight: '400',
      },
      titleColor: '#FCEFE6',
      bodyColor: '#FCEFE6',
      borderColor: '#F28E7A',
      borderWidth: 1,
      cornerRadius: 8,
      displayColors: false,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      min: 0,
      ticks: {
        stepSize: 1,
        color: '#6B7280',
        font: {
          size: 11,
        },
      },
      grid: {
        color: 'rgba(14, 40, 37, 0.08)',
      },
    },
    x: {
      ticks: {
        color: '#6B7280',
        font: {
          size: 11,
        },
      },
      grid: {
        display: false,
      },
    },
  },
}
</script>

<template>
  <div class="relative w-full h-full">
    <ClientOnly>
      <Line :data="chartData" :options="chartOptions" />
      <template #fallback>
        <div class="flex items-center justify-center h-full">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

