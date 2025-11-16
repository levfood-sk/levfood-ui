import { sendPasswordResetEmail, sendAdminNotification, sendOrderNotification, sendClientOrderConfirmation } from '~~/server/utils/email'
import { z } from 'zod'

const TestEmailSchema = z.object({
  email: z.string().email('Neplatný formát emailu'),
  type: z.enum(['password-reset', 'admin-notification', 'order-notification', 'client-order-confirmation']),
})

interface TestEmailResponse {
  success: boolean
  message?: string
  error?: string
  messageId?: string
}

export default defineEventHandler(async (event): Promise<TestEmailResponse> => {
  try {
    const body = await readBody(event)

    // Validate request body
    const validation = TestEmailSchema.safeParse(body)
    if (!validation.success) {
      throw createError({
        statusCode: 400,
        message: validation.error.issues[0].message,
      })
    }

    const { email, type } = validation.data
    const config = useRuntimeConfig()

    let result

    if (type === 'password-reset') {
      // Send test password reset email
      const resetLink = `${config.public.appUrl}/login?reset=test-token-123`

      result = await sendPasswordResetEmail(email, {
        adminName: 'Test Admin',
        resetLink,
        expiryHours: 1,
      })
    } else if (type === 'admin-notification') {
      // Send test admin notification email
      result = await sendAdminNotification(email, {
        adminName: 'Test Admin',
        subject: 'Test Admin Notification',
        message: 'Toto je testovacia správa z LevFood administrátorského systému.\n\nAk vidíte tento email, váš SMTP server je správne nakonfigurovaný!',
        actionUrl: `${config.public.appUrl}/dashboard`,
        actionLabel: 'Otvoriť Dashboard',
      })
    } else if (type === 'order-notification') {
      // Send test order notification email
      result = await sendOrderNotification(email, {
        orderId: '123456',
        clientName: 'TEST KLIENT',
        package: 'ŠTANDARD',
        dateRange: '13.01.2026 - 09.02.2026',
        totalPrice: '299',
        email: 'test@example.com',
        phone: '+421900123456',
      })
    } else if (type === 'client-order-confirmation') {
      // Send test client order confirmation email
      result = await sendClientOrderConfirmation(email, {
        clientName: 'Test Klient',
        orderId: '123456',
      })
    } else {
      throw createError({
        statusCode: 400,
        message: 'Neplatný typ emailu',
      })
    }

    if (!result.success) {
      throw createError({
        statusCode: 500,
        message: result.error || 'Nepodarilo sa odoslať email',
      })
    }

    console.log('Test email sent successfully:', {
      type,
      to: email,
      messageId: result.messageId,
    })

    return {
      success: true,
      message: 'Email bol úspešne odoslaný!',
      messageId: result.messageId,
    }
  } catch (error: any) {
    console.error('Error sending test email:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Nepodarilo sa odoslať testovací email',
    })
  }
})
