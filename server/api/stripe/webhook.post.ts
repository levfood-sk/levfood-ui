/**
 * Stripe Webhook Endpoint
 *
 * Receives and processes webhook events from Stripe.
 * Handles automatic invoice generation and client notification after successful payment.
 *
 * POST /api/stripe/webhook
 *
 * FLOW:
 * 1. Stripe payment succeeds → webhook fires
 * 2. Retrieve order from Firestore using payment intent ID
 * 3. Create invoice in Superfaktura with 10% discount for ŠTANDARD/PREMIUM
 * 4. Download invoice PDF from Superfaktura
 * 5. Send client confirmation email with PDF attachment
 * 6. Store invoice ID in order document
 *
 * Setup instructions:
 * 1. Go to Stripe Dashboard > Developers > Webhooks
 * 2. Add endpoint: https://yourdomain.com/api/stripe/webhook
 * 3. Select events: payment_intent.succeeded, payment_intent.payment_failed
 * 4. Copy webhook signing secret to STRIPE_WEBHOOK_SECRET env variable
 *
 * For local testing:
 * 1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
 * 2. Run: stripe listen --forward-to localhost:3000/api/stripe/webhook
 * 3. Copy webhook signing secret from CLI output
 *
 * Security: Always verify webhook signatures
 */

import { useServerStripe } from '#stripe/server'
import { getFirestore } from 'firebase-admin/firestore'
import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { createInvoice, downloadInvoicePDF } from '~~/server/utils/superfaktura'
import { sendClientOrderConfirmation } from '~~/server/utils/email'
import type { CreateInvoiceRequest, InvoiceClient, InvoiceItem, InvoiceData } from '~~/server/utils/superfaktura'
import type { Order } from '~~/app/lib/types/order'

// Logging helper for consistent format
const log = {
  info: (msg: string, data?: object) => console.log(`[WEBHOOK] ${msg}`, data ? JSON.stringify(data) : ''),
  success: (msg: string, data?: object) => console.log(`[WEBHOOK] ✅ ${msg}`, data ? JSON.stringify(data) : ''),
  warn: (msg: string, data?: object) => console.warn(`[WEBHOOK] ⚠️ ${msg}`, data ? JSON.stringify(data) : ''),
  error: (msg: string, data?: object) => console.error(`[WEBHOOK] ❌ ${msg}`, data ? JSON.stringify(data) : ''),
  step: (step: string) => console.log(`[WEBHOOK] 📍 STEP: ${step}`),
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  log.info('=== WEBHOOK REQUEST STARTED ===')

  try {
    // Get raw body (required for signature verification)
    const body = await readRawBody(event)

    if (!body) {
      throw createError({
        statusCode: 400,
        message: 'No body provided',
      })
    }

    // Get Stripe signature from headers
    const signature = getHeader(event, 'stripe-signature')

    if (!signature) {
      throw createError({
        statusCode: 400,
        message: 'No signature provided',
      })
    }

    // Get webhook secret from environment
    const config = useRuntimeConfig()
    const webhookSecret = config.stripeWebhookSecret

    if (!webhookSecret) {
      log.error('STRIPE_WEBHOOK_SECRET is not configured')
      throw createError({
        statusCode: 500,
        message: 'Webhook secret not configured',
      })
    }

    // Get Stripe instance
    const stripe = await useServerStripe(event)

    // Verify webhook signature and construct event
    log.step('Verifying webhook signature')
    let stripeEvent
    try {
      stripeEvent = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      )
    } catch (err: any) {
      log.error('Webhook signature verification failed', { error: err.message })
      throw createError({
        statusCode: 400,
        message: `Webhook Error: ${err.message}`,
      })
    }

    log.success('Webhook signature verified', {
      type: stripeEvent.type,
      id: stripeEvent.id,
      timestamp: new Date(stripeEvent.created * 1000).toISOString(),
    })

    // Handle different event types
    switch (stripeEvent.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = stripeEvent.data.object
        log.info('=== PAYMENT_INTENT.SUCCEEDED ===', {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        })

        // Track processing result for summary
        const result: Record<string, any> = {
          paymentIntentId: paymentIntent.id,
          orderFound: false,
          invoiceCreated: false,
          pdfDownloaded: false,
          emailSent: false,
        }

        // Create Superfaktura invoice and send to client
        try {
          // Initialize Firebase Admin
          log.step('1. Finding order in Firestore')
          const { app } = getFirebaseAdmin()
          const db = getFirestore(app)

          // Find the order associated with this payment intent
          // Retry up to 3 times with 2-second delays to handle race condition
          const ordersRef = db.collection('orders')
          let orderQuery = await ordersRef
            .where('stripePaymentIntentId', '==', paymentIntent.id)
            .limit(1)
            .get()

          let retries = 0
          const maxRetries = 3

          while (orderQuery.empty && retries < maxRetries) {
            log.warn(`Order not found, retrying in 2s (attempt ${retries + 1}/${maxRetries})`, { paymentIntentId: paymentIntent.id })
            await new Promise(resolve => setTimeout(resolve, 2000))

            orderQuery = await ordersRef
              .where('stripePaymentIntentId', '==', paymentIntent.id)
              .limit(1)
              .get()

            retries++
          }

          if (orderQuery.empty) {
            log.error('ORDER NOT FOUND after all retries - EMAIL WILL NOT BE SENT', {
              paymentIntentId: paymentIntent.id,
              retriesAttempted: maxRetries,
            })
            result.error = 'Order not found'
            break
          }

          const orderDoc = orderQuery.docs[0]
          const order = orderDoc.data() as Order
          const orderId = order.orderId
          result.orderFound = true
          result.orderId = orderId

          log.success('Order found', {
            orderId,
            package: order.package,
            totalPrice: order.totalPrice,
            clientId: order.clientId,
          })

          // Idempotency check - prevent duplicate invoices from webhook retries
          if (order.superfakturaInvoiceId) {
            log.warn('Invoice already exists - skipping (idempotency check)', {
              orderId,
              existingInvoiceId: order.superfakturaInvoiceId,
            })
            result.invoiceCreated = true
            result.skippedReason = 'Invoice already exists'
            break
          }

          // Get client data
          log.step('2. Loading client data')
          const clientDoc = await db.collection('clients').doc(order.clientId).get()
          if (!clientDoc.exists) {
            log.error('CLIENT NOT FOUND - EMAIL WILL NOT BE SENT', { orderId, clientId: order.clientId })
            result.error = 'Client not found'
            break
          }

          const client = clientDoc.data()
          result.clientEmail = client?.email

          log.success('Client found', {
            email: client?.email,
            fullName: client?.fullName,
          })

          // Configure Superfaktura
          log.step('3. Creating Superfaktura invoice')
          const superfakturaConfig = {
            email: config.superfakturaEmail,
            apiKey: config.superfakturaApiKey,
            companyId: config.superfakturaCompanyId,
            isSandbox: config.superfakturaIsSandbox === 'true',
          }

          log.info('Superfaktura config check', {
            hasEmail: !!superfakturaConfig.email,
            hasApiKey: !!superfakturaConfig.apiKey,
            companyId: superfakturaConfig.companyId,
            isSandbox: superfakturaConfig.isSandbox,
          })

          // Only create invoice if Superfaktura is configured
          if (!superfakturaConfig.email || !superfakturaConfig.apiKey) {
            log.error('SUPERFAKTURA NOT CONFIGURED - INVOICE WILL NOT BE CREATED', { orderId })
            result.error = 'Superfaktura not configured'
            break
          }

          // Build invoice client data
          const invoiceClient: InvoiceClient = {
            name: client?.fullName || 'Customer',
            email: client?.email,
            phone: client?.phone,
            address: order.deliveryAddress,
          }

          // Calculate pricing with discount support
          // Original prices BEFORE 10% discount - Superfaktura applies discount to get final price
          // ŠTANDARD/PREMIUM: original price → 10% off → final price (rounded)
          const originalPrices: Record<string, Record<string, number>> = {
            'EKONOMY': { '5': 29900, '6': 33900 },
            'ŠTANDARD': { '5': 35900, '6': 39900 }, // 359→323, 399→359 after 10%
            'PREMIUM': { '5': 41900, '6': 45900 },  // 419→377, 459→413 after 10%
            'OFFICE': { '5': 24900, '6': 24900 },
          }

          // Check if package has discount (ŠTANDARD or PREMIUM)
          const hasDiscount = order.package === 'ŠTANDARD' || order.package === 'PREMIUM'

          // Get the exact original price before discount
          const originalPrice = hasDiscount
            ? (originalPrices[order.package]?.[order.duration] || order.totalPrice)
            : order.totalPrice

          // Convert to euros
          const originalPriceEuros = originalPrice / 100
          const finalPriceEuros = order.totalPrice / 100

          // Calculate nominal discount amount (e.g., 359 - 323 = 36€)
          const discountAmount = hasDiscount ? originalPriceEuros - finalPriceEuros : 0

          // Build invoice item - use original price, discount will be on invoice level
          const invoiceItem: InvoiceItem = {
            name: `LevFood ${order.package} balík`,
            description: `${order.daysCount} dní / Od: ${order.deliveryStartDate}${hasDiscount ? ' (Zľava 10%)' : ''}`,
            quantity: 1,
            unit: 'balík',
            unit_price: originalPriceEuros, // Original price before discount
            tax: 0,
          }

          log.info('Invoice pricing calculated', {
            package: order.package,
            hasDiscount,
            originalPrice: `${originalPriceEuros}€`,
            discountAmount: `${discountAmount}€`,
            finalPrice: `${finalPriceEuros}€`,
          })

          // Get current date for invoice
          const now = new Date()
          const invoiceDate = now.toISOString().split('T')[0] // YYYY-MM-DD format

          // Build invoice data - mark as already paid, with discount on invoice level
          const invoiceData: InvoiceData = {
            name: `Objednávka #${orderId}`,
            currency: 'EUR',
            variable: orderId, // Use order ID as variable symbol
            comment: `LevFood ${order.package} balík\nDoručenie: ${order.deliveryType}\nPoznámky: ${order.notes || 'Bez poznámok'}`,
            delivery: invoiceDate, // Set delivery date to today
            due: invoiceDate, // Set due date to today (already paid)
            rounding: 'item_ext',
            discount_total: discountAmount, // Nominal discount (e.g., 36€) on invoice level
          }

          // Create invoice request
          const invoiceRequest: CreateInvoiceRequest = {
            Client: invoiceClient,
            Invoice: invoiceData,
            InvoiceItem: [invoiceItem],
          }

          // Create invoice in Superfaktura
          log.info('Calling Superfaktura API to create invoice...')
          const invoiceResult = await createInvoice(invoiceRequest, superfakturaConfig)

          if (invoiceResult.error) {
            log.error('SUPERFAKTURA INVOICE CREATION FAILED', {
              orderId,
              error: invoiceResult.error,
              message: invoiceResult.error_message,
              responseData: JSON.stringify(invoiceResult.data),
            })
            result.error = `Superfaktura error: ${invoiceResult.error_message}`
            break
          }

          const invoiceId = invoiceResult.data?.Invoice?.id
          const invoiceNumber = invoiceResult.data?.Invoice?.invoice_no_formatted
          result.invoiceCreated = true
          result.invoiceId = invoiceId

          log.success('Superfaktura invoice created', { invoiceId, invoiceNumber, orderId })

          // Store invoice ID in order document for reference
          await orderDoc.ref.update({
            superfakturaInvoiceId: invoiceId,
            superfakturaInvoiceNumber: invoiceNumber,
            updatedAt: new Date(),
          })

          // Download invoice PDF
          log.step('4. Downloading invoice PDF')
          const invoicePdf = await downloadInvoicePDF(invoiceId, superfakturaConfig)

          if (!invoicePdf) {
            log.error('PDF DOWNLOAD FAILED - Email will be sent without attachment', { invoiceId, orderId })
            result.pdfDownloaded = false
          } else {
            log.success('Invoice PDF downloaded', { invoiceId, pdfSize: invoicePdf.length })
            result.pdfDownloaded = true
          }

          // Send client order confirmation email with invoice PDF attached
          log.step('5. Sending client confirmation email')
          if (client?.email) {
            try {
              log.info('Attempting to send email', { to: client.email, orderId, hasInvoice: !!invoicePdf })

              const emailResult = await sendClientOrderConfirmation(client.email, {
                clientName: client.fullName || 'Zákazník',
                orderId: String(orderId),
                invoicePdf: invoicePdf || undefined,
              })

              if (emailResult.success) {
                log.success('EMAIL SENT SUCCESSFULLY', {
                  to: client.email,
                  orderId,
                  hasInvoice: !!invoicePdf,
                  messageId: emailResult.messageId,
                })
                result.emailSent = true
                result.emailMessageId = emailResult.messageId

                // Mark email as sent on the order
                await orderDoc.ref.update({
                  confirmationEmailSent: true,
                  confirmationEmailSentAt: new Date(),
                })
              } else {
                log.error('EMAIL SENDING FAILED - Check SMTP configuration', {
                  to: client.email,
                  orderId,
                  error: emailResult.error,
                })
                result.emailSent = false
                result.emailError = emailResult.error

                // Mark email as failed on the order for admin visibility
                await orderDoc.ref.update({
                  confirmationEmailSent: false,
                  confirmationEmailError: emailResult.error || 'Unknown error',
                })
              }
            } catch (emailError: any) {
              log.error('EMAIL EXCEPTION', {
                to: client.email,
                orderId,
                error: emailError.message,
                stack: emailError.stack,
              })
              result.emailSent = false
              result.emailError = emailError.message

              // Mark email as failed on the order
              await orderDoc.ref.update({
                confirmationEmailSent: false,
                confirmationEmailError: emailError.message,
              })
            }
          } else {
            log.warn('NO CLIENT EMAIL - Cannot send confirmation', { orderId, clientId: order.clientId })
            result.emailSent = false
            result.emailError = 'No client email'
          }

          // Log final summary
          log.info('=== PROCESSING COMPLETE ===', result)
        } catch (invoiceError: any) {
          log.error('INVOICE GENERATION EXCEPTION', {
            error: invoiceError.message,
            stack: invoiceError.stack,
          })
          // Don't fail the webhook if invoice creation fails
        }

        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = stripeEvent.data.object
        log.warn('PAYMENT FAILED', {
          paymentIntentId: paymentIntent.id,
          error: paymentIntent.last_payment_error?.message,
          code: paymentIntent.last_payment_error?.code,
        })
        break
      }

      case 'payment_intent.created': {
        const paymentIntent = stripeEvent.data.object
        log.info('Payment intent created', {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          status: paymentIntent.status,
        })
        break
      }

      case 'charge.succeeded': {
        const charge = stripeEvent.data.object
        log.info('Charge succeeded', {
          chargeId: charge.id,
          amount: charge.amount,
        })
        break
      }

      default:
        log.info(`Unhandled event type: ${stripeEvent.type}`)
    }

    const duration = Date.now() - startTime
    log.info(`=== WEBHOOK COMPLETED in ${duration}ms ===`)

    // Return success response to Stripe
    return { received: true }
  } catch (error: any) {
    const duration = Date.now() - startTime
    log.error(`WEBHOOK FAILED after ${duration}ms`, {
      error: error.message,
      statusCode: error.statusCode,
      stack: error.stack,
    })

    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Webhook processing failed',
    })
  }
})
