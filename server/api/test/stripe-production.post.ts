/**
 * Stripe Production Test Endpoint
 *
 * POST /api/test/stripe-production
 *
 * Creates a €0.50 payment intent for testing production Stripe integration
 */

import { useServerStripe } from '#stripe/server'

export default defineEventHandler(async (event) => {
  try {
    const stripe = await useServerStripe(event)

    // Create payment intent for €0.50 (Stripe minimum for EUR)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 50, // 50 cents = €0.50
      currency: 'eur',
      description: 'Production Test Payment - €0.50',
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never', // Prevents redirect-based payment methods
      },
      metadata: {
        test: 'production',
        purpose: 'integration_testing',
      },
    })

    console.log('✅ Production test payment intent created:', {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
    })

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    }
  } catch (error: any) {
    console.error('❌ Production Stripe test error:', error)

    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to create test payment intent',
    })
  }
})
