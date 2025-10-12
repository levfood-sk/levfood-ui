export default defineNuxtRouteMiddleware((to) => {
  // Skip middleware on server
  if (import.meta.server) {
    return
  }

  // Get auth state from useState (set by plugin)
  const user = useState('firebase-user')

  // Protected routes
  const protectedRoutes = ['/app', '/dashboard']
  const isProtectedRoute = protectedRoutes.some(route => to.path.startsWith(route))

  // Auth routes
  const authRoutes = ['/login', '/register']
  const isAuthRoute = authRoutes.some(route => to.path.startsWith(route))

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !user.value) {
    return navigateTo('/login')
  }

  // Redirect authenticated users from auth routes
  if (isAuthRoute && user.value) {
    return navigateTo('/dashboard')
  }
})
