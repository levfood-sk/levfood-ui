/**
 * Invoice Generation Debug Endpoint
 *
 * POST /api/test/invoice-debug
 *
 * Tests the complete invoice generation and email flow
 */

import { getFirestore } from 'firebase-admin/firestore'
import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { createInvoice, downloadInvoicePDF } from '~~/server/utils/superfaktura'
import { sendClientOrderConfirmation } from '~~/server/utils/email'
import type { CreateInvoiceRequest, InvoiceClient, InvoiceItem, InvoiceData } from '~~/server/utils/superfaktura'
import { ORIGINAL_PRICES, hasPackageDiscount } from '~~/app/lib/types/order'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { orderId, testEmail } = body

    if (!orderId) {
      throw createError({
        statusCode: 400,
        message: 'orderId is required',
      })
    }

    const config = useRuntimeConfig()
    const logs: string[] = []

    logs.push(`[1] Starting invoice debug for order: ${orderId}`)

    // Initialize Firebase
    const { app } = getFirebaseAdmin()
    const db = getFirestore(app)

    // Find order
    logs.push('[2] Searching for order in Firestore...')
    const ordersRef = db.collection('orders')
    const orderQuery = await ordersRef
      .where('orderId', '==', orderId)
      .limit(1)
      .get()

    if (orderQuery.empty) {
      logs.push(`[ERROR] Order not found: ${orderId}`)
      return { success: false, logs, error: 'Order not found' }
    }

    const orderDoc = orderQuery.docs[0]
    const order = orderDoc.data()
    logs.push(`[3] Order found: ${JSON.stringify(order, null, 2)}`)

    // Get client
    logs.push(`[4] Fetching client: ${order.clientId}`)
    const clientDoc = await db.collection('clients').doc(order.clientId).get()

    if (!clientDoc.exists) {
      logs.push('[ERROR] Client not found')
      return { success: false, logs, error: 'Client not found' }
    }

    const client = clientDoc.data()
    logs.push(`[5] Client found: ${JSON.stringify(client, null, 2)}`)

    // Configure Superfaktura
    const superfakturaConfig = {
      email: config.superfakturaEmail,
      apiKey: config.superfakturaApiKey,
      companyId: config.superfakturaCompanyId,
      isSandbox: config.superfakturaIsSandbox === 'true',
    }

    logs.push(`[6] Superfaktura config: ${JSON.stringify({
      email: superfakturaConfig.email,
      hasApiKey: !!superfakturaConfig.apiKey,
      companyId: superfakturaConfig.companyId,
      isSandbox: superfakturaConfig.isSandbox,
    })}`)

    if (!superfakturaConfig.email || !superfakturaConfig.apiKey) {
      logs.push('[ERROR] Superfaktura not configured')
      return { success: false, logs, error: 'Superfaktura not configured' }
    }

    // Build invoice data
    logs.push('[7] Building invoice request...')

    const invoiceClient: InvoiceClient = {
      name: client?.fullName || 'Customer',
      email: client?.email,
      phone: client?.phone,
      address: order.deliveryAddress,
    }

    // Calculate pricing with discount support (using single source of truth from order.ts)
    const hasDiscount = hasPackageDiscount(order.package)

    // Get the original price before discount (for invoice display)
    const originalPrice = ORIGINAL_PRICES[order.package]?.[order.duration] || order.totalPrice

    // Convert to euros
    const originalPriceEuros = originalPrice / 100
    const finalPriceEuros = order.totalPrice / 100

    // Calculate nominal discount amount (e.g., 359 - 323 = 36€)
    const discountAmount = hasDiscount ? originalPriceEuros - finalPriceEuros : 0

    const invoiceItem: InvoiceItem = {
      name: `LevFood ${order.package} balík`,
      description: `${order.daysCount} dní / Od: ${order.deliveryStartDate}${hasDiscount ? ' (Zľava 10%)' : ''}`,
      quantity: 1,
      unit: 'balík',
      unit_price: originalPriceEuros, // Original price before discount
      tax: 0, // No VAT - accountant will handle it
    }

    logs.push(`[7b] Pricing details: Package=${order.package}, HasDiscount=${hasDiscount}, OriginalPrice=${originalPriceEuros}€, DiscountAmount=${discountAmount}€, FinalPrice=${finalPriceEuros}€`)

    const now = new Date()
    const invoiceDate = now.toISOString().split('T')[0]

    const invoiceData: InvoiceData = {
      name: `Objednávka #${orderId}`,
      currency: 'EUR',
      variable: orderId,
      comment: `LevFood ${order.package} balík\nDoručenie: ${order.deliveryType}\nPoznámky: ${order.notes || 'Bez poznámok'}`,
      delivery: invoiceDate,
      due: invoiceDate,
      rounding: 'item_ext',
      discount_total: discountAmount, // Nominal discount on invoice level
    }

    const invoiceRequest: CreateInvoiceRequest = {
      Client: invoiceClient,
      Invoice: invoiceData,
      InvoiceItem: [invoiceItem],
    }

    logs.push(`[8] Invoice request: ${JSON.stringify(invoiceRequest, null, 2)}`)

    // Create invoice
    logs.push('[9] Creating invoice in Superfaktura...')
    const invoiceResult = await createInvoice(invoiceRequest, superfakturaConfig)

    logs.push(`[10] Invoice result: ${JSON.stringify(invoiceResult, null, 2)}`)

    if (invoiceResult.error) {
      logs.push(`[ERROR] Invoice creation failed: ${invoiceResult.error_message}`)
      return { success: false, logs, error: invoiceResult.error_message, result: invoiceResult }
    }

    const invoiceId = invoiceResult.data?.Invoice?.id
    const invoiceNumber = invoiceResult.data?.Invoice?.invoice_no_formatted

    logs.push(`[11] Invoice created successfully! ID: ${invoiceId}, Number: ${invoiceNumber}`)

    // Download PDF
    logs.push('[12] Downloading invoice PDF...')
    const invoicePdf = await downloadInvoicePDF(invoiceId, superfakturaConfig)

    if (!invoicePdf) {
      logs.push('[ERROR] Failed to download PDF')
      return { success: false, logs, error: 'Failed to download PDF', invoiceId, invoiceNumber }
    }

    logs.push(`[13] PDF downloaded successfully! Size: ${invoicePdf.length} bytes`)

    // Send email
    const emailTo = testEmail || client?.email
    logs.push(`[14] Sending email to: ${emailTo}`)

    const emailResult = await sendClientOrderConfirmation(emailTo, {
      clientName: client?.fullName || 'Zákazník',
      orderId: String(orderId),
      invoicePdf,
    })

    logs.push(`[15] Email result: ${JSON.stringify(emailResult, null, 2)}`)

    if (!emailResult.success) {
      logs.push(`[ERROR] Email failed: ${emailResult.error}`)
      return {
        success: false,
        logs,
        error: 'Email failed',
        invoiceId,
        invoiceNumber,
        emailError: emailResult.error,
      }
    }

    logs.push('[16] ✅ SUCCESS! Invoice created and email sent.')

    return {
      success: true,
      logs,
      invoiceId,
      invoiceNumber,
      pdfSize: invoicePdf.length,
      emailSent: true,
      messageId: emailResult.messageId,
    }
  } catch (error: any) {
    console.error('Invoice debug error:', error)
    return {
      success: false,
      error: error.message,
      stack: error.stack,
    }
  }
})
