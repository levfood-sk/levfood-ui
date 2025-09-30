<script setup lang="ts">
import { authClient } from "~~/lib/auth-client"

const { data: session } = await authClient.useSession(useFetch)
const loading = ref(false)

const handleSignOut = async () => {
  loading.value = true
  try {
    await authClient.signOut()
    await navigateTo('/login')
  } catch (error) {
    console.error('Sign out error:', error)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-professional">
    <!-- Navigation Bar -->
    <nav class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-slate-700/50 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <NuxtLink to="/" class="flex items-center">
            <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Levita</h1>
          </NuxtLink>
          <div class="flex items-center gap-3">
            <ThemeToggle />
            <UButton
              color="error"
              variant="soft"
              :loading="loading"
              @click="handleSignOut"
            >
              Sign Out
            </UButton>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="mb-8">
        <h2 class="text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h2>
        <p class="text-slate-600 dark:text-slate-400 mt-2">Welcome back to your account</p>
      </div>

      <!-- User Info Card -->
      <UCard v-if="session" class="max-w-2xl">
        <template #header>
          <h3 class="text-xl font-semibold text-slate-900 dark:text-white">Profile Information</h3>
        </template>

        <div class="space-y-6">
          <div class="flex items-center gap-4">
            <UAvatar
              v-if="session.user.image"
              :src="session.user.image"
              size="xl"
              :alt="session.user.name"
            />
            <UAvatar
              v-else
              size="xl"
              :alt="session.user.name"
            />
            <div>
              <p class="text-lg font-semibold text-slate-900 dark:text-white">
                {{ session.user.name }}
              </p>
              <p class="text-sm text-slate-600 dark:text-slate-400">
                {{ session.user.email }}
              </p>
            </div>
          </div>

          <UDivider />

          <div class="grid grid-cols-2 gap-6">
            <div>
              <p class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">First Name</p>
              <p class="text-base text-slate-900 dark:text-white">{{ session.user.firstName }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Last Name</p>
              <p class="text-base text-slate-900 dark:text-white">{{ session.user.lastName }}</p>
            </div>
          </div>

          <div>
            <p class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Email Status</p>
            <UBadge :color="session.user.emailVerified ? 'success' : 'warning'" variant="subtle" size="md">
              {{ session.user.emailVerified ? 'Verified' : 'Not Verified' }}
            </UBadge>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>