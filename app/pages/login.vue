<script setup lang="ts">
import logoLongIcon from '~/assets/icons/logo-long-orange.svg'

definePageMeta({
  layout: false
})

const { signIn } = useAuth()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const handleEmailLogin = async () => {
  loading.value = true
  error.value = ''

  try {
    await signIn(email.value, password.value)
    await navigateTo('/dashboard')
  } catch (e: any) {
    error.value = e.message || 'Prihlásenie zlyhalo'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-beige px-4">
    <UCard class="w-full bg-beige max-w-md shadow-lg">
      <template #header>
        <div class="text-center pt-2">
          <NuxtLink to="/" class="inline-block mb-4">
            <img :src="logoLongIcon" alt="LevFood logo" class="w-[240px] h-auto" />
          </NuxtLink>
          <h2 class="text-2xl font-bold text-slate-900">Prihlásenie do Admin Panelu</h2>
          <p class="text-sm text-slate-600 mt-2">Prihláste sa pomocou svojho admin účtu</p>
        </div>
      </template>

      <div class="space-y-4">

        <!-- Error Alert -->
        <UAlert
          v-if="error"
          variant="soft"
          :title="error"
          :close-button="{ icon: 'i-heroicons-x-mark-20-solid', color: 'red', variant: 'link' }"
          @close="error = ''"
        />

        <!-- Email Login Form -->
        <form @submit.prevent="handleEmailLogin" class="flex flex-col gap-4">
          <UFormGroup label="Email" required class="w-full">
            <UInput
              v-model="email"
              type="email"
              placeholder="vas@email.com"
              size="lg"
              :disabled="loading"
              required
              class="w-full bg-beige"
              :ui="{ base: 'rounded-md ring-1 ring-[var(--color-dark-green)] focus:border-[var(--color-orange)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-orange)]' }"

            >
              <template #leading>
                <Icon name="lucide:mail" class="w-5 h-5" />
              </template>
            </UInput>
          </UFormGroup>

          <UFormGroup label="Heslo" required class="w-full">
            <UInput
              v-model="password"
              type="password"
              placeholder="••••••••"
              size="lg"
              :disabled="loading"
              required
              class="w-full"
              :ui="{ base: 'rounded-md ring-1 ring-[var(--color-dark-green)] focus:border-[var(--color-orange)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-orange)]' }"

            >
              <template #leading>
                <Icon name="lucide:lock" class="w-5 h-5" />
              </template>
            </UInput>
          </UFormGroup>

          <UButton
            type="submit"
            block
            color="neutral"
            size="lg"
            :loading="loading"
            class="pricing-button bg-[var(--color-dark-green)] text-beige mb-6 h-14 text-lg font-bold"
          >
            Prihlásiť sa
          </UButton>
        </form>
      </div>
    </UCard>
  </div>
</template>