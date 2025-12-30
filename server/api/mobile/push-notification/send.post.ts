/**
 * Send Mobile Push Notification Endpoint
 *
 * POST /api/mobile/push-notification/send
 *
 * Sends push notifications to all mobile app users with Expo push tokens.
 * Creates notification documents in Firestore and sends via Expo Push API.
 */

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "~~/server/utils/firebase-admin";

interface SendNotificationRequest {
  title: string;
  body: string;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  sound: "default";
  data: Record<string, string>;
}

interface ExpoPushResponse {
  data: Array<{
    status: "ok" | "error";
    id?: string;
    message?: string;
    details?: { error?: string };
  }>;
}

const log = {
  info: (msg: string, data?: object) =>
    console.log(`[PUSH-NOTIFICATION] ${msg}`, data ? JSON.stringify(data) : ""),
  success: (msg: string, data?: object) =>
    console.log(`[PUSH-NOTIFICATION] ✅ ${msg}`, data ? JSON.stringify(data) : ""),
  error: (msg: string, data?: object) =>
    console.error(`[PUSH-NOTIFICATION] ❌ ${msg}`, data ? JSON.stringify(data) : ""),
};

const EXPO_PUSH_API = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 100; // Expo allows up to 100 messages per request

/**
 * Send push notifications to Expo Push API
 */
async function sendToExpoPushAPI(messages: ExpoPushMessage[]): Promise<ExpoPushResponse> {
  const response = await fetch(EXPO_PUSH_API, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    throw new Error(`Expo Push API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now();

  try {
    // Read and validate body
    const body = await readBody<SendNotificationRequest>(event);

    if (!body.title?.trim()) {
      throw createError({
        statusCode: 400,
        message: "Názov notifikácie je povinný",
      });
    }

    if (!body.body?.trim()) {
      throw createError({
        statusCode: 400,
        message: "Text notifikácie je povinný",
      });
    }

    log.info("Sending mobile push notification", {
      title: body.title,
      bodyLength: body.body.length,
    });

    // Initialize Firestore
    const { app } = getFirebaseAdmin();
    const db = getFirestore(app);

    // Query all clients with Expo push tokens
    const clientsRef = db.collection("clients");
    const clientsWithTokens = await clientsRef
      .where("expoPushToken", "!=", null)
      .where("notificationsEnabled", "==", true)
      .get();

    if (clientsWithTokens.empty) {
      return {
        success: true,
        message: "Žiadni používatelia s povolenými notifikáciami",
        totalClients: 0,
        successCount: 0,
        failureCount: 0,
      };
    }

    const clients = clientsWithTokens.docs.map((doc) => ({
      id: doc.id,
      expoPushToken: doc.data().expoPushToken as string,
    }));

    log.info(`Found ${clients.length} clients with push tokens`);

    // Create notification documents in Firestore (batch write)
    const notificationsRef = db.collection("notifications");
    const batch = db.batch();
    const now = FieldValue.serverTimestamp();

    for (const client of clients) {
      const notificationDoc = notificationsRef.doc();
      batch.set(notificationDoc, {
        clientId: client.id,
        type: "custom",
        title: body.title.trim(),
        body: body.body.trim(),
        createdAt: now,
        readAt: null,
        data: { sentBy: "admin" },
      });
    }

    await batch.commit();
    log.success(`Created ${clients.length} notification documents`);

    // Prepare Expo push messages
    const pushMessages: ExpoPushMessage[] = clients.map((client) => ({
      to: client.expoPushToken,
      title: body.title.trim(),
      body: body.body.trim(),
      sound: "default",
      data: { type: "custom", sentBy: "admin" },
    }));

    // Send in batches (Expo allows max 100 per request)
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < pushMessages.length; i += BATCH_SIZE) {
      const batch = pushMessages.slice(i, i + BATCH_SIZE);

      try {
        const response = await sendToExpoPushAPI(batch);

        for (const result of response.data) {
          if (result.status === "ok") {
            successCount++;
          } else {
            failureCount++;
            log.error("Push failed for token", { error: result.message });
          }
        }
      } catch (error: any) {
        log.error("Batch send failed", { error: error.message, batchStart: i });
        failureCount += batch.length;
      }
    }

    const duration = Date.now() - startTime;
    log.success(`Push notifications sent (${duration}ms)`, {
      totalClients: clients.length,
      successCount,
      failureCount,
    });

    return {
      success: true,
      message: `Notifikácia odoslaná ${successCount} používateľom`,
      totalClients: clients.length,
      successCount,
      failureCount,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    log.error(`Failed (${duration}ms)`, { error: error.message });

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: error.message || "Nepodarilo sa odoslať notifikáciu",
    });
  }
});
