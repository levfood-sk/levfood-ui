/**
 * Send Mobile Push Notification Endpoint
 *
 * POST /api/mobile/push-notification/send
 *
 * Creates notification documents for ALL linked clients (those with firebaseUid),
 * so all users see the notification in the app modal. Actual push notifications
 * are only sent to users with Expo push tokens and notifications enabled.
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
const EXPO_BATCH_SIZE = 100; // Expo allows up to 100 messages per request
const FIRESTORE_BATCH_LIMIT = 500; // Firestore batch write limit

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

    // Query all LINKED clients (those with firebaseUid - users who can access the mobile app)
    const clientsRef = db.collection("clients");
    const linkedClientsQuery = await clientsRef
      .where("firebaseUid", "!=", null)
      .get();

    if (linkedClientsQuery.empty) {
      return {
        success: true,
        message: "Žiadni prepojení používatelia",
        totalClients: 0,
        totalPushClients: 0,
        successCount: 0,
        failureCount: 0,
      };
    }

    const linkedClients = linkedClientsQuery.docs.map((doc) => ({
      id: doc.id,
      expoPushToken: doc.data().expoPushToken as string | null,
      notificationsEnabled: doc.data().notificationsEnabled as boolean | undefined,
    }));

    log.info(`Found ${linkedClients.length} linked clients`);

    // Create notification documents in Firestore for ALL linked clients
    // Handle batching (max 500 per Firestore batch)
    const notificationsRef = db.collection("notifications");
    const now = FieldValue.serverTimestamp();

    for (let i = 0; i < linkedClients.length; i += FIRESTORE_BATCH_LIMIT) {
      const batchClients = linkedClients.slice(i, i + FIRESTORE_BATCH_LIMIT);
      const batch = db.batch();

      for (const client of batchClients) {
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
    }

    log.success(`Created ${linkedClients.length} notification documents`);

    // Filter clients with valid push tokens for actual push delivery
    const clientsWithPush = linkedClients.filter(
      (c) => c.expoPushToken && c.notificationsEnabled === true
    );

    log.info(`${clientsWithPush.length} clients have push notifications enabled`);

    // Prepare Expo push messages only for clients with push enabled
    const pushMessages: ExpoPushMessage[] = clientsWithPush.map((client) => ({
      to: client.expoPushToken!,
      title: body.title.trim(),
      body: body.body.trim(),
      sound: "default",
      data: { type: "custom", sentBy: "admin" },
    }));

    // Send in batches (Expo allows max 100 per request)
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < pushMessages.length; i += EXPO_BATCH_SIZE) {
      const expoBatch = pushMessages.slice(i, i + EXPO_BATCH_SIZE);

      try {
        const response = await sendToExpoPushAPI(expoBatch);

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
        failureCount += expoBatch.length;
      }
    }

    const duration = Date.now() - startTime;
    log.success(`Push notifications sent (${duration}ms)`, {
      totalClients: linkedClients.length,
      totalPushClients: clientsWithPush.length,
      successCount,
      failureCount,
    });

    return {
      success: true,
      message: `Notifikácia vytvorená pre ${linkedClients.length} používateľov, push odoslaný ${successCount} zariadeniam`,
      totalClients: linkedClients.length,
      totalPushClients: clientsWithPush.length,
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
