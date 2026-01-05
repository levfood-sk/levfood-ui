/**
 * Client Auth Composable
 * Manages Firebase authentication + client link status for the client portal
 */

import type { Client, OrderSummary, MeResponse, LinkAccountResponse } from '~/lib/types/client-portal'

const CLIENT_STORAGE_KEY = 'levita-client-data'

interface ClientState {
  client: Client | null
  activeOrders: OrderSummary[]
  isLinked: boolean
  linkCheckComplete: boolean
  linkCheckLoading: boolean
}

interface CachedClientData {
  firebaseUid: string
  client: Client
  activeOrders: OrderSummary[]
}

// Shared reactive state (singleton pattern)
const clientState = reactive<ClientState>({
  client: null,
  activeOrders: [],
  isLinked: false,
  linkCheckComplete: false,
  linkCheckLoading: false,
})

let clientAuthInitialized = false

export const useClientAuth = () => {
  // Get base auth functionality
  const {
    user,
    loading: authLoading,
    error,
    signInWithGoogle,
    signInWithApple,
    signOut: baseSignOut,
    getIdToken,
    handleRedirectResult,
  } = useAuth()

  // Load cached client data on initialization
  const loadCachedClient = () => {
    if (import.meta.server) return

    try {
      const cached = localStorage.getItem(CLIENT_STORAGE_KEY)
      if (cached) {
        const data: CachedClientData = JSON.parse(cached)
        // Only use cache if it matches current user
        if (user.value && data.firebaseUid === user.value.uid) {
          clientState.client = data.client
          clientState.activeOrders = data.activeOrders
          clientState.isLinked = true
        }
      }
    } catch {
      // Ignore cache errors
    }
  }

  // Save client data to cache
  const saveClientToCache = (client: Client | null, orders: OrderSummary[] = []) => {
    if (import.meta.server) return

    try {
      if (client && user.value) {
        const cacheData: CachedClientData = {
          firebaseUid: user.value.uid,
          client,
          activeOrders: orders,
        }
        localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(cacheData))
      } else {
        localStorage.removeItem(CLIENT_STORAGE_KEY)
      }
    } catch {
      // Ignore cache errors
    }
  }

  // Check if user is linked to a client account
  const checkLinkStatus = async () => {
    if (!user.value) {
      clientState.client = null
      clientState.activeOrders = []
      clientState.isLinked = false
      clientState.linkCheckComplete = true
      return
    }

    clientState.linkCheckLoading = true

    try {
      const token = await getIdToken()
      if (!token) {
        throw new Error('No auth token')
      }

      const response = await $fetch<MeResponse>('/api/mobile/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.linked && response.client) {
        clientState.client = response.client
        clientState.activeOrders = response.activeOrders
        clientState.isLinked = true
        saveClientToCache(response.client, response.activeOrders)
      } else {
        clientState.client = null
        clientState.activeOrders = []
        clientState.isLinked = false
        saveClientToCache(null)
      }
    } catch (err) {
      console.error('Error checking link status:', err)
      // Keep cached data if API fails
    } finally {
      clientState.linkCheckComplete = true
      clientState.linkCheckLoading = false
    }
  }

  // Link account with order code
  const linkAccount = async (orderCode: string): Promise<LinkAccountResponse> => {
    const token = await getIdToken()
    if (!token) {
      throw new Error('Nie ste prihlásený')
    }

    const response = await $fetch<LinkAccountResponse>('/api/mobile/link-account', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: { orderId: orderCode },
    })

    if (response.success && response.client) {
      clientState.client = response.client
      clientState.activeOrders = [response.order]
      clientState.isLinked = true
      saveClientToCache(response.client, [response.order])
    }

    return response
  }

  // Clear client data (for logout)
  const clearClientData = () => {
    clientState.client = null
    clientState.activeOrders = []
    clientState.isLinked = false
    clientState.linkCheckComplete = false
    saveClientToCache(null)
  }

  // Sign out (clears client data too)
  const signOut = async () => {
    clearClientData()
    await baseSignOut()
  }

  // Refresh client data
  const refreshClientData = async () => {
    await checkLinkStatus()
  }

  // Initialize on client-side
  if (import.meta.client && !clientAuthInitialized) {
    clientAuthInitialized = true

    // Load cached data immediately
    loadCachedClient()

    // Watch for user changes and check link status
    watch(
      () => user.value,
      async (newUser, oldUser) => {
        // User logged out
        if (!newUser && oldUser) {
          clearClientData()
          return
        }

        // User logged in (or different user)
        if (newUser && (!oldUser || newUser.uid !== oldUser.uid)) {
          clientState.linkCheckComplete = false
          loadCachedClient()
          await checkLinkStatus()
        }
      },
      { immediate: true },
    )
  }

  return {
    // Auth state
    user,
    loading: authLoading,
    error,

    // Client state
    client: computed(() => clientState.client),
    activeOrders: computed(() => clientState.activeOrders),
    isLinked: computed(() => clientState.isLinked),
    linkCheckComplete: computed(() => clientState.linkCheckComplete),
    linkCheckLoading: computed(() => clientState.linkCheckLoading),

    // Auth methods
    signInWithGoogle,
    signInWithApple,
    signOut,
    getIdToken,
    handleRedirectResult,

    // Client methods
    checkLinkStatus,
    linkAccount,
    clearClientData,
    refreshClientData,
  }
}
