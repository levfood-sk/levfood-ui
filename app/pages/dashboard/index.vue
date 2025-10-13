<script setup lang="ts">
// Use dashboard layout
definePageMeta({
  layout: 'dashboard',
})

// Get user from auth composable
const { user } = useAuth()
</script>

<template>
  <div>
    <!-- Page Header -->
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
        <!-- User Avatar and Name -->
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

        <!-- Divider -->
        <div class="border-t border-gray-200"></div>

        <!-- First and Last Name -->
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

        <!-- User ID -->
        <div>
          <p class="text-sm font-medium text-slate-500 mb-2">User ID</p>
          <p class="text-xs text-slate-600 font-mono">{{ user.uid }}</p>
        </div>
      </div>
    </UCard>
  </div>
</template>