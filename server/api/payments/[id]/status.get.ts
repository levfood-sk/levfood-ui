/**
 * Payment Status Endpoint
 *
 * Retrieves the current status of a payment from GoPay.
 * Used to check if payment was completed successfully.
 *
 * GET /api/payments/:id/status
 *
 * Response:
 * {
 *   success: true,
 *   payment: {
 *     id: number,
 *     orderNumber: string,
 *     state: string,
 *     amount: number,
 *     currency: string
 *   }
 * }
 */

export default defineEventHandler(async (event) => {
  try {
    // Get payment ID from URL parameter
    const paymentId = getRouterParam(event, 'id')

    if (!paymentId) {
      throw createError({
        statusCode: 400,
        message: 'Payment ID is required',
      })
    }

    // Parse payment ID to number
    const id = parseInt(paymentId, 10)
    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid payment ID',
      })
    }

    // Get GoPay client
    const gopay = useGoPay()

    // Fetch payment status from GoPay
    const payment = await gopay.getPaymentStatus(id)

    // Log status check for debugging
    console.log('Payment status checked:', {
      id: payment.id,
      order_number: payment.order_number,
      state: payment.state,
    })

    // Return payment status
    return {
      success: true,
      payment: {
        id: payment.id,
        orderNumber: payment.order_number,
        state: payment.state,
        amount: payment.amount,
        currency: payment.currency,
        payer: payment.payer,
      },
    }
  } catch (error: any) {
    console.error('Payment status check error:', error)

    // Return error response
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to check payment status',
    })
  }
})
