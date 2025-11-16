/**
 * Download Order Invoice PDF
 *
 * GET /api/orders/:orderId/invoice
 *
 * Downloads the Superfaktura invoice PDF for a specific order.
 * Requires the order to have a superfakturaInvoiceId stored.
 */

import { getFirestore } from 'firebase-admin/firestore'
import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { downloadInvoicePDF } from '~~/server/utils/superfaktura'

export default defineEventHandler(async (event) => {
  try {
    // Get order ID from route params
    const orderId = getRouterParam(event, 'orderId')

    if (!orderId) {
      throw createError({
        statusCode: 400,
        message: 'Order ID is required',
      })
    }

    // Initialize Firebase Admin
    const { app } = getFirebaseAdmin()
    const db = getFirestore(app)

    // Find order by orderId (6-digit ID)
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
    const order = orderDoc.data()

    // Check if invoice ID exists
    if (!order.superfakturaInvoiceId) {
      throw createError({
        statusCode: 404,
        message: 'Faktúra pre túto objednávku nebola vytvorená',
      })
    }

    // Configure Superfaktura
    const config = useRuntimeConfig()
    const superfakturaConfig = {
      email: config.superfakturaEmail,
      apiKey: config.superfakturaApiKey,
      companyId: config.superfakturaCompanyId,
      isSandbox: config.superfakturaIsSandbox === 'true',
    }

    // Validate Superfaktura configuration
    if (!superfakturaConfig.email || !superfakturaConfig.apiKey) {
      throw createError({
        statusCode: 500,
        message: 'Superfaktura nie je nakonfigurovaná',
      })
    }

    console.log('Downloading invoice PDF:', {
      orderId,
      invoiceId: order.superfakturaInvoiceId,
    })

    // Download invoice PDF from Superfaktura
    const pdfBuffer = await downloadInvoicePDF(
      order.superfakturaInvoiceId,
      superfakturaConfig
    )

    if (!pdfBuffer) {
      throw createError({
        statusCode: 500,
        message: 'Nepodarilo sa stiahnuť faktúru',
      })
    }

    console.log('Invoice PDF downloaded successfully:', {
      orderId,
      invoiceId: order.superfakturaInvoiceId,
      size: pdfBuffer.length,
    })

    // Set response headers for PDF download
    setHeader(event, 'Content-Type', 'application/pdf')
    setHeader(
      event,
      'Content-Disposition',
      `attachment; filename="faktura-${orderId}.pdf"`
    )
    setHeader(event, 'Content-Length', pdfBuffer.length.toString())

    // Return PDF buffer
    return pdfBuffer
  } catch (error: any) {
    console.error('Invoice download error:', error)

    // Handle specific error types
    if (error.statusCode) {
      throw error
    }

    // Generic error
    throw createError({
      statusCode: 500,
      message: error.message || 'Nepodarilo sa stiahnuť faktúru',
    })
  }
})
