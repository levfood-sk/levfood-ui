<script setup lang="ts">
import logoLongIcon from '~/assets/icons/logo-long-orange.svg'

definePageMeta({
  layout: false,
  ssr: false, // Client-only page - requires Firebase auth
})

const router = useRouter()
const { signInWithGoogle, signInWithApple, user, isLinked, linkCheckComplete } = useClientAuth()

const loginLoading = ref<'google' | 'apple' | null>(null)
const loginError = ref<string | null>(null)

// Redirect result is now handled by the firebase.client.ts plugin
// The watcher below will handle redirect when user state changes

// Watch for auth state changes and redirect accordingly
watch(
  [user, isLinked, linkCheckComplete],
  ([currentUser, linked, checkComplete]) => {
    console.log('Auth state changed:', { user: currentUser?.email, linked, checkComplete })
    if (currentUser && checkComplete) {
      if (linked) {
        router.replace('/client/calendar')
      } else {
        router.replace('/client/order-code')
      }
    }
  },
  { immediate: true }
)

const handleGoogleLogin = async () => {
  loginLoading.value = 'google'
  loginError.value = null

  try {
    await signInWithGoogle()
    // Page will redirect to Google, then back here
    // handleRedirectResult in onMounted will process the result
  } catch (err: any) {
    console.error('Google login error:', err)
    loginError.value = err.message || 'Nepodarilo sa prihlásiť cez Google'
    loginLoading.value = null
  }
}

const handleAppleLogin = async () => {
  loginLoading.value = 'apple'
  loginError.value = null

  try {
    await signInWithApple()
    // Page will redirect to Apple, then back here
    // handleRedirectResult in onMounted will process the result
  } catch (err: any) {
    console.error('Apple login error:', err)
    loginError.value = err.message || 'Nepodarilo sa prihlásiť cez Apple'
    loginLoading.value = null
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-beige px-4">
    <UCard class="w-full bg-beige max-w-md" :ui="{ root: 'border-0 ring-0', header: 'border-0 ring-0' }">
      <template #header>
        <div class="text-center pt-2">
          <NuxtLink to="/" class="inline-block mb-4">
            <img :src="logoLongIcon" alt="LevFood logo" class="w-[240px] h-auto" />
          </NuxtLink>
          <h2 class="text-2xl font-bold text-[var(--color-dark-green)]">Vitajte</h2>
          <p class="text-sm text-[var(--color-dark-green)]/80 mt-2">
            Prihláste sa pre prístup k vašim objednávkam
          </p>
        </div>
      </template>

      <div class="space-y-4">
        <!-- Error Alert -->
        <UAlert
          v-if="loginError"
          variant="soft"
          :title="loginError"
          :close-button="{ icon: 'i-heroicons-x-mark-20-solid', color: 'error', variant: 'link' }"
          @close="loginError = null"
        />

        <!-- Login Buttons -->
        <div class="flex flex-col gap-3">
          <UButton
            block
            color="neutral"
            size="lg"
            class="pricing-button bg-[var(--color-dark-green)] text-beige h-14 text-lg font-bold"
            :loading="loginLoading === 'google'"
            :disabled="loginLoading !== null"
            @click="handleGoogleLogin"
          >
            <template #leading>
              <UIcon name="i-logos-google-icon" class="size-5" />
            </template>
            Pokračovať s Google
          </UButton>

          <UButton
            block
            color="neutral"
            size="lg"
            class="pricing-button bg-[var(--color-dark-green)] text-beige h-14 text-lg font-bold"
            :loading="loginLoading === 'apple'"
            :disabled="loginLoading !== null"
            @click="handleAppleLogin"
          >
            <template #leading>
              <UIcon name="i-fa6-brands-apple" class="size-5" />
            </template>
            Pokračovať s Apple
          </UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>
