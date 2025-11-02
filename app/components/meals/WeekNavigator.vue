<template>
  <div class="flex items-center justify-between gap-4">
    <UButton
      icon="i-heroicons-chevron-left"
      color="neutral"
      variant="ghost"
      @click="previousWeek"
    />

    <div class="text-center">
      <p class="text-lg font-semibold">
        {{ dateRange }}
      </p>
      <p class="text-sm text-gray-500">
        Týždeň {{ weekNumber }}, {{ year }}
      </p>
    </div>

    <UButton
      icon="i-heroicons-chevron-right"
      color="neutral"
      variant="ghost"
      @click="nextWeek"
    />
  </div>
</template>

<script setup lang="ts">
interface Props {
  currentMonday: Date
}

interface Emits {
  (e: 'update:currentMonday', date: Date): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const dateRange = computed(() => {
  const monday = new Date(props.currentMonday)
  const saturday = new Date(monday)
  saturday.setDate(monday.getDate() + 5)

  const formatDate = (d: Date) => {
    return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`
  }

  return `${formatDate(monday)} - ${formatDate(saturday)}`
})

const weekNumber = computed(() => {
  const d = new Date(Date.UTC(
    props.currentMonday.getFullYear(),
    props.currentMonday.getMonth(),
    props.currentMonday.getDate()
  ))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
})

const year = computed(() => props.currentMonday.getFullYear())

function previousWeek() {
  const newMonday = new Date(props.currentMonday)
  newMonday.setDate(newMonday.getDate() - 7)
  emit('update:currentMonday', newMonday)
}

function nextWeek() {
  const newMonday = new Date(props.currentMonday)
  newMonday.setDate(newMonday.getDate() + 7)
  emit('update:currentMonday', newMonday)
}
</script>
