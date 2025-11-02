<script setup lang="ts">
const { user, signOut: firebaseSignOut } = useAuth()
const route = useRoute()

// Sidebar state (open on desktop, closed on mobile by default)
const isSidebarOpen = ref(false)
const loading = ref(false)

// Sign out handler
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

// Toggle sidebar (mobile only)
const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

// Close sidebar when clicking outside (mobile only)
const closeSidebar = () => {
  if (isSidebarOpen.value) {
    isSidebarOpen.value = false
  }
}

// Close sidebar when route changes (mobile)
watch(route, () => {
  if (isSidebarOpen.value) {
    isSidebarOpen.value = false
  }
})

// Navigation items
const navItems = [
  {
    label: 'Dashboard',
    icon: 'i-lucide-home',
    to: '/dashboard',
    exact: true,
  },
  {
    label: 'Objednávky',
    icon: 'i-lucide-package-search',
    to: '/dashboard/orders',
  },
  {
    label: 'Užívatelia',
    icon: 'i-lucide-users',
    to: '/dashboard/uzivatelia',
  },
  {
    label: 'Pridanie Jedla',
    icon: 'i-lucide-carrot',
    to: '/dashboard/pridanie-jedla',
  },
  {
    label: 'Zamestnanci',
    icon: 'i-lucide-shield-user',
    to: '/dashboard/zamestnanci',
  },
  {
    label: 'CMS - Modal',
    icon: 'i-lucide-app-window-mac',
    to: '/dashboard/cms-modal',
  },
  // {
  //   label: 'Push Notifications',
  //   icon: 'i-heroicons-bell',
  //   to: '/dashboard/notifications',
  // },
  // {
  //   label: 'GoPay Test',
  //   icon: 'i-heroicons-credit-card',
  //   to: '/dashboard/gopay-test',
  // },
  // {
  //   label: 'Stripe Test',
  //   icon: 'i-heroicons-banknotes',
  //   to: '/dashboard/stripe-test',
  // },
  // {
  //   label: 'Superfaktura Test',
  //   icon: 'i-heroicons-document-text',
  //   to: '/dashboard/superfaktura-test',
  // },
]

// Check if route is active
const isActiveRoute = (item: typeof navItems[0]) => {
  if (item.exact) {
    return route.path === item.to
  }
  return route.path.startsWith(item.to)
}
</script>

<template>
  <div class="min-h-screen bg-gradient-professional">
    <!-- Top Header -->
    <header class="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
      <div class="px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Left: Logo + Mobile Menu Toggle -->
          <div class="flex items-center gap-4">
            <!-- Mobile Hamburger Menu -->
            <button
              @click="toggleSidebar"
              class="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Toggle menu"
            >
              <UIcon
                :name="isSidebarOpen ? 'i-heroicons-x-mark' : 'i-heroicons-bars-3'"
                class="w-6 h-6 text-slate-700"
              />
            </button>

            <!-- Logo -->
            <NuxtLink to="/" class="flex items-center">
              <img src="~/assets/icons/logo-long-orange.svg" alt="Levfood" class="w-[130px]" />
            </NuxtLink>
          </div>

          <!-- Right: User Actions -->
          <div class="flex items-center gap-3">
            <!-- Sign Out Button -->
            <UButton
              color="error"
              variant="soft"
              size="sm"
              :loading="loading"
              @click="handleSignOut"
            >
              <span class="hidden sm:inline">Odhlásiť sa</span>
              <UIcon name="i-lucide-log-out" class="sm:hidden w-5 h-5" />
            </UButton>
          </div>
        </div>
      </div>
    </header>

    <!-- Layout Container -->
    <div class="flex relative">
      <!-- Mobile Backdrop Overlay -->
      <transition
        enter-active-class="transition-opacity duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-300"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isSidebarOpen"
          @click="closeSidebar"
          class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden"
          aria-hidden="true"
        />
      </transition>

      <!-- Sidebar Navigation -->
      <transition
        enter-active-class="transition-transform duration-300 ease-out"
        enter-from-class="-translate-x-full"
        enter-to-class="translate-x-0"
        leave-active-class="transition-transform duration-300 ease-in"
        leave-from-class="translate-x-0"
        leave-to-class="-translate-x-full"
      >
        <aside
          v-show="isSidebarOpen"
          class="fixed left-0 top-16 bottom-0 w-64 bg-white/50 backdrop-blur-sm border-r border-gray-200/50 z-40 md:hidden overflow-y-auto"
        >
          <nav class="p-4 space-y-2">
            <NuxtLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200"
              :class="[
                isActiveRoute(item)
                  ? 'bg-orange text-dark-green font-medium'
                  : 'text-dark-green hover:bg-orange hover:text-white'
              ]"
            >
              <UIcon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </nav>
        </aside>
      </transition>

      <!-- Desktop Sidebar (Always Visible) -->
      <aside class="hidden md:flex md:flex-col w-64 border-r border-gray-200/50 bg-white/50 backdrop-blur-sm h-[calc(100vh-4rem)] sticky top-16">
        <!-- Navigation (Scrollable) -->
        <nav class="flex-1 p-4 space-y-2 overflow-y-auto">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200"
            :class="[
              isActiveRoute(item)
                ? 'text-dark-green bg-orange font-medium text-condensed text-18px hover:bg-orange'
                : 'text-dark-green hover:bg-beige hover:text-dark-green text-condensed text-18px'
            ]"
          >
            <UIcon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </nav>

        <!-- Sidebar Footer (Always Visible at Bottom) -->
        <div class="p-4 border-t border-gray-200/50 flex-shrink-0">
          <div v-if="user" class="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50">
            <UAvatar
              v-if="user.photoURL"
              :src="user.photoURL"
              :alt="user.displayName || user.email || 'User'"
              size="sm"
            />
            <UAvatar
              v-else
              :alt="user.displayName || user.email || 'User'"
              size="sm"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-900 truncate">
                {{ user.displayName || 'User' }}
              </p>
              <p class="text-xs text-slate-500 truncate">
                {{ user.email }}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="flex-1 min-w-0">
        <div class="px-4 sm:px-6 lg:px-8 py-8">
          <!-- Page Content -->
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
/* Smooth scrolling for sidebar */
aside {
  scroll-behavior: smooth;
}

/* Prevent body scroll when mobile menu is open */
body:has(aside[v-show="true"]) {
  overflow: hidden;
}
</style>
