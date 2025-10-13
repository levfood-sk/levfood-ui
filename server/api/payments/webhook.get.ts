/**
 * Payment Webhook Endpoint
 *
 * Receives notifications from GoPay when payment status changes.
 * GoPay calls this endpoint with payment ID as query parameter.
 *
 * GET /api/payments/webhook?id=123456
 *
 * Note: In production, you should:
 * 1. Verify the request comes from GoPay IP addresses
 * 2. Store payment status in your database
 * 3. Send confirmation emails
 * 4. Update order status
 *
 * Response:
 * {
 *   success: true
 * }
 */

export default defineEventHandler(async (event) => {
  try {
    // Get payment ID from query parameter
    const query = getQuery(event)
    const paymentId = query.id

    if (!paymentId) {
      throw createError({
        statusCode: 400,
        message: 'Payment ID is required',
      })
    }

    // Parse payment ID to number
    const id = parseInt(paymentId as string, 10)
    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid payment ID',
      })
    }

    // Get GoPay client
    const gopay = useGoPay()

    // Fetch current payment status from GoPay
    const payment = await gopay.getPaymentStatus(id)

    // Log webhook notification for debugging
    console.log('Webhook received:', {
      id: payment.id,
      order_number: payment.order_number,
      state: payment.state,
      amount: payment.amount,
      currency: payment.currency,
      timestamp: new Date().toISOString(),
    })

    // TODO: In production implementation, add:
    // - Database update with payment status
    // - Email notification to customer
    // - Order fulfillment trigger if state is 'PAID'
    // - Refund handling if state is 'REFUNDED'

    // Handle different payment states
    switch (payment.state) {
      case 'PAID':
        console.log(`✅ Payment ${payment.id} was successful`)
        // TODO: Mark order as paid in database
        // TODO: Send confirmation email
        break

      case 'CANCELED':
        console.log(`❌ Payment ${payment.id} was canceled`)
        // TODO: Mark order as canceled
        break

      case 'TIMEOUTED':
        console.log(`⏱️  Payment ${payment.id} timed out`)
        // TODO: Mark order as expired
        break

      case 'REFUNDED':
        console.log(`💸 Payment ${payment.id} was refunded`)
        // TODO: Handle refund in database
        break

      default:
        console.log(`ℹ️  Payment ${payment.id} state: ${payment.state}`)
    }

    // Return success response
    return {
      success: true,
    }
  } catch (error: any) {
    console.error('Webhook processing error:', error)

    // Return error response
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to process webhook',
    })
  }
})
