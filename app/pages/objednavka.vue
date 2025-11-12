<script setup lang="ts">
import { z } from 'zod'
import logoLongIcon from '~/assets/icons/logo-long-orange.svg'
import type { CreateOrderInput } from '~~/app/lib/types/order'

const currentStep = ref(1)
const totalSteps = 4
const showDeliveryInfoModal = ref(false)

// Stripe integration
const { stripe } = useClientStripe()
const stripeLoading = ref(false)
const stripeProcessing = ref(false)
const stripeError = ref<string | null>(null)
const clientSecret = ref<string | null>(null)
const paymentIntentId = ref<string | null>(null)
const elements = ref<any>(null)
const paymentElement = ref<any>(null)
const orderSuccess = ref(false)
const createdOrderId = ref<string | null>(null)

// Form data
const formData = ref({
  step1: {
    package: '' as 'EKONOMY' | 'ŠTANDARD' | 'PREMIUM' | 'OFFICE' | '',
    duration: '' as '5' | '6' | ''
  },
  step2: {
    dietaryRequirement: [] as string[],
    notes: '',
    // Personal info (Niečo o tebe)
    birthDate: '',
    height: null as number | null,
    weight: null as number | null,
    physicalActivity: '' as 'nízka' | 'stredná' | 'vysoká' | '',
    workActivity: '' as 'ľahká' | 'mierne náročná' | 'náročná' | '',
    stressLevel: '' as 'nízky' | 'stredný' | 'vysoký' | '',
    goal: ''
  },
  step3: {
    deliveryType: '' as 'prevádzka' | 'domov' | '',
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

// Computed flags for delivery logic
const isEkonomy = computed(() => formData.value.step1.package === 'EKONOMY')
const showAddressField = computed(() => formData.value.step3.deliveryType === 'domov')
const isDeliveryTypeDisabled = computed(() => isEkonomy.value)

// Zod schemas - dynamic based on delivery type
const step3Schema = computed(() => {
  const baseSchema = {
    deliveryType: z.enum(['prevádzka', 'domov'] as const, {
      required_error: 'Typ doručenia je povinný'
    }),
    fullName: z.string().min(2, 'Meno musí obsahovať aspoň 2 znaky'),
    phone: z.string()
      .min(1, 'Telefónne číslo je povinné')
      .regex(/^(\+421|0)?[0-9]{9,10}$/, 'Neplatné telefónne číslo. Použite formát +421000000000)'),
    email: z.string().email('Neplatná emailová adresa'),
  }

  // Only require address if delivery type is 'domov'
  if (formData.value.step3.deliveryType === 'domov') {
    return z.object({
      ...baseSchema,
      address: z.string().min(5, 'Adresa musí obsahovať aspoň 5 znakov')
    })
  }

  return z.object(baseSchema)
})

const steps = computed(() => [
  { number: 1, title: 'Tvoj balíček', completed: currentStep.value > 1 },
  { number: 2, title: 'Tvoje preferencie', completed: currentStep.value > 2 },
  { number: 3, title: 'Doručenie', completed: currentStep.value > 3 },
  { number: 4, title: 'Platba', completed: currentStep.value > 4 || orderSuccess.value }
])

// Package options
const packageOptions = [
  { value: 'EKONOMY', label: 'EKONOMY', description: '4 jedlá denne / jednoduché, vyvážené menu' },
  { value: 'ŠTANDARD', label: 'ŠTANDARD', description: '5 jedál denne / pestrá ponuka a viac chutí' },
  { value: 'PREMIUM', label: 'PREMIUM', description: '6 jedál denne / nutrične prispôsobené' },
  { value: 'OFFICE', label: 'OFFICE', description: '4 jedlá denne / kompletné riešenie pre pracovný deň' }
]

// Duration options - dynamic based on package
const durationOptions = computed(() => {
  // OFFICE package only allows 5 days
  if (formData.value.step1.package === 'OFFICE') {
    return [
      { label: '4 týždne (5 dní v týždni pon-pia)', value: '5' }
    ]
  }

  // All other packages allow both 5 and 6 days
  return [
    { label: '4 týždne (5 dní v týždni pon-pia)', value: '5' },
    { label: '4 týždne (6 dní v týždni pon – sob)', value: '6' }
  ]
})

// Delivery type options - dynamic based on package
const deliveryTypeOptions = computed(() => {
  // For OFFICE package, show "Do práce" instead of "Domov"
  if (formData.value.step1.package === 'OFFICE') {
    return [
      { label: 'Prevádzka', value: 'prevádzka' },
      { label: 'Do práce', value: 'domov' }
    ]
  }

  // For all other packages, show "Domov"
  return [
    { label: 'Prevádzka', value: 'prevádzka' },
    { label: 'Domov', value: 'domov' }
  ]
})

// Dietary requirement options
const dietaryOptions = [
  { value: 'bezlaktózová', label: 'Bezlaktózová' },
  { value: 'vegetariánska', label: 'Vegetariánska' },
  { value: 'bezlepková', label: 'Bezlepková' },
  { value: 'bez-rýb', label: 'Bez rýb' },
  { value: 'bez-orechov', label: 'Bez orechov' },
  { value: 'žiadne', label: 'Nemám špeciálne požiadavky' }
]

// Personal info options (Niečo o tebe)
const physicalActivityOptions = [
  { label: 'Nízka', value: 'nízka' },
  { label: 'Stredná', value: 'stredná' },
  { label: 'Vysoká', value: 'vysoká' }
]

const workActivityOptions = [
  { label: 'Ľahká', value: 'ľahká' },
  { label: 'Mierne náročná', value: 'mierne náročná' },
  { label: 'Náročná', value: 'náročná' }
]

const stressLevelOptions = [
  { label: 'Nízky', value: 'nízky' },
  { label: 'Stredný', value: 'stredný' },
  { label: 'Vysoký', value: 'vysoký' }
]

// Pricing (in cents for Stripe) - Dynamic pricing based on duration
const packagePrices = {
  EKONOMY: {
    '5': 29900,  // 299€ for 5 days
    '6': 33900   // 339€ for 6 days
  },
  ŠTANDARD: {
    '5': 35900,  // 359€ for 5 days
    '6': 39900   // 399€ for 6 days
  },
  PREMIUM: {
    '5': 41900,  // 419€ for 5 days
    '6': 45900   // 459€ for 6 days
  },
  OFFICE: {
    '5': 24900,  // 249€ for 5 days (only option)
    '6': 24900   // 249€ for 6 days (not available, but keeping for consistency)
  }
}

const totalPrice = computed(() => {
  if (!formData.value.step1.package || !formData.value.step1.duration) return 0
  const packageType = formData.value.step1.package as keyof typeof packagePrices
  const duration = formData.value.step1.duration as '5' | '6'
  return packagePrices[packageType]?.[duration] || 0
})

const totalPriceFormatted = computed(() => {
  const euros = totalPrice.value / 100
  return `${euros.toFixed(2)}€`
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

  const shape = step3Schema.value.shape as Record<string, z.ZodTypeAny>
  const fieldSchema = shape[field]
  if (!fieldSchema) return true // Field not in current schema

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
  const result = step3Schema.value.safeParse(formData.value.step3)

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
  const result = step3Schema.value.safeParse(formData.value.step3)
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

// Read query parameters and pre-fill form
const route = useRoute()

// Map lowercase English package names from URL to internal values
const packageMap: Record<string, 'EKONOMY' | 'ŠTANDARD' | 'PREMIUM' | 'OFFICE'> = {
  economy: 'EKONOMY',
  standard: 'ŠTANDARD',
  premium: 'PREMIUM',
  office: 'OFFICE'
}

// Initialize delivery date with suggested date and pre-fill from query params
onMounted(() => {
  // Pre-fill from query parameters if present
  const packageParam = route.query.package as string
  const durationParam = route.query.duration as string

  // Validate and set package (accept lowercase English names)
  if (packageParam) {
    const mappedPackage = packageMap[packageParam.toLowerCase()]
    if (mappedPackage) {
      formData.value.step1.package = mappedPackage
    }
  }

  // Validate and set duration
  if (durationParam && ['5', '6'].includes(durationParam)) {
    formData.value.step1.duration = durationParam as '5' | '6'
  }

  // Ensure we're on step 1 when coming from pricing cards
  if (packageParam || durationParam) {
    currentStep.value = 1
  }

  // Initialize delivery date with suggested date
  if (!formData.value.step4.deliveryStartDate && suggestedDeliveryDate.value) {
    formData.value.step4.deliveryStartDate = suggestedDeliveryDate.value
  }

  // Set delivery type to 'prevádzka' if EKONOMY is pre-selected
  if (formData.value.step1.package === 'EKONOMY') {
    formData.value.step3.deliveryType = 'prevádzka'
  }
})

// Watch for package changes to update delivery type for EKONOMY
watch(() => formData.value.step1.package, (newPackage) => {
  if (newPackage === 'EKONOMY') {
    formData.value.step3.deliveryType = 'prevádzka'
  }

  // OFFICE package only allows 5 days
  if (newPackage === 'OFFICE' && formData.value.step1.duration === '6') {
    formData.value.step1.duration = '5'
  }
})

// Watch for delivery type changes to clear address when switching to 'prevádzka'
watch(() => formData.value.step3.deliveryType, (newType) => {
  if (newType === 'prevádzka') {
    formData.value.step3.address = ''
    formData.value.step3.courierNotes = ''
    // Clear address validation errors
    errors.value.address = ''
    touched.value.address = false
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

/**
 * Initialize Stripe payment when entering step 4
 */
const initializePayment = async () => {
  stripeLoading.value = true
  stripeError.value = null

  try {
    // Call server endpoint to create payment intent
    const response = await $fetch('/api/stripe/create-payment-intent', {
      method: 'POST',
      body: {
        amount: totalPrice.value,
        currency: 'eur',
        description: `Levfood ${formData.value.step1.package} balíček`,
      },
    })

    clientSecret.value = response.clientSecret
    paymentIntentId.value = response.paymentIntentId

    console.log('Payment intent created:', paymentIntentId.value)
  } catch (e: any) {
    console.error('Payment initialization error:', e)
    stripeError.value = e.data?.message || e.message || 'Nepodarilo sa inicializovať platbu'
  } finally {
    stripeLoading.value = false
  }
}

/**
 * Initialize Stripe Elements when stripe and clientSecret are ready
 */
watch([stripe, clientSecret], async () => {
  if (stripe.value && clientSecret.value && !paymentElement.value) {
    try {
      // Wait for next tick to ensure DOM is ready
      await nextTick()

      // Check if container exists
      const container = document.getElementById('payment-element')
      if (!container) {
        console.error('Payment element container not found')
        return
      }

      // Create Elements instance with client secret
      elements.value = stripe.value.elements({
        clientSecret: clientSecret.value,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#f97316', // Orange color
            colorBackground: '#ffffff',
            colorText: '#1e293b',
            colorDanger: '#ef4444',
            fontFamily: 'system-ui, sans-serif',
            borderRadius: '8px',
          },
        },
      })

      // Create and mount Payment Element
      paymentElement.value = elements.value.create('payment', {
        layout: 'tabs',
      })

      // Mount to DOM
      paymentElement.value.mount('#payment-element')
      console.log('Stripe Payment Element mounted successfully')
    } catch (e: any) {
      console.error('Elements initialization error:', e)
      stripeError.value = 'Nepodarilo sa načítať platobný formulár'
    }
  }
})

/**
 * Handle payment submission
 */
async function handleSubmit() {
  if (!formData.value.step4.termsAccepted) {
    alert('Musíte súhlasiť s obchodnými podmienkami')
    return
  }

  if (!stripe.value || !elements.value) {
    stripeError.value = 'Platobný systém nie je pripravený'
    return
  }

  stripeProcessing.value = true
  stripeError.value = null

  try {
    // Confirm payment with Stripe
    const { error: submitError, paymentIntent } = await stripe.value.confirmPayment({
      elements: elements.value,
      redirect: 'if_required', // Don't redirect, handle success here
    })

    if (submitError) {
      stripeError.value = submitError.message || 'Platba zlyhala'
      stripeProcessing.value = false
      return
    }

    if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Payment successful, save order to database
      await saveOrder(paymentIntent.id)
    }
  } catch (e: any) {
    console.error('Payment confirmation error:', e)
    stripeError.value = 'Spracovanie platby zlyhalo'
    stripeProcessing.value = false
  }
}

/**
 * Save order to Firestore after successful payment
 */
async function saveOrder(stripePaymentIntentId: string) {
  try {
    const orderData: CreateOrderInput = {
      // Step 1
      package: formData.value.step1.package as any,
      duration: formData.value.step1.duration as any,

      // Step 2
      dietaryRequirements: formData.value.step2.dietaryRequirement,
      notes: formData.value.step2.notes || '',

      // Step 2b - Personal info
      birthDate: formData.value.step2.birthDate,
      height: Number(formData.value.step2.height),
      weight: Number(formData.value.step2.weight),
      physicalActivity: formData.value.step2.physicalActivity as any,
      workActivity: formData.value.step2.workActivity as any,
      stressLevel: formData.value.step2.stressLevel as any,
      goal: formData.value.step2.goal,

      // Step 3
      deliveryType: formData.value.step3.deliveryType as any,
      fullName: formData.value.step3.fullName,
      phone: formData.value.step3.phone,
      email: formData.value.step3.email,
      address: formData.value.step3.deliveryType === 'domov' ? formData.value.step3.address : '',
      courierNotes: formData.value.step3.deliveryType === 'domov' ? formData.value.step3.courierNotes || '' : '',

      // Step 4
      deliveryStartDate: formData.value.step4.deliveryStartDate,
      termsAccepted: formData.value.step4.termsAccepted,
      stripePaymentIntentId,
    }

    console.log('Order data being sent:', orderData)

    const response = await $fetch('/api/orders/create', {
      method: 'POST',
      body: orderData,
    })

    console.log('Order created:', response)

    // Show success notification
    useToast().add({
      title: 'Objednávka úspešná!',
      description: `Tvoja objednávka #${response.orderId} bola prijatá. Ďakujeme!`,
      color: 'success',
      duration: 8000,
    })

    // Show success state
    orderSuccess.value = true
    createdOrderId.value = response.orderId
  } catch (e: any) {
    console.error('Order creation error:', e)
    stripeError.value = 'Platba bola úspešná, ale nepodarilo sa uložiť objednávku. Kontaktujte nás.'

    useToast().add({
      title: 'Chyba',
      description: 'Platba bola úspešná, ale objednávka nebola uložená. Kontaktujte nás.',
      color: 'error',
      duration: 10000,
    })
  } finally {
    stripeProcessing.value = false
  }
}

// Watch for step 4 and initialize payment
watch(() => currentStep.value, (newStep) => {
  if (newStep === 4 && !clientSecret.value) {
    initializePayment()
  }
})
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
                currentStep === step.number ? 'border-[var(--color-orange)] text-[var(--color-orange)]' : 
                'border-[var(--color-dark-green)]/50 text-[var(--color-dark-green)]/50'
              ]"  
            >
              <UIcon v-if="step.completed" name="i-lucide-check" class="w-4 h-4" />
              <span v-else class="text-sm font-medium">{{ step.number }}</span>
            </div>
            <span 
              class="text-xs font-medium hidden sm:inline font-condensed"
              :class="currentStep >= step.number ? 'text-[var(--color-orange)]' : 'text-[var(--color-dark-green)]/50'"
            >
              {{ step.title }}
            </span>
          </div>
          <div v-if="index < steps.length - 1" class="w-8 h-0.5 mx-2" :class="currentStep > step.number ? 'bg-[var(--color-orange)]' : 'bg-[var(--color-dark-green)]/50'" />
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
                color="orange"
                variant="subtle"
                placeholder="Vyber dĺžku objednávky"
                class="pricing-select w-full bg-transparent h-[3.5rem] data-[state=open]:border-[var(--color-orange)] data-[state=closed]:border-[var(--color-dark-green)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-dark-green)] data-[state=open]:ring-2 data-[state=open]:ring-inset data-[state=open]:ring-[var(--color-orange)] data-[state=closed]:ring-[var(--color-dark-green)]"
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
                :ui="{ fieldset: 'flex flex-wrap gap-2', label: 'text-[var(--color-dark-green)]', icon: 'text-[var(--color-dark-green)]' }"
              />
            </UFormField>

            <UFormField label="Iné poznámky alebo alergie" class="w-full">
              <UTextarea
                v-model="formData.step2.notes"
                size="lg"
                placeholder="Napríklad: nemám rád huby, prosím menej pikantné jedlá…"
                :rows="4"
                class="w-full"
                :ui="{ base: 'rounded-md bg-transparent placeholder:text-[var(--color-dark-green)]/50 ring-1 ring-[var(--color-dark-green)] focus:border-[var(--color-orange)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-orange)]' }"

              />
            </UFormField>
          </div>

          <!-- Niečo o tebe section -->
          <div class="">
            <div class="text-center mb-4">
              <h3 class="text-xl font-bold text-[var(--color-dark-green)] font-condensed">Niečo o tebe</h3>
              <p class="text-sm text-[var(--color-dark-green)] mt-1">Pomôžu nám lepšie nastaviť tvoj plán</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <UFormField label="Dátum narodenia" class="w-full">
                <UInput
                  v-model="formData.step2.birthDate"
                  type="date"
                  size="lg"
                  class="w-full"
                  :ui="{ base: 'rounded-md bg-transparent placeholder:text-[var(--color-dark-green)]/50 ring-1 ring-[var(--color-dark-green)] focus:border-[var(--color-orange)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-orange)]' }"

                />
              </UFormField>

              <UFormField label="Výška (cm)" class="w-full">
                <UInput
                  v-model.number="formData.step2.height"
                  type="number"
                  size="lg"
                  placeholder="napr. 175"
                  max="300"
                  class="w-full"
                  :ui="{ base: 'rounded-md bg-transparent placeholder:text-[var(--color-dark-green)]/50 ring-1 ring-[var(--color-dark-green)] focus:border-[var(--color-orange)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-orange)]' }"

                />
              </UFormField>

              <UFormField label="Aktuálna hmotnosť (kg)" class="w-full">
                <UInput
                  v-model.number="formData.step2.weight"
                  type="number"
                  size="lg"
                  placeholder="napr. 70"
                  max="500"
                  :ui="{ base: 'rounded-md bg-transparent placeholder:text-[var(--color-dark-green)]/50 ring-1 ring-[var(--color-dark-green)] focus:border-[var(--color-orange)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-orange)]' }"

                />
              </UFormField>

              <UFormField label="Fyzická aktivita" class="w-full">
                <USelect
                  v-model="formData.step2.physicalActivity"
                  :items="physicalActivityOptions"
                  placeholder="Vyber úroveň"
                  size="lg"
                  class="pricing-select w-full bg-transparent h-[3.5rem] data-[state=open]:border-[var(--color-orange)] data-[state=closed]:border-[var(--color-dark-green)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-dark-green)] data-[state=open]:ring-2 data-[state=open]:ring-inset data-[state=open]:ring-[var(--color-orange)] data-[state=closed]:ring-[var(--color-dark-green)]"
                />
              </UFormField>

              <UFormField label="Pracovná aktivita" class="w-full">
                <USelect
                  v-model="formData.step2.workActivity"
                  :items="workActivityOptions"
                  placeholder="Vyber typ"
                  size="lg"
                  class="pricing-select w-full bg-transparent h-[3.5rem] data-[state=open]:border-[var(--color-orange)] data-[state=closed]:border-[var(--color-dark-green)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-dark-green)] data-[state=open]:ring-2 data-[state=open]:ring-inset data-[state=open]:ring-[var(--color-orange)] data-[state=closed]:ring-[var(--color-dark-green)]"
                />
              </UFormField>

              <UFormField label="Stres" class="w-full">
                <USelect
                  v-model="formData.step2.stressLevel"
                  :items="stressLevelOptions"
                  placeholder="Vyber úroveň"
                  size="lg"
                  class="pricing-select w-full bg-transparent h-[3.5rem] data-[state=open]:border-[var(--color-orange)] data-[state=closed]:border-[var(--color-dark-green)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-dark-green)] data-[state=open]:ring-2 data-[state=open]:ring-inset data-[state=open]:ring-[var(--color-orange)] data-[state=closed]:ring-[var(--color-dark-green)]"
                />
              </UFormField>
            </div>

            <UFormField label="Aký máš cieľ?" class="w-full mt-4">
              <UTextarea
                v-model="formData.step2.goal"
                size="lg"
                placeholder="Napríklad: chcem schudnúť 5 kg, chcem nabrať svalovú hmotu, chhem sa cítiť lepšie..."
                :rows="3"
                class="w-full"
                :ui="{ base: 'rounded-md bg-transparent placeholder:text-[var(--color-dark-green)]/50 ring-1 ring-[var(--color-dark-green)] focus:border-[var(--color-orange)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-orange)]' }"

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
              class="hero-button border-2 border-transparent bg-[var(--color-orange)] text-[var(--color-dark-green)] font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg font-condensed"
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
            <p v-if="!isEkonomy && showAddressField" class="text-sm text-[var(--color-dark-green)]">Zabezpečíme doručenie priamo k tvojim dverám v čase od 11:00 do 15:00.</p>
          </div>

          <div class="space-y-6">
            <!-- Delivery Type Select -->
            <UFormField label="Doručenie" required class="w-full">
              <USelect
                v-model="formData.step3.deliveryType"
                :items="deliveryTypeOptions"
                placeholder="Vyber spôsob doručenia"
                size="lg"
                :disabled="isDeliveryTypeDisabled"
                class="pricing-select w-full bg-transparent h-[3.5rem] data-[state=open]:border-[var(--color-orange)] data-[state=closed]:border-[var(--color-dark-green)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-dark-green)] data-[state=open]:ring-2 data-[state=open]:ring-inset data-[state=open]:ring-[var(--color-orange)] data-[state=closed]:ring-[var(--color-dark-green)] disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <template v-if="isEkonomy" #hint>
                <span class="text-xs text-[var(--color-dark-green)]/70">EKONOMY balíček je dostupný iba s doručením do prevádzky</span>
              </template>
            </UFormField>
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
                :ui="{ base: 'rounded-md bg-transparent placeholder:text-[var(--color-dark-green)]/50 ring-1 ring-[var(--color-dark-green)] focus:border-[var(--color-orange)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-orange)]' }"

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
                :ui="{ base: 'rounded-md bg-transparent placeholder:text-[var(--color-dark-green)]/50 ring-1 ring-[var(--color-dark-green)] focus:border-[var(--color-orange)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-orange)]' }"

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
                :ui="{ base: 'rounded-md bg-transparent placeholder:text-[var(--color-dark-green)]/50 ring-1 ring-[var(--color-dark-green)] focus:border-[var(--color-orange)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-orange)]', icon: 'text-[var(--color-dark-green)]' }"

              />
            </UFormField>

            <!-- Address field - only show when delivery type is 'domov' -->
            <UFormField
              v-if="showAddressField"
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
                :ui="{ base: 'rounded-md bg-transparent placeholder:text-[var(--color-dark-green)]/50 ring-1 ring-[var(--color-dark-green)] focus:border-[var(--color-orange)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-orange)]' }"

              />
            </UFormField>

            <!-- Courier notes - only show when delivery type is 'domov' -->
            <UFormField v-if="showAddressField" label="Poznámka pre kuriéra" class="w-full">
              <UTextarea
                v-model="formData.step3.courierNotes"
                size="lg"
                placeholder="Napríklad: žltý dom, 4. naľavo…"
                :rows="3"
                class="w-full"
                :ui="{ base: 'rounded-md bg-transparent placeholder:text-[var(--color-dark-green)]/50 ring-1 ring-[var(--color-dark-green)] focus:border-[var(--color-orange)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-orange)]' }"
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
          <!-- Success Message -->
          <div v-if="orderSuccess" class="text-center py-12">
            <div class="mb-6">
              <div class="inline-flex items-center justify-center w-16 h-16 bg-[var(--color-orange)] rounded-full mb-4">
                <UIcon name="i-heroicons-check" class="w-10 h-10 text-white" />
              </div>
              <h2 class="text-2xl font-bold text-[var(--color-dark-green)] mb-3 font-condensed">Objednávka úspešná!</h2>
              <p class="text-[var(--color-dark-green)] mb-4">
                Tvoja objednávka bola prijatá.<br>
                Číslo objednávky: <strong class="text-2xl">{{ createdOrderId }}</strong>
              </p>
              <p class="text-sm text-[var(--color-dark-green)] mb-6">
                Budeme ťa kontaktovať na {{ formData.step3.email }}
              </p>
              <button
                class="hero-button border-2 border-transparent bg-[var(--color-orange)] text-[var(--color-dark-green)] font-semibold py-3 px-8 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg font-condensed"
                @click="navigateTo('/')"
              >
                Späť na hlavnú stránku
              </button>
            </div>
          </div>

          <!-- Payment Form -->
          <div v-else>
            <div class="text-center mb-6">
              <h2 class="text-2xl font-bold text-[var(--color-dark-green)] mb-3 font-condensed">Zhrnutie objednávky a platba</h2>
              <p class="text-sm text-[var(--color-dark-green)]">Skontroluj údaje a dokonči objednávku.</p>
            </div>

            <!-- Summary Section -->
            <div class="bg-orange border-1 border-[var(--color-dark-green)] rounded-lg p-6 mb-6">
              <h3 class="text-lg font-bold text-[var(--color-dark-green)] mb-4 font-condensed ">Zhrnutie</h3>
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
                  <span class="font-semibold">{{ totalPriceFormatted }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Typ doručenia:</span>
                  <span class="font-semibold">{{ formData.step3.deliveryType === 'prevádzka' ? 'Prevádzka' : 'Domov' }}</span>
                </div>
                <div v-if="formData.step3.deliveryType === 'domov'" class="flex justify-between">
                  <span>Adresa:</span>
                  <span class="font-semibold">{{ summaryData.address || '-' }}</span>
                </div>
              </div>
            </div>

            <div class="space-y-6">
              <UFormField label="Začiatok dodávky" class="w-full">
                <div class="flex flex-col items-start gap-2">
                  <UInput
                    v-model="formData.step4.deliveryStartDate"
                    type="date"
                    size="lg"
                    icon="i-lucide-calendar"
                    placeholder="dd/mm/rrrr"
                    class="flex-1"
                  />
                  <span
                    class="p-2 text-[var(--color-dark-green)] hover:text-[var(--color-orange)] transition-colors font-condensed text-[16px]"
                    @click="showDeliveryInfoModal = true"
                  >
                  Kedy dostanem objednávku?
                </span>
                </div>
              </UFormField>

              <!-- Loading State -->
              <div v-if="stripeLoading" class="flex flex-col items-center justify-center py-12 bg-white rounded-lg">
                <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 text-orange-500 animate-spin mb-4" />
                <p class="text-sm text-slate-600">Načítavam platobný formulár...</p>
              </div>

              <!-- Error Alert -->
              <div v-if="stripeError && !stripeLoading" class="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <div class="flex items-start gap-3">
                  <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p class="font-semibold text-red-900">Chyba</p>
                    <p class="text-sm text-red-700">{{ stripeError }}</p>
                  </div>
                </div>
              </div>

              <!-- Stripe Payment Element -->
              <div v-if="clientSecret && !stripeLoading" class="space-y-6">
                <div class="bg-white rounded-lg p-6">
                  <h3 class="text-lg font-bold text-[var(--color-dark-green)] mb-4 font-condensed">Platobné údaje</h3>
                  <div id="payment-element" class="min-h-[200px]"></div>
                </div>

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
                  class="hero-button border-2 border-[var(--color-orange)] text-[var(--color-orange)] font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:bg-[var(--color-orange)] hover:text-[var(--color-dark-green)] hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="stripeProcessing"
                  @click="previousStep"
                >
                  Späť
                </button>
                <button
                  class="flex items-center hero-button border-2 border-transparent bg-[var(--color-orange)] text-[var(--color-dark-green)] font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg font-condensed disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  :disabled="!formData.step4.termsAccepted || stripeProcessing || stripeLoading || !clientSecret"
                  @click="handleSubmit"
                >
                  <UIcon v-if="stripeProcessing" name="i-heroicons-arrow-path" class="w-5 h-5 mr-2 animate-spin" />
                  {{ stripeProcessing ? 'Spracúvam platbu...' : `Zaplatiť ${totalPriceFormatted}` }}
                </button>
              </div>

              <p v-if="clientSecret" class="text-xs text-center text-slate-500">
                Zabezpečené platbou cez Stripe. Tvoje platobné údaje sú šifrované.
              </p>
            </div>
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
