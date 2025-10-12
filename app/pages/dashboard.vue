<script setup lang="ts">
const { user, signOut: firebaseSignOut } = useAuth()
const loading = ref(false)

const handleSignOut = async () => {
  loading.value = true
  try {
    await firebaseSignOut()
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
    <nav class="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <NuxtLink to="/" class="flex items-center">
            <h1 class="text-2xl font-bold text-slate-900">Levita</h1>
          </NuxtLink>
          <div class="flex items-center gap-3">
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
        <h2 class="text-3xl font-bold text-slate-900">Dashboard</h2>
        <p class="text-slate-600 mt-2">Welcome back to your account</p>
      </div>

      <!-- User Info Card -->
      <UCard v-if="user" class="max-w-2xl">
        <template #header>
          <h3 class="text-xl font-semibold text-slate-900">Profile Information</h3>
        </template>

        <div class="space-y-6">
          <div class="flex items-center gap-4">
            <UAvatar
              v-if="user.photoURL"
              :src="user.photoURL"
              size="xl"
              :alt="user.displayName || user.email || 'User'"
            />
            <UAvatar
              v-else
              size="xl"
              :alt="user.displayName || user.email || 'User'"
            />
            <div>
              <p class="text-lg font-semibold text-slate-900">
                {{ user.displayName || 'No name' }}
              </p>
              <p class="text-sm text-slate-600">
                {{ user.email }}
              </p>
            </div>
          </div>

          <UDivider />

          <div v-if="user.firstName || user.lastName" class="grid grid-cols-2 gap-6">
            <div v-if="user.firstName">
              <p class="text-sm font-medium text-slate-500 mb-1">First Name</p>
              <p class="text-base text-slate-900">{{ user.firstName }}</p>
            </div>
            <div v-if="user.lastName">
              <p class="text-sm font-medium text-slate-500 mb-1">Last Name</p>
              <p class="text-base text-slate-900">{{ user.lastName }}</p>
            </div>
          </div>

          <div>
            <p class="text-sm font-medium text-slate-500 mb-2">User ID</p>
            <p class="text-xs text-slate-600 font-mono">{{ user.uid }}</p>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>