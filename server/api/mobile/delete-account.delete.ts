/**
 * Delete Mobile User Account API Endpoint
 *
 * DELETE /api/mobile/delete-account
 *
 * Permanently deletes the authenticated user's account:
 * 1. Anonymizes the linked client record (name, email, phone)
 * 2. Removes the Firebase UID link from the client
 * 3. Deletes any push notification tokens
 * 4. Deletes the Firebase Auth account
 *
 * Required for App Store / Play Store compliance.
 */

import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "~~/server/utils/firebase-admin";
import { requireAuth } from "~~/server/utils/auth";
import type { Client } from "~~/app/lib/types/order";

// Logging helper for consistent format
const log = {
  info: (msg: string, data?: object) =>
    console.log(`[DELETE-ACCOUNT] ${msg}`, data ? JSON.stringify(data) : ""),
  success: (msg: string, data?: object) =>
    console.log(`[DELETE-ACCOUNT] ✅ ${msg}`, data ? JSON.stringify(data) : ""),
  error: (msg: string, data?: object) =>
    console.error(`[DELETE-ACCOUNT] ❌ ${msg}`, data ? JSON.stringify(data) : ""),
};

export default defineEventHandler(async (event) => {
  const startTime = Date.now();

  try {
    // Require authentication
    const user = requireAuth(event);
    const firebaseUid = user.uid;

    log.info("Starting account deletion", { firebaseUid });

    // Initialize Firebase Admin
    const { app, auth } = getFirebaseAdmin();
    const db = getFirestore(app);

    // Find client by firebaseUid
    const clientsRef = db.collection("clients");
    const clientQuery = await clientsRef
      .where("firebaseUid", "==", firebaseUid)
      .limit(1)
      .get();

    if (!clientQuery.empty) {
      const clientDoc = clientQuery.docs[0];
      const client = clientDoc.data() as Client;
      const clientId = clientDoc.id;

      log.info("Found linked client, anonymizing", { clientId, email: client.email });

      // Anonymize client data - keep order history but remove personal info
      await clientDoc.ref.update({
        // Anonymize name
        firstName: "Odstránený",
        lastName: "používateľ",
        fullName: "Odstránený používateľ",
        // Clear contact info
        email: "",
        phone: "",
        // Remove Firebase link
        firebaseUid: FieldValue.delete(),
        // Set as inactive
        accountStatus: "neaktívny",
        // Clear personal health/preference data
        birthDate: FieldValue.delete(),
        height: FieldValue.delete(),
        weight: FieldValue.delete(),
        physicalActivity: FieldValue.delete(),
        workActivity: FieldValue.delete(),
        stressLevel: FieldValue.delete(),
        goal: FieldValue.delete(),
        dietaryRequirements: FieldValue.delete(),
        // Update timestamp
        updatedAt: Timestamp.now(),
      });

      log.info("Client anonymized", { clientId });

      // Delete push notification tokens for this client
      try {
        const tokensRef = db.collection("push-tokens");
        const tokensQuery = await tokensRef
          .where("clientId", "==", clientId)
          .get();

        if (!tokensQuery.empty) {
          const batch = db.batch();
          tokensQuery.docs.forEach((doc) => batch.delete(doc.ref));
          await batch.commit();
          log.info("Push tokens deleted", { count: tokensQuery.size });
        }
      } catch (tokenError: any) {
        // Non-critical - push tokens collection may not exist
        log.info("Push tokens cleanup skipped", { error: tokenError.message });
      }
    } else {
      log.info("No linked client found, proceeding with auth deletion only");
    }

    // Delete Firebase Auth account
    await auth.deleteUser(firebaseUid);
    log.success("Firebase Auth account deleted", { firebaseUid });

    const duration = Date.now() - startTime;
    log.success(`Account deletion completed (${duration}ms)`);

    return {
      success: true,
      message: "Účet bol úspešne odstránený",
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    log.error(`Account deletion failed (${duration}ms)`, { error: error.message });

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: error.message || "Nepodarilo sa odstrániť účet",
    });
  }
});
