<script setup lang="ts">
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'

definePageMeta({
  layout: 'dashboard',
})

const { user } = useAuth()

// Get Firestore instance (only on client)
const getDb = () => {
  if (import.meta.server) return null
  return useFirestore()
}

interface ModalData {
  message: string
  isActive: boolean
  isScheduled: boolean
  startDate: string
  endDate: string
}

// Form state
const formData = reactive<ModalData>({
  message: '',
  isActive: false,
  isScheduled: false,
  startDate: '',
  endDate: '',
})

const loading = ref(false)
const saving = ref(false)
const showPreview = ref(false)

// Character limit
const MAX_CHARS = 100
const remainingChars = computed(() => MAX_CHARS - formData.message.length)

// Validation
const isValid = computed(() => {
  if (!formData.message.trim()) return false
  if (formData.message.length > MAX_CHARS) return false

  // If scheduled, both dates are required
  if (formData.isScheduled) {
    if (!formData.startDate || !formData.endDate) return false
    // End date must be after start date
    const startDate = new Date(formData.startDate)
    const endDate = new Date(formData.endDate)
    if (endDate <= startDate) return false
  }

  return true
})

// Load existing modal data
const loadModalData = async () => {
  // Skip on server side
  if (import.meta.server) return

  loading.value = true
  try {
    const db = getDb()
    if (!db) {
      loading.value = false
      return
    }

    const modalRef = doc(db, 'modal', 'current')
    const modalDoc = await getDoc(modalRef)

    if (modalDoc.exists()) {
      const data = modalDoc.data()
      formData.message = data.message || ''
      formData.isActive = data.isActive || false
      formData.isScheduled = data.isScheduled || false

      // Convert Firestore timestamps to datetime-local format
      if (data.startDate) {
        const date = data.startDate.toDate()
        formData.startDate = date.toISOString().slice(0, 16)
      }
      if (data.endDate) {
        const date = data.endDate.toDate()
        formData.endDate = date.toISOString().slice(0, 16)
      }
    } else {
      // Document doesn't exist, create an empty one
      await setDoc(modalRef, {
        message: '',
        isActive: false,
        isScheduled: false,
        startDate: null,
        endDate: null,
        updatedAt: serverTimestamp(),
        updatedBy: user.value?.email || user.value?.uid || 'system',
      })
    }
  } catch (error) {
    console.error('Error loading modal data:', error)
    useToast().add({
      title: 'Chyba',
      description: 'Nepodarilo sa načítať údaje modálneho okna',
      color: 'error',
    })
  } finally {
    loading.value = false
  }
}

// Save modal data
const saveModalData = async () => {
  if (!isValid.value) return

  saving.value = true
  try {
    const db = getDb()
    if (!db) return

    const modalRef = doc(db, 'modal', 'current')

    await setDoc(modalRef, {
      message: formData.message.trim(),
      isActive: formData.isActive,
      isScheduled: formData.isScheduled,
      startDate: formData.isScheduled && formData.startDate ? new Date(formData.startDate) : null,
      endDate: formData.isScheduled && formData.endDate ? new Date(formData.endDate) : null,
      updatedAt: serverTimestamp(),
      updatedBy: user.value?.email || user.value?.uid || 'unknown',
    }, { merge: true })

    useToast().add({
      title: 'Úspech',
      description: 'Nastavenia modálneho okna boli úspešne uložené',
      color: 'success',
    })
  } catch (error) {
    console.error('Error saving modal data:', error)
    useToast().add({
      title: 'Chyba',
      description: 'Nepodarilo sa uložiť nastavenia modálneho okna',
      color: 'error',
    })
  } finally {
    saving.value = false
  }
}

// Reset scheduled fields when toggle is disabled
watch(() => formData.isScheduled, (isScheduled) => {
  if (!isScheduled) {
    formData.startDate = ''
    formData.endDate = ''
  }
})

// Load data on mount
onMounted(() => {
  loadModalData()
})
</script>

<template>
  <div>
    <h2 class="text-3xl font-bold text-slate-900 mb-6">CMS - Modálne okno</h2>

    <UCard v-if="loading" class="max-w-3xl">
      <div class="flex items-center justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-orange-500" />
      </div>
    </UCard>

    <UCard v-else class="max-w-3xl">
      <template #header>
        <h3 class="text-xl font-semibold text-slate-900">Nastavenia modálneho okna</h3>
        <p class="text-sm text-slate-500 mt-1">Nakonfiguruj správu, ktorá sa zobrazí na úvodnej stránke</p>
      </template>

      <div class="space-y-6">
        <!-- Message Input -->
        <UFormField
          label="Správa v modálnom okne"
          required
          class="w-full"
          :hint="`Zostáva ${remainingChars} znakov`"
        >
          <UTextarea
            v-model="formData.message"
            placeholder="Zadaj správu, ktorá sa zobrazí v modálnom okne..."
            :rows="4"
            :maxlength="MAX_CHARS"
            class="w-full"
            :class="{ 'ring-2 ring-red-500': remainingChars < 0 }"
          />
        </UFormField>

        <!-- Active Switch -->
        <UFormField
          label="Stav"
          help="Ovládaj, či sa modálne okno zobrazuje používateľom"
        >
          <div class="flex items-center gap-3">
            <USwitch
              v-model="formData.isActive"
              color="orange"
            />
            <span class="text-sm text-slate-700">
              {{ formData.isActive ? 'Aktívne (modálne okno je viditeľné)' : 'Neaktívne (modálne okno je skryté)' }}
            </span>
          </div>
        </UFormField>

        <!-- Scheduling Switch -->
        <UFormField
          label="Plánovanie"
          help="Naplánuj, kedy sa má modálne okno zobrazovať"
        >
          <div class="flex items-center gap-3">
            <USwitch
              v-model="formData.isScheduled"
              color="orange"
            />
            <span class="text-sm text-slate-700">
              {{ formData.isScheduled ? 'Plánované zobrazenie zapnuté' : 'Vždy zobraziť (bez plánovania)' }}
            </span>
          </div>
        </UFormField>

        <!-- Date Pickers (conditional) -->
        <div v-if="formData.isScheduled" class="space-y-4">
          <UFormField
            label="Začiatok zobrazenia"
            required
            help="Modálne okno sa začne zobrazovať od tohto dátumu a času"
          >
            <UInput
              v-model="formData.startDate"
              type="datetime-local"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Koniec zobrazenia"
            required
            help="Modálne okno sa prestane zobrazovať po tomto dátume a čase"
          >
            <UInput
              v-model="formData.endDate"
              type="datetime-local"
              class="w-full"
              :min="formData.startDate"
            />
          </UFormField>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col md:flex-row items-stretch md:items-center justify-end gap-3 pt-4">
          <button
            class="flex items-center justify-center hero-button border-2 border-[var(--color-orange)] text-[var(--color-orange)] font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:bg-[var(--color-orange)] hover:text-[var(--color-dark-green)] hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 w-full md:w-auto"
            :disabled="!formData.message.trim()"
            @click="showPreview = true"
          >
            <UIcon name="i-heroicons-eye" class="w-5 h-5 mr-2" />
            Náhľad
          </button>

          <button
            class="flex items-center justify-center hero-button border-2 border-transparent bg-[var(--color-orange)] text-[var(--color-dark-green)] font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg font-condensed disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 w-full md:w-auto"
            :disabled="!isValid || saving"
            @click="saveModalData"
          >
            <UIcon v-if="saving" name="i-heroicons-arrow-path" class="w-5 h-5 mr-2 animate-spin" />
            {{ saving ? 'Ukladám...' : 'Uložiť nastavenia' }}
          </button>
        </div>

        <!-- Validation Messages -->
        <div v-if="formData.isScheduled && formData.startDate && formData.endDate && formData.endDate <= formData.startDate" class="text-sm text-red-600">
          Dátum ukončenia musí byť po dátume začiatku
        </div>
      </div>
    </UCard>

    <!-- Preview Modal -->
    <UModal v-model:open="showPreview">
      <template #content>
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-slate-900">Náhľad</h3>
            <button
              class="text-slate-400 hover:text-slate-600 transition-colors"
              @click="showPreview = false"
            >
              <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
            </button>
          </div>

          <div class="py-4">
            <p class="text-slate-700 whitespace-pre-wrap">{{ formData.message || 'Zatiaľ nebola zadaná žiadna správa...' }}</p>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <button
              class="hero-button border-2 border-transparent bg-[var(--color-orange)] text-[var(--color-dark-green)] font-semibold py-2 px-6 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg font-condensed"
              @click="showPreview = false"
            >
              Zavrieť
            </button>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
