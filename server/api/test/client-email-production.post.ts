/**
 * Client Order Confirmation Email Production Test Endpoint
 *
 * POST /api/test/client-email-production
 *
 * Sends a test client order confirmation email with optional invoice PDF attachment
 */

import { z } from 'zod'
import { sendClientOrderConfirmation } from '~~/server/utils/email'

const testClientEmailSchema = z.object({
  to: z.string().email('Invalid email address'),
  clientName: z.string().min(1, 'Client name is required'),
  orderId: z.string().min(1, 'Order ID is required'),
  includeInvoice: z.boolean().default(false),
  invoicePdfBase64: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    // Validate input
    const validationResult = testClientEmailSchema.safeParse(body)

    if (!validationResult.success) {
      throw createError({
        statusCode: 400,
        message: 'Invalid request data',
        data: validationResult.error.issues,
      })
    }

    const { to, clientName, orderId, includeInvoice, invoicePdfBase64 } = validationResult.data

    console.log('📧 Sending client order confirmation email test to:', to)

    let invoicePdf: Buffer | undefined

    // Convert base64 to buffer if invoice is included
    if (includeInvoice && invoicePdfBase64) {
      try {
        invoicePdf = Buffer.from(invoicePdfBase64, 'base64')
        console.log('📎 Invoice PDF added to email:', invoicePdf.length, 'bytes')
      } catch (attachmentError) {
        console.error('❌ Failed to process invoice PDF:', attachmentError)
      }
    }

    // Send client order confirmation email
    const result = await sendClientOrderConfirmation(to, {
      clientName,
      orderId,
      invoicePdf,
    })

    if (result.success) {
      console.log('✅ Client order confirmation email sent successfully:', {
        to,
        orderId,
        hasInvoice: !!invoicePdf,
        messageId: result.messageId,
      })
    } else {
      console.error('❌ Failed to send client order confirmation email:', result.error)
    }

    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      to,
      orderId,
      hasInvoice: includeInvoice && !!invoicePdf,
    }
  } catch (error: any) {
    console.error('❌ Client email test error:', error)

    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to send test email',
    })
  }
})
