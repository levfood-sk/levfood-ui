/**
 * Stripe Webhook Endpoint
 *
 * Receives and processes webhook events from Stripe.
 * Webhooks are used to get real-time updates about payment status changes.
 *
 * POST /api/stripe/webhook
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
        console.log('✅ Payment succeeded:', {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        })

        // TODO: Update database with successful payment
        // TODO: Send confirmation email to customer
        // TODO: Fulfill order
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = stripeEvent.data.object
        console.log('❌ Payment failed:', {
          id: paymentIntent.id,
          last_payment_error: paymentIntent.last_payment_error?.message,
        })

        // TODO: Update database with failed payment
        // TODO: Notify customer of failure
        break
      }

      case 'payment_intent.created': {
        const paymentIntent = stripeEvent.data.object
        console.log('🆕 Payment intent created:', {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
        })
        break
      }

      case 'charge.succeeded': {
        const charge = stripeEvent.data.object
        console.log('💳 Charge succeeded:', {
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
