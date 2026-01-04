<script setup lang="ts">
import { z } from 'zod'
import type {
  AccountStatus,
  PhysicalActivity,
  WorkActivity,
  StressLevel,
} from '~~/app/lib/types/order'

// Props and emits
const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'created': [clientId: string]
}>()

// Modal open state
const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})

// Form state
const saving = ref(false)
const formData = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  accountStatus: 'neaktívny' as AccountStatus,
  birthDate: '',
  height: null as number | null,
  weight: null as number | null,
  physicalActivity: null as PhysicalActivity | null,
  workActivity: null as WorkActivity | null,
  stressLevel: null as StressLevel | null,
  goal: '',
  dietaryRequirements: [] as string[],
})

// Validation errors
const validationErrors = ref<Record<string, string>>({})

// Zod validation schema
const createClientSchema = z.object({
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
  dietaryRequirements: z.array(z.string()).optional().default([]),
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

const dietaryOptions = [
  { value: 'bezlaktózová', label: 'Bezlaktózová' },
  { value: 'vegetariánska', label: 'Vegetariánska' },
  { value: 'bezlepková', label: 'Bezlepková' },
]

// Reset form
const resetForm = () => {
  formData.value = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    accountStatus: 'neaktívny',
    birthDate: '',
    height: null,
    weight: null,
    physicalActivity: null,
    workActivity: null,
    stressLevel: null,
    goal: '',
    dietaryRequirements: [],
  }
  validationErrors.value = {}
}

// Close modal
const closeModal = () => {
  resetForm()
  isOpen.value = false
}

// Create client
const createClient = async () => {
  // Validate with Zod
  const result = createClientSchema.safeParse(formData.value)

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
    const response = await $fetch('/api/clients/create', {
      method: 'POST',
      body: {
        firstName: formData.value.firstName,
        lastName: formData.value.lastName,
        email: formData.value.email,
        phone: formData.value.phone,
        accountStatus: formData.value.accountStatus,
        birthDate: formData.value.birthDate || null,
        height: formData.value.height,
        weight: formData.value.weight,
        physicalActivity: formData.value.physicalActivity,
        workActivity: formData.value.workActivity,
        stressLevel: formData.value.stressLevel,
        goal: formData.value.goal || null,
        dietaryRequirements: formData.value.dietaryRequirements,
      },
    })

    useToast().add({
      title: 'Úspech',
      description: 'Používateľ bol úspešne vytvorený',
      color: 'success',
    })

    emit('created', response.clientId)
    closeModal()
  } catch (error: any) {
    console.error('Error creating client:', error)

    // Handle duplicate email error
    if (error.statusCode === 409) {
      validationErrors.value.email = 'Používateľ s týmto emailom už existuje'
      useToast().add({
        title: 'Chyba',
        description: 'Používateľ s týmto emailom už existuje',
        color: 'error',
      })
    } else {
      useToast().add({
        title: 'Chyba',
        description: error.data?.message || 'Nepodarilo sa vytvoriť používateľa',
        color: 'error',
      })
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :ui="{ content: 'max-w-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto' }"
  >
    <template #content>
      <div class="bg-white p-6">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-slate-900">Pridať nového používateľa</h2>
          <UButton
            icon="i-heroicons-x-mark"
            color="neutral"
            variant="ghost"
            size="lg"
            class="cursor-pointer"
            @click="closeModal"
          />
        </div>

        <!-- Form -->
        <div class="space-y-6">
          <!-- Section 1: Informácie o zákazníkovi -->
          <div>
            <h3 class="text-lg font-semibold text-slate-900 mb-4">Informácie o zákazníkovi</h3>
            <div class="space-y-4">
              <!-- Name Fields -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="text-sm text-slate-600 block mb-1">Meno *</label>
                  <UInput
                    v-model="formData.firstName"
                    placeholder="Zadajte meno"
                    size="lg"
                    :color="validationErrors.firstName ? 'error' : undefined"
                  />
                  <p v-if="validationErrors.firstName" class="text-xs text-red-500 mt-1">
                    {{ validationErrors.firstName }}
                  </p>
                </div>
                <div>
                  <label class="text-sm text-slate-600 block mb-1">Priezvisko *</label>
                  <UInput
                    v-model="formData.lastName"
                    placeholder="Zadajte priezvisko"
                    size="lg"
                    :color="validationErrors.lastName ? 'error' : undefined"
                  />
                  <p v-if="validationErrors.lastName" class="text-xs text-red-500 mt-1">
                    {{ validationErrors.lastName }}
                  </p>
                </div>
              </div>

              <!-- Email -->
              <div>
                <label class="text-sm text-slate-600 block mb-1">Email *</label>
                <UInput
                  v-model="formData.email"
                  type="email"
                  placeholder="email@priklad.sk"
                  size="lg"
                  :color="validationErrors.email ? 'error' : undefined"
                />
                <p v-if="validationErrors.email" class="text-xs text-red-500 mt-1">
                  {{ validationErrors.email }}
                </p>
              </div>

              <!-- Phone -->
              <div>
                <label class="text-sm text-slate-600 block mb-1">Telefón *</label>
                <UInput
                  v-model="formData.phone"
                  placeholder="+421 9XX XXX XXX"
                  size="lg"
                  :color="validationErrors.phone ? 'error' : undefined"
                />
                <p v-if="validationErrors.phone" class="text-xs text-red-500 mt-1">
                  {{ validationErrors.phone }}
                </p>
              </div>

              <!-- Account Status -->
              <div>
                <label class="text-sm text-slate-600 block mb-1">Stav účtu *</label>
                <USelect
                  v-model="formData.accountStatus"
                  :items="accountStatusOptions"
                  size="lg"
                  class="w-full"
                />
              </div>
            </div>
          </div>

          <!-- Section 2: Osobné údaje -->
          <div>
            <h3 class="text-lg font-semibold text-slate-900 mb-4">Osobné údaje</h3>
            <div class="space-y-4">
              <!-- Birth Date -->
              <div>
                <label class="text-sm text-slate-600 block mb-1">Dátum narodenia</label>
                <UInput
                  v-model="formData.birthDate"
                  placeholder="DD.MM.YYYY"
                  size="lg"
                />
              </div>

              <!-- Height and Weight -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="text-sm text-slate-600 block mb-1">Výška (cm)</label>
                  <UInput
                    v-model.number="formData.height"
                    type="number"
                    placeholder="napr. 175"
                    size="lg"
                    :color="validationErrors.height ? 'error' : undefined"
                  />
                  <p v-if="validationErrors.height" class="text-xs text-red-500 mt-1">
                    {{ validationErrors.height }}
                  </p>
                </div>
                <div>
                  <label class="text-sm text-slate-600 block mb-1">Hmotnosť (kg)</label>
                  <UInput
                    v-model.number="formData.weight"
                    type="number"
                    placeholder="napr. 70"
                    size="lg"
                    :color="validationErrors.weight ? 'error' : undefined"
                  />
                  <p v-if="validationErrors.weight" class="text-xs text-red-500 mt-1">
                    {{ validationErrors.weight }}
                  </p>
                </div>
              </div>

              <!-- Activity Levels -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="text-sm text-slate-600 block mb-1">Fyzická aktivita</label>
                  <USelect
                    v-model="formData.physicalActivity"
                    :items="physicalActivityOptions"
                    placeholder="Vyberte"
                    size="lg"
                    class="w-full"
                  />
                </div>
                <div>
                  <label class="text-sm text-slate-600 block mb-1">Pracovná aktivita</label>
                  <USelect
                    v-model="formData.workActivity"
                    :items="workActivityOptions"
                    placeholder="Vyberte"
                    size="lg"
                    class="w-full"
                  />
                </div>
                <div>
                  <label class="text-sm text-slate-600 block mb-1">Úroveň stresu</label>
                  <USelect
                    v-model="formData.stressLevel"
                    :items="stressLevelOptions"
                    placeholder="Vyberte"
                    size="lg"
                    class="w-full"
                  />
                </div>
              </div>

              <!-- Goal -->
              <div>
                <label class="text-sm text-slate-600 block mb-1">Cieľ</label>
                <UTextarea
                  v-model="formData.goal"
                  placeholder="Cieľ zákazníka..."
                  :rows="3"
                  :color="validationErrors.goal ? 'error' : undefined"
                  class="w-full"
                />
                <p v-if="validationErrors.goal" class="text-xs text-red-500 mt-1">
                  {{ validationErrors.goal }}
                </p>
              </div>

              <!-- Dietary Requirements -->
              <div>
                <label class="text-sm text-slate-600 block mb-2">Diétne požiadavky</label>
                <div class="flex flex-wrap gap-2">
                  <label
                    v-for="option in dietaryOptions"
                    :key="option.value"
                    class="inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors"
                    :class="formData.dietaryRequirements.includes(option.value)
                      ? 'border-orange bg-orange/10 text-orange'
                      : 'border-slate-200 hover:border-slate-300'"
                  >
                    <input
                      type="checkbox"
                      :value="option.value"
                      v-model="formData.dietaryRequirements"
                      class="sr-only"
                    />
                    <span class="text-sm font-medium">{{ option.label }}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <UButton
              color="neutral"
              variant="outline"
              class="cursor-pointer"
              :disabled="saving"
              @click="closeModal"
            >
              Zrušiť
            </UButton>
            <UButton
              class="cursor-pointer bg-orange text-white hover:bg-dark-green"
              :loading="saving"
              @click="createClient"
            >
              Vytvoriť používateľa
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
