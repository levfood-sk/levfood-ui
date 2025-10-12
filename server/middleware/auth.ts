import { verifyIdToken } from '../utils/firebase-admin'

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  // Skip auth check for public routes
  const publicRoutes = ['/api/health', '/api/public']
  if (publicRoutes.some(route => path.startsWith(route))) {
    return
  }

  // Skip auth check for non-API routes
  if (!path.startsWith('/api/')) {
    return
  }

  const authHeader = getHeader(event, 'authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return
  }

  const token = authHeader.substring(7)

  try {
    const decodedToken = await verifyIdToken(token)
    event.context.user = decodedToken
  } catch (error) {
    console.error('Token verification failed:', error)
    event.context.user = null
  }
})
