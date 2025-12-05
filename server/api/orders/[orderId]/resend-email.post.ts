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

export default defineEventHandler(async (event) => {
  const orderId = getRouterParam(event, 'orderId')

  if (!orderId) {
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
    const ordersRef = db.collection('orders')
    const orderQuery = await ordersRef
      .where('orderId', '==', orderId)
      .limit(1)
      .get()

    if (orderQuery.empty) {
      throw createError({
        statusCode: 404,
        message: 'Objednávka nenájdená',
      })
    }

    const orderDoc = orderQuery.docs[0]
    const order = orderDoc.data() as Order

    // Check if invoice exists
    if (!order.superfakturaInvoiceId) {
      throw createError({
        statusCode: 400,
        message: 'Faktúra pre túto objednávku neexistuje',
      })
    }

    // Get client data
    const clientDoc = await db.collection('clients').doc(order.clientId).get()

    if (!clientDoc.exists) {
      throw createError({
        statusCode: 404,
        message: 'Klient nenájdený',
      })
    }

    const client = clientDoc.data() as Client

    if (!client.email) {
      throw createError({
        statusCode: 400,
        message: 'Klient nemá emailovú adresu',
      })
    }

    // Configure Superfaktura
    const superfakturaConfig = {
      email: config.superfakturaEmail,
      apiKey: config.superfakturaApiKey,
      companyId: config.superfakturaCompanyId,
      isSandbox: config.superfakturaIsSandbox === 'true',
    }

    // Download invoice PDF
    console.log('📥 Downloading invoice PDF for resend:', {
      invoiceId: order.superfakturaInvoiceId,
      isSandbox: superfakturaConfig.isSandbox,
      hasApiKey: !!superfakturaConfig.apiKey,
    })
    const invoicePdf = await downloadInvoicePDF(order.superfakturaInvoiceId, superfakturaConfig)

    if (!invoicePdf) {
      console.error('❌ Failed to download invoice PDF')
      throw createError({
        statusCode: 500,
        message: 'Nepodarilo sa stiahnuť faktúru',
      })
    }

    // Send confirmation email
    console.log('📧 Resending client confirmation email to:', client.email)
    const emailResult = await sendClientOrderConfirmation(client.email, {
      clientName: client.fullName || 'Zákazník',
      orderId: String(orderId),
      invoicePdf,
    })

    if (!emailResult.success) {
      console.error('❌ Failed to send email:', emailResult.error)
      throw createError({
        statusCode: 500,
        message: emailResult.error || 'Nepodarilo sa odoslať email',
      })
    }

    // Update order to track email was sent
    await orderDoc.ref.update({
      confirmationEmailSentAt: new Date(),
      updatedAt: new Date(),
    })

    console.log('✅ Client confirmation email resent successfully:', {
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
    console.error('Error resending confirmation email:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Nepodarilo sa odoslať email',
    })
  }
})


