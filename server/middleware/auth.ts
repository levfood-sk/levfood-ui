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
    event.context.user = null
    return
  }

  const token = authHeader.substring(7)

  // Don't try to verify null or empty tokens
  if (!token || token === 'null' || token === 'undefined') {
    event.context.user = null
    return
  }

  try {
    const decodedToken = await verifyIdToken(token)
    event.context.user = decodedToken
  } catch (error: any) {
    // Log detailed error information
    if (error.message?.includes('FIREBASE_SERVICE_ACCOUNT')) {
      console.error('❌ Firebase Admin SDK not configured:', error.message)
      console.error('   Please set FIREBASE_SERVICE_ACCOUNT environment variable in Vercel')
    } else if (error.message?.includes('JSON')) {
      console.error('❌ Firebase Admin SDK configuration error:', error.message)
      console.error('   FIREBASE_SERVICE_ACCOUNT must be a valid JSON string')
    } else {
      console.error('Token verification failed:', error.message || error)
    }
    event.context.user = null
  }
})
