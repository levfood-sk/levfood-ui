/**
 * Mark Notification as Read Endpoint
 *
 * PATCH /api/mobile/notifications/[id]
 *
 * Marks a specific notification as read for the authenticated user.
 */

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "~~/server/utils/firebase-admin";
import { requireAuth } from "~~/server/utils/auth";

const log = {
  info: (msg: string, data?: object) =>
    console.log(`[NOTIFICATION-READ] ${msg}`, data ? JSON.stringify(data) : ""),
  success: (msg: string, data?: object) =>
    console.log(`[NOTIFICATION-READ] ✅ ${msg}`, data ? JSON.stringify(data) : ""),
};

export default defineEventHandler(async (event) => {
  const startTime = Date.now();

  try {
    // Require authentication
    const user = requireAuth(event);
    const firebaseUid = user.uid;

    // Get notification ID from URL
    const notificationId = getRouterParam(event, "id");

    if (!notificationId) {
      throw createError({
        statusCode: 400,
        message: "Notification ID is required",
      });
    }

    log.info("Marking notification as read", { firebaseUid, notificationId });

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
        message: "Client not found",
      });
    }

    const clientId = clientQuery.docs[0].id;

    // Get the notification
    const notificationRef = db.collection("notifications").doc(notificationId);
    const notificationDoc = await notificationRef.get();

    if (!notificationDoc.exists) {
      throw createError({
        statusCode: 404,
        message: "Notification not found",
      });
    }

    // Verify ownership
    const notificationData = notificationDoc.data();
    if (notificationData?.clientId !== clientId) {
      throw createError({
        statusCode: 403,
        message: "Access denied",
      });
    }

    // Mark as read
    await notificationRef.update({
      readAt: FieldValue.serverTimestamp(),
    });

    const duration = Date.now() - startTime;
    log.success(`Notification marked as read (${duration}ms)`, {
      notificationId,
      clientId,
    });

    return {
      success: true,
      message: "Notification marked as read",
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    log.info(`Request failed (${duration}ms)`, { error: error.message });

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: error.message || "Failed to mark notification as read",
    });
  }
});
