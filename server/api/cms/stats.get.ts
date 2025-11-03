import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { requireAuth, handleApiError } from '~~/server/utils/auth'
import { Timestamp } from 'firebase-admin/firestore'

export default defineEventHandler(async (event) => {
  try {
    requireAuth(event)

    const { firestore } = getFirebaseAdmin()
    
    // Get week's date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const weekStart = Timestamp.fromDate(weekAgo)

    // Get active subscribers (clients whose subscription hasn't ended)
    const now = Timestamp.now()
    const allClientsSnapshot = await firestore.collection('clients').get()
    
    const activeSubscribers = allClientsSnapshot.docs.filter(doc => {
      const data = doc.data()
      const subscriptionEndDate = data.subscriptionEndDate as Timestamp | null
      if (!subscriptionEndDate) return false
      return subscriptionEndDate.toMillis() > now.toMillis()
    }).length

    // Get orders for the week
    const weekOrdersSnapshot = await firestore
      .collection('orders')
      .where('createdAt', '>=', weekStart)
      .get()
    const weekOrders = weekOrdersSnapshot.size

    // Get approved orders
    const approvedOrdersSnapshot = await firestore
      .collection('orders')
      .where('orderStatus', '==', 'approved')
      .get()
    const approvedOrders = approvedOrdersSnapshot.size

    // Get pending orders
    const pendingOrdersSnapshot = await firestore
      .collection('orders')
      .where('orderStatus', '==', 'pending')
      .get()
    const pendingOrders = pendingOrdersSnapshot.size

    return {
      success: true,
      stats: {
        activeSubscribers,
        newOrdersWeek: weekOrders,
        approvedOrders,
        pendingOrders,
      }
    }
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch statistics')
  }
})

