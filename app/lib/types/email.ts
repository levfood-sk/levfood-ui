/**
 * Email types and interfaces for the email sending system
 */

export type EmailType = 'password-reset' | 'admin-notification' | 'welcome-admin' | 'order-notification' | 'client-order-confirmation'

export interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
  from: {
    email: string
    name: string
  }
}

export interface EmailAttachment {
  filename: string
  content: Buffer
  contentType?: string
}

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
  attachments?: EmailAttachment[]
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface PasswordResetEmailProps {
  adminName: string
  resetLink: string
  expiryHours?: number
}

export interface AdminNotificationEmailProps {
  adminName: string
  subject: string
  message: string
  actionUrl?: string
  actionLabel?: string
}

export interface WelcomeAdminEmailProps {
  adminName: string
  email: string
  role: string
  dashboardUrl: string
}

export interface OrderNotificationEmailProps {
  orderId: string
  clientName: string
  package: string
  dateRange: string
  totalPrice: string
  email: string
  phone: string
}

export interface ClientOrderConfirmationEmailProps {
  clientName: string
  orderId: string
  invoicePdf?: Buffer
}
