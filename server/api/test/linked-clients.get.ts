/**
 * Get Linked Clients for Testing
 *
 * GET /api/test/linked-clients
 *
 * Returns all clients that have linked their mobile app (have firebaseUid set).
 * Used for testing notification delivery to specific users.
 */

import { getFirestore } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "~~/server/utils/firebase-admin";

interface LinkedClient {
  id: string;
  name: string;
  email: string;
  hasExpoPushToken: boolean;
  notificationsEnabled: boolean;
}

export default defineEventHandler(async () => {
  const { app } = getFirebaseAdmin();
  const db = getFirestore(app);

  const clientsRef = db.collection("clients");
  const linkedClientsQuery = await clientsRef
    .where("firebaseUid", "!=", null)
    .get();

  const clients: LinkedClient[] = linkedClientsQuery.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: `${data.firstName || ""} ${data.lastName || ""}`.trim() || "Neznámy",
      email: data.email || "—",
      hasExpoPushToken: !!data.expoPushToken,
      notificationsEnabled: data.notificationsEnabled === true,
    };
  });

  return {
    clients,
    total: clients.length,
  };
});
