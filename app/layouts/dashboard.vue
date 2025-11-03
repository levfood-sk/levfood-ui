<script setup lang="ts">
const { user, signOut: firebaseSignOut } = useAuth()
const route = useRoute()

// Sidebar state (open on desktop, closed on mobile by default)
const isSidebarOpen = ref(false)
const loading = ref(false)
const isDesktopCollapsed = ref(false)

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

// Toggle desktop sidebar collapse
const toggleDesktopSidebar = () => {
  isDesktopCollapsed.value = !isDesktopCollapsed.value
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
    to: '/cms',
    exact: true,
  },
  {
    label: 'Objednávky',
    icon: 'i-lucide-package-search',
    to: '/cms/orders',
  },
  {
    label: 'Užívatelia',
    icon: 'i-lucide-users',
    to: '/cms/uzivatelia',
  },
  {
    label: 'Pridanie Jedla',
    icon: 'i-lucide-carrot',
    to: '/cms/pridanie-jedla',
  },
  {
    label: 'Zamestnanci',
    icon: 'i-lucide-shield-user',
    to: '/cms/zamestnanci',
  },
  {
    label: 'CMS - Modal',
    icon: 'i-lucide-app-window-mac',
    to: '/cms/cms-modal',
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
    <!-- Mobile Header -->
    <header class="fixed top-0 left-0 right-0 h-16 border-b bg-white border-gray-200/50 z-50 md:hidden flex items-center justify-start px-4">
      <button
        @click="toggleSidebar"
        class="p-2 rounded-lg hover:bg-beige transition-colors cursor-pointer flex items-center justify-center"
        aria-label="Toggle menu"
      >
        <UIcon
          :name="isSidebarOpen ? 'i-lucide-x' : 'i-lucide-menu'"
          class="w-6 h-6 text-dark-green"
        />
      </button>
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
          class="fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200/50 z-40 md:hidden overflow-y-auto flex flex-col"
        >
          <nav class="flex-1 p-4 space-y-2 overflow-y-auto min-h-0">
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
          
          <!-- Sidebar Footer (User Info) -->
          <div class="p-4 border-t border-gray-200/50 flex-shrink-0 space-y-2">
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
            <button
              @click="handleSignOut"
              :disabled="loading"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-dark-green hover:orange"
            >
              <UIcon name="i-lucide-log-out" class="w-5 h-5 flex-shrink-0 text-dark-green" />
              <span>Odhlásiť sa</span>
            </button>
          </div>
        </aside>
      </transition>

      <!-- Desktop Sidebar (Always Visible) -->
      <aside :class="[
        'hidden md:flex md:flex-col border-r border-gray-200/50 bg-white/50 backdrop-blur-sm fixed top-0 left-0 h-screen max-h-screen z-30 transition-all duration-300',
        isDesktopCollapsed ? 'w-20' : 'w-64'
      ]">
        <!-- Logo / Toggle Section -->
        <div class="p-4 border-b border-gray-200/50 flex items-center justify-end flex-shrink-0">
          <button
            @click="toggleDesktopSidebar"
            class="p-2 rounded-lg hover:bg-beige transition-colors cursor-pointer flex items-center justify-center"
            aria-label="Toggle sidebar"
          >
            <UIcon
              :name="isDesktopCollapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-right-open'"
              class="w-5 h-5 flex-shrink-0 text-18px px-4 py-3"
            />
          </button>
        </div>

        <!-- Navigation (Scrollable) -->
        <nav class="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden min-h-0">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="flex items-start gap-3 px-4 py-3 rounded-lg transition-all duration-200"
            :class="[
              isActiveRoute(item)
                ? 'text-dark-green bg-orange font-medium text-condensed text-18px hover:bg-orange'
                : 'text-dark-green hover:bg-beige hover:text-dark-green text-condensed text-18px',
              isDesktopCollapsed ? 'justify-center' : ''
            ]"
            :title="isDesktopCollapsed ? item.label : ''"
          >
            <UIcon :name="item.icon" class="w-5 h-5 flex-shrink-0 " />
            <span v-show="!isDesktopCollapsed" :class="['transition-all duration-300 overflow-hidden whitespace-nowrap', isDesktopCollapsed ? 'hidden' : 'block']">{{ item.label }}</span>
          </NuxtLink>
        </nav>

        <!-- Sidebar Footer (Always Visible at Bottom) -->
        <div class="p-4 border-t border-gray-200/50 flex-shrink-0 space-y-2">
          <div v-if="user" :class="[
            'flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50',
            isDesktopCollapsed ? 'justify-center' : ''
          ]">
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
            <div 
              :class="[
                'flex-1 min-w-0 transition-all duration-300 overflow-hidden',
                isDesktopCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
              ]"
            >
              <p class="text-sm font-medium text-slate-900 truncate">
                {{ user.displayName || 'User' }}
              </p>
              <p class="text-xs text-slate-500 truncate">
                {{ user.email }}
              </p>
            </div>
          </div>
          <button
            @click="handleSignOut"
            :disabled="loading"
            :class="[
              'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-dark-green hover:bg-beige cursor-pointer',
              isDesktopCollapsed ? 'justify-center' : ''
            ]"
            :title="isDesktopCollapsed ? 'Odhlásiť sa' : ''"
          >
            <UIcon name="i-lucide-log-out" class="w-5 h-5 flex-shrink-0" />
            <span v-show="!isDesktopCollapsed" :class="['transition-all duration-300 overflow-hidden whitespace-nowrap', isDesktopCollapsed ? 'hidden' : 'block']">Odhlásiť sa</span>
          </button>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main :class="[
        'flex-1 min-w-0 transition-all duration-300',
        isDesktopCollapsed ? 'md:ml-20' : 'md:ml-64'
      ]">
        <div class="px-4 sm:px-6 lg:px-8 py-8 pt-20 md:pt-8">
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
