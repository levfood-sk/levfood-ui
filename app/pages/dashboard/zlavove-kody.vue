<script setup lang="ts">
import { z } from 'zod'
import type { Coupon } from '~/lib/types/coupon'

definePageMeta({
  layout: 'dashboard',
})

// Validation schema
const couponSchema = z.object({
  code: z
    .string()
    .min(3, 'Kód musí mať aspoň 3 znaky')
    .max(20, 'Kód môže mať maximálne 20 znakov')
    .regex(/^[A-Za-z0-9]+$/, 'Kód môže obsahovať iba písmená a čísla'),
  discountPercentage: z
    .number()
    .min(1, 'Zľava musí byť aspoň 1%')
    .max(100, 'Zľava nemôže byť viac ako 100%'),
})

// State
const coupons = ref<Coupon[]>([])
const loading = ref(true)
const searchQuery = ref('')
const showCreateForm = ref(false)
const createLoading = ref(false)

// Delete modal state
const showDeleteModal = ref(false)
const selectedCoupon = ref<Coupon | null>(null)
const deleteLoading = ref(false)

// Toggle loading state
const toggleLoading = ref<string | null>(null)

// Form state
const form = reactive({
  code: '',
  discountPercentage: 10,
})

// Load coupons
const loadCoupons = async () => {
  loading.value = true
  try {
    const response = await useAuthFetch<{ success: boolean; coupons: Coupon[] }>('/api/coupons')
    if (response.success) {
      coupons.value = response.coupons
    }
  } catch (error) {
    console.error('Error loading coupons:', error)
    showErrorToast('Nepodarilo sa načítať zľavové kódy')
  } finally {
    loading.value = false
  }
}

// Load on mount
onMounted(() => {
  loadCoupons()
})

// Filtered coupons
const filteredCoupons = computed(() => {
  if (!searchQuery.value) {
    return coupons.value
  }
  const query = searchQuery.value.toLowerCase()
  return coupons.value.filter((coupon) =>
    coupon.code.toLowerCase().includes(query)
  )
})

// Statistics
const stats = computed(() => {
  const totalUsage = coupons.value.reduce((sum, c) => sum + c.usageCount, 0)
  return [
    {
      label: 'Celkom kódov',
      value: coupons.value.length,
      icon: 'i-lucide-ticket-percent',
    },
    {
      label: 'Aktívnych',
      value: coupons.value.filter((c) => c.isActive).length,
      icon: 'i-lucide-check-circle',
    },
    {
      label: 'Neaktívnych',
      value: coupons.value.filter((c) => !c.isActive).length,
      icon: 'i-lucide-x-circle',
    },
    {
      label: 'Celkom použití',
      value: totalUsage,
      icon: 'i-lucide-shopping-cart',
    },
  ]
})

// Format date
const formatDate = (timestamp: any) => {
  if (!timestamp) return '-'

  let date: Date
  if (timestamp.toDate) {
    date = timestamp.toDate()
  } else if (timestamp._seconds) {
    date = new Date(timestamp._seconds * 1000)
  } else {
    date = new Date(timestamp)
  }

  return new Intl.DateTimeFormat('sk-SK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

// Form validation
const isFormValid = computed(() => {
  const result = couponSchema.safeParse(form)
  return result.success
})

// Reset form
const resetForm = () => {
  form.code = ''
  form.discountPercentage = 10
}

// Create coupon
const handleCreateCoupon = async () => {
  const result = couponSchema.safeParse(form)
  if (!result.success) {
    const firstError = result.error.issues[0]
    useToast().add({
      title: 'Chyba',
      description: firstError?.message || 'Neplatné údaje',
      color: 'error',
    })
    return
  }

  createLoading.value = true

  try {
    await useAuthFetch('/api/coupons', {
      method: 'POST',
      body: {
        code: form.code.toUpperCase(),
        discountPercentage: form.discountPercentage,
      },
    })

    showSuccessToast('Zľavový kód bol úspešne vytvorený')
    await loadCoupons()

    showCreateForm.value = false
    resetForm()
  } catch (error: any) {
    console.error('Error creating coupon:', error)
    showErrorToast(error.data?.message || 'Nepodarilo sa vytvoriť zľavový kód')
  } finally {
    createLoading.value = false
  }
}

// Toggle create form
const toggleCreateForm = () => {
  showCreateForm.value = !showCreateForm.value
  if (showCreateForm.value) {
    resetForm()
  }
}

// Toggle coupon active status
const handleToggleStatus = async (coupon: Coupon) => {
  toggleLoading.value = coupon.id
  try {
    await useAuthFetch(`/api/coupons/${coupon.id}`, {
      method: 'PATCH',
      body: { isActive: !coupon.isActive },
    })

    showSuccessToast(coupon.isActive ? 'Kód bol deaktivovaný' : 'Kód bol aktivovaný')
    await loadCoupons()
  } catch (error: any) {
    console.error('Error toggling coupon:', error)
    showErrorToast(error.data?.message || 'Nepodarilo sa zmeniť stav kódu')
  } finally {
    toggleLoading.value = null
  }
}

// Open delete modal
const openDeleteModal = (coupon: Coupon) => {
  selectedCoupon.value = coupon
  showDeleteModal.value = true
}

// Delete coupon
const handleDeleteCoupon = async () => {
  if (!selectedCoupon.value) return

  deleteLoading.value = true
  try {
    await useAuthFetch(`/api/coupons/${selectedCoupon.value.id}`, {
      method: 'DELETE',
    })

    showSuccessToast('Zľavový kód bol úspešne vymazaný')
    await loadCoupons()
    showDeleteModal.value = false
  } catch (error: any) {
    console.error('Error deleting coupon:', error)
    showErrorToast(error.data?.message || 'Nepodarilo sa vymazať zľavový kód')
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between">
      <div>
        <h1 class="text-3xl font-bold" style="color: var(--color-dark-green)">
          Zľavové kódy
        </h1>
        <p class="text-slate-600 mt-1">Správa zľavových kódov pre objednávky</p>
      </div>
      <button
        class="flex items-center justify-center gap-2 w-full md:w-auto bg-[var(--color-orange)] text-[var(--color-dark-green)] font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg font-roboto mt-4 md:mt-0"
        @click="toggleCreateForm"
      >
        <UIcon
          :name="showCreateForm ? 'i-heroicons-x-mark' : 'i-heroicons-plus'"
          class="w-5 h-5"
        />
        {{ showCreateForm ? 'Zrušiť' : 'Pridať zľavový kód' }}
      </button>
    </div>

    <!-- Create Coupon Form -->
    <UCard v-if="showCreateForm">
      <template #header>
        <h2 class="text-xl font-semibold" style="color: var(--color-dark-green)">
          Pridať nový zľavový kód
        </h2>
      </template>

      <form class="space-y-6" @submit.prevent="handleCreateCoupon">
        <!-- Code and Discount Fields -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <label
              class="block text-sm font-medium"
              style="color: var(--color-dark-green)"
              >Kód *</label
            >
            <UInput
              v-model="form.code"
              placeholder="ZIMA2026"
              size="lg"
              :disabled="createLoading"
              class="uppercase"
            />
            <p class="text-xs text-slate-500">
              Iba písmená a čísla, 3-20 znakov
            </p>
          </div>

          <div class="space-y-2">
            <label
              class="block text-sm font-medium"
              style="color: var(--color-dark-green)"
              >Zľava (%) *</label
            >
            <UInput
              v-model.number="form.discountPercentage"
              type="number"
              min="1"
              max="100"
              placeholder="10"
              size="lg"
              :disabled="createLoading"
            />
            <p class="text-xs text-slate-500">Percentuálna zľava z ceny (1-100%)</p>
          </div>
        </div>

        <!-- Footer Buttons -->
        <div
          class="flex flex-col md:flex-row justify-end gap-3 pt-4 border-t border-gray-200"
        >
          <button
            type="button"
            :disabled="createLoading"
            class="w-full md:w-auto px-6 py-3 rounded-lg border-2 text-slate-600 border-gray-300 font-semibold hover:bg-gray-50 transition-all font-roboto disabled:opacity-50"
            @click="toggleCreateForm"
          >
            Zrušiť
          </button>
          <button
            type="submit"
            :disabled="createLoading || !isFormValid"
            class="w-full md:w-auto flex items-center justify-center gap-2 bg-[var(--color-orange)] text-[var(--color-dark-green)] font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg font-roboto disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <UIcon
              v-if="createLoading"
              name="i-heroicons-arrow-path"
              class="w-5 h-5 animate-spin"
            />
            {{ createLoading ? 'Vytváram...' : 'Vytvoriť kód' }}
          </button>
        </div>
      </form>
    </UCard>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <UCard v-for="stat in stats" :key="stat.label">
        <div class="flex items-center gap-4">
          <div
            class="p-2 rounded-lg flex items-center justify-center"
            style="background-color: var(--color-beige)"
          >
            <UIcon
              :name="stat.icon"
              class="w-6 h-6"
              style="color: var(--color-dark-green)"
            />
          </div>
          <div>
            <p class="text-2xl font-bold" style="color: var(--color-dark-green)">
              {{ stat.value }}
            </p>
            <p class="text-sm text-slate-600">{{ stat.label }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Search Filter -->
    <UCard>
      <div class="flex flex-col md:flex-row gap-4">
        <div class="flex-1">
          <UInput
            v-model="searchQuery"
            placeholder="Hľadať podľa kódu..."
            icon="i-heroicons-magnifying-glass"
            size="lg"
          />
        </div>
      </div>
    </UCard>

    <!-- Coupons Table -->
    <UCard>
      <template #header>
        <h2 class="text-xl font-semibold">Zoznam zľavových kódov</h2>
      </template>

      <div v-if="loading" class="flex justify-center py-12">
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-8 h-8 animate-spin"
          style="color: var(--color-orange)"
        />
      </div>

      <div v-else-if="filteredCoupons.length === 0" class="text-center py-12">
        <UIcon
          name="i-lucide-ticket-percent"
          class="w-16 h-16 text-slate-300 mx-auto mb-4"
        />
        <p class="text-slate-600">Žiadne zľavové kódy</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-slate-200">
              <th class="text-left px-4 py-3 text-sm font-semibold text-slate-700">
                Kód
              </th>
              <th class="text-left px-4 py-3 text-sm font-semibold text-slate-700">
                Zľava
              </th>
              <th class="text-left px-4 py-3 text-sm font-semibold text-slate-700">
                Použití
              </th>
              <th class="text-left px-4 py-3 text-sm font-semibold text-slate-700">
                Vytvoril
              </th>
              <th class="text-left px-4 py-3 text-sm font-semibold text-slate-700">
                Dátum
              </th>
              <th class="text-center px-4 py-3 text-sm font-semibold text-slate-700">
                Stav
              </th>
              <th class="text-right px-4 py-3 text-sm font-semibold text-slate-700">
                Akcie
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="coupon in filteredCoupons"
              :key="coupon.id"
              class="border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <!-- Code -->
              <td class="px-4 py-3">
                <span
                  class="font-mono font-semibold text-lg"
                  style="color: var(--color-dark-green)"
                >
                  {{ coupon.code }}
                </span>
              </td>

              <!-- Discount -->
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                  style="
                    background-color: var(--color-orange);
                    color: var(--color-dark-green);
                  "
                >
                  {{ coupon.discountPercentage }}%
                </span>
              </td>

              <!-- Usage Count -->
              <td class="px-4 py-3">
                <p class="text-slate-600 font-medium">
                  {{ coupon.usageCount }}x
                </p>
              </td>

              <!-- Created By -->
              <td class="px-4 py-3">
                <p class="text-slate-600">{{ coupon.createdByName }}</p>
              </td>

              <!-- Created At -->
              <td class="px-4 py-3">
                <p class="text-sm text-slate-600">
                  {{ formatDate(coupon.createdAt) }}
                </p>
              </td>

              <!-- Status Toggle -->
              <td class="px-4 py-3 text-center">
                <button
                  :disabled="toggleLoading === coupon.id"
                  class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50"
                  :class="
                    coupon.isActive ? 'bg-green-500' : 'bg-gray-300'
                  "
                  @click="handleToggleStatus(coupon)"
                >
                  <span
                    class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                    :class="coupon.isActive ? 'translate-x-5' : 'translate-x-0'"
                  />
                </button>
              </td>

              <!-- Actions -->
              <td class="px-4 py-3">
                <div class="flex justify-end gap-2">
                  <button
                    class="p-2 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                    title="Vymazať"
                    @click="openDeleteModal(coupon)"
                  >
                    <UIcon name="i-lucide-trash-2" class="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal" title="Potvrdiť vymazanie">
      <template #body>
        <div class="space-y-4">
          <p class="text-slate-600">
            Naozaj chcete vymazať zľavový kód
            <strong class="font-mono">{{ selectedCoupon?.code }}</strong
            >?
          </p>
          <p class="text-sm text-slate-500">
            Tento kód bol použitý {{ selectedCoupon?.usageCount }}x.
          </p>
        </div>
      </template>

      <template #footer="{ close }">
        <div class="flex justify-end gap-3">
          <button
            type="button"
            :disabled="deleteLoading"
            class="px-6 py-3 rounded-lg border-2 text-slate-600 border-gray-300 font-semibold hover:bg-gray-50 transition-all font-roboto disabled:opacity-50"
            @click="close"
          >
            Zrušiť
          </button>
          <button
            type="button"
            :disabled="deleteLoading"
            class="flex items-center gap-2 bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:bg-red-700 font-roboto disabled:opacity-50"
            @click="handleDeleteCoupon"
          >
            <UIcon
              v-if="deleteLoading"
              name="i-heroicons-arrow-path"
              class="w-5 h-5 animate-spin"
            />
            {{ deleteLoading ? 'Odstraňujem...' : 'Vymazať' }}
          </button>
        </div>
      </template>
    </UModal>
  </div>
</template>
