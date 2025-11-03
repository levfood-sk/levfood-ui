<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

// Ensure Chart.js is registered
if (typeof window !== 'undefined') {
  ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
  )
}

interface ChartData {
  package: string
  count: number
}

interface Props {
  data: ChartData[]
}

const props = withDefaults(defineProps<Props>(), {
  data: () => []
})


const chartData = computed(() => {
  if (!props.data || props.data.length === 0) {
    return {
      labels: [],
      datasets: []
    }
  }

  const labels = props.data.map(d => d.package)
  const colors = {
    EKONOMY: '#F28E7A',
    ŠTANDARD: '#0E2825',
    PREMIUM: '#FCEFE6',
  }
  const borderColors = {
    EKONOMY: '#F28E7A',
    ŠTANDARD: '#0E2825',
    PREMIUM: '#0E2825', // Dark border for light beige background
  }

  const dataValues = props.data.map(d => d.count)
  const backgroundColorsArray = props.data.map(d => colors[d.package as keyof typeof colors] || '#9CA3AF')
  const borderColorsArray = props.data.map(d => borderColors[d.package as keyof typeof borderColors] || '#9CA3AF')

  return {
    labels,
    datasets: [
      {
        label: 'Počet objednávok',
        data: dataValues,
        backgroundColor: backgroundColorsArray,
        borderColor: borderColorsArray,
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
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
      displayColors: true,
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
      <Bar :data="chartData" :options="chartOptions" />
      <template #fallback>
        <div class="flex items-center justify-center h-full">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
