<script setup lang="ts">
import numbersIcon from '~/assets/icons/numbers.svg'

definePageMeta({
  layout: false,
  ssr: false, // Client-only page - requires Firebase auth
})

const router = useRouter()
const { linkAccount, signOut } = useClientAuth()

const CODE_LENGTH = 6
const code = ref<string[]>(Array(CODE_LENGTH).fill(''))
const error = ref<string | null>(null)
const loading = ref(false)
const success = ref(false)
const shake = ref(false)

const inputRefs = ref<HTMLInputElement[]>([])

const isComplete = computed(() => code.value.every((d) => d !== ''))

const triggerShake = () => {
  shake.value = true
  setTimeout(() => {
    shake.value = false
  }, 500)
}

const handleInput = (event: Event, index: number) => {
  const target = event.target as HTMLInputElement
  const value = target.value

  // Clear error on input
  if (error.value) error.value = null

  // Only allow digits
  const digit = value.replace(/[^0-9]/g, '').slice(-1)
  code.value[index] = digit

  // Update input value (in case non-digit was entered)
  target.value = digit

  // Auto-focus next input
  if (digit && index < CODE_LENGTH - 1) {
    inputRefs.value[index + 1]?.focus()
  }

  // Auto-submit when complete
  if (digit && index === CODE_LENGTH - 1 && isComplete.value) {
    verifyCode()
  }
}

const handleKeydown = (event: KeyboardEvent, index: number) => {
  // Handle backspace - move to previous input if current is empty
  if (event.key === 'Backspace' && !code.value[index] && index > 0) {
    event.preventDefault()
    code.value[index - 1] = ''
    inputRefs.value[index - 1]?.focus()
  }
}

const handlePaste = (event: ClipboardEvent) => {
  event.preventDefault()
  const pastedData = event.clipboardData?.getData('text') || ''
  const digits = pastedData.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH)

  if (digits.length > 0) {
    // Fill in the digits
    for (let i = 0; i < CODE_LENGTH; i++) {
      code.value[i] = digits[i] || ''
    }

    // Focus the next empty input or last input
    const nextEmpty = code.value.findIndex((d) => d === '')
    if (nextEmpty !== -1) {
      inputRefs.value[nextEmpty]?.focus()
    } else {
      inputRefs.value[CODE_LENGTH - 1]?.focus()
      // Auto-submit if complete
      if (isComplete.value) {
        verifyCode()
      }
    }
  }
}

const verifyCode = async () => {
  if (!isComplete.value || loading.value) return

  loading.value = true
  error.value = null

  try {
    const fullCode = code.value.join('')
    await linkAccount(fullCode)
    success.value = true

    // Navigate to calendar after success animation
    setTimeout(() => {
      router.push('/client/calendar')
    }, 1000)
  } catch (err: any) {
    error.value = err.data?.message || err.message || 'Neplatný kód. Skontrolujte a skúste znova.'
    triggerShake()
    loading.value = false
  }
}

const handleClear = () => {
  code.value = Array(CODE_LENGTH).fill('')
  error.value = null
  inputRefs.value[0]?.focus()
}

const handleLogout = async () => {
  await signOut()
  router.push('/client/login')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-beige px-4">
    <UCard class="w-full bg-beige max-w-md" :ui="{ root: 'border-0 ring-0', header: 'border-0 ring-0' }">
      <template #header>
        <div class="text-center pt-2">
          <!-- Icon -->
          <div
            class="mx-auto mb-4 flex size-20 items-center justify-center rounded-full"
            :class="success ? 'bg-green-500' : 'bg-white'"
          >
            <UIcon
              v-if="success"
              name="i-heroicons-check"
              class="size-10 text-white"
            />
            <img
              v-else
              :src="numbersIcon"
              alt="Numbers"
              class="size-10"
            />
          </div>

          <h2 class="text-2xl font-bold text-[var(--color-dark-green)]">
            {{ success ? 'Úspešne prepojené!' : 'Kód objednávky' }}
          </h2>
          <p class="text-sm text-[var(--color-dark-green)]/80 mt-2">
            {{
              success
                ? 'Vaša objednávka bola úspešne prepojená s aplikáciou.'
                : 'Zadajte 6-miestny kód z vašej objednávky'
            }}
          </p>
        </div>
      </template>

      <div v-if="!success" class="space-y-4">
        <!-- Code Input -->
        <div
          class="flex justify-center gap-2 transition-transform"
          :class="{ 'animate-shake': shake }"
        >
          <input
            v-for="(_, index) in CODE_LENGTH"
            :key="index"
            :ref="(el) => { if (el) inputRefs[index] = el as HTMLInputElement }"
            type="text"
            inputmode="numeric"
            maxlength="1"
            :value="code[index]"
            :disabled="loading"
            class="size-12 rounded-md bg-white text-center text-2xl font-bold text-[var(--color-dark-green)] outline-none transition-colors ring-1 ring-[var(--color-dark-green)] focus:ring-2 focus:ring-[var(--color-orange)] sm:size-14"
            :class="{
              'ring-2 ring-[var(--color-dark-green)]': code[index],
              'ring-red-500 bg-red-50': error,
            }"
            @input="handleInput($event, index)"
            @keydown="handleKeydown($event, index)"
            @paste="handlePaste"
            @focus="error = null"
          />
        </div>

        <!-- Error Alert -->
        <UAlert
          v-if="error"
          variant="soft"
          :title="error"
          :close-button="{ icon: 'i-heroicons-x-mark-20-solid', color: 'error', variant: 'link' }"
          @close="error = null"
        />

        <!-- Actions -->
        <div class="flex flex-col gap-3">
          <UButton
            block
            color="neutral"
            size="lg"
            class="pricing-button bg-[var(--color-dark-green)] text-beige h-14 text-lg font-bold"
            :loading="loading"
            :disabled="!isComplete || loading"
            @click="verifyCode"
          >
            {{ loading ? 'Overujem...' : 'Overiť kód' }}
          </UButton>

          <button
            v-if="code.some((d) => d !== '')"
            type="button"
            class="py-3 text-sm font-medium text-[var(--color-dark-green)]/70 hover:text-[var(--color-dark-green)]"
            @click="handleClear"
          >
            Vymazať
          </button>
        </div>

        <!-- Help Text -->
        <p class="text-center text-sm text-[var(--color-dark-green)]/60">
          Kód nájdete v potvrdzovacom emaile ktorý ste obdržali po zaplatení objednávky
        </p>

        <!-- Back to Login Link -->
        <div class="text-center">
          <button
            type="button"
            class="text-sm font-medium text-[var(--color-orange)] hover:underline"
            @click="handleLogout"
          >
            Späť na prihlásenie
          </button>
        </div>
      </div>
    </UCard>
  </div>
</template>

<style scoped>
@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  10%,
  30%,
  50%,
  70%,
  90% {
    transform: translateX(-10px);
  }
  20%,
  40%,
  60%,
  80% {
    transform: translateX(10px);
  }
}

.animate-shake {
  animation: shake 0.5s ease-in-out;
}
</style>
