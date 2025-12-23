/**
 * POST /api/mobile/cancelled-deliveries
 * Cancel a single delivery day for a user
 * Extends subscription by +1 day per cancelled date
 */

import { getFirebaseAdmin } from "~~/server/utils/firebase-admin";
import { requireAuth, handleApiError } from "~~/server/utils/auth";
import { getOrCalculateDeliveryEndDate, extendDeliveryEndDate } from "~~/server/utils/delivery-dates";
import type { DurationType } from "~~/app/lib/types/order";

/**
 * New cutoff logic based on production schedule
 * Orders placed Monday morning for Tuesday's food
 *
 * Current Day (until 23:59) -> First Skippable Day
 * Sunday    -> Thursday (+4 days)
 * Monday    -> Friday (+4 days)
 * Tuesday   -> Saturday (+4 days)
 * Wednesday -> Monday (+5 days)
 * Thursday  -> Tuesday (+5 days)
 * Friday    -> Wednesday (+5 days)
 * Saturday  -> Thursday (+5 days)
 */
function getFirstSkippableDate(now: Date = new Date()): Date {
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

  return result;
}


function isValidDeliveryDay(dateStr: string, deliveryDays: 5 | 6): boolean {
  // Parse as local date to avoid timezone issues
  const parts = dateStr.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
  const day = parseInt(parts[2], 10);
  const date = new Date(year, month, day);
  const dayOfWeek = date.getDay();

  if (dayOfWeek === 0) return false; // Sunday never
  if (dayOfWeek === 6 && deliveryDays === 5) return false; // Saturday only for 6-day

  return true;
}

function canSkipDate(
  targetDate: string,
  deliveryDays: 5 | 6,
  now: Date = new Date(),
): boolean {
  // Parse as local date to avoid timezone issues
  const parts = targetDate.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const target = new Date(year, month, day);
  target.setHours(0, 0, 0, 0);

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  if (target <= today) return false;
  if (!isValidDeliveryDay(targetDate, deliveryDays)) return false;

  const firstSkippable = getFirstSkippableDate(now);
  if (target < firstSkippable) return false;

  return true;
}

export default defineEventHandler(async (event) => {
  try {
    const user = requireAuth(event);
    const body = await readBody(event);

    const { dates } = body;

    // Validate dates array is provided
    if (!Array.isArray(dates) || dates.length === 0) {
      throw createError({
        statusCode: 400,
        message: "Dátum je povinný",
      });
    }

    // Enforce single-day skip only
    if (dates.length > 1) {
      throw createError({
        statusCode: 400,
        message: "Môžete preskočiť iba jeden deň naraz",
      });
    }

    const datesToProcess: string[] = dates;

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    for (const d of datesToProcess) {
      if (!dateRegex.test(d)) {
        throw createError({
          statusCode: 400,
          message: `Neplatný formát dátumu: ${d}`,
        });
      }
    }

    const { firestore } = getFirebaseAdmin();

    // Find the client linked to this Firebase user
    const clientsRef = firestore.collection("clients");
    const clientQuery = await clientsRef
      .where("firebaseUid", "==", user.uid)
      .limit(1)
      .get();

    if (clientQuery.empty) {
      throw createError({
        statusCode: 403,
        message: "Účet nie je prepojený s klientom",
      });
    }

    const clientDoc = clientQuery.docs[0];
    const clientId = clientDoc.id;

    // Get active order
    const ordersRef = firestore.collection("orders");
    const orderQuery = await ordersRef
      .where("clientId", "==", clientId)
      .where("orderStatus", "in", ["pending", "approved"])
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (orderQuery.empty) {
      throw createError({
        statusCode: 403,
        message: "Nemáte aktívnu objednávku",
      });
    }

    const orderDoc = orderQuery.docs[0];
    const orderData = orderDoc.data();
    const deliveryDays = (orderData.duration === "6" ? 6 : 5) as 5 | 6;

    const now = new Date();

    // Validate all dates can be skipped
    for (const d of datesToProcess) {
      if (!canSkipDate(d, deliveryDays, now)) {
        throw createError({
          statusCode: 400,
          message: `Dátum ${d} nie je možné preskočiť. Skontrolujte, či je v povolenej lehote a je to deň doručenia.`,
        });
      }
    }

    // Check if any dates are already cancelled
    const cancellationRefs = datesToProcess.map((d) =>
      firestore.collection("cancelledDeliveries").doc(`${clientId}_${d}`),
    );

    const existingDocs = await firestore.getAll(...cancellationRefs);
    const alreadyCancelled = existingDocs
      .filter((doc) => doc.exists)
      .map((doc) => doc.id.split("_")[1]);

    if (alreadyCancelled.length > 0) {
      throw createError({
        statusCode: 400,
        message: `Tento deň je už preskočený`,
      });
    }

    // Get current end date using utility (handles legacy orders without deliveryEndDate)
    const duration = orderData.duration as DurationType;
    const currentEndDate = getOrCalculateDeliveryEndDate({
      deliveryStartDate: orderData.deliveryStartDate,
      duration,
      daysCount: orderData.daysCount,
      deliveryEndDate: orderData.deliveryEndDate,
      creditDays: orderData.creditDays || 0,
    });

    // Use batch write for atomicity
    const batch = firestore.batch();

    // Create cancellation records
    for (const d of datesToProcess) {
      const cancellationRef = firestore
        .collection("cancelledDeliveries")
        .doc(`${clientId}_${d}`);
      batch.set(cancellationRef, {
        clientId,
        orderId: orderData.orderId,
        date: d,
        creditApplied: true,
        cancelledAt: new Date(),
      });
    }

    // Add credit days (one per cancelled date) - extends by valid delivery days, not calendar days
    const creditDaysToAdd = datesToProcess.length;
    const newEndDate = extendDeliveryEndDate(currentEndDate, duration, creditDaysToAdd);

    // Update order
    const orderRef = firestore.collection("orders").doc(orderDoc.id);
    batch.update(orderRef, {
      deliveryEndDate: newEndDate,
      creditDays: (orderData.creditDays || 0) + creditDaysToAdd,
    });

    // Commit all changes
    await batch.commit();

    const newEndDateStr = newEndDate.toISOString().split("T")[0];

    return {
      success: true,
      message: "Doručenie bolo zrušené. +1 deň bol pripočítaný k predplatnému.",
      dates: datesToProcess,
      action: "cancel",
      newEndDate: newEndDateStr,
      creditDaysAdded: creditDaysToAdd,
    };
  } catch (error: any) {
    return handleApiError(error, "Nepodarilo sa spracovať požiadavku");
  }
});
