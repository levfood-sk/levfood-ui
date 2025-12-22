/**
 * Register Expo Push Token Endpoint
 *
 * POST /api/mobile/push-token
 *
 * Stores the user's Expo push token in Firestore for sending push notifications.
 * Links the token to the authenticated user's client record.
 */

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "~~/server/utils/firebase-admin";
import { requireAuth } from "~~/server/utils/auth";

interface PushTokenRequest {
  expoPushToken: string;
  platform: "ios" | "android";
}

const log = {
  info: (msg: string, data?: object) =>
    console.log(`[PUSH-TOKEN] ${msg}`, data ? JSON.stringify(data) : ""),
  success: (msg: string, data?: object) =>
    console.log(`[PUSH-TOKEN] ✅ ${msg}`, data ? JSON.stringify(data) : ""),
  error: (msg: string, data?: object) =>
    console.error(`[PUSH-TOKEN] ❌ ${msg}`, data ? JSON.stringify(data) : ""),
};

export default defineEventHandler(async (event) => {
  const startTime = Date.now();

  try {
    // Require authentication
    const user = requireAuth(event);
    const firebaseUid = user.uid;

    // Read and validate body
    const body = await readBody<PushTokenRequest>(event);

    if (!body.expoPushToken) {
      throw createError({
        statusCode: 400,
        message: "Expo push token is required",
      });
    }

    // Validate token format (Expo push tokens start with ExponentPushToken)
    if (!body.expoPushToken.startsWith("ExponentPushToken[")) {
      throw createError({
        statusCode: 400,
        message: "Invalid Expo push token format",
      });
    }

    log.info("Registering push token", {
      firebaseUid,
      platform: body.platform,
      tokenPrefix: body.expoPushToken.substring(0, 30) + "...",
    });

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
        message: "Client not found. Please link your account first.",
      });
    }

    const clientDoc = clientQuery.docs[0];
    const clientId = clientDoc.id;

    // Update client document with push token
    await clientDoc.ref.update({
      expoPushToken: body.expoPushToken,
      pushTokenPlatform: body.platform,
      pushTokenUpdatedAt: FieldValue.serverTimestamp(),
      notificationsEnabled: true,
    });

    const duration = Date.now() - startTime;
    log.success(`Push token registered (${duration}ms)`, {
      clientId,
      platform: body.platform,
    });

    return {
      success: true,
      message: "Push token registered successfully",
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    log.error(`Failed (${duration}ms)`, { error: error.message });

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: error.message || "Failed to register push token",
    });
  }
});
