import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { requireAuth, handleApiError } from '~~/server/utils/auth'
import { Timestamp } from 'firebase-admin/firestore'
import type { PackageType } from '~~/app/lib/types/order'

export default defineEventHandler(async (event) => {
  try {
    requireAuth(event)

    const { firestore } = getFirebaseAdmin()
    
    // Get all clients for monthly grouping
    const clientsSnapshot = await firestore.collection('clients').get()

    // Get all orders for package-based grouping
    const ordersSnapshot = await firestore.collection('orders').get()

    // Group clients by month (YYYY-MM format)
    const clientCountByMonth: Record<string, number> = {}
    clientsSnapshot.forEach(doc => {
      const createdAt = doc.data().createdAt as Timestamp
      const date = createdAt.toDate()
      const month = date.getMonth() + 1
      const monthKey = `${date.getFullYear()}-${month < 10 ? '0' : ''}${month}`
      clientCountByMonth[monthKey] = (clientCountByMonth[monthKey] || 0) + 1
    })

    // Group orders by package type
    const orderCountByPackage: Record<PackageType, number> = {
      EKONOMY: 0,
      ŠTANDARD: 0,
      PREMIUM: 0,
    }
    ordersSnapshot.forEach(doc => {
      const packageType = doc.data().package as PackageType
      if (packageType && orderCountByPackage.hasOwnProperty(packageType)) {
        orderCountByPackage[packageType]++
      }
    })

    // Build client chart data (last 12 months)
    const today = new Date()
    const months: string[] = []
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const month = date.getMonth() + 1
      const monthKey = `${date.getFullYear()}-${month < 10 ? '0' : ''}${month}`
      months.push(monthKey)
    }

    const clientChartData = months.map(month => ({
      month,
      count: clientCountByMonth[month] || 0
    }))

    // Build order trend data by package
    const orderTrendData = Object.entries(orderCountByPackage).map(([packageType, count]) => ({
      package: packageType as PackageType,
      count
    }))

    return {
      success: true,
      charts: {
        clientCount: clientChartData,
        orderTrend: orderTrendData,
      }
    }
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch chart data')
  }
})

