<script setup lang="ts">
definePageMeta({
  layout: false
})

const { signIn, signInWithGoogle, signInWithApple } = useAuth()

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
    error.value = e.message || 'Login failed'
  } finally {
    loading.value = false
  }
}

const handleGoogleLogin = async () => {
  loading.value = true
  error.value = ''

  try {
    await signInWithGoogle()
    await navigateTo('/dashboard')
  } catch (e: any) {
    error.value = e.message || 'Google login failed'
    loading.value = false
  }
}

const handleAppleLogin = async () => {
  loading.value = true
  error.value = ''

  try {
    await signInWithApple()
    await navigateTo('/dashboard')
  } catch (e: any) {
    error.value = e.message || 'Apple login failed'
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
            <h1 class="text-3xl font-bold text-slate-900">Levita</h1>
          </NuxtLink>
          <h2 class="text-2xl font-bold text-slate-900">Welcome Back</h2>
          <p class="text-sm text-slate-600 mt-2">Sign in to your account</p>
        </div>
      </template>

      <div class="space-y-4">
        <!-- Social Login Buttons -->
        <div class="space-y-3">
          <UButton
            block
            size="lg"
            variant="outline"
            :loading="loading"
            @click="handleGoogleLogin"
          >
            <template #leading>
              <svg class="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </template>
            Continue with Google
          </UButton>

          <UButton
            block
            size="lg"
            :loading="loading"
            @click="handleAppleLogin"
          >
            <template #leading>
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
            </template>
            Continue with Apple
          </UButton>
        </div>

        <UDivider label="OR" />

        <!-- Error Alert -->
        <UAlert
          v-if="error"
          variant="soft"
          :title="error"
          :close-button="{ icon: 'i-heroicons-x-mark-20-solid', color: 'red', variant: 'link' }"
          @close="error = ''"
        />

        <!-- Email Login Form -->
        <form @submit.prevent="handleEmailLogin" class="flex flex-col gap-2 ">
          <UFormGroup label="Email" required class="w-full">
            <UInput
              v-model="email"
              type="email"
              placeholder="you@example.com"
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

          <UFormGroup label="Password" required class="w-full">
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

          <div class="flex items-center justify-between">
            <UCheckbox label="Remember me" />
            <UButton variant="link" to="/forgot-password" :padded="false">
              Forgot password?
            </UButton>
          </div>

          <UButton
            type="submit"
            block
            size="lg"
            :loading="loading"
          >
            Sign in
          </UButton>
        </form>
      </div>

      <template #footer>
        <div class="text-center text-sm text-slate-600 pb-2">
          Don't have an account?
          <UButton variant="link" to="/register" :padded="false" class="font-semibold">
            Sign up
          </UButton>
        </div>
      </template>
    </UCard>
  </div>
</template>