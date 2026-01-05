/**
 * Get Current Mobile User API Endpoint
 *
 * GET /api/mobile/me
 *
 * Returns the client data linked to the authenticated Firebase user.
 * Used by mobile app to check if user has already linked their account.
 */

import { getFirestore } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "~~/server/utils/firebase-admin";
import { requireAuth } from "~~/server/utils/auth";
import type { Order, Client, DurationType, PendingDeliveryChange } from "~~/app/lib/types/order";
import { getOrCalculateDeliveryEndDate, formatToYYYYMMDD } from "~~/server/utils/delivery-dates";

/**
 * Check if a pending delivery change should be applied
 */
function shouldApplyPendingChange(pendingChange: PendingDeliveryChange | undefined): boolean {
  if (!pendingChange) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const effectiveDate = new Date(pendingChange.effectiveDate);
  effectiveDate.setHours(0, 0, 0, 0);

  return today >= effectiveDate;
}

// Logging helper for consistent format
const log = {
  info: (msg: string, data?: object) =>
    console.log(`[ME] ${msg}`, data ? JSON.stringify(data) : ""),
  success: (msg: string, data?: object) =>
    console.log(`[ME] ✅ ${msg}`, data ? JSON.stringify(data) : ""),
};

export default defineEventHandler(async (event) => {
  const startTime = Date.now();

  try {
    // Require authentication
    const user = requireAuth(event);
    const firebaseUid = user.uid;

    log.info("Fetching user data", { firebaseUid });

    // Initialize Firestore
    const { app } = getFirebaseAdmin();
    const db = getFirestore(app);

    // Find client by firebaseUid
    const clientsRef = db.collection("clients");
    const clientQuery = await clientsRef
      .where("firebaseUid", "==", firebaseUid)
      .limit(1)
      .get();

    if (clientQuery.empty) {
      const duration = Date.now() - startTime;
      log.info(`No linked account found (${duration}ms)`, { firebaseUid });

      return {
        linked: false,
        client: null,
        activeOrders: [],
      };
    }

    const clientDoc = clientQuery.docs[0];
    const client = clientDoc.data() as Client;
    const clientId = clientDoc.id;

    log.info("Client found", { clientId, email: client.email });

    // Fetch active orders (wrapped in try-catch - orders are non-critical)
    let activeOrders: Array<{
      orderId: string;
      package: string;
      orderStatus: string;
      deliveryStartDate: string;
      deliveryEndDate?: string;
      duration?: "5" | "6";
      daysCount: number;
      totalPrice: number;
      creditDays?: number;
      deliveryType?: string;
      deliveryCity?: string;
      deliveryAddress?: string;
      pendingDeliveryChange?: PendingDeliveryChange;
    }> = [];

    try {
      const ordersRef = db.collection("orders");
      const ordersQuery = await ordersRef
        .where("clientId", "==", clientId)
        .where("orderStatus", "in", ["pending", "approved"])
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();

      // Process orders with pending change application
      for (const doc of ordersQuery.docs) {
        const order = doc.data() as Order;
        let currentDeliveryType = order.deliveryType;
        let currentDeliveryCity = order.deliveryCity;
        let currentDeliveryAddress = order.deliveryAddress;
        let pendingChange = order.pendingDeliveryChange;

        // Check if pending change should be applied
        if (shouldApplyPendingChange(pendingChange)) {
          log.info("Applying pending delivery change", {
            orderId: order.orderId,
            effectiveDate: pendingChange!.effectiveDate,
          });

          // Apply the pending change
          currentDeliveryType = pendingChange!.deliveryType;
          currentDeliveryCity = pendingChange!.deliveryCity;
          currentDeliveryAddress = pendingChange!.deliveryAddress;

          // Update the order in Firestore (fire and forget - don't block response)
          db.collection("orders").doc(doc.id).update({
            deliveryType: pendingChange!.deliveryType,
            deliveryCity: pendingChange!.deliveryCity || null,
            deliveryAddress: pendingChange!.deliveryAddress || '',
            pendingDeliveryChange: null,
            updatedAt: new Date(),
          }).catch((err) => {
            log.info("Failed to apply pending change to Firestore", { error: err.message });
          });

          // Clear pending change from response since it was applied
          pendingChange = undefined;
        }

        // Calculate delivery end date using utility (handles legacy orders without stored field)
        const computedEndDate = getOrCalculateDeliveryEndDate({
          deliveryStartDate: order.deliveryStartDate,
          duration: order.duration as DurationType,
          daysCount: order.daysCount,
          deliveryEndDate: order.deliveryEndDate,
          creditDays: order.creditDays || 0,
        });
        const deliveryEndDateStr = formatToYYYYMMDD(computedEndDate);

        activeOrders.push({
          orderId: order.orderId,
          package: order.package,
          orderStatus: order.orderStatus,
          deliveryStartDate: order.deliveryStartDate,
          deliveryEndDate: deliveryEndDateStr,
          duration: order.duration,
          daysCount: order.daysCount,
          totalPrice: order.totalPrice,
          creditDays: order.creditDays || 0,
          deliveryType: currentDeliveryType,
          deliveryCity: currentDeliveryCity,
          deliveryAddress: currentDeliveryAddress,
          pendingDeliveryChange: pendingChange,
        });
      }
    } catch (ordersError: any) {
      // Orders query may fail if Firestore index is missing - this is non-critical
      log.info("Orders fetch skipped (index may be missing)", {
        error: ordersError.message,
      });
    }

    const duration = Date.now() - startTime;
    log.success(`User data fetched (${duration}ms)`, {
      clientId,
      activeOrdersCount: activeOrders.length,
    });

    return {
      linked: true,
      client: {
        clientId,
        firstName: client.firstName,
        lastName: client.lastName,
        fullName: client.fullName,
        email: client.email,
        phone: client.phone,
        currentPlan: client.currentPlan,
        accountStatus: client.accountStatus,
        subscriptionEndDate: client.subscriptionEndDate,
      },
      activeOrders,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    log.info(`Request failed (${duration}ms)`, { error: error.message });

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: error.message || "Nepodarilo sa načítať údaje",
    });
  }
});
