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

    // Helper function to get ISO week number
    const getISOWeek = (date: Date): string => {
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const dayNum = d.getDay() || 7
      d.setDate(d.getDate() + 4 - dayNum)
      const yearStart = new Date(d.getFullYear(), 0, 1)
      const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
      const year = d.getFullYear()
      return `${year}-W${weekNum.toString().padStart(2, '0')}`
    }

    // Group orders by package type and time period
    const orderCountByPackageMonth: Record<string, Record<PackageType, number>> = {}
    const orderCountByPackageWeek: Record<string, Record<PackageType, number>> = {}
    const orderCountByPackageYear: Record<string, Record<PackageType, number>> = {}

    const today = new Date()
    
    // Get date ranges for filtering
    const last12Months: string[] = []
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const month = date.getMonth() + 1
      const monthKey = `${date.getFullYear()}-${month < 10 ? '0' : ''}${month}`
      last12Months.push(monthKey)
      orderCountByPackageMonth[monthKey] = {
        EKONOMY: 0,
        ŠTANDARD: 0,
        PREMIUM: 0,
      }
    }

    // Get last 12 weeks
    const last12Weeks: string[] = []
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - (i * 7))
      const weekKey = getISOWeek(date)
      if (!last12Weeks.includes(weekKey)) {
        last12Weeks.push(weekKey)
        orderCountByPackageWeek[weekKey] = {
          EKONOMY: 0,
          ŠTANDARD: 0,
          PREMIUM: 0,
        }
      }
    }

    // Get all years
    const allYears: Record<string, Record<PackageType, number>> = {}

    ordersSnapshot.forEach(doc => {
      const orderData = doc.data()
      const packageType = orderData.package as PackageType
      if (!packageType || !['EKONOMY', 'ŠTANDARD', 'PREMIUM'].includes(packageType)) return

      const createdAt = orderData.createdAt as Timestamp
      const date = createdAt.toDate()
      
      // Group by month (last 12 months)
      const month = date.getMonth() + 1
      const monthKey = `${date.getFullYear()}-${month < 10 ? '0' : ''}${month}`
      if (orderCountByPackageMonth[monthKey]) {
        orderCountByPackageMonth[monthKey][packageType]++
      }
      
      // Group by week (last 12 weeks)
      const weekKey = getISOWeek(date)
      if (orderCountByPackageWeek[weekKey]) {
        orderCountByPackageWeek[weekKey][packageType]++
      }
      
      // Group by year
      const yearKey = date.getFullYear().toString()
      if (!allYears[yearKey]) {
        allYears[yearKey] = {
          EKONOMY: 0,
          ŠTANDARD: 0,
          PREMIUM: 0,
        }
      }
      allYears[yearKey][packageType]++
    })

    // Build client chart data (last 12 months)
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

    // Aggregate package counts for each time period
    const aggregatePackages = (packageCounts: Record<string, Record<PackageType, number>>): Record<PackageType, number> => {
      const aggregated: Record<PackageType, number> = {
        EKONOMY: 0,
        ŠTANDARD: 0,
        PREMIUM: 0,
      }
      Object.values(packageCounts).forEach(periodCounts => {
        aggregated.EKONOMY += periodCounts.EKONOMY
        aggregated.ŠTANDARD += periodCounts.ŠTANDARD
        aggregated.PREMIUM += periodCounts.PREMIUM
      })
      return aggregated
    }

    // Build order trend data by package for each time period
    const orderTrendDataByMonth = Object.entries(aggregatePackages(orderCountByPackageMonth)).map(([packageType, count]) => ({
      package: packageType as PackageType,
      count
    }))

    const orderTrendDataByWeek = Object.entries(aggregatePackages(orderCountByPackageWeek)).map(([packageType, count]) => ({
      package: packageType as PackageType,
      count
    }))

    const orderTrendDataByYear = Object.entries(aggregatePackages(allYears)).map(([packageType, count]) => ({
      package: packageType as PackageType,
      count
    }))

    return {
      success: true,
      charts: {
        clientCount: clientChartData,
        orderTrend: orderTrendDataByMonth,
        orderTrendByWeek: orderTrendDataByWeek,
        orderTrendByYear: orderTrendDataByYear,
      }
    }
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch chart data')
  }
})

