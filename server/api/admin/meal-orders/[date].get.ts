/**
 * GET /api/admin/meal-orders/[date]
 * Get aggregated meal selections for a specific date
 * For admin dashboard - shows what to order for production
 */

import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { requireAuth, handleApiError } from '~~/server/utils/auth'

interface ClientSelection {
  clientId: string
  clientName: string
  orderId: string
  selectedRanajky: 'A' | 'B'
  ranajkyName: string
  selectedObed: 'A' | 'B' | 'C'
  obedName: string
  deliveryType: 'prevádzka' | 'domov'
  deliveryAddress: string
  phone: string
  // Non-option meals (same for everyone)
  desiata: string
  polievka: string
  olovrant: string
  vecera: string
}

interface SkippedClient {
  clientId: string
  clientName: string
  orderId: string
  packageTier: string
  deliveryType: 'prevádzka' | 'domov'
  deliveryAddress: string
  phone: string
}

interface PackageGroup {
  count: number
  clients: ClientSelection[]
}

interface MealOrderSummary {
  date: string
  totalOrders: number
  byPackage: Record<string, PackageGroup>
  ranajkyCounts: {
    optionA: { name: string; count: number }
    optionB: { name: string; count: number }
  }
  obedCounts: {
    optionA: { name: string; count: number }
    optionB: { name: string; count: number }
    optionC: { name: string; count: number }
  }
  // Non-option meals (same for everyone, just the name)
  fixedMeals: {
    desiata: string
    polievka: string
    olovrant: string
    vecera: string
  }
  skippedClients: SkippedClient[]
}

export default defineEventHandler(async (event) => {
  try {
    requireAuth(event)
    const date = getRouterParam(event, 'date')

    if (!date) {
      throw createError({
        statusCode: 400,
        message: 'Dátum je povinný'
      })
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      throw createError({
        statusCode: 400,
        message: 'Neplatný formát dátumu'
      })
    }

    const { firestore } = getFirebaseAdmin()

    // Get the daily meals for this date (to get meal names)
    const mealsRef = firestore.collection('dailyMeals').doc(date)
    const mealsDoc = await mealsRef.get()
    const mealsData = mealsDoc.data()

    if (!mealsDoc.exists || !mealsData?.isPublished) {
      return {
        date,
        totalOrders: 0,
        byPackage: {},
        ranajkyCounts: {
          optionA: { name: mealsData?.ranajkyOptions?.optionA || 'Variant A', count: 0 },
          optionB: { name: mealsData?.ranajkyOptions?.optionB || 'Variant B', count: 0 }
        },
        obedCounts: {
          optionA: { name: mealsData?.obedOptions?.optionA || 'Variant A', count: 0 },
          optionB: { name: mealsData?.obedOptions?.optionB || 'Variant B', count: 0 },
          optionC: { name: mealsData?.obedOptions?.optionC || 'Variant C', count: 0 }
        },
        fixedMeals: {
          desiata: mealsData?.meals?.desiata || '',
          polievka: mealsData?.meals?.polievka || '',
          olovrant: mealsData?.meals?.olovrant || '',
          vecera: mealsData?.meals?.vecera || ''
        },
        skippedClients: [],
        message: 'Žiadne objednávky'
      }
    }

    // Get all meal selections for this date
    const selectionsRef = firestore.collection('mealSelections')
    const selectionsQuery = await selectionsRef
      .where('date', '==', date)
      .get()

    if (selectionsQuery.empty) {
      return {
        date,
        totalOrders: 0,
        byPackage: {},
        ranajkyCounts: {
          optionA: { name: mealsData.ranajkyOptions?.optionA || 'Variant A', count: 0 },
          optionB: { name: mealsData.ranajkyOptions?.optionB || 'Variant B', count: 0 }
        },
        obedCounts: {
          optionA: { name: mealsData.obedOptions?.optionA || 'Variant A', count: 0 },
          optionB: { name: mealsData.obedOptions?.optionB || 'Variant B', count: 0 },
          optionC: { name: mealsData.obedOptions?.optionC || 'Variant C', count: 0 }
        },
        fixedMeals: {
          desiata: mealsData.meals?.desiata || '',
          polievka: mealsData.meals?.polievka || '',
          olovrant: mealsData.meals?.olovrant || '',
          vecera: mealsData.meals?.vecera || ''
        },
        skippedClients: []
      }
    }

    // Get client IDs from selections
    const clientIds = [...new Set(selectionsQuery.docs.map(doc => doc.data().clientId))]

    // Batch fetch client data (including phone)
    const clientsMap = new Map<string, { fullName: string; phone: string }>()
    const clientChunks = []
    for (let i = 0; i < clientIds.length; i += 10) {
      clientChunks.push(clientIds.slice(i, i + 10))
    }

    for (const chunk of clientChunks) {
      const clientsQuery = await firestore.collection('clients')
        .where('__name__', 'in', chunk)
        .get()

      clientsQuery.docs.forEach(doc => {
        const data = doc.data()
        clientsMap.set(doc.id, {
          fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Neznámy',
          phone: data.phone || ''
        })
      })
    }

    // Batch fetch order data (for delivery info)
    const orderIds = [...new Set(selectionsQuery.docs.map(doc => doc.data().orderId))]
    const ordersMap = new Map<string, { deliveryType: 'prevádzka' | 'domov'; deliveryAddress: string }>()
    const orderChunks = []
    for (let i = 0; i < orderIds.length; i += 10) {
      orderChunks.push(orderIds.slice(i, i + 10))
    }

    for (const chunk of orderChunks) {
      const ordersQuery = await firestore.collection('orders')
        .where('orderId', 'in', chunk)
        .get()

      ordersQuery.docs.forEach(doc => {
        const data = doc.data()
        ordersMap.set(data.orderId, {
          deliveryType: data.deliveryType || 'prevádzka',
          deliveryAddress: data.deliveryAddress || ''
        })
      })
    }

    // Check for cancelled deliveries
    const cancelledIds = clientIds.map(id => `${id}_${date}`)
    const cancelledSet = new Set<string>()
    
    // Check in batches of 10
    for (let i = 0; i < cancelledIds.length; i += 10) {
      const batch = cancelledIds.slice(i, i + 10)
      const cancelledQuery = await firestore.collection('cancelledDeliveries')
        .where('__name__', 'in', batch)
        .get()
      
      cancelledQuery.docs.forEach(doc => {
        const clientId = doc.data().clientId
        cancelledSet.add(clientId)
      })
    }

    // Aggregate data
    const byPackage: Record<string, PackageGroup> = {}
    const skippedClients: SkippedClient[] = []
    let totalOrders = 0
    const ranajkyCounts = { A: 0, B: 0 }
    const obedCounts = { A: 0, B: 0, C: 0 }

    for (const doc of selectionsQuery.docs) {
      const selection = doc.data()
      const clientId = selection.clientId
      const clientInfo = clientsMap.get(clientId)
      const orderInfo = ordersMap.get(selection.orderId)
      const packageTier = selection.packageTier || 'UNKNOWN'

      // Collect skipped clients instead of just filtering
      if (cancelledSet.has(clientId)) {
        skippedClients.push({
          clientId,
          clientName: clientInfo?.fullName || 'Neznámy',
          orderId: selection.orderId,
          packageTier,
          deliveryType: orderInfo?.deliveryType || 'prevádzka',
          deliveryAddress: orderInfo?.deliveryAddress || '',
          phone: clientInfo?.phone || ''
        })
        continue
      }

      totalOrders++

      // Count ranajky
      if (selection.selectedRanajky === 'A') {
        ranajkyCounts.A++
      } else if (selection.selectedRanajky === 'B') {
        ranajkyCounts.B++
      }

      // Count obed
      if (selection.selectedObed === 'A') {
        obedCounts.A++
      } else if (selection.selectedObed === 'B') {
        obedCounts.B++
      } else if (selection.selectedObed === 'C') {
        obedCounts.C++
      }

      // Group by package
      if (!byPackage[packageTier]) {
        byPackage[packageTier] = { count: 0, clients: [] }
      }

      byPackage[packageTier].count++
      byPackage[packageTier].clients.push({
        clientId,
        clientName: clientInfo?.fullName || 'Neznámy',
        orderId: selection.orderId,
        selectedRanajky: selection.selectedRanajky,
        ranajkyName: mealsData.ranajkyOptions?.[`option${selection.selectedRanajky}`] || `Variant ${selection.selectedRanajky}`,
        selectedObed: selection.selectedObed,
        obedName: mealsData.obedOptions?.[`option${selection.selectedObed}`] || `Variant ${selection.selectedObed}`,
        deliveryType: orderInfo?.deliveryType || 'prevádzka',
        deliveryAddress: orderInfo?.deliveryAddress || '',
        phone: clientInfo?.phone || '',
        // Non-option meals (same for everyone)
        desiata: mealsData.meals?.desiata || '',
        polievka: mealsData.meals?.polievka || '',
        olovrant: mealsData.meals?.olovrant || '',
        vecera: mealsData.meals?.vecera || ''
      })
    }

    // Sort skipped clients by name
    skippedClients.sort((a, b) => a.clientName.localeCompare(b.clientName, 'sk'))

    // Sort clients in each package group by name
    for (const pkg of Object.values(byPackage)) {
      pkg.clients.sort((a, b) => a.clientName.localeCompare(b.clientName, 'sk'))
    }

    const summary: MealOrderSummary = {
      date,
      totalOrders,
      byPackage,
      ranajkyCounts: {
        optionA: { name: mealsData.ranajkyOptions?.optionA || 'Variant A', count: ranajkyCounts.A },
        optionB: { name: mealsData.ranajkyOptions?.optionB || 'Variant B', count: ranajkyCounts.B }
      },
      obedCounts: {
        optionA: { name: mealsData.obedOptions?.optionA || 'Variant A', count: obedCounts.A },
        optionB: { name: mealsData.obedOptions?.optionB || 'Variant B', count: obedCounts.B },
        optionC: { name: mealsData.obedOptions?.optionC || 'Variant C', count: obedCounts.C }
      },
      fixedMeals: {
        desiata: mealsData.meals?.desiata || '',
        polievka: mealsData.meals?.polievka || '',
        olovrant: mealsData.meals?.olovrant || '',
        vecera: mealsData.meals?.vecera || ''
      },
      skippedClients
    }

    return summary
  } catch (error: any) {
    return handleApiError(error, 'Nepodarilo sa načítať objednávky jedál')
  }
})
