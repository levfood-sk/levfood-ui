/**
 * Resend Client Confirmation Email API Endpoint
 *
 * POST /api/orders/[orderId]/resend-email
 *
 * Manually resends the client confirmation email with invoice PDF attached.
 * Used when automatic email fails during the Stripe webhook flow.
 */

import { getFirestore } from 'firebase-admin/firestore'
import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { downloadInvoicePDF } from '~~/server/utils/superfaktura'
import { sendClientOrderConfirmation } from '~~/server/utils/email'
import type { Order, Client } from '~~/app/lib/types/order'

// Logging helper for consistent format
const log = {
  info: (msg: string, data?: object) => console.log(`[RESEND] ${msg}`, data ? JSON.stringify(data) : ''),
  success: (msg: string, data?: object) => console.log(`[RESEND] ✅ ${msg}`, data ? JSON.stringify(data) : ''),
  warn: (msg: string, data?: object) => console.warn(`[RESEND] ⚠️ ${msg}`, data ? JSON.stringify(data) : ''),
  error: (msg: string, data?: object) => console.error(`[RESEND] ❌ ${msg}`, data ? JSON.stringify(data) : ''),
}

export default defineEventHandler(async (event) => {
  const orderId = getRouterParam(event, 'orderId')
  const startTime = Date.now()

  log.info('=== MANUAL EMAIL RESEND STARTED ===', { orderId })

  if (!orderId) {
    log.error('Missing orderId parameter')
    throw createError({
      statusCode: 400,
      message: 'Order ID is required',
    })
  }

  try {
    const config = useRuntimeConfig()
    const { app } = getFirebaseAdmin()
    const db = getFirestore(app)

    // Find order by orderId
    log.info('Finding order...', { orderId })
    const ordersRef = db.collection('orders')
    const orderQuery = await ordersRef
      .where('orderId', '==', orderId)
      .limit(1)
      .get()

    if (orderQuery.empty) {
      log.error('Order not found', { orderId })
      throw createError({
        statusCode: 404,
        message: 'Objednávka nenájdená',
      })
    }

    const orderDoc = orderQuery.docs[0]
    const order = orderDoc.data() as Order
    log.success('Order found', { orderId, clientId: order.clientId, invoiceId: order.superfakturaInvoiceId })

    // Check if invoice exists
    if (!order.superfakturaInvoiceId) {
      log.error('No invoice exists for order', { orderId })
      throw createError({
        statusCode: 400,
        message: 'Faktúra pre túto objednávku neexistuje',
      })
    }

    // Get client data
    log.info('Loading client data...', { clientId: order.clientId })
    const clientDoc = await db.collection('clients').doc(order.clientId).get()

    if (!clientDoc.exists) {
      log.error('Client not found', { clientId: order.clientId })
      throw createError({
        statusCode: 404,
        message: 'Klient nenájdený',
      })
    }

    const client = clientDoc.data() as Client

    if (!client.email) {
      log.error('Client has no email', { clientId: order.clientId })
      throw createError({
        statusCode: 400,
        message: 'Klient nemá emailovú adresu',
      })
    }

    log.success('Client found', { email: client.email, fullName: client.fullName })

    // Configure Superfaktura
    const superfakturaConfig = {
      email: config.superfakturaEmail,
      apiKey: config.superfakturaApiKey,
      companyId: config.superfakturaCompanyId,
      isSandbox: config.superfakturaIsSandbox === 'true',
    }

    // Download invoice PDF
    log.info('Downloading invoice PDF...', {
      invoiceId: order.superfakturaInvoiceId,
      isSandbox: superfakturaConfig.isSandbox,
    })
    const invoicePdf = await downloadInvoicePDF(order.superfakturaInvoiceId, superfakturaConfig)

    if (!invoicePdf) {
      log.error('Failed to download invoice PDF', { invoiceId: order.superfakturaInvoiceId })
      throw createError({
        statusCode: 500,
        message: 'Nepodarilo sa stiahnuť faktúru',
      })
    }

    log.success('Invoice PDF downloaded', { size: invoicePdf.length })

    // Send confirmation email
    log.info('Sending email...', { to: client.email, orderId })
    const emailResult = await sendClientOrderConfirmation(client.email, {
      clientName: client.fullName || 'Zákazník',
      orderId: String(orderId),
      invoicePdf,
    })

    if (!emailResult.success) {
      log.error('Email sending failed', { to: client.email, error: emailResult.error })
      throw createError({
        statusCode: 500,
        message: emailResult.error || 'Nepodarilo sa odoslať email',
      })
    }

    // Update order to track email was sent successfully
    await orderDoc.ref.update({
      confirmationEmailSent: true,
      confirmationEmailSentAt: new Date(),
      confirmationEmailError: null, // Clear any previous error
      updatedAt: new Date(),
    })

    const duration = Date.now() - startTime
    log.success(`Email resent successfully in ${duration}ms`, {
      orderId,
      email: client.email,
      messageId: emailResult.messageId,
    })

    return {
      success: true,
      message: 'Email bol úspešne odoslaný',
      email: client.email,
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    log.error(`Resend failed after ${duration}ms`, {
      orderId,
      error: error.message,
      statusCode: error.statusCode,
    })

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Nepodarilo sa odoslať email',
    })
  }
})

