/**
 * Custom Invoice API Endpoint (Testing Feature)
 *
 * POST /api/orders/custom-invoice
 *
 * Creates a SuperFaktura invoice with a custom price and sends it to the client.
 * Used for special one-time pricing deals.
 */

import { getFirestore } from 'firebase-admin/firestore'
import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { createInvoice, downloadInvoicePDF } from '~~/server/utils/superfaktura'
import { sendClientOrderConfirmation } from '~~/server/utils/email'
import { z } from 'zod'
import type { Order, Client } from '~~/app/lib/types/order'

const log = {
  info: (msg: string, data?: object) => console.log(`[CUSTOM-INVOICE] ${msg}`, data ? JSON.stringify(data) : ''),
  success: (msg: string, data?: object) => console.log(`[CUSTOM-INVOICE] ✅ ${msg}`, data ? JSON.stringify(data) : ''),
  error: (msg: string, data?: object) => console.error(`[CUSTOM-INVOICE] ❌ ${msg}`, data ? JSON.stringify(data) : ''),
}

const inputSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  customPrice: z.number().positive('Price must be positive'), // In cents
})

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  log.info('=== CUSTOM INVOICE STARTED ===')

  try {
    const body = await readBody(event)
    const { orderId, customPrice } = inputSchema.parse(body)

    log.info('Request validated', { orderId, customPrice })

    const config = useRuntimeConfig()
    const { app } = getFirebaseAdmin()
    const db = getFirestore(app)

    // Step 1: Find order
    const ordersRef = db.collection('orders')
    const orderQuery = await ordersRef.where('orderId', '==', orderId).limit(1).get()

    if (orderQuery.empty) {
      throw createError({ statusCode: 404, message: 'Objednávka nenájdená' })
    }

    const orderDoc = orderQuery.docs[0]
    const order = orderDoc.data() as Order
    log.success('Order found', { orderId, clientId: order.clientId })

    // Step 2: Get client data
    const clientDoc = await db.collection('clients').doc(order.clientId).get()
    if (!clientDoc.exists) {
      throw createError({ statusCode: 404, message: 'Klient nenájdený' })
    }

    const client = clientDoc.data() as Client
    if (!client.email) {
      throw createError({ statusCode: 400, message: 'Klient nemá email' })
    }
    log.success('Client found', { email: client.email })

    // Step 3: Create invoice in SuperFaktura with custom price
    const superfakturaConfig = {
      email: config.superfakturaEmail,
      apiKey: config.superfakturaApiKey,
      companyId: config.superfakturaCompanyId,
      isSandbox: config.superfakturaIsSandbox === 'true',
    }

    const priceInEur = customPrice / 100
    const today = new Date().toISOString().split('T')[0]

    const invoiceData = {
      Client: {
        name: client.fullName,
        email: client.email,
        phone: client.phone,
        address: order.deliveryAddress,
      },
      InvoiceItem: [{
        name: `LevFood ${order.package} balík (špeciálna cena)`,
        description: `${order.daysCount} dní / Od: ${order.deliveryStartDate}`,
        quantity: 1,
        unit: 'balík',
        unit_price: priceInEur,
        tax: 0,
      }],
      Invoice: {
        name: `Objednávka #${orderId} (špeciálna cena)`,
        currency: 'EUR',
        variable: orderId,
        comment: `LevFood ${order.package} balík - špeciálna cena`,
        delivery: today,
        due: today,
        rounding: 'item_ext',
      },
    }

    log.info('Creating invoice in SuperFaktura...', { priceInEur })
    const invoiceResult = await createInvoice(invoiceData, superfakturaConfig)

    if (invoiceResult.error || !invoiceResult.data?.Invoice?.id) {
      log.error('Failed to create invoice', invoiceResult)
      throw createError({ statusCode: 500, message: invoiceResult.error_message || 'Nepodarilo sa vytvoriť faktúru' })
    }

    const invoiceId = invoiceResult.data.Invoice.id
    log.success('Invoice created', { invoiceId })

    // Step 4: Download invoice PDF
    log.info('Downloading invoice PDF...')
    const invoicePdf = await downloadInvoicePDF(invoiceId, superfakturaConfig)

    if (!invoicePdf) {
      log.error('Failed to download invoice PDF')
      throw createError({ statusCode: 500, message: 'Nepodarilo sa stiahnuť faktúru' })
    }
    log.success('Invoice PDF downloaded', { size: invoicePdf.length })

    // Step 5: Send email with invoice
    log.info('Sending email...', { to: client.email })
    const emailResult = await sendClientOrderConfirmation(client.email, {
      clientName: client.fullName || 'Zákazník',
      orderId,
      invoicePdf,
    })

    if (!emailResult.success) {
      log.error('Failed to send email', { error: emailResult.error })
      throw createError({ statusCode: 500, message: 'Nepodarilo sa odoslať email' })
    }

    const duration = Date.now() - startTime
    log.success(`Custom invoice completed in ${duration}ms`, {
      orderId,
      invoiceId,
      priceInEur,
      email: client.email,
    })

    return {
      success: true,
      message: 'Faktúra bola vytvorená a email odoslaný',
      invoiceId,
      customPrice: priceInEur,
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    log.error(`Custom invoice FAILED after ${duration}ms`, {
      error: error.message,
      statusCode: error.statusCode,
    })

    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      message: error.message || 'Nepodarilo sa vytvoriť faktúru',
    })
  }
})
