/**
 * Admin Send Notification Endpoint
 *
 * POST /api/admin/send-notification
 *
 * Sends push notifications to mobile app users.
 * Supports sending to all users, specific client, or by package type.
 * Creates notification records in Firestore for in-app notification history.
 */

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "~~/server/utils/firebase-admin";

// Expo Push API URL
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface SendNotificationRequest {
  targetType: "all" | "client" | "package";
  targetId?: string; // clientId for 'client', package tier for 'package'
  title: string;
  body: string;
  type?: string; // notification type (default: 'custom')
  data?: Record<string, string>;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: "default" | null;
  badge?: number;
}

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

const log = {
  info: (msg: string, data?: object) =>
    console.log(`[ADMIN-NOTIFICATION] ${msg}`, data ? JSON.stringify(data) : ""),
  success: (msg: string, data?: object) =>
    console.log(`[ADMIN-NOTIFICATION] ✅ ${msg}`, data ? JSON.stringify(data) : ""),
  error: (msg: string, data?: object) =>
    console.error(`[ADMIN-NOTIFICATION] ❌ ${msg}`, data ? JSON.stringify(data) : ""),
};

/**
 * Send push notifications via Expo Push API
 */
async function sendExpoPushNotifications(
  messages: ExpoPushMessage[]
): Promise<ExpoPushTicket[]> {
  if (messages.length === 0) {
    return [];
  }

  // Expo recommends sending in batches of 100
  const BATCH_SIZE = 100;
  const tickets: ExpoPushTicket[] = [];

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);

    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error("Expo Push API error", {
        status: response.status,
        error: errorText,
      });
      throw new Error(`Expo Push API error: ${response.status}`);
    }

    const result = await response.json();
    tickets.push(...result.data);
  }

  return tickets;
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now();

  try {
    // Read request body
    const body = await readBody<SendNotificationRequest>(event);

    // Validate required fields
    if (!body.targetType) {
      throw createError({
        statusCode: 400,
        message: "targetType is required (all, client, or package)",
      });
    }

    if (!body.title || !body.body) {
      throw createError({
        statusCode: 400,
        message: "title and body are required",
      });
    }

    if (body.targetType !== "all" && !body.targetId) {
      throw createError({
        statusCode: 400,
        message: "targetId is required for client or package targeting",
      });
    }

    log.info("Sending notification", {
      targetType: body.targetType,
      targetId: body.targetId,
      title: body.title,
    });

    // Initialize Firestore
    const { app } = getFirebaseAdmin();
    const db = getFirestore(app);

    // Build query based on target type
    const clientsRef = db.collection("clients");
    let clientsQuery: FirebaseFirestore.Query;

    switch (body.targetType) {
      case "all":
        // Get all clients with push tokens
        clientsQuery = clientsRef.where("expoPushToken", "!=", null);
        break;

      case "client":
        // Get specific client
        clientsQuery = clientsRef
          .where("__name__", "==", body.targetId)
          .limit(1);
        break;

      case "package":
        // Get clients with specific package
        clientsQuery = clientsRef
          .where("currentPlan", "==", body.targetId)
          .where("expoPushToken", "!=", null);
        break;

      default:
        throw createError({
          statusCode: 400,
          message: "Invalid targetType",
        });
    }

    const clientsSnapshot = await clientsQuery.get();

    if (clientsSnapshot.empty) {
      log.info("No clients found for target", {
        targetType: body.targetType,
        targetId: body.targetId,
      });
      return {
        success: true,
        message: "No clients found with push tokens",
        sentCount: 0,
        failedCount: 0,
      };
    }

    // Collect push tokens and create notification records
    const messages: ExpoPushMessage[] = [];
    const notificationType = body.type || "custom";
    const batch = db.batch();
    const notificationsRef = db.collection("notifications");

    for (const clientDoc of clientsSnapshot.docs) {
      const clientData = clientDoc.data();
      const expoPushToken = clientData.expoPushToken;

      if (!expoPushToken || !expoPushToken.startsWith("ExponentPushToken[")) {
        continue;
      }

      // Add push message
      messages.push({
        to: expoPushToken,
        title: body.title,
        body: body.body,
        data: {
          ...body.data,
          type: notificationType,
        },
        sound: "default",
      });

      // Create notification record in Firestore
      const notificationDoc = notificationsRef.doc();
      batch.set(notificationDoc, {
        clientId: clientDoc.id,
        type: notificationType,
        title: body.title,
        body: body.body,
        data: body.data || {},
        createdAt: FieldValue.serverTimestamp(),
        readAt: null,
      });
    }

    if (messages.length === 0) {
      log.info("No valid push tokens found");
      return {
        success: true,
        message: "No valid push tokens found",
        sentCount: 0,
        failedCount: 0,
      };
    }

    // Send push notifications
    const tickets = await sendExpoPushNotifications(messages);

    // Count successes and failures
    let sentCount = 0;
    let failedCount = 0;

    for (const ticket of tickets) {
      if (ticket.status === "ok") {
        sentCount++;
      } else {
        failedCount++;
        log.error("Push notification failed", {
          error: ticket.message,
          details: ticket.details,
        });
      }
    }

    // Commit notification records to Firestore
    await batch.commit();

    const duration = Date.now() - startTime;
    log.success(`Notifications sent (${duration}ms)`, {
      targetType: body.targetType,
      targetId: body.targetId,
      sentCount,
      failedCount,
      totalTokens: messages.length,
    });

    return {
      success: true,
      message: `Notification sent to ${sentCount} devices`,
      sentCount,
      failedCount,
      totalTargeted: messages.length,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    log.error(`Failed (${duration}ms)`, { error: error.message });

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: error.message || "Failed to send notification",
    });
  }
});
