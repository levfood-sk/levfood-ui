export default defineNuxtRouteMiddleware(async (to) => {
  // Skip middleware on server
  if (import.meta.server) {
    return
  }

  // Client routes have their own middleware - skip admin middleware
  const isClientRoute = to.path.startsWith('/client')
  if (isClientRoute) {
    return
  }

  // Get auth state from useState (set by plugin)
  const user = useState('firebase-user')
  const loading = useState('firebase-auth-loading')

  // Protected routes
  const protectedRoutes = ['/app', '/dashboard']
  const isProtectedRoute = protectedRoutes.some(route => to.path.startsWith(route))

  // Auth routes
  const authRoutes = ['/login', '/register']
  const isAuthRoute = authRoutes.some(route => to.path.startsWith(route))

  // Wait for auth to initialize before checking routes
  if (loading.value) {
    await new Promise<void>((resolve) => {
      const unwatch = watch(loading, (newLoading) => {
        if (!newLoading) {
          unwatch()
          resolve()
        }
      }, { immediate: true })

      setTimeout(() => {
        unwatch()
        resolve()
      }, 3000)
    })
  }

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !user.value) {
    return navigateTo('/login')
  }

  // Redirect authenticated users from auth routes
  if (isAuthRoute && user.value) {
    return navigateTo('/dashboard')
  }
})
