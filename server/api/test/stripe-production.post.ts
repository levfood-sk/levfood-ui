/**
 * Stripe Production Test Endpoint
 *
 * POST /api/test/stripe-production
 *
 * Creates a 1 cent payment intent for testing production Stripe integration
 */

import { useServerStripe } from '#stripe/server'

export default defineEventHandler(async (event) => {
  try {
    const stripe = await useServerStripe(event)

    // Create payment intent for 1 cent (100 cents = 1 euro, so 1 cent)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1, // 1 cent
      currency: 'eur',
      description: 'Production Test Payment - €0.01',
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
