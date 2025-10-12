<script setup lang="ts">
const { user } = useAuth()

// Redirect to dashboard if already logged in (client-side only)
onMounted(() => {
  if (user.value) {
    navigateTo('/dashboard')
  }
})
</script>

<template>
  <div class="min-h-screen bg-gradient-professional">
    <!-- Navigation -->
    <nav class="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <h1 class="text-2xl font-bold text-slate-900">Levita</h1>
          </div>
          <div class="flex items-center gap-3">
            <NuxtLink to="/login">
              <UButton variant="ghost">Sign in</UButton>
            </NuxtLink>
            <NuxtLink to="/register">
              <UButton>Get Started</UButton>
            </NuxtLink>
          </div>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
      <div class="text-center">
        <h1 class="text-5xl font-bold text-slate-900 sm:text-6xl lg:text-7xl tracking-tight">
          Welcome to <span class="text-blue-600">Levita</span>
        </h1>
        <p class="mt-6 max-w-2xl mx-auto text-lg text-slate-600 leading-relaxed">
          A modern authentication platform built with Nuxt 4, Firebase, and Nuxt UI.
          Get started in seconds with email or social login.
        </p>
        <div class="mt-10 flex justify-center gap-4">
          <NuxtLink to="/register">
            <UButton size="lg">Create Account</UButton>
          </NuxtLink>
          <NuxtLink to="/login">
            <UButton size="lg" variant="outline">Sign In</UButton>
          </NuxtLink>
        </div>
      </div>

      <!-- Features -->
      <div class="mt-24 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <UCard>
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Icon name="lucide:lock" class="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-slate-900 mb-2">Secure Authentication</h3>
              <p class="text-slate-600 text-sm">Industry-standard security with Firebase Authentication.</p>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0 w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Icon name="lucide:zap" class="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-slate-900 mb-2">Lightning Fast</h3>
              <p class="text-slate-600 text-sm">Built on Nuxt 4 for optimal performance and speed.</p>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0 w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center">
              <Icon name="lucide:sliders-horizontal" class="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-slate-900 mb-2">Flexible Options</h3>
              <p class="text-slate-600 text-sm">Email/password or social login with Google and Apple.</p>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>