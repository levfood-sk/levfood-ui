/**
 * Stripe Payment Intent Creation Endpoint
 *
 * Creates a payment intent on the server-side for secure payment processing.
 * This endpoint must be called from the client before showing the payment form.
 *
 * POST /api/stripe/create-payment-intent
 *
 * Request body:
 * {
 *   amount: number (in cents, e.g., 199 for $1.99)
 *   currency?: string (default: 'usd')
 *   description?: string
 * }
 *
 * Response:
 * {
 *   clientSecret: string (used to initialize Stripe Elements)
 *   paymentIntentId: string
 * }
 *
 * Security: Never create payment intents from the client-side
 */

import { useServerStripe } from '#stripe/server'

export default defineEventHandler(async (event) => {
  try {
    // Read request body
    const body = await readBody(event)

    // Validate amount
    if (!body.amount || typeof body.amount !== 'number' || body.amount <= 0) {
      throw createError({
        statusCode: 400,
        message: 'Valid amount is required (in cents)',
      })
    }

    // Get server Stripe instance
    const stripe = await useServerStripe(event)

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: body.amount,
      currency: body.currency || 'usd',
      description: body.description || 'Stripe Test Payment',
      // Enable automatic payment methods (cards, wallets, etc.)
      automatic_payment_methods: {
        enabled: true,
      },
      // Add metadata for tracking
      metadata: {
        integration: 'nuxt-stripe-test',
        timestamp: new Date().toISOString(),
      },
    })

    // Log for debugging (remove in production)
    console.log('Payment intent created:', {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
    })

    // Return client secret and payment intent ID
    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    }
  } catch (error: any) {
    console.error('Payment intent creation error:', error)

    // Return user-friendly error
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to create payment intent',
    })
  }
})
