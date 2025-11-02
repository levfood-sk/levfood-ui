<script setup lang="ts">
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
  <div class="min-h-screen flex items-center justify-center bg-gradient-professional px-4">
    <UCard class="w-full max-w-md shadow-lg">
      <template #header>
        <div class="text-center pt-2">
          <NuxtLink to="/" class="inline-block mb-4">
            <h1 class="text-3xl font-bold text-slate-900">Levfood</h1>
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
              class="w-full"
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
            >
              <template #leading>
                <Icon name="lucide:lock" class="w-5 h-5" />
              </template>
            </UInput>
          </UFormGroup>

          <UButton
            type="submit"
            block
            size="lg"
            :loading="loading"
          >
            Prihlásiť sa
          </UButton>
        </form>
      </div>
    </UCard>
  </div>
</template>