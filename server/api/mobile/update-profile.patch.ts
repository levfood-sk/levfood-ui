/**
 * Update Mobile User Profile API Endpoint
 *
 * PATCH /api/mobile/update-profile
 *
 * Updates client profile data and active order delivery settings.
 * - Client fields (name, email, phone) stored in `clients` collection
 * - Delivery fields (type, city, address) stored in active `orders` document
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { getFirebaseAdmin } from "~~/server/utils/firebase-admin";
import { requireAuth, handleApiError } from "~~/server/utils/auth";
import type { Order, Client, DeliveryCity, DELIVERY_CITIES } from "~~/app/lib/types/order";

// Validation schema
const updateProfileSchema = z.object({
  // Client fields (optional)
  fullName: z
    .string()
    .min(2, "Meno musí obsahovať aspoň 2 znaky")
    .max(100, "Meno je príliš dlhé")
    .optional(),
  email: z
    .string()
    .email("Neplatná emailová adresa")
    .toLowerCase()
    .optional(),
  phone: z
    .string()
    .regex(/^(\+421|0)?[0-9]{9,10}$/, { message: "Neplatné telefónne číslo" })
    .optional(),

  // Order delivery fields (optional)
  deliveryType: z.enum(["prevádzka", "domov"]).optional(),
  deliveryCity: z
    .enum([
      "Levice",
      "Géňa",
      "Kalinčiakovo",
      "Hronské Klačany",
      "Starý Tekov",
      "Podlužany",
      "Hronské Kosihy",
      "Čajkov",
      "Rybník",
      "Tlmače",
      "Tlmače - Lipník",
      "Mochovce",
      "Kalná n. Hronom",
      "Horná Seč",
    ])
    .optional(),
  deliveryAddress: z
    .string()
    .min(5, "Adresa musí obsahovať aspoň 5 znakov")
    .max(500, "Adresa je príliš dlhá")
    .optional(),
});

// Logging helper
const log = {
  info: (msg: string, data?: object) =>
    console.log(`[UPDATE-PROFILE] ${msg}`, data ? JSON.stringify(data) : ""),
  success: (msg: string, data?: object) =>
    console.log(`[UPDATE-PROFILE] ✅ ${msg}`, data ? JSON.stringify(data) : ""),
  error: (msg: string, data?: object) =>
    console.error(`[UPDATE-PROFILE] ❌ ${msg}`, data ? JSON.stringify(data) : ""),
};

export default defineEventHandler(async (event) => {
  const startTime = Date.now();

  try {
    // Require authentication
    const user = requireAuth(event);
    const firebaseUid = user.uid;

    log.info("Profile update request", { firebaseUid });

    // Parse and validate request body
    const body = await readBody(event);
    const validationResult = updateProfileSchema.safeParse(body);

    if (!validationResult.success) {
      // Log detailed errors for debugging
      log.info("Validation failed", { issues: validationResult.error.issues });

      // Return user-friendly message
      throw createError({
        statusCode: 400,
        message: "Skontrolujte prosím zadané údaje a skúste znova.",
      });
    }

    const data = validationResult.data;

    // Validate delivery fields combination
    if (data.deliveryType === "domov") {
      if (data.deliveryCity === undefined && data.deliveryAddress === undefined) {
        // Allow partial updates, but if switching to domov, require both
      }
    }

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
      throw createError({
        statusCode: 404,
        message: "Účet nenájdený",
      });
    }

    const clientDoc = clientQuery.docs[0];
    const clientId = clientDoc.id;
    const existingClient = clientDoc.data() as Client;

    log.info("Client found", { clientId, email: existingClient.email });

    // Build client update data
    const clientUpdateData: Record<string, any> = {
      updatedAt: Timestamp.now(),
    };

    if (data.fullName !== undefined) {
      clientUpdateData.fullName = data.fullName;
      // Split name into first/last
      const nameParts = data.fullName.trim().split(" ");
      clientUpdateData.firstName = nameParts[0] || "";
      clientUpdateData.lastName = nameParts.slice(1).join(" ") || "";
    }

    if (data.email !== undefined) {
      clientUpdateData.email = data.email;
    }

    if (data.phone !== undefined) {
      clientUpdateData.phone = data.phone;
    }

    // Update client document
    const hasClientUpdates = Object.keys(clientUpdateData).length > 1; // > 1 because updatedAt is always present
    if (hasClientUpdates) {
      await clientDoc.ref.update(clientUpdateData);
      log.info("Client updated", { clientId, fields: Object.keys(clientUpdateData) });
    }

    // Find and update active order if delivery fields provided
    let updatedOrder: any = null;
    const hasDeliveryUpdates =
      data.deliveryType !== undefined ||
      data.deliveryCity !== undefined ||
      data.deliveryAddress !== undefined;

    if (hasDeliveryUpdates) {
      const ordersRef = db.collection("orders");
      const ordersQuery = await ordersRef
        .where("clientId", "==", clientId)
        .where("orderStatus", "in", ["pending", "approved"])
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (!ordersQuery.empty) {
        const orderDoc = ordersQuery.docs[0];
        const existingOrder = orderDoc.data() as Order;

        // Build order update data
        const orderUpdateData: Record<string, any> = {
          updatedAt: Timestamp.now(),
        };

        if (data.deliveryType !== undefined) {
          orderUpdateData.deliveryType = data.deliveryType;

          // If switching to prevádzka, clear delivery-specific fields
          if (data.deliveryType === "prevádzka") {
            orderUpdateData.deliveryCity = null;
          }
        }

        if (data.deliveryCity !== undefined) {
          orderUpdateData.deliveryCity = data.deliveryCity;
        }

        if (data.deliveryAddress !== undefined) {
          orderUpdateData.deliveryAddress = data.deliveryAddress;
        }

        await orderDoc.ref.update(orderUpdateData);
        log.info("Order updated", {
          orderId: existingOrder.orderId,
          fields: Object.keys(orderUpdateData),
        });

        // Fetch updated order for response
        const updatedOrderDoc = await orderDoc.ref.get();
        updatedOrder = updatedOrderDoc.data() as Order;
      } else {
        log.info("No active order found for delivery update", { clientId });
      }
    }

    // Fetch updated client for response
    const updatedClientDoc = await clientDoc.ref.get();
    const updatedClient = updatedClientDoc.data() as Client;

    // Fetch all active orders for response
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
    }> = [];

    try {
      const ordersRef = db.collection("orders");
      const ordersQuery = await ordersRef
        .where("clientId", "==", clientId)
        .where("orderStatus", "in", ["pending", "approved"])
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();

      activeOrders = ordersQuery.docs.map((doc) => {
        const order = doc.data() as Order;
        let deliveryEndDateStr: string | undefined;
        if ((order as any).deliveryEndDate) {
          if (
            typeof (order as any).deliveryEndDate === "object" &&
            "toDate" in (order as any).deliveryEndDate
          ) {
            deliveryEndDateStr = ((order as any).deliveryEndDate as any)
              .toDate()
              .toISOString()
              .split("T")[0];
          } else if (typeof (order as any).deliveryEndDate === "string") {
            deliveryEndDateStr = (order as any).deliveryEndDate;
          }
        }

        return {
          orderId: order.orderId,
          package: order.package,
          orderStatus: order.orderStatus,
          deliveryStartDate: order.deliveryStartDate,
          deliveryEndDate: deliveryEndDateStr,
          duration: order.duration,
          daysCount: order.daysCount,
          totalPrice: order.totalPrice,
          creditDays: (order as any).creditDays || 0,
          deliveryType: order.deliveryType,
          deliveryCity: order.deliveryCity,
          deliveryAddress: order.deliveryAddress,
        };
      });
    } catch (ordersError: any) {
      log.info("Orders fetch skipped", { error: ordersError.message });
    }

    const duration = Date.now() - startTime;
    log.success(`Profile updated (${duration}ms)`, {
      clientId,
      hasClientUpdates,
      hasDeliveryUpdates,
    });

    return {
      success: true,
      client: {
        clientId,
        firstName: updatedClient.firstName,
        lastName: updatedClient.lastName,
        fullName: updatedClient.fullName,
        email: updatedClient.email,
        phone: updatedClient.phone,
        currentPlan: updatedClient.currentPlan,
        accountStatus: updatedClient.accountStatus,
        subscriptionEndDate: updatedClient.subscriptionEndDate,
      },
      activeOrders,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    log.error(`Request failed (${duration}ms)`, { error: error.message });

    return handleApiError(error, "Nepodarilo sa aktualizovať profil");
  }
});
