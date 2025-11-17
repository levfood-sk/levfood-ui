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

export default defineEventHandler(async (event) => {
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
      console.error('STRIPE_WEBHOOK_SECRET is not configured')
      throw createError({
        statusCode: 500,
        message: 'Webhook secret not configured',
      })
    }

    // Get Stripe instance
    const stripe = await useServerStripe(event)

    // Verify webhook signature and construct event
    let stripeEvent
    try {
      stripeEvent = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      )
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      throw createError({
        statusCode: 400,
        message: `Webhook Error: ${err.message}`,
      })
    }

    // Log event for debugging
    console.log('Stripe webhook received:', {
      type: stripeEvent.type,
      id: stripeEvent.id,
      timestamp: new Date(stripeEvent.created * 1000).toISOString(),
    })

    // Handle different event types
    switch (stripeEvent.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = stripeEvent.data.object
        console.log('Payment succeeded:', {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        })

        // Create Superfaktura invoice and send to client
        try {
          // Initialize Firebase Admin
          const { app } = getFirebaseAdmin()
          const db = getFirestore(app)

          // Find the order associated with this payment intent
          // Retry up to 3 times with 2-second delays to handle race condition
          // (order might not be created yet when webhook fires)
          const ordersRef = db.collection('orders')
          let orderQuery = await ordersRef
            .where('stripePaymentIntentId', '==', paymentIntent.id)
            .limit(1)
            .get()

          let retries = 0
          const maxRetries = 3

          while (orderQuery.empty && retries < maxRetries) {
            console.log(`Order not found yet, retrying in 2 seconds... (attempt ${retries + 1}/${maxRetries})`)
            await new Promise(resolve => setTimeout(resolve, 2000))

            orderQuery = await ordersRef
              .where('stripePaymentIntentId', '==', paymentIntent.id)
              .limit(1)
              .get()

            retries++
          }

          if (orderQuery.empty) {
            console.warn(`No order found for payment intent after ${maxRetries} retries:`, paymentIntent.id)
            break
          }

          const orderDoc = orderQuery.docs[0]
          const order = orderDoc.data() as Order
          const orderId = order.orderId

          console.log('✅ Found order for invoice generation:', {
            orderId,
            package: order.package,
            totalPrice: order.totalPrice,
            deliveryStartDate: order.deliveryStartDate,
            clientId: order.clientId,
          })

          // Get client data
          const clientDoc = await db.collection('clients').doc(order.clientId).get()
          if (!clientDoc.exists) {
            console.error('❌ Client not found for order:', orderId)
            break
          }

          const client = clientDoc.data()
          console.log('✅ Client found:', {
            email: client?.email,
            fullName: client?.fullName,
          })

          // Configure Superfaktura
          const superfakturaConfig = {
            email: config.superfakturaEmail,
            apiKey: config.superfakturaApiKey,
            companyId: config.superfakturaCompanyId,
            isSandbox: config.superfakturaIsSandbox === 'true',
          }

          console.log('📋 Superfaktura configuration:', {
            hasEmail: !!superfakturaConfig.email,
            hasApiKey: !!superfakturaConfig.apiKey,
            companyId: superfakturaConfig.companyId,
            isSandbox: superfakturaConfig.isSandbox,
          })

          // Only create invoice if Superfaktura is configured
          if (!superfakturaConfig.email || !superfakturaConfig.apiKey) {
            console.warn('⚠️  Superfaktura not configured, skipping invoice generation')
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
          // Use exact original prices before 10% discount (from objednavka.vue pricing)
          const originalPrices: Record<string, Record<string, number>> = {
            'EKONOMY': { '5': 50, '6': 50 }, // TEST PRICE
            'ŠTANDARD': { '5': 35900, '6': 39900 }, // 359€ and 399€ before 10% off
            'PREMIUM': { '5': 41900, '6': 45900 },  // 419€ and 459€ before 10% off
            'OFFICE': { '5': 24900, '6': 24900 },
          }

          // Check if package has discount (ŠTANDARD or PREMIUM)
          const hasDiscount = order.package === 'ŠTANDARD' || order.package === 'PREMIUM'

          // Get the exact original price before discount
          const originalPrice = hasDiscount
            ? (originalPrices[order.package]?.[order.duration] || order.totalPrice)
            : order.totalPrice

          // Convert to euros and round down to whole euros (accountant will handle decimals)
          const unitPrice = Math.floor(originalPrice / 100)

          // Build invoice item with proper description and discount
          const invoiceItem: InvoiceItem = {
            name: `LevFood ${order.package} balík`,
            description: `${order.daysCount} dní / Od: ${order.deliveryStartDate} / ${hasDiscount ? '\n Zľava 10%' : ''}`,
            quantity: 1,
            unit: 'balík',
            unit_price: unitPrice,
            tax: 0,
            discount: hasDiscount ? 10 : 0, // 10% discount for ŠTANDARD and PREMIUM
          }

          console.log('💰 Invoice pricing:', {
            package: order.package,
            hasDiscount,
            originalPrice: originalPrice / 100,
            finalPrice: order.totalPrice / 100,
            discount: hasDiscount ? '10%' : 'none',
          })

          // Get current date for invoice
          const now = new Date()
          const invoiceDate = now.toISOString().split('T')[0] // YYYY-MM-DD format

          // Build invoice data - mark as already paid
          const invoiceData: InvoiceData = {
            name: `Objednávka #${orderId}`,
            currency: 'EUR',
            variable: orderId, // Use order ID as variable symbol
            comment: `LevFood ${order.package} balík\nDoručenie: ${order.deliveryType}\nPoznámky: ${order.notes || 'Bez poznámok'}`,
            delivery: invoiceDate, // Set delivery date to today
            due: invoiceDate, // Set due date to today (already paid)
          }

          // Create invoice request
          const invoiceRequest: CreateInvoiceRequest = {
            Client: invoiceClient,
            Invoice: invoiceData,
            InvoiceItem: [invoiceItem],
          }

          // Create invoice in Superfaktura
          console.log('📤 Creating invoice in Superfaktura...')
          const invoiceResult = await createInvoice(invoiceRequest, superfakturaConfig)

          if (invoiceResult.error) {
            console.error('❌ Failed to create Superfaktura invoice:', {
              error: invoiceResult.error,
              message: invoiceResult.error_message,
              data: invoiceResult.data,
            })
            break
          }

          const invoiceId = invoiceResult.data?.Invoice?.id
          const invoiceNumber = invoiceResult.data?.Invoice?.invoice_no_formatted

          console.log('✅ Superfaktura invoice created:', {
            invoiceId,
            invoiceNumber,
            orderId,
          })

          // Store invoice ID in order document for reference
          await orderDoc.ref.update({
            superfakturaInvoiceId: invoiceId,
            superfakturaInvoiceNumber: invoiceNumber,
            updatedAt: new Date(),
          })

          // Download invoice PDF
          console.log('📥 Downloading invoice PDF...')
          const invoicePdf = await downloadInvoicePDF(invoiceId, superfakturaConfig)

          if (!invoicePdf) {
            console.error('❌ Failed to download invoice PDF for invoice:', invoiceId)
          } else {
            console.log('✅ Invoice PDF downloaded successfully:', {
              invoiceId,
              pdfSize: invoicePdf.length,
            })
          }

          // Send client order confirmation email with invoice PDF attached
          if (client?.email) {
            try {
              console.log('📧 Sending client confirmation email to:', client.email)

              const emailResult = await sendClientOrderConfirmation(client.email, {
                clientName: client.fullName || 'Zákazník',
                orderId: String(orderId),
                invoicePdf: invoicePdf || undefined,
              })

              console.log('✅ Client order confirmation email sent:', {
                email: client.email,
                orderId,
                hasInvoice: !!invoicePdf,
                success: emailResult.success,
                messageId: emailResult.messageId,
              })
            } catch (emailError: any) {
              console.error('❌ Failed to send client confirmation email:', {
                error: emailError.message,
                stack: emailError.stack,
              })
            }
          } else {
            console.warn('⚠️  No client email found, skipping confirmation email')
          }
        } catch (invoiceError: any) {
          console.error('Invoice generation error:', invoiceError.message)
          // Don't fail the webhook if invoice creation fails
        }

        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = stripeEvent.data.object
        console.log('Payment failed:', {
          id: paymentIntent.id,
          last_payment_error: paymentIntent.last_payment_error?.message,
        })

        // TODO: Update database with failed payment
        // TODO: Notify customer of failure
        break
      }

      case 'payment_intent.created': {
        const paymentIntent = stripeEvent.data.object
        console.log('Payment intent created:', {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
        })
        break
      }

      case 'charge.succeeded': {
        const charge = stripeEvent.data.object
        console.log('Charge succeeded:', {
          id: charge.id,
          amount: charge.amount,
        })
        break
      }

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`)
    }

    // Return success response to Stripe
    return { received: true }
  } catch (error: any) {
    console.error('Webhook processing error:', error)

    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Webhook processing failed',
    })
  }
})
