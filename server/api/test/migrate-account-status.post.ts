/**
 * Migrate Account Status API Endpoint
 *
 * POST /api/test/migrate-account-status
 *
 * Finds all clients with firebaseUid set but accountStatus not 'aktívny'
 * and updates them to 'aktívny'.
 *
 * Supports dry-run mode (default) to preview changes before applying.
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'

interface MigrateRequest {
  dryRun?: boolean
}

interface ClientToUpdate {
  clientId: string
  email: string
  previousStatus: string
}

interface MigrationError {
  clientId: string
  error: string
}

const log = {
  info: (msg: string, data?: object) =>
    console.log(`[MIGRATE-STATUS] ${msg}`, data ? JSON.stringify(data) : ''),
  success: (msg: string, data?: object) =>
    console.log(`[MIGRATE-STATUS] ✅ ${msg}`, data ? JSON.stringify(data) : ''),
  error: (msg: string, data?: object) =>
    console.error(`[MIGRATE-STATUS] ❌ ${msg}`, data ? JSON.stringify(data) : ''),
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()

  try {
    // Parse request body
    const body = await readBody<MigrateRequest>(event)
    const dryRun = body?.dryRun !== false // Default to true for safety

    log.info(`=== MIGRATION ${dryRun ? '(DRY RUN)' : ''} STARTED ===`)

    // Initialize Firestore
    const { app } = getFirebaseAdmin()
    const db = getFirestore(app)

    // Query all clients with firebaseUid set
    const clientsRef = db.collection('clients')
    const linkedClientsQuery = await clientsRef
      .where('firebaseUid', '!=', null)
      .get()

    log.info(`Found ${linkedClientsQuery.size} clients with firebaseUid`)

    const clientsToUpdate: ClientToUpdate[] = []
    const errors: MigrationError[] = []
    let updatedCount = 0

    // Filter clients needing update
    for (const doc of linkedClientsQuery.docs) {
      const data = doc.data()

      // Check if accountStatus is not 'aktívny'
      if (data.accountStatus !== 'aktívny') {
        clientsToUpdate.push({
          clientId: doc.id,
          email: data.email || 'unknown',
          previousStatus: data.accountStatus || 'undefined',
        })
      }
    }

    log.info(`Found ${clientsToUpdate.length} clients needing update`)

    // Perform updates (if not dry run)
    if (!dryRun && clientsToUpdate.length > 0) {
      // Use batched writes for efficiency (Firestore limit: 500 per batch)
      const BATCH_SIZE = 500

      for (let i = 0; i < clientsToUpdate.length; i += BATCH_SIZE) {
        const batch = db.batch()
        const batchClients = clientsToUpdate.slice(i, i + BATCH_SIZE)

        for (const client of batchClients) {
          const clientRef = clientsRef.doc(client.clientId)
          batch.update(clientRef, {
            accountStatus: 'aktívny',
            updatedAt: Timestamp.now(),
          })
        }

        try {
          await batch.commit()
          updatedCount += batchClients.length
          log.success(
            `Batch ${Math.floor(i / BATCH_SIZE) + 1} committed (${batchClients.length} clients)`
          )
        } catch (error: any) {
          log.error(`Batch commit failed`, { error: error.message })
          // Add errors for all clients in the failed batch
          for (const client of batchClients) {
            errors.push({
              clientId: client.clientId,
              error: error.message,
            })
          }
        }
      }
    }

    const duration = Date.now() - startTime

    log.success(`Migration ${dryRun ? '(DRY RUN)' : ''} completed (${duration}ms)`, {
      totalChecked: linkedClientsQuery.size,
      needingUpdate: clientsToUpdate.length,
      updated: updatedCount,
      errors: errors.length,
    })

    return {
      success: true,
      dryRun,
      totalClientsChecked: linkedClientsQuery.size,
      clientsNeedingUpdate: clientsToUpdate.length,
      clientsUpdated: updatedCount,
      updatedClients: clientsToUpdate,
      errors,
      duration,
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    log.error(`Migration failed (${duration}ms)`, { error: error.message })

    throw createError({
      statusCode: 500,
      message: error.message || 'Migration failed',
    })
  }
})
