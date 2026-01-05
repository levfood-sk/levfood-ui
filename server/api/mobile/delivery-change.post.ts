/**
 * POST /api/mobile/delivery-change
 * Request a delivery address change for the active order
 * Change takes effect after a 4-day period (uses same cutoff logic as meal modifications)
 */

import { getFirebaseAdmin } from "~~/server/utils/firebase-admin";
import { requireAuth, handleApiError } from "~~/server/utils/auth";
import { DELIVERY_CITIES } from "~~/app/lib/types/order";
import type { DeliveryType, DeliveryCity, PendingDeliveryChange } from "~~/app/lib/types/order";

const log = {
  info: (msg: string, data?: object) => console.log(`[DELIVERY-CHANGE] ${msg}`, data ? JSON.stringify(data) : ''),
  success: (msg: string, data?: object) => console.log(`[DELIVERY-CHANGE] ${msg}`, data ? JSON.stringify(data) : ''),
  error: (msg: string, data?: object) => console.error(`[DELIVERY-CHANGE] ${msg}`, data ? JSON.stringify(data) : ''),
};

/**
 * Calculate the effective date for delivery change (4-5 days based on cutoff rules)
 * Uses same logic as meal modification cutoff
 */
function getEffectiveDate(now: Date = new Date()): string {
  const dayOfWeek = now.getDay();

  const daysToAdd: Record<number, number> = {
    0: 4, // Sunday -> Thursday
    1: 4, // Monday -> Friday
    2: 4, // Tuesday -> Saturday
    3: 5, // Wednesday -> Monday
    4: 5, // Thursday -> Tuesday
    5: 5, // Friday -> Wednesday
    6: 5, // Saturday -> Thursday
  };

  const result = new Date(now);
  result.setDate(result.getDate() + daysToAdd[dayOfWeek]);
  result.setHours(0, 0, 0, 0);

  return result.toISOString().split('T')[0];
}

/**
 * Format date as Slovak readable format
 */
function formatDateSlovak(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('sk-SK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default defineEventHandler(async (event) => {
  try {
    const user = requireAuth(event);
    const body = await readBody(event);

    const { deliveryType, deliveryCity, deliveryAddress } = body as {
      deliveryType: DeliveryType;
      deliveryCity?: DeliveryCity;
      deliveryAddress?: string;
    };

    log.info('Delivery change request received', { deliveryType, deliveryCity, uid: user.uid });

    // Validate delivery type
    if (!deliveryType || !['prevádzka', 'domov'].includes(deliveryType)) {
      throw createError({
        statusCode: 400,
        message: 'Typ doručenia je povinný',
      });
    }

    // Validate city and address for home delivery
    if (deliveryType === 'domov') {
      if (!deliveryCity) {
        throw createError({
          statusCode: 400,
          message: 'Mesto/obec je povinné pre doručenie domov',
        });
      }

      if (!DELIVERY_CITIES.includes(deliveryCity)) {
        throw createError({
          statusCode: 400,
          message: 'Neplatné mesto/obec',
        });
      }

      if (!deliveryAddress || deliveryAddress.trim().length < 5) {
        throw createError({
          statusCode: 400,
          message: 'Adresa doručenia je povinná (minimálne 5 znakov)',
        });
      }
    }

    const { firestore } = getFirebaseAdmin();

    // Find the client linked to this Firebase user
    const clientsRef = firestore.collection('clients');
    const clientQuery = await clientsRef
      .where('firebaseUid', '==', user.uid)
      .limit(1)
      .get();

    if (clientQuery.empty) {
      throw createError({
        statusCode: 403,
        message: 'Účet nie je prepojený s klientom',
      });
    }

    const clientDoc = clientQuery.docs[0];
    const clientId = clientDoc.id;

    // Get active order
    const ordersRef = firestore.collection('orders');
    const orderQuery = await ordersRef
      .where('clientId', '==', clientId)
      .where('orderStatus', 'in', ['pending', 'approved'])
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (orderQuery.empty) {
      throw createError({
        statusCode: 403,
        message: 'Nemáte aktívnu objednávku',
      });
    }

    const orderDoc = orderQuery.docs[0];
    const orderData = orderDoc.data();

    // Check if there's already a pending change
    if (orderData.pendingDeliveryChange) {
      throw createError({
        statusCode: 400,
        message: `Už máte naplánovanú zmenu doručenia od ${formatDateSlovak(orderData.pendingDeliveryChange.effectiveDate)}. Počkajte, kým sa zmena uplatní.`,
      });
    }

    // Calculate effective date
    const now = new Date();
    const effectiveDate = getEffectiveDate(now);

    // Create pending delivery change
    const pendingChange: PendingDeliveryChange = {
      deliveryType,
      deliveryCity: deliveryType === 'domov' ? deliveryCity : undefined,
      deliveryAddress: deliveryType === 'domov' ? deliveryAddress?.trim() : undefined,
      effectiveDate,
      requestedAt: now.toISOString(),
      requestedBy: 'client',
    };

    // Update order with pending change
    const orderRef = firestore.collection('orders').doc(orderDoc.id);
    await orderRef.update({
      pendingDeliveryChange: pendingChange,
      updatedAt: new Date(),
    });

    log.success('Delivery change request saved', {
      orderId: orderData.orderId,
      effectiveDate,
      deliveryType,
    });

    return {
      success: true,
      message: `Zmena doručenia bola naplánovaná. Nadobudne účinnosť ${formatDateSlovak(effectiveDate)}.`,
      pendingChange,
      effectiveDateFormatted: formatDateSlovak(effectiveDate),
    };
  } catch (error: any) {
    log.error('Delivery change request failed', { error: error.message });
    return handleApiError(error, 'Nepodarilo sa spracovať požiadavku na zmenu doručenia');
  }
});
