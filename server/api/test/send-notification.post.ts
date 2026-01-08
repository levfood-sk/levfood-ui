/**
 * Send Test Notification to Single User
 *
 * POST /api/test/send-notification
 *
 * Creates a notification document for a specific client and optionally sends push.
 * Used for testing notification delivery to specific users.
 */

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "~~/server/utils/firebase-admin";

interface SendTestNotificationRequest {
  clientId: string;
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

const EXPO_PUSH_API = "https://exp.host/--/api/v2/push/send";

export default defineEventHandler(async (event) => {
  const body = await readBody<SendTestNotificationRequest>(event);

  if (!body.clientId?.trim()) {
    throw createError({
      statusCode: 400,
      message: "Client ID je povinný",
    });
  }

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

  const { app } = getFirebaseAdmin();
  const db = getFirestore(app);

  // Get client data
  const clientRef = db.collection("clients").doc(body.clientId);
  const clientDoc = await clientRef.get();

  if (!clientDoc.exists) {
    throw createError({
      statusCode: 404,
      message: "Klient nebol nájdený",
    });
  }

  const clientData = clientDoc.data()!;
  const expoPushToken = clientData.expoPushToken as string | null;
  const notificationsEnabled = clientData.notificationsEnabled === true;

  // Create notification document in Firestore
  const notificationsRef = db.collection("notifications");
  const notificationDoc = notificationsRef.doc();

  await notificationDoc.set({
    clientId: body.clientId,
    type: "custom",
    title: body.title.trim(),
    body: body.body.trim(),
    createdAt: FieldValue.serverTimestamp(),
    readAt: null,
    data: { sentBy: "admin-test" },
  });

  let pushSent = false;
  let pushError: string | null = null;

  // Try to send push notification if enabled
  if (expoPushToken && notificationsEnabled) {
    try {
      const pushMessage: ExpoPushMessage = {
        to: expoPushToken,
        title: body.title.trim(),
        body: body.body.trim(),
        sound: "default",
        data: { type: "custom", sentBy: "admin-test" },
      };

      const response = await fetch(EXPO_PUSH_API, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify([pushMessage]),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("[TEST-PUSH] Expo API response:", JSON.stringify(result, null, 2));
        pushSent = result.data?.[0]?.status === "ok";
        if (!pushSent) {
          pushError = result.data?.[0]?.message || result.data?.[0]?.details?.error || "Push delivery failed";
        }
      } else {
        const errorText = await response.text();
        console.log("[TEST-PUSH] Expo API error:", response.status, errorText);
        pushError = `Expo API error: ${response.status}`;
      }
    } catch (error: any) {
      pushError = error.message;
    }
  }

  return {
    success: true,
    notificationId: notificationDoc.id,
    clientName: `${clientData.firstName || ""} ${clientData.lastName || ""}`.trim() || "Neznámy",
    inAppCreated: true,
    pushAttempted: !!(expoPushToken && notificationsEnabled),
    pushSent,
    pushError,
    clientHasPushEnabled: notificationsEnabled && !!expoPushToken,
  };
});
