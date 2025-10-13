/**
 * Create Superfaktura Invoice from Stripe Payment
 *
 * Creates an invoice in Superfaktura based on a Stripe payment intent.
 * This endpoint converts Stripe payment data into Superfaktura invoice format.
 *
 * POST /api/superfaktura/create-from-stripe
 *
 * Request body:
 * {
 *   paymentIntentId: string,
 *   customerData?: {
 *     name?: string,
 *     email?: string,
 *     address?: {
 *       line1?: string,
 *       city?: string,
 *       postal_code?: string,
 *       country?: string
 *     }
 *   }
 * }
 */

import { useServerStripe } from '#stripe/server'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const config = useRuntimeConfig()

    // Validate required fields
    if (!body.paymentIntentId) {
      throw createError({
        statusCode: 400,
        message: 'Payment intent ID is required',
      })
    }

    // Validate Superfaktura credentials
    if (!config.superfakturaEmail || !config.superfakturaApiKey) {
      throw createError({
        statusCode: 500,
        message: 'Superfaktura credentials not configured',
      })
    }

    // Get Stripe payment intent
    const stripe = await useServerStripe(event)
    const paymentIntent = await stripe.paymentIntents.retrieve(body.paymentIntentId)

    // Check if payment was successful
    if (paymentIntent.status !== 'succeeded') {
      throw createError({
        statusCode: 400,
        message: `Cannot create invoice for payment with status: ${paymentIntent.status}`,
      })
    }

    // Create invoice data from payment intent
    const invoiceRequest = createInvoiceFromStripePayment(
      paymentIntent,
      body.customerData
    )

    // Prepare Superfaktura config
    const superfakturaConfig = {
      email: config.superfakturaEmail,
      apiKey: config.superfakturaApiKey,
      companyId: config.superfakturaCompanyId,
      isSandbox: config.superfakturaIsSandbox === 'true',
    }

    // Create invoice
    const result = await createInvoice(invoiceRequest, superfakturaConfig)

    // Check for errors
    if (result.error) {
      console.error('Superfaktura invoice creation failed:', result)
      throw createError({
        statusCode: 400,
        message: result.error_message || 'Failed to create invoice',
      })
    }

    console.log('Invoice created from Stripe payment:', {
      paymentIntentId: paymentIntent.id,
      invoiceId: result.data?.Invoice?.id,
      invoiceNumber: result.data?.Invoice?.invoice_no_formatted,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
    })

    return {
      success: true,
      invoice: result.data,
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      },
    }
  } catch (error: any) {
    console.error('Invoice creation from Stripe error:', error)

    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to create invoice from Stripe payment',
    })
  }
})
