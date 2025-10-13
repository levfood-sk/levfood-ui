/**
 * Payment Creation Endpoint
 *
 * Creates a new payment in GoPay and returns the payment URL
 * to redirect the user to the payment gateway.
 *
 * POST /api/payments/create
 *
 * Request body:
 * {
 *   amount: number (in cents, e.g., 199 for €1.99)
 *   description: string
 * }
 *
 * Response:
 * {
 *   success: true,
 *   paymentId: number,
 *   paymentUrl: string
 * }
 */

export default defineEventHandler(async (event) => {
  try {
    // Read request body
    const body = await readBody(event)

    // Validate required fields
    if (!body.amount || typeof body.amount !== 'number') {
      throw createError({
        statusCode: 400,
        message: 'Invalid amount',
      })
    }

    if (!body.description || typeof body.description !== 'string') {
      throw createError({
        statusCode: 400,
        message: 'Invalid description',
      })
    }

    // Get runtime config for app URL
    const config = useRuntimeConfig()
    const appUrl = config.public.appUrl

    // Generate unique order number using timestamp
    const orderNumber = `TEST-${Date.now()}`

    // Get GoPay client
    const gopay = useGoPay()

    // Create payment in GoPay
    const payment = await gopay.createPayment({
      amount: body.amount,
      currency: 'EUR', // Euro currency for Slovak business
      order_number: orderNumber,
      order_description: body.description,
      return_url: `${appUrl}/payment/return`, // Where user returns after payment
      notify_url: `${appUrl}/api/payments/webhook`, // Webhook for status updates
      lang: 'SK', // Slovak language
    })

    // Log payment creation for debugging
    console.log('Payment created:', {
      id: payment.id,
      order_number: payment.order_number,
      state: payment.state,
      amount: payment.amount,
    })

    // Return payment details
    return {
      success: true,
      paymentId: payment.id,
      paymentUrl: payment.gw_url,
      orderNumber: payment.order_number,
      state: payment.state,
    }
  } catch (error: any) {
    console.error('Payment creation error:', error)

    // Return error response
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to create payment',
    })
  }
})
