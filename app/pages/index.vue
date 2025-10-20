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
    <AuthLoading />
    <!-- Navigation -->
    <nav class="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <h1 class="text-2xl font-bold text-slate-900">Levfood</h1>
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
          Lorem Ipsum
        </h1>
        <p class="mt-6 max-w-2xl mx-auto text-lg text-slate-600 leading-relaxed">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique. Duis cursus, mi quis viverra ornare, eros dolor interdum nulla, ut commodo diam libero vitae erat.
        </p>
        <div class="mt-10 flex justify-center gap-4">
          <NuxtLink>
            <UButton size="lg">Button</UButton>
          </NuxtLink>
          <NuxtLink>
            <UButton size="lg" variant="outline">Button</UButton>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Features Section -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div class="grid lg:grid-cols-2 gap-12 items-center">
        <!-- Image Placeholder -->
        <div class="bg-gray-200 rounded-2xl aspect-square flex items-center justify-center">
          <div class="w-32 h-32 bg-gray-300 rounded-lg flex items-center justify-center">
            <svg class="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>

        <!-- Features List -->
        <div class="space-y-8">
          <div v-for="i in 3" :key="i" class="flex gap-4">
            <div class="flex-shrink-0">
              <UIcon name="i-lucide-salad" class="w-10 h-10 text-slate-900" />
            </div>  
            <div>
              <h3 class="text-xl font-bold text-slate-900 mb-2">Lorem Ipsum</h3>
              <p class="text-slate-600">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique.</p>
            </div>
          </div>

          <div class="flex justify-center gap-4 pt-4">
            <UButton size="xl" variant="outline">Button</UButton>
            <UButton size="xl" variant="outline">Button</UButton>
          </div>
        </div>
      </div>
    </div>
        <!-- Process Section -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative">
      <!-- Main Title -->
      <div class="text-center mb-16">
        <h2 class="text-5xl font-bold text-slate-900 sm:text-6xl lg:text-7xl tracking-tight">
          Lorem Ipsum
        </h2>
        <p class="mt-6 max-w-2xl mx-auto text-lg text-slate-600 leading-relaxed">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
      </div>

      <!-- Process Flow -->
      <div class="flex flex-col items-center space-y-8">
        <!-- 4-Step Horizontal Flow -->
        <div class="flex items-center justify-center space-x-4 sm:space-x-8">
          <div v-for="i in 4" :key="i" class="flex items-center">
            <!-- Process Step -->
            <div class="w-20 h-20 sm:w-24 sm:h-24 bg-gray-200 rounded-2xl flex items-center justify-center">
              <svg class="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
              </svg>
            </div>
            <!-- Arrow (except for last step) -->
            <div v-if="i < 4" class="ml-4 sm:ml-8">
              <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Downward Arrow -->
        <div class="flex justify-center">
          <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        <!-- Final Step -->
        <div class="w-24 h-24 sm:w-32 sm:h-32 bg-gray-200 rounded-2xl flex items-center justify-center">
          <svg class="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
          </svg>
        </div>
      </div>

      <!-- Bottom Left Image -->
      <div class="absolute bottom-20 -left-10 w-48 h-32 bg-gray-200 rounded-2xl transform rotate-12 opacity-60 hidden lg:block">
        <div class="w-full h-full flex items-center justify-center">
          <svg class="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
          </svg>
        </div>
      </div>

      <!-- Bottom Right Image -->
      <div class="absolute bottom-40 -right-10 w-48 h-32 bg-gray-200 rounded-2xl transform -rotate-12 opacity-60 hidden lg:block">
        <div class="w-full h-full flex items-center justify-center">
          <svg class="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>