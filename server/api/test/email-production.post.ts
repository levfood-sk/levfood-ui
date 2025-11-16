/**
 * Email Production Test Endpoint
 *
 * POST /api/test/email-production
 *
 * Sends a test email using production SMTP with optional PDF attachment
 */

import { z } from 'zod'
import { sendEmail } from '~~/server/utils/email'
import type { SendEmailOptions, EmailAttachment } from '~~/app/lib/types/email'

const testEmailSchema = z.object({
  to: z.string().email('Invalid email address'),
  includeAttachment: z.boolean().default(false),
  pdfBase64: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    // Validate input
    const validationResult = testEmailSchema.safeParse(body)

    if (!validationResult.success) {
      throw createError({
        statusCode: 400,
        message: 'Invalid request data',
        data: validationResult.error.issues,
      })
    }

    const { to, includeAttachment, pdfBase64 } = validationResult.data

    console.log('📧 Sending production test email to:', to)

    // Generate test email HTML
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Production Email Test</title>
  <link href="https://fonts.googleapis.com/css2?family=Sofia+Sans+Condensed:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: 'Sofia Sans Condensed', Arial, sans-serif; background-color: #FCEFE6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FCEFE6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FCEFE6;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding: 0 0 80px 0;">
              <img src="https://levfood-ui.vercel.app/logo-long-orange@3x.png" alt="LevFood" width="307" height="48" style="display: block; max-width: 100%; height: auto;" />
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 0 20px;">
              <p style="font-family: 'Sofia Sans Condensed', Arial, sans-serif; color: #0E2825; font-size: 18px; font-weight: 600; line-height: 140%; margin: 0 0 24px 0;">
                Production Email Integration Test
              </p>

              <p style="font-family: 'Sofia Sans Condensed', Arial, sans-serif; color: #0E2825; font-size: 16px; font-weight: 400; line-height: 160%; margin: 0 0 24px 0;">
                Tento email je testovací email pre overenie produkčnej SMTP konfigurácie.
              </p>

              <p style="font-family: 'Sofia Sans Condensed', Arial, sans-serif; color: #0E2825; font-size: 16px; font-weight: 400; line-height: 160%; margin: 0 0 24px 0;">
                Čas odoslania: <strong>${new Date().toLocaleString('sk-SK')}</strong>
              </p>

              ${includeAttachment ? `
              <p style="font-family: 'Sofia Sans Condensed', Arial, sans-serif; color: #0E2825; font-size: 16px; font-weight: 400; line-height: 160%; margin: 0 0 24px 0;">
                Tento email obsahuje prílohu (test PDF invoice).
              </p>
              ` : ''}

              <div style="background-color: #F28E7A; padding: 16px; border-radius: 8px; margin: 24px 0;">
                <p style="font-family: 'Sofia Sans Condensed', Arial, sans-serif; color: #FCEFE6; font-size: 14px; font-weight: 400; line-height: 140%; margin: 0;">
                  ✅ Production SMTP is working correctly!
                </p>
              </div>

              <p style="font-family: 'Sofia Sans Condensed', Arial, sans-serif; color: #F28E7A; font-size: 16px; font-weight: 400; line-height: 100%; margin-top: 70px;">
                Tím LevFood.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `

    const text = `
LevFood - Production Email Test

Tento email je testovací email pre overenie produkčnej SMTP konfigurácie.

Čas odoslania: ${new Date().toLocaleString('sk-SK')}

${includeAttachment ? 'Tento email obsahuje prílohu (test PDF invoice).' : ''}

✅ Production SMTP is working correctly!

---
LevFood - Jedlo s láskou doručené
    `

    // Prepare email options
    const emailOptions: SendEmailOptions = {
      to,
      subject: `Production Email Test - ${new Date().toLocaleString('sk-SK')}`,
      html,
      text,
    }

    // Add PDF attachment if provided
    if (includeAttachment && pdfBase64) {
      try {
        const pdfBuffer = Buffer.from(pdfBase64, 'base64')
        emailOptions.attachments = [{
          filename: `Test-Invoice-${Date.now()}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        }]
        console.log('📎 PDF attachment added to email:', pdfBuffer.length, 'bytes')
      } catch (attachmentError) {
        console.error('❌ Failed to process PDF attachment:', attachmentError)
      }
    }

    // Send email
    const result = await sendEmail(emailOptions)

    if (result.success) {
      console.log('✅ Production test email sent successfully:', {
        to,
        messageId: result.messageId,
        hasAttachment: includeAttachment,
      })
    } else {
      console.error('❌ Failed to send production test email:', result.error)
    }

    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      to,
      hasAttachment: includeAttachment && !!pdfBase64,
    }
  } catch (error: any) {
    console.error('❌ Production email test error:', error)

    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to send test email',
    })
  }
})
