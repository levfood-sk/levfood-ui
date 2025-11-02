<script setup lang="ts">
import { z } from 'zod'
import logoLongIcon from '~/assets/icons/logo-long-orange.svg'

const currentStep = ref(1)
const totalSteps = 4
const showDeliveryInfoModal = ref(false)

// Form data
const formData = ref({
  step1: {
    package: '' as 'EKONOMY' | 'ŠTANDARD' | 'PREMIUM' | '',
    duration: '' as '5' | '6' | ''
  },
  step2: {
    dietaryRequirement: [] as string[],
    notes: ''
  },
  step3: {
    fullName: '',
    phone: '',
    email: '',
    address: '',
    courierNotes: ''
  },
  step4: {
    deliveryStartDate: '',
    termsAccepted: false
  }
})

// Validation errors
const errors = ref({
  fullName: '',
  phone: '',
  email: '',
  address: ''
})

// Track if field has been touched
const touched = ref({
  fullName: false,
  phone: false,
  email: false,
  address: false
})

// Zod schemas
const step3Schema = z.object({
  fullName: z.string().min(2, 'Meno musí obsahovať aspoň 2 znaky'),
  phone: z.string()
    .min(1, 'Telefónne číslo je povinné')
    .regex(/^(\+421|0)?[0-9]{9,10}$/, 'Neplatné telefónne číslo. Použite formát +421000000000)'),
  email: z.email('Neplatná emailová adresa'),
  address: z.string().min(5, 'Adresa musí obsahovať aspoň 5 znakov')
})

const steps = computed(() => [
  { number: 1, title: 'Tvoj balíček', completed: currentStep.value > 1 },
  { number: 2, title: 'Tvoje preferencie', completed: currentStep.value > 2 },
  { number: 3, title: 'Doručenie', completed: currentStep.value > 3 },
  { number: 4, title: 'Platba', completed: currentStep.value > 4 }
])

// Package options
const packageOptions = [
  { value: 'EKONOMY', label: 'EKONOMY', description: '4 jedlá denne / jednoduché, vyvážené menu' },
  { value: 'ŠTANDARD', label: 'ŠTANDARD', description: '5 jedál denne / pestrá ponuka a viac chutí' },
  { value: 'PREMIUM', label: 'PREMIUM', description: '6 jedál denne / nutrične prispôsobené' }
]

// Duration options - format for USelect with items
const durationOptions = [
  { label: '4 týždne (5 dní v týždni pon-pia)', value: '5' },
  { label: '4 týždne (6 dní v týždni pon – sob)', value: '6' }
]

// Dietary requirement options
const dietaryOptions = [
  { value: 'bezlaktózová', label: 'Bezlaktózová' },
  { value: 'vegetariánska', label: 'Vegetariánska' },
  { value: 'bezlepková', label: 'Bezlepková' },
  { value: 'bez-rýb', label: 'Bez rýb' },
  { value: 'bez-orechov', label: 'Bez orechov' },
  { value: 'žiadne', label: 'Nemám špeciálne požiadavky' }
]

// Pricing
const packagePrices = {
  EKONOMY: 290,
  ŠTANDARD: 350,
  PREMIUM: 400
}

const totalPrice = computed(() => {
  if (!formData.value.step1.package) return 0
  return packagePrices[formData.value.step1.package] || 0
})

const daysCount = computed(() => {
  if (!formData.value.step1.duration) return 0
  return formData.value.step1.duration === '5' ? 20 : 24
})

const summaryData = computed(() => {
  return {
    package: formData.value.step1.package,
    days: daysCount.value,
    price: totalPrice.value,
    address: formData.value.step3.address
  }
})

// Validation
const isStep1Valid = computed(() => {
  return formData.value.step1.package !== '' && formData.value.step1.duration !== ''
})

// Validate individual field
function validateField(field: 'fullName' | 'phone' | 'email' | 'address') {
  // Mark field as touched
  touched.value[field] = true
  
  const fieldSchema = step3Schema.shape[field]
  const result = fieldSchema.safeParse(formData.value.step3[field])
  
  if (!result.success) {
    errors.value[field] = result.error.issues[0]?.message || ''
    return false
  } else {
    errors.value[field] = ''
    return true
  }
}

// Debounced validation for input events
let validationTimer: NodeJS.Timeout | null = null

function validateFieldOnInput(field: 'fullName' | 'phone' | 'email' | 'address') {
  // Only validate if field has been touched
  if (!touched.value[field]) return
  
  if (validationTimer) {
    clearTimeout(validationTimer)
  }
  
  validationTimer = setTimeout(() => {
    validateField(field)
  }, 500)
}

// Validate all step 3 fields
function validateStep3() {
  const result = step3Schema.safeParse(formData.value.step3)
  
  if (!result.success) {
    result.error.issues.forEach((err: z.ZodIssue) => {
      const field = err.path[0] as 'fullName' | 'phone' | 'email' | 'address'
      errors.value[field] = err.message
    })
    return false
  } else {
    errors.value = {
      fullName: '',
      phone: '',
      email: '',
      address: ''
    }
    return true
  }
}

const isStep3Valid = computed(() => {
  const result = step3Schema.safeParse(formData.value.step3)
  return result.success
})

const canProceed = computed(() => {
  if (currentStep.value === 1) return isStep1Valid.value
  if (currentStep.value === 3) return isStep3Valid.value
  return true
})

// Delivery schedule information
const deliverySchedule = [
  {
    orderDay: 'utorok',
    preparedDay: 'sobota/pondelok ráno',
    deliveryDay: 'piatok/sobota na obed'
  },
  {
    orderDay: 'streda',
    preparedDay: 'pondelok ráno',
    deliveryDay: 'sobota na obed'
  },
  {
    orderDay: 'štvrtok',
    preparedDay: 'utorok ráno',
    deliveryDay: 'pondelok na obed'
  },
  {
    orderDay: 'piatok',
    preparedDay: 'streda ráno',
    deliveryDay: 'utorok na obed'
  },
  {
    orderDay: 'sobota',
    preparedDay: 'štvrtok ráno',
    deliveryDay: 'streda na obed'
  },
  {
    orderDay: 'nedeľa',
    preparedDay: 'štvrtok ráno',
    deliveryDay: 'streda na obed'
  },
  {
    orderDay: 'pondelok',
    preparedDay: 'piatok ráno',
    deliveryDay: 'štvrtok na obed'
  }
]

// Calculate delivery info based on current day
function getDeliveryInfo() {
  const today = new Date()
  const dayOfWeek = today.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = Sunday, 1 = Monday, etc.
  
  const infoMap: Record<0 | 1 | 2 | 3 | 4 | 5 | 6, { delivery: string; prepared: string }> = {
    2: { // Tuesday
      prepared: 'sobota/pondelok ráno',
      delivery: 'piatok/sobota na obed'
    },
    3: { // Wednesday
      prepared: 'pondelok ráno',
      delivery: 'sobota na obed'
    },
    4: { // Thursday
      prepared: 'utorok ráno',
      delivery: 'pondelok na obed'
    },
    5: { // Friday
      prepared: 'streda ráno',
      delivery: 'utorok na obed'
    },
    6: { // Saturday
      prepared: 'štvrtok ráno',
      delivery: 'streda na obed'
    },
    0: { // Sunday
      prepared: 'štvrtok ráno',
      delivery: 'streda na obed'
    },
    1: { // Monday
      prepared: 'piatok ráno',
      delivery: 'štvrtok na obed'
    }
  }
  
  return infoMap[dayOfWeek] || { delivery: '', prepared: '' }
}

const deliveryInfo = computed(() => {
  return getDeliveryInfo()
})

// Helper function to check if schedule is for today
function isTodaySchedule(orderDay: string) {
  const today = new Date()
  const dayOfWeek = today.getDay()
  
  const dayMap: Record<number, string> = {
    0: 'nedeľa',
    1: 'pondelok',
    2: 'utorok',
    3: 'streda',
    4: 'štvrtok',
    5: 'piatok',
    6: 'sobota'
  }
  
  return dayMap[dayOfWeek] === orderDay.toLowerCase()
}

// Calculate suggested delivery start date based on current day
function calculateDeliveryStartDate() {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, etc.
  
  let daysToAdd = 0
  
  switch (dayOfWeek) {
    case 2: // Tuesday
      daysToAdd = 3 // Saturday
      break
    case 3: // Wednesday
      daysToAdd = 5 // Monday
      break
    case 4: // Thursday
      daysToAdd = 5 // Tuesday
      break
    case 5: // Friday
      daysToAdd = 5 // Wednesday
      break
    case 6: // Saturday
      daysToAdd = 5 // Thursday
      break
    case 0: // Sunday
      daysToAdd = 4 // Thursday
      break
    case 1: // Monday
      daysToAdd = 4 // Friday
      break
  }
  
  const deliveryDate = new Date(today)
  deliveryDate.setDate(today.getDate() + daysToAdd)
  
  return deliveryDate.toISOString().split('T')[0]
}

const suggestedDeliveryDate = computed(() => {
  return calculateDeliveryStartDate()
})

// Initialize delivery date with suggested date
onMounted(() => {
  if (!formData.value.step4.deliveryStartDate && suggestedDeliveryDate.value) {
    formData.value.step4.deliveryStartDate = suggestedDeliveryDate.value
  }
})

function nextStep() {
  if (currentStep.value < totalSteps) {
    currentStep.value++
  }
}

function previousStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

function handleCancel() {
  navigateTo('/')
}

function handleSubmit() {
  if (!formData.value.step4.termsAccepted) {
    alert('Musíte súhlasiť s obchodnými podmienkami')
    return
  }
  console.log('Form submitted:', formData.value)
  // Handle form submission logic here
}
</script>

<template>
  <div class="min-h-screen bg-[var(--color-beige)]">
    <div class="container mx-auto px-4 py-12 max-w-2xl">
      <!-- Logo -->
      <div class="flex justify-center mb-12">
        <NuxtLink to="/" class="flex items-center">
          <img 
            :src="logoLongIcon" 
            alt="LevFood logo" 
            class="h-8 sm:h-10"
          />
        </NuxtLink>
      </div>

      <!-- Step Indicators -->
      <div class="flex items-center justify-center gap-4 mb-12">
        <div v-for="(step, index) in steps" :key="step.number" class="flex items-center">
          <div class="flex items-center gap-2">
            <div 
              class="flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors"
              :class="[
                step.completed ? 'bg-[var(--color-orange)] border-[var(--color-orange)] text-white' : 
                currentStep === step.number ? 'border-[var(--color-dark-green)] text-[var(--color-dark-green)]' : 
                'border-gray-300 text-gray-400'
              ]"
            >
              <UIcon v-if="step.completed" name="i-lucide-check" class="w-4 h-4" />
              <span v-else class="text-sm font-medium">{{ step.number }}</span>
            </div>
            <span 
              class="text-xs font-medium hidden sm:inline font-condensed"
              :class="currentStep >= step.number ? 'text-[var(--color-dark-green)]' : 'text-gray-400'"
            >
              {{ step.title }}
            </span>
          </div>
          <div v-if="index < steps.length - 1" class="w-8 h-0.5 mx-2" :class="currentStep > step.number ? 'bg-[var(--color-orange)]' : 'bg-gray-300'" />
        </div>
      </div>

      <!-- Form Content -->
      <div class="space-y-8">
        <!-- Step 1 - Package Selection -->
        <div v-if="currentStep === 1" class="space-y-8">
          <div class="text-center">
            <h2 class="text-2xl font-bold text-[var(--color-dark-green)] mb-3 font-condensed">Vyber si svoj plán</h2>
            <p class="text-sm text-[var(--color-dark-green)]">Každý deň varíme čerstvé, vyvážené jedlá. Vyber si program, ktorý ti najviac sedí.</p>
          </div>

          <div class="space-y-6">
            <UFormField label="Balíček" class="w-full">
              <URadioGroup
                v-model="formData.step1.package"
                :items="packageOptions"
                variant="table"
                color="orange"
                size="xl"
                orientation="vertical"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Dĺžka objednávky" class="w-full">
              <USelect 
                v-model="formData.step1.duration" 
                :items="durationOptions"
                placeholder="Vyber dĺžku objednávky"
                class="pricing-select w-full bg-transparent"
              />
            </UFormField>
          </div>

          <div class="flex justify-end gap-3">
            <button 
              class="hero-button border-2 border-[var(--color-orange)] text-[var(--color-orange)] font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:bg-[var(--color-orange)] hover:text-[var(--color-dark-green)] hover:scale-105 hover:shadow-lg"
              @click="handleCancel"
            >
              Zrušiť
            </button>
            <button 
              class="hero-button border-2 border-transparent bg-[var(--color-orange)] text-[var(--color-dark-green)] font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg font-condensed disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              :disabled="!isStep1Valid"
              @click="nextStep"
            >
              Ďalej
            </button>
          </div>
        </div>

        <!-- Step 2 - Preferences -->
        <div v-if="currentStep === 2" class="space-y-8">
          <div class="text-center">
            <h2 class="text-2xl font-bold text-[var(--color-dark-green)] mb-3 font-condensed">Uprav si balíček podľa seba</h2>
            <p class="text-sm text-[var(--color-dark-green)]">Jedlo ti prispôsobíme tak, aby si si ho naozaj vychutnal/a.</p>
          </div>

          <div class="space-y-6">
            <UFormField label="Máš nejaké špecifické požiadavky na stravu?">
              <UCheckboxGroup
                v-model="formData.step2.dietaryRequirement"
                :items="dietaryOptions"
                variant="card"
                color="orange"
                size="lg"
                orientation="horizontal"
                :ui="{ fieldset: 'flex flex-wrap gap-2' }"
              />
            </UFormField>

            <UFormField label="Iné poznámky alebo alergie" class="w-full">
              <UTextarea 
                v-model="formData.step2.notes" 
                size="lg"
                placeholder="Napríklad: nemám rád huby, prosím menej pikantné jedlá…"
                :rows="4"
                class="w-full"
              />
            </UFormField>
          </div>

          <div class="flex justify-end gap-3">
            <button 
              class="hero-button border-2 border-[var(--color-orange)] text-[var(--color-orange)] font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:bg-[var(--color-orange)] hover:text-[var(--color-dark-green)] hover:scale-105 hover:shadow-lg"
              @click="previousStep"
            >
              Späť
            </button>
            <button 
              class="hero-button border-2 border-transparent bg-[var(--color-orange)] text-[var(--color-dark-green)] font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg font-condensed disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              @click="nextStep"
            >
              Ďalej
            </button>
          </div>
        </div>

        <!-- Step 3 - Delivery -->
        <div v-if="currentStep === 3" class="space-y-8">
          <div class="text-center">
            <h2 class="text-2xl font-bold text-[var(--color-dark-green)] mb-3 font-condensed">Kam ti máme jedlo doručiť?</h2>
            <p class="text-sm text-[var(--color-dark-green)]">Zabezpečíme doručenie priamo k tvojim dverám v čase od 11:00 do 15:00.</p>
          </div>

          <div class="space-y-6">
            <UFormField 
              label="Meno a priezvisko" 
              required 
              class="w-full" 
              :error="touched.fullName ? errors.fullName : ''"
              eager-validation
            >
              <UInput 
                v-model="formData.step3.fullName" 
                size="lg" 
                placeholder="Ján Dvořáček"
                class="w-full"
                :highlight="!!(touched.fullName && errors.fullName)"
                @blur="validateField('fullName')"
                @input="validateFieldOnInput('fullName')"
              />
            </UFormField>

            <UFormField 
              label="Telefónne číslo" 
              required 
              class="w-full" 
              :error="touched.phone ? errors.phone : ''"
              eager-validation
            >
              <UInput 
                v-model="formData.step3.phone" 
                size="lg" 
                placeholder="+421 9XX XXX XXX"
                type="tel"
                class="w-full"
                :highlight="!!(touched.phone && errors.phone)"
                @blur="validateField('phone')"
                @input="validateFieldOnInput('phone')"
              />
            </UFormField>

            <UFormField 
              label="Email" 
              required 
              class="w-full" 
              :error="touched.email ? errors.email : ''"
              eager-validation
            >
              <UInput 
                v-model="formData.step3.email" 
                type="email" 
                size="lg" 
                placeholder="email@levfood.sk"
                icon="i-lucide-mail"
                class="w-full"
                :highlight="!!(touched.email && errors.email)"
                @blur="validateField('email')"
                @input="validateFieldOnInput('email')"
              />
            </UFormField>

            <UFormField 
              label="Adresa doručenia" 
              required 
              class="w-full" 
              :error="touched.address ? errors.address : ''"
              eager-validation
            >
              <UInput 
                v-model="formData.step3.address" 
                size="lg" 
                placeholder="Ulica, číslo, mesto"
                class="w-full"
                :highlight="!!(touched.address && errors.address)"
                @blur="validateField('address')"
                @input="validateFieldOnInput('address')"
              />
            </UFormField>

            <UFormField label="Poznámka pre kuriéra" class="w-full">
              <UTextarea 
                v-model="formData.step3.courierNotes" 
                size="lg"
                placeholder="Napríklad: žltý dom, 4. naľavo…"
                :rows="3"
                class="w-full"
              />
            </UFormField>
          </div>

          <div class="flex justify-end gap-3">
            <button 
              class="hero-button border-2 border-[var(--color-orange)] text-[var(--color-orange)] font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:bg-[var(--color-orange)] hover:text-[var(--color-dark-green)] hover:scale-105 hover:shadow-lg"
              @click="previousStep"
            >
              Späť
            </button>
            <button 
              class="hero-button border-2 border-transparent bg-[var(--color-orange)] text-[var(--color-dark-green)] font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg font-condensed disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              :disabled="!isStep3Valid"
              @click="nextStep"
            >
              Ďalej
            </button>
          </div>
        </div>

        <!-- Step 4 - Payment -->
        <div v-if="currentStep === 4" class="space-y-8">
          <div class="text-center">
            <h2 class="text-2xl font-bold text-[var(--color-dark-green)] mb-3 font-condensed">Zhrnutie objednávky a platba</h2>
            <p class="text-sm text-[var(--color-dark-green)]">Skontroluj údaje a dokonči objednávku.</p>
          </div>

          <!-- Summary Section -->
          <div class="bg-white rounded-lg p-6 mb-6">
            <h3 class="text-lg font-bold text-[var(--color-dark-green)] mb-4 font-condensed">Zhrnutie</h3>
            <div class="space-y-2 text-[var(--color-dark-green)]">
              <div class="flex justify-between">
                <span>Balíček:</span>
                <span class="font-semibold">{{ summaryData.package || '-' }}</span>
              </div>
              <div class="flex justify-between">
                <span>Počet dní:</span>
                <span class="font-semibold">{{ summaryData.days || '-' }}</span>
              </div>
              <div class="flex justify-between">
                <span>Cena spolu:</span>
                <span class="font-semibold">{{ summaryData.price ? `${summaryData.price}€` : '-' }}</span>
              </div>
              <div class="flex justify-between">
                <span>Doručenie:</span>
                <span class="font-semibold">{{ summaryData.address || '-' }}</span>
              </div>
            </div>
          </div>

          <div class="space-y-6">
            <UFormField label="Začiatok dodávky" class="w-full">
              <div class="flex items-center gap-2">
                <UInput 
                  v-model="formData.step4.deliveryStartDate" 
                  type="date"
                  size="lg"
                  icon="i-lucide-calendar"
                  placeholder="dd/mm/rrrr"
                  class="flex-1"
                />
                <UButton
                  variant="ghost"
                  color="neutral"
                  @click="showDeliveryInfoModal = true"
                  class="text-[var(--color-dark-green)]"
                >
                  <UIcon name="i-lucide-info" class="w-5 h-5" />
                </UButton>
              </div>
            </UFormField>

            <UFormField>
              <div class="flex items-start gap-2">
                <UCheckbox 
                  v-model="formData.step4.termsAccepted"
                  color="orange"
                />
                <label class="text-sm text-[var(--color-dark-green)]">
                  Súhlasím s <a href="#" class="underline hover:text-[var(--color-orange)]">obchodnými podmienkami</a>, <a href="#" class="underline hover:text-[var(--color-orange)]">zásadami ochrany údajov</a> a spracovaním osobných údajov pre účely objednávky.
                </label>
              </div>
            </UFormField>
          </div>

          <div class="flex justify-end gap-3">
            <button 
              class="hero-button border-2 border-[var(--color-orange)] text-[var(--color-orange)] font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:bg-[var(--color-orange)] hover:text-[var(--color-dark-green)] hover:scale-105 hover:shadow-lg"
              @click="previousStep"
            >
              Späť
            </button>
            <button 
              class="hero-button border-2 border-transparent bg-[var(--color-orange)] text-[var(--color-dark-green)] font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg font-condensed"
              @click="handleSubmit"
            >
              Zaplatiť a dokončiť objednávku
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delivery Info Modal -->
    <UModal v-model:open="showDeliveryInfoModal" :ui="{ content: 'sm:max-w-3xl' }">
      <template #header>
        <h3 class="text-xl font-bold text-[var(--color-dark-green)] font-condensed">Kedy dostanem svoje jedlo?</h3>
      </template>
      <template #body>
        <div class="space-y-6">
          <p class="text-[var(--color-dark-green)]">
            Načasovanie doručenia závisí od dňa, keď vytvoríš objednávku:
          </p>
          
          <!-- Delivery Schedule Table -->
          <div class="overflow-x-auto rounded-lg border border-[var(--color-dark-green)]/20">
            <table class="w-full">
              <thead>
                <tr class="bg-[var(--color-dark-green)] text-[var(--color-beige)]">
                  <th class="px-4 py-3 text-left font-semibold font-condensed">Ak objednáš v</th>
                  <th class="px-4 py-3 text-left font-semibold font-condensed">Pripravené od</th>
                  <th class="px-4 py-3 text-left font-semibold font-condensed">Doručujeme od</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="(schedule, index) in deliverySchedule" 
                  :key="index"
                  class="border-t border-[var(--color-dark-green)]/10 hover:bg-[var(--color-beige)]/50 transition-colors"
                  :class="{ 'bg-[var(--color-orange)]/10': isTodaySchedule(schedule.orderDay) }"
                >
                  <td class="px-4 py-3 text-[var(--color-dark-green)] font-medium capitalize">
                    {{ schedule.orderDay }}
                    <span v-if="isTodaySchedule(schedule.orderDay)" class="ml-2 text-xs bg-[var(--color-orange)] text-white px-2 py-0.5 rounded-full">Dnes</span>
                  </td>
                  <td class="px-4 py-3 text-[var(--color-dark-green)] font-semibold capitalize">
                    {{ schedule.preparedDay }}
                  </td>
                  <td class="px-4 py-3 text-[var(--color-dark-green)] capitalize">
                    {{ schedule.deliveryDay }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Today's Info Highlight -->
          <div v-if="deliveryInfo.delivery" class="p-4 bg-[var(--color-orange)]/20 rounded-lg border-2 border-[var(--color-orange)]">
            <div class="flex items-start gap-3">
              <UIcon name="i-lucide-calendar-check" class="w-5 h-5 text-[var(--color-orange)] mt-0.5 flex-shrink-0" />
              <div>
                <p class="text-[var(--color-dark-green)] font-semibold mb-1">
                  Tvoja objednávka dnes
                </p>
                <p class="text-[var(--color-dark-green)] text-sm">
                  Jedlo máš pripravené od <strong>{{ deliveryInfo.prepared }}</strong> (doručujeme od <strong>{{ deliveryInfo.delivery }}</strong>)
                </p>
              </div>
            </div>
          </div>

          <!-- Additional Info -->
          <div class="text-sm text-[var(--color-dark-green)]/70 space-y-2 pt-2 border-t border-[var(--color-dark-green)]/10">
            <p><strong>Poznámka:</strong> „Doručujeme" znamená, že tvoje jedlo už bude pripravené na výdajnom mieste alebo sa bude doručovať podľa tvojho nastavenia.</p>
            <p><strong>Doba doručenia:</strong> 11:00 - 15:00</p>
          </div>
        </div>
      </template>
    </UModal>

    
  </div>
  <!-- Footer -->
  <Footer />
</template>
