/**
 * Get User Notifications Endpoint
 *
 * GET /api/mobile/notifications
 *
 * Returns the authenticated user's notifications sorted by creation date.
 */

import { getFirestore } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "~~/server/utils/firebase-admin";
import { requireAuth } from "~~/server/utils/auth";

interface NotificationDoc {
  id: string;
  clientId: string;
  type: string;
  title: string;
  body: string;
  createdAt: FirebaseFirestore.Timestamp;
  readAt: FirebaseFirestore.Timestamp | null;
  data?: Record<string, string>;
}

const log = {
  info: (msg: string, data?: object) =>
    console.log(`[NOTIFICATIONS] ${msg}`, data ? JSON.stringify(data) : ""),
  success: (msg: string, data?: object) =>
    console.log(`[NOTIFICATIONS] ✅ ${msg}`, data ? JSON.stringify(data) : ""),
};

export default defineEventHandler(async (event) => {
  const startTime = Date.now();

  try {
    // Require authentication
    const user = requireAuth(event);
    const firebaseUid = user.uid;

    log.info("Fetching notifications", { firebaseUid });

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
      // Return empty list if no client linked
      return {
        notifications: [],
        unreadCount: 0,
      };
    }

    const clientId = clientQuery.docs[0].id;

    // Fetch notifications for this client
    const notificationsRef = db.collection("notifications");
    const notificationsQuery = await notificationsRef
      .where("clientId", "==", clientId)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    // Transform notifications
    const notifications = notificationsQuery.docs.map((doc) => {
      const data = doc.data() as NotificationDoc;
      return {
        id: doc.id,
        type: data.type,
        title: data.title,
        body: data.body,
        createdAt: data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
        readAt: data.readAt?.toDate()?.toISOString() || null,
        data: data.data || {},
      };
    });

    // Count unread
    const unreadCount = notifications.filter((n) => n.readAt === null).length;

    const duration = Date.now() - startTime;
    log.success(`Fetched notifications (${duration}ms)`, {
      clientId,
      count: notifications.length,
      unreadCount,
    });

    return {
      notifications,
      unreadCount,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    log.info(`Request failed (${duration}ms)`, { error: error.message });

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: error.message || "Failed to fetch notifications",
    });
  }
});
