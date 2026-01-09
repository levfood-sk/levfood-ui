/**
 * GET /api/admin/meal-orders/[date]
 * Get aggregated meal selections for a specific date
 * For admin dashboard - shows what to order for production
 */

import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { requireAuth, handleApiError } from '~~/server/utils/auth'
import { parseDDMMYYYY, getOrCalculateDeliveryEndDate, isValidDeliveryDay } from '~~/server/utils/delivery-dates'
import type { DurationType } from '~~/app/lib/types/order'

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
  // Dietary requirements (only for standard and premium packages)
  dietaryRequirements: string[]
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

interface PendingSelectionClient {
  clientId: string
  clientName: string
  email: string
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
  // Non-option meals with counts based on package types
  fixedMeals: {
    desiata: { name: string; count: number }   // premium, office
    polievka: { name: string; count: number }  // all packages
    olovrant: { name: string; count: number }  // standard, premium
    vecera: { name: string; count: number }    // economy, standard, premium
  }
  skippedClients: SkippedClient[]
  pendingSelectionClients: PendingSelectionClient[]
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
          desiata: { name: mealsData?.meals?.desiata || '', count: 0 },
          polievka: { name: mealsData?.meals?.polievka || '', count: 0 },
          olovrant: { name: mealsData?.meals?.olovrant || '', count: 0 },
          vecera: { name: mealsData?.meals?.vecera || '', count: 0 }
        },
        skippedClients: [],
        pendingSelectionClients: [],
        message: 'Žiadne objednávky'
      }
    }

    // Get all meal selections for this date
    const selectionsRef = firestore.collection('mealSelections')
    const selectionsQuery = await selectionsRef
      .where('date', '==', date)
      .get()

    // Get client IDs from selections (may be empty)
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
    const ordersMap = new Map<string, { deliveryType: 'prevádzka' | 'domov'; deliveryAddress: string; dietaryRequirements: string[] }>()
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
          deliveryAddress: data.deliveryAddress || '',
          dietaryRequirements: data.dietaryRequirements || []
        })
      })
    }

    // Check for cancelled deliveries for clients who made selections
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

    // ============================================================
    // Find clients with active orders who haven't made selections
    // ============================================================

    // Parse the target date for comparison
    const [year, month, day] = date.split('-').map(Number)
    const targetDate = new Date(year, month - 1, day)
    targetDate.setHours(0, 0, 0, 0)

    // Get all approved orders
    const approvedOrdersQuery = await firestore.collection('orders')
      .where('orderStatus', '==', 'approved')
      .get()

    // Create set of client IDs who already made selections for quick lookup
    const clientsWithSelections = new Set(clientIds)

    // Filter orders to find those with active delivery on the target date
    const pendingSelectionClients: PendingSelectionClient[] = []
    const pendingClientIds: string[] = []

    for (const orderDoc of approvedOrdersQuery.docs) {
      const order = orderDoc.data()
      const orderClientId = order.clientId

      // Skip if client already made a selection
      if (clientsWithSelections.has(orderClientId)) {
        continue
      }

      // Parse delivery start date (DD.MM.YYYY format)
      const startDate = parseDDMMYYYY(order.deliveryStartDate)
      startDate.setHours(0, 0, 0, 0)

      // Skip if target date is before start date
      if (targetDate < startDate) {
        continue
      }

      // Calculate or get delivery end date
      const endDate = getOrCalculateDeliveryEndDate({
        deliveryStartDate: order.deliveryStartDate,
        duration: order.duration as DurationType,
        daysCount: order.daysCount || (order.duration === '5' ? 20 : 24),
        deliveryEndDate: order.deliveryEndDate,
        creditDays: order.creditDays
      })
      endDate.setHours(0, 0, 0, 0)

      // Skip if target date is after end date
      if (targetDate > endDate) {
        continue
      }

      // Check if target date is a valid delivery day for this package duration
      const duration = (order.duration || '5') as DurationType
      if (!isValidDeliveryDay(targetDate, duration)) {
        continue
      }

      // This client has an active order for the target date but hasn't made a selection
      pendingClientIds.push(orderClientId)
    }

    // Check for cancelled deliveries among pending clients
    const pendingCancelledSet = new Set<string>()
    if (pendingClientIds.length > 0) {
      const pendingCancelledIds = pendingClientIds.map(id => `${id}_${date}`)
      for (let i = 0; i < pendingCancelledIds.length; i += 10) {
        const batch = pendingCancelledIds.slice(i, i + 10)
        const cancelledQuery = await firestore.collection('cancelledDeliveries')
          .where('__name__', 'in', batch)
          .get()

        cancelledQuery.docs.forEach(doc => {
          const clientId = doc.data().clientId
          pendingCancelledSet.add(clientId)
        })
      }
    }

    // Filter out cancelled deliveries from pending clients
    const filteredPendingClientIds = pendingClientIds.filter(id => !pendingCancelledSet.has(id))

    // Fetch client data for pending clients
    const pendingClientsMap = new Map<string, { fullName: string; email: string; phone: string }>()
    if (filteredPendingClientIds.length > 0) {
      const pendingClientChunks = []
      for (let i = 0; i < filteredPendingClientIds.length; i += 10) {
        pendingClientChunks.push(filteredPendingClientIds.slice(i, i + 10))
      }

      for (const chunk of pendingClientChunks) {
        const clientsQuery = await firestore.collection('clients')
          .where('__name__', 'in', chunk)
          .get()

        clientsQuery.docs.forEach(doc => {
          const data = doc.data()
          pendingClientsMap.set(doc.id, {
            fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Neznámy',
            email: data.email || '',
            phone: data.phone || ''
          })
        })
      }
    }

    // Build pending selection clients list with order data
    for (const orderDoc of approvedOrdersQuery.docs) {
      const order = orderDoc.data()
      const orderClientId = order.clientId

      // Only process clients in our filtered list
      if (!filteredPendingClientIds.includes(orderClientId)) {
        continue
      }

      const clientInfo = pendingClientsMap.get(orderClientId)
      if (clientInfo) {
        pendingSelectionClients.push({
          clientId: orderClientId,
          clientName: clientInfo.fullName,
          email: clientInfo.email,
          orderId: order.orderId,
          packageTier: order.package || 'UNKNOWN',
          deliveryType: order.deliveryType || 'prevádzka',
          deliveryAddress: order.deliveryAddress || '',
          phone: clientInfo.phone
        })
      }
    }

    // Sort pending clients by name
    pendingSelectionClients.sort((a, b) => a.clientName.localeCompare(b.clientName, 'sk'))

    // Aggregate data
    const byPackage: Record<string, PackageGroup> = {}
    const skippedClients: SkippedClient[] = []
    let totalOrders = 0
    const ranajkyCounts = { A: 0, B: 0 }
    const obedCounts = { A: 0, B: 0, C: 0 }
    // Fixed meal counts based on package types
    // Desiata: premium, office
    // Polievka: all packages (economy, standard, premium, office)
    // Olovrant: standard, premium
    // Vecera: economy, standard, premium
    const fixedMealCounts = { desiata: 0, polievka: 0, olovrant: 0, vecera: 0 }

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

      // Count fixed meals based on package type
      const pkgLower = packageTier.toLowerCase()
      // Polievka: all packages
      fixedMealCounts.polievka++
      // Desiata: premium, office
      if (pkgLower === 'premium' || pkgLower === 'office') {
        fixedMealCounts.desiata++
      }
      // Olovrant: standard, premium
      if (pkgLower === 'standard' || pkgLower === 'premium') {
        fixedMealCounts.olovrant++
      }
      // Vecera: economy, standard, premium
      if (pkgLower === 'economy' || pkgLower === 'standard' || pkgLower === 'premium') {
        fixedMealCounts.vecera++
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
        vecera: mealsData.meals?.vecera || '',
        // Dietary requirements (only applicable for standard and premium packages)
        dietaryRequirements: orderInfo?.dietaryRequirements || []
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
        desiata: { name: mealsData.meals?.desiata || '', count: fixedMealCounts.desiata },
        polievka: { name: mealsData.meals?.polievka || '', count: fixedMealCounts.polievka },
        olovrant: { name: mealsData.meals?.olovrant || '', count: fixedMealCounts.olovrant },
        vecera: { name: mealsData.meals?.vecera || '', count: fixedMealCounts.vecera }
      },
      skippedClients,
      pendingSelectionClients
    }

    return summary
  } catch (error: any) {
    return handleApiError(error, 'Nepodarilo sa načítať objednávky jedál')
  }
})
