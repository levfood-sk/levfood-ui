/**
 * Client Portal Middleware
 * Handles routing logic for the client authentication flow:
 * - Not logged in -> /login
 * - Logged in but not linked -> /client/order-code
 * - Logged in and linked -> /client/calendar (or requested page)
 */

export default defineNuxtRouteMiddleware(async (to) => {
  // Skip middleware on server
  if (import.meta.server) {
    return
  }

  const { user, loading, isLinked, linkCheckComplete, linkCheckLoading } = useClientAuth()

  // Wait for auth to initialize
  if (loading.value) {
    await new Promise<void>((resolve) => {
      const unwatch = watch(
        () => loading.value,
        (newLoading) => {
          if (!newLoading) {
            unwatch()
            resolve()
          }
        },
        { immediate: true },
      )

      // Timeout after 3 seconds
      setTimeout(() => {
        unwatch()
        resolve()
      }, 3000)
    })
  }

  // Wait for link status check to complete
  if (user.value && !linkCheckComplete.value) {
    await new Promise<void>((resolve) => {
      const unwatch = watch(
        () => linkCheckComplete.value,
        (complete) => {
          if (complete) {
            unwatch()
            resolve()
          }
        },
        { immediate: true },
      )

      // Timeout after 3 seconds
      setTimeout(() => {
        unwatch()
        resolve()
      }, 3000)
    })
  }

  const isLoginPage = to.path === '/login'
  const isOrderCodePage = to.path === '/client/order-code'

  // Login page logic
  if (isLoginPage) {
    // Redirect logged in + linked users to calendar
    if (user.value && isLinked.value) {
      return navigateTo('/client/calendar')
    }
    // Redirect logged in but unlinked users to order-code
    if (user.value && !isLinked.value && linkCheckComplete.value) {
      return navigateTo('/client/order-code')
    }
    // Allow access to login page
    return
  }

  // Order code page logic
  if (isOrderCodePage) {
    // Redirect unauthenticated users to login
    if (!user.value) {
      return navigateTo('/login')
    }
    // Redirect linked users to calendar
    if (isLinked.value) {
      return navigateTo('/client/calendar')
    }
    // Allow access to order-code page
    return
  }

  // All other /client/* pages require auth + link
  if (!user.value) {
    return navigateTo('/login')
  }

  if (!isLinked.value && linkCheckComplete.value) {
    return navigateTo('/client/order-code')
  }
})
