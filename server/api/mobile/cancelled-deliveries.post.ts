/**
 * POST /api/mobile/cancelled-deliveries
 * Cancel delivery day(s) for a user
 * Supports both single date and batch operations
 * Extends subscription by +1 day per cancelled date
 */

import { getFirebaseAdmin } from "~~/server/utils/firebase-admin";
import { requireAuth, handleApiError } from "~~/server/utils/auth";

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

function getLastSkippableDate(now: Date = new Date()): Date {
  const firstSkippable = getFirstSkippableDate(now);
  const lastSkippable = new Date(firstSkippable);
  lastSkippable.setDate(lastSkippable.getDate() + 13); // 2 weeks
  return lastSkippable;
}

function isValidDeliveryDay(dateStr: string, deliveryDays: 5 | 6): boolean {
  const date = new Date(dateStr);
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
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  if (target <= today) return false;
  if (!isValidDeliveryDay(targetDate, deliveryDays)) return false;

  const firstSkippable = getFirstSkippableDate(now);
  if (target < firstSkippable) return false;

  const lastSkippable = getLastSkippableDate(now);
  if (target > lastSkippable) return false;

  return true;
}

export default defineEventHandler(async (event) => {
  try {
    const user = requireAuth(event);
    const body = await readBody(event);

    const { date, dates, action } = body; // date for single, dates for batch

    // Validate action
    if (!action || !["cancel", "reactivate"].includes(action)) {
      throw createError({
        statusCode: 400,
        message: 'Neplatná akcia. Použite "cancel" alebo "reactivate"',
      });
    }

    // Determine if batch or single operation
    const isBatch = Array.isArray(dates) && dates.length > 0;
    const datesToProcess: string[] = isBatch ? dates : date ? [date] : [];

    if (datesToProcess.length === 0) {
      throw createError({
        statusCode: 400,
        message: "Dátum je povinný",
      });
    }

    // Validate date format for all dates
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

    // Validate max dates based on package
    const maxDates = deliveryDays === 5 ? 10 : 12;
    if (datesToProcess.length > maxDates) {
      throw createError({
        statusCode: 400,
        message: `Maximálny počet dní na preskočenie je ${maxDates}`,
      });
    }

    const now = new Date();

    if (action === "cancel") {
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
          message: `Tieto dni sú už preskočené: ${alreadyCancelled.join(", ")}`,
        });
      }

      // Get current end date
      let deliveryEndDate: Date;
      if (orderData.deliveryEndDate?.toDate) {
        deliveryEndDate = orderData.deliveryEndDate.toDate();
      } else if (orderData.deliveryEndDate) {
        deliveryEndDate = new Date(orderData.deliveryEndDate);
      } else {
        // Calculate from start date + days count if no end date
        deliveryEndDate = new Date();
        deliveryEndDate.setDate(
          deliveryEndDate.getDate() + (orderData.daysCount || 30),
        );
      }

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

      // Add credit days (one per cancelled date)
      const creditDaysToAdd = datesToProcess.length;
      deliveryEndDate.setDate(deliveryEndDate.getDate() + creditDaysToAdd);

      // Update order
      const orderRef = firestore.collection("orders").doc(orderDoc.id);
      batch.update(orderRef, {
        deliveryEndDate,
        creditDays: (orderData.creditDays || 0) + creditDaysToAdd,
      });

      // Commit all changes
      await batch.commit();

      const newEndDateStr = deliveryEndDate.toISOString().split("T")[0];

      return {
        success: true,
        message: isBatch
          ? `${datesToProcess.length} dní bolo preskočených. +${creditDaysToAdd} dní bolo pripočítaných k predplatnému.`
          : "Doručenie bolo zrušené. +1 deň bol pripočítaný k predplatnému.",
        dates: datesToProcess,
        action: "cancel",
        newEndDate: newEndDateStr,
        creditDaysAdded: creditDaysToAdd,
      };
    } else {
      // Reactivate - only supports single date
      if (isBatch) {
        throw createError({
          statusCode: 400,
          message: "Obnovenie podporuje len jeden dátum naraz",
        });
      }

      const dateToReactivate = datesToProcess[0];

      // Check cutoff for reactivation
      if (!canSkipDate(dateToReactivate, deliveryDays, now)) {
        throw createError({
          statusCode: 400,
          message: "Tento dátum už nie je možné obnoviť - lehota uplynula.",
        });
      }

      const cancellationId = `${clientId}_${dateToReactivate}`;
      const cancellationRef = firestore
        .collection("cancelledDeliveries")
        .doc(cancellationId);

      const existingDoc = await cancellationRef.get();
      if (!existingDoc.exists) {
        throw createError({
          statusCode: 400,
          message: "Doručenie na tento deň nie je zrušené",
        });
      }

      const existingData = existingDoc.data();

      // Remove the credit day if it was applied
      if (existingData?.creditApplied) {
        const orderRef = firestore.collection("orders").doc(orderDoc.id);

        let deliveryEndDate: Date;
        if (orderData.deliveryEndDate?.toDate) {
          deliveryEndDate = orderData.deliveryEndDate.toDate();
        } else if (orderData.deliveryEndDate) {
          deliveryEndDate = new Date(orderData.deliveryEndDate);
        } else {
          deliveryEndDate = new Date();
        }

        // Subtract 1 day
        deliveryEndDate.setDate(deliveryEndDate.getDate() - 1);

        await orderRef.update({
          deliveryEndDate,
          creditDays: Math.max((orderData.creditDays || 0) - 1, 0),
        });
      }

      // Delete the cancellation record
      await cancellationRef.delete();

      return {
        success: true,
        message: "Doručenie bolo obnovené.",
        dates: [dateToReactivate],
        action: "reactivate",
      };
    }
  } catch (error: any) {
    return handleApiError(error, "Nepodarilo sa spracovať požiadavku");
  }
});
