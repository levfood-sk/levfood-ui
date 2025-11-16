/**
 * Full Integration Production Test Endpoint
 *
 * POST /api/test/full-integration
 *
 * Tests complete production workflow: Stripe payment → Superfaktura invoice → Email with attachment
 */

import { z } from 'zod'
import { useServerStripe } from '#stripe/server'
import { createInvoice, downloadInvoicePDF } from '~~/server/utils/superfaktura'
import { sendEmail } from '~~/server/utils/email'
import type { CreateInvoiceRequest, InvoiceClient, InvoiceItem, InvoiceData } from '~~/server/utils/superfaktura'
import type { SendEmailOptions } from '~~/app/lib/types/email'

const fullIntegrationSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export default defineEventHandler(async (event) => {
  const logs: string[] = []
  const results: Record<string, any> = {}

  try {
    const body = await readBody(event)

    // Validate input
    const validationResult = fullIntegrationSchema.safeParse(body)

    if (!validationResult.success) {
      throw createError({
        statusCode: 400,
        message: 'Invalid request data',
        data: validationResult.error.issues,
      })
    }

    const { email: recipientEmail } = validationResult.data

    logs.push('[1] 🚀 Starting full integration test...')
    logs.push(`[2] 📧 Recipient email: ${recipientEmail}`)

    // ============================================================================
    // STEP 1: Create Stripe Payment Intent (€0.50 - Stripe minimum)
    // ============================================================================
    logs.push('[3] 💳 STEP 1: Creating Stripe payment intent...')

    try {
      const stripe = await useServerStripe(event)

      const paymentIntent = await stripe.paymentIntents.create({
        amount: 50, // 50 cents = €0.50 (Stripe minimum for EUR)
        currency: 'eur',
        description: 'Full Integration Test Payment - €0.50',
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never', // Prevents redirect-based payment methods
        },
        metadata: {
          test: 'full_integration',
          purpose: 'production_testing',
        },
      })

      results.stripe = {
        success: true,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
      }

      logs.push(`[4] ✅ Stripe payment intent created: ${paymentIntent.id}`)
      logs.push(`[5] 💰 Amount: €${(paymentIntent.amount / 100).toFixed(2)}`)
    } catch (stripeError: any) {
      logs.push(`[4] ❌ Stripe payment failed: ${stripeError.message}`)
      results.stripe = {
        success: false,
        error: stripeError.message,
      }
      throw stripeError
    }

    // ============================================================================
    // STEP 2: Create Superfaktura Invoice
    // ============================================================================
    logs.push('[6] 📄 STEP 2: Creating Superfaktura invoice...')

    try {
      const config = useRuntimeConfig()

      if (!config.superfakturaEmail || !config.superfakturaApiKey) {
        throw new Error('Superfaktura credentials not configured')
      }

      const superfakturaConfig = {
        email: config.superfakturaEmail,
        apiKey: config.superfakturaApiKey,
        companyId: config.superfakturaCompanyId,
        isSandbox: config.superfakturaIsSandbox === 'true',
      }

      logs.push(`[7] 📋 Using Superfaktura: ${superfakturaConfig.isSandbox ? 'SANDBOX' : 'PRODUCTION'}`)

      // Build invoice
      const invoiceClient: InvoiceClient = {
        name: 'Integration Test Client',
        email: recipientEmail,
        phone: '+421900000000',
        address: 'Test Street 123, Bratislava, 12345',
      }

      const invoiceItem: InvoiceItem = {
        name: 'Full Integration Test',
        description: `Payment ID: ${results.stripe.paymentIntentId}\nTest amount: €0.50`,
        quantity: 1,
        unit: 'ks',
        unit_price: 0.50,
        tax: 0,
      }

      const now = new Date()
      const invoiceDate = now.toISOString().split('T')[0]

      const invoiceData: InvoiceData = {
        name: `Integration Test - ${now.toLocaleString('sk-SK')}`,
        currency: 'EUR',
        variable: results.stripe.paymentIntentId,
        comment: 'Full integration test invoice\nPayment: €0.50 via Stripe',
        delivery: invoiceDate,
        due: invoiceDate,
      }

      const invoiceRequest: CreateInvoiceRequest = {
        Client: invoiceClient,
        Invoice: invoiceData,
        InvoiceItem: [invoiceItem],
      }

      // Create invoice
      const invoiceResult = await createInvoice(invoiceRequest, superfakturaConfig)

      if (invoiceResult.error) {
        throw new Error(invoiceResult.error_message || 'Invoice creation failed')
      }

      const invoiceId = invoiceResult.data?.Invoice?.id
      const invoiceNumber = invoiceResult.data?.Invoice?.invoice_no_formatted

      results.superfaktura = {
        success: true,
        invoiceId,
        invoiceNumber,
      }

      logs.push(`[8] ✅ Invoice created: ${invoiceNumber} (ID: ${invoiceId})`)

      // Download PDF
      logs.push('[9] 📥 Downloading invoice PDF...')
      const invoicePdf = await downloadInvoicePDF(invoiceId, superfakturaConfig)

      if (!invoicePdf) {
        throw new Error('Failed to download invoice PDF')
      }

      results.superfaktura.pdfSize = invoicePdf.length
      results.superfaktura.pdfDownloaded = true

      logs.push(`[10] ✅ PDF downloaded: ${invoicePdf.length} bytes`)

      // Store PDF for email
      results.invoicePdf = invoicePdf
    } catch (superfakturaError: any) {
      logs.push(`[8] ❌ Superfaktura failed: ${superfakturaError.message}`)
      results.superfaktura = {
        success: false,
        error: superfakturaError.message,
      }
      throw superfakturaError
    }

    // ============================================================================
    // STEP 3: Send Email with Invoice Attachment
    // ============================================================================
    logs.push('[11] 📧 STEP 3: Sending confirmation email...')

    try {
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Sofia+Sans+Condensed:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: 'Sofia Sans Condensed', Arial, sans-serif; background-color: #FCEFE6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FCEFE6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 0 0 40px 0;">
              <img src="https://levfood-ui.vercel.app/logo-long-orange@3x.png" alt="LevFood" width="307" height="48" />
            </td>
          </tr>
          <tr>
            <td style="padding: 0 20px;">
              <h2 style="color: #0E2825; font-size: 24px; margin: 0 0 20px 0;">✅ Full Integration Test Successful!</h2>

              <p style="color: #0E2825; font-size: 16px; line-height: 160%; margin: 0 0 16px 0;">
                All production integrations are working correctly:
              </p>

              <div style="background-color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 12px 0;"><strong>💳 Stripe Payment:</strong> ${results.stripe.paymentIntentId}</p>
                <p style="margin: 0 0 12px 0;"><strong>📄 Invoice Number:</strong> ${results.superfaktura.invoiceNumber}</p>
                <p style="margin: 0 0 12px 0;"><strong>💰 Amount:</strong> €0.50</p>
                <p style="margin: 0;"><strong>📎 Attachment:</strong> Invoice PDF (${Math.round(results.superfaktura.pdfSize / 1024)}KB)</p>
              </div>

              <p style="color: #0E2825; font-size: 14px; line-height: 160%; margin: 20px 0;">
                Test completed at: ${new Date().toLocaleString('sk-SK')}
              </p>

              <p style="color: #F28E7A; margin-top: 40px;">Tím LevFood</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `

      const emailOptions: SendEmailOptions = {
        to: recipientEmail,
        subject: `✅ Full Integration Test Complete - ${new Date().toLocaleString('sk-SK')}`,
        html,
        text: `Full Integration Test Complete!\n\nStripe: ${results.stripe.paymentIntentId}\nInvoice: ${results.superfaktura.invoiceNumber}\nAmount: €0.50\n\nTest completed at: ${new Date().toLocaleString('sk-SK')}`,
        attachments: [{
          filename: `Invoice-${results.superfaktura.invoiceNumber}.pdf`,
          content: results.invoicePdf,
          contentType: 'application/pdf',
        }],
      }

      const emailResult = await sendEmail(emailOptions)

      if (!emailResult.success) {
        throw new Error(emailResult.error || 'Email sending failed')
      }

      results.email = {
        success: true,
        messageId: emailResult.messageId,
        to: recipientEmail,
      }

      logs.push(`[12] ✅ Email sent: ${emailResult.messageId}`)
      logs.push(`[13] 📬 Recipient: ${recipientEmail}`)
    } catch (emailError: any) {
      logs.push(`[12] ❌ Email failed: ${emailError.message}`)
      results.email = {
        success: false,
        error: emailError.message,
      }
      throw emailError
    }

    // ============================================================================
    // SUCCESS
    // ============================================================================
    logs.push('[14] 🎉 Full integration test completed successfully!')

    return {
      success: true,
      logs,
      results,
      timestamp: new Date().toISOString(),
    }
  } catch (error: any) {
    logs.push(`[ERROR] ❌ Test failed: ${error.message}`)

    console.error('❌ Full integration test error:', error)

    return {
      success: false,
      logs,
      results,
      error: error.message,
      timestamp: new Date().toISOString(),
    }
  }
})
