/**
 * Mark All Notifications as Read Endpoint
 *
 * POST /api/mobile/notifications/read-all
 *
 * Marks all unread notifications as read for the authenticated user.
 */

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "~~/server/utils/firebase-admin";
import { requireAuth } from "~~/server/utils/auth";

const log = {
  info: (msg: string, data?: object) =>
    console.log(`[NOTIFICATIONS-READ-ALL] ${msg}`, data ? JSON.stringify(data) : ""),
  success: (msg: string, data?: object) =>
    console.log(`[NOTIFICATIONS-READ-ALL] ✅ ${msg}`, data ? JSON.stringify(data) : ""),
};

export default defineEventHandler(async (event) => {
  const startTime = Date.now();

  try {
    // Require authentication
    const user = requireAuth(event);
    const firebaseUid = user.uid;

    log.info("Marking all notifications as read", { firebaseUid });

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
      return {
        success: true,
        updatedCount: 0,
      };
    }

    const clientId = clientQuery.docs[0].id;

    // Get all unread notifications for this client
    const notificationsRef = db.collection("notifications");
    const unreadQuery = await notificationsRef
      .where("clientId", "==", clientId)
      .where("readAt", "==", null)
      .get();

    if (unreadQuery.empty) {
      const duration = Date.now() - startTime;
      log.success(`No unread notifications (${duration}ms)`, { clientId });
      return {
        success: true,
        updatedCount: 0,
      };
    }

    // Batch update all unread notifications
    const batch = db.batch();
    const timestamp = FieldValue.serverTimestamp();

    unreadQuery.docs.forEach((doc) => {
      batch.update(doc.ref, { readAt: timestamp });
    });

    await batch.commit();

    const duration = Date.now() - startTime;
    log.success(`All notifications marked as read (${duration}ms)`, {
      clientId,
      updatedCount: unreadQuery.size,
    });

    return {
      success: true,
      updatedCount: unreadQuery.size,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    log.info(`Request failed (${duration}ms)`, { error: error.message });

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: error.message || "Failed to mark notifications as read",
    });
  }
});
