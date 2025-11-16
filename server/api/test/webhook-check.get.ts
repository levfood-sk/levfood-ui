/**
 * Simple endpoint to check if the server is receiving requests
 * GET /api/test/webhook-check
 */

export default defineEventHandler(async (event) => {
  console.log('✅ Test endpoint hit!')

  return {
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    message: 'If you see this, your server is working correctly'
  }
})
