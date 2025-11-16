/**
 * Email Sending Utilities
 *
 * Handles sending emails via SMTP using nodemailer with simple HTML templates
 */

import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import type {
  EmailConfig,
  SendEmailOptions,
  SendEmailResult,
  PasswordResetEmailProps,
  AdminNotificationEmailProps,
  OrderNotificationEmailProps,
  ClientOrderConfirmationEmailProps
} from '~/lib/types/email'

let transporter: Transporter | null = null

/**
 * Get or create SMTP transporter
 */
function getTransporter(): Transporter {
  if (transporter) {
    return transporter
  }

  const config = useRuntimeConfig()

  const emailConfig: EmailConfig = {
    host: config.smtpHost,
    port: parseInt(config.smtpPort),
    secure: config.smtpSecure === 'true',
    auth: {
      user: config.smtpUser,
      pass: config.smtpPassword,
    },
    from: {
      email: config.smtpFromEmail,
      name: config.smtpFromName,
    }
  }

  // Validate required config
  if (!emailConfig.host || !emailConfig.auth.user || !emailConfig.auth.pass || !emailConfig.from.email) {
    throw new Error('Missing required SMTP configuration. Please check your environment variables.')
  }

  transporter = nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: emailConfig.auth,
  })

  console.log('SMTP transporter initialized:', {
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    from: emailConfig.from.email,
  })

  return transporter
}

/**
 * Generate simple password reset email HTML
 */
function generatePasswordResetEmail(props: PasswordResetEmailProps): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Obnovenie hesla</title>
  <link href="https://fonts.googleapis.com/css2?family=Sofia+Sans+Condensed:wght@400&display=swap" rel="stylesheet">
  <style>
    a.reset-link { color: #F28E7A !important; }
    a.reset-link:visited { color: #F28E7A !important; }
    a.reset-link:hover { color: #0E2825 !important; }
    a.button-link { color: #FCEFE6 !important; }
    a.button-link:visited { color: #FCEFE6 !important; }
    a.button-link:hover { color: #FCEFE6 !important; }
  </style>
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
              <p style="font-family: 'Sofia Sans Condensed', Arial, sans-serif; color: #0E2825; font-size: 16px; font-weight: 400; line-height: 100%; margin: 0 0 24px 0;">
                Dobrý deň ${props.adminName},
              </p>

              <p style="font-family: 'Sofia Sans Condensed', Arial, sans-serif; color: #0E2825; font-size: 16px; font-weight: 400; line-height: 100%; margin: 0 0 24px 0;">
                Prijali sme žiadosť o obnovenie hesla pre váš LevFood administrátorský účet.
                Kliknite na tlačidlo nižšie pre vytvorenie nového hesla.
              </p>

              <p style="margin: 32px 0;">
                <a href="${props.resetLink}" class="button-link"
                   style="font-family: 'Sofia Sans Condensed', Arial, sans-serif; background-color: #F28E7A; color: #FCEFE6 !important; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 16px; font-weight: 400;">
                  Obnoviť heslo
                </a>
              </p>

              <p style="font-family: 'Sofia Sans Condensed', Arial, sans-serif; color: #0E2825; font-size: 16px; font-weight: 400; line-height: 100%; margin: 0 0 16px 0;">
                Tento odkaz vyprší o ${props.expiryHours || 1} ${props.expiryHours === 1 ? 'hodinu' : 'hodiny'}.
              </p>

              <p style="font-family: 'Sofia Sans Condensed', Arial, sans-serif; color: #0E2825; font-size: 16px; font-weight: 400; line-height: 100%; margin: 0 0 12px 0; ">
                Ak nefunguje tlačidlo, skopírujte a vložte tento odkaz do vášho prehliadača:
              </p>

              <p style="margin: 0 0 32px 0; line-height: %;">
                <a href="${props.resetLink}" class="reset-link" style="font-family: 'Sofia Sans Condensed', Arial, sans-serif; color: #F28E7A; font-size: 16px; font-weight: 400; word-break: break-all; text-decoration: none;">
                  ${props.resetLink}
                </a>
              </p>

              <p style="font-family: 'Sofia Sans Condensed', Arial, sans-serif; color: #0E2825; font-size: 16px; font-weight: 400; line-height: 100%; margin: 0 0 40px 0;">
                Ak ste nepožiadali o obnovenie hesla, môžete tento email ignorovať.
                Vaše heslo zostane nezmenené.
              </p>

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
LevFood - Obnovenie hesla

Dobrý deň ${props.adminName},

Prijali sme žiadosť o obnovenie hesla pre váš LevFood administrátorský účet.

Pre obnovenie hesla kliknite na tento odkaz:
${props.resetLink}

Tento odkaz vyprší o ${props.expiryHours || 1} ${props.expiryHours === 1 ? 'hodinu' : 'hodiny'}.

Ak ste nepožiadali o obnovenie hesla, môžete tento email ignorovať. Vaše heslo zostane nezmenené.

---
LevFood - Jedlo s láskou doručené
  `

  return { html, text }
}

/**
 * Generate simple admin notification email HTML
 */
function generateAdminNotificationEmail(props: AdminNotificationEmailProps): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${props.subject}</title>
  <link href="https://fonts.googleapis.com/css2?family=Sofia+Sans+Condensed:wght@400&display=swap" rel="stylesheet">
  <style>
    a.button-link { color: #FCEFE6 !important; }
    a.button-link:visited { color: #FCEFE6 !important; }
    a.button-link:hover { color: #FCEFE6 !important; }
  </style>
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
              <p style="font-family: 'Sofia Sans Condensed', Arial, sans-serif; color: #0E2825; font-size: 16px; font-weight: 400; line-height: 100%; margin: 0 0 24px 0;">
                Dobrý deň ${props.adminName},
              </p>

              <p style="font-family: 'Sofia Sans Condensed', Arial, sans-serif; color: #0E2825; font-size: 16px; font-weight: 400; line-height: 100%; margin: 0 0 24px 0; white-space: pre-line;">
                ${props.message}
              </p>

              ${props.actionUrl && props.actionLabel ? `
              <p style="margin: 32px 0;">
                <a href="${props.actionUrl}" class="button-link"
                   style="font-family: 'Sofia Sans Condensed', Arial, sans-serif; background-color: #F28E7A; color: #FCEFE6 !important; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 16px; font-weight: 400;">
                  ${props.actionLabel}
                </a>
              </p>
              ` : ''}

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
LevFood - ${props.subject}

Dobrý deň ${props.adminName},

${props.message}

${props.actionUrl && props.actionLabel ? `
${props.actionLabel}: ${props.actionUrl}
` : ''}

---
Toto je automaticky generované upozornenie z LevFood administrátorského systému.

LevFood - Jedlo s láskou doručené
  `

  return { html, text }
}

/**
 * Send an email
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  try {
    const config = useRuntimeConfig()
    const transport = getTransporter()

    const mailOptions: any = {
      from: `${config.smtpFromName} <${config.smtpFromEmail}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || undefined,
      replyTo: options.replyTo || undefined,
    }

    // Add attachments if provided
    if (options.attachments && options.attachments.length > 0) {
      mailOptions.attachments = options.attachments.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType || 'application/octet-stream',
      }))
    }

    const info = await transport.sendMail(mailOptions)

    console.log('Email sent successfully:', {
      messageId: info.messageId,
      to: mailOptions.to,
      subject: options.subject,
      attachments: options.attachments?.length || 0,
    })

    return {
      success: true,
      messageId: info.messageId,
    }
  } catch (error) {
    console.error('Error sending email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Send password reset email to admin user
 */
export async function sendPasswordResetEmail(
  to: string,
  props: PasswordResetEmailProps
): Promise<SendEmailResult> {
  try {
    const { html, text } = generatePasswordResetEmail(props)

    return await sendEmail({
      to,
      subject: 'Obnovenie hesla - LevFood Admin',
      html,
      text,
    })
  } catch (error) {
    console.error('Error sending password reset email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send password reset email',
    }
  }
}

/**
 * Send admin notification email
 */
export async function sendAdminNotification(
  to: string | string[],
  props: AdminNotificationEmailProps
): Promise<SendEmailResult> {
  try {
    const { html, text } = generateAdminNotificationEmail(props)

    return await sendEmail({
      to,
      subject: props.subject,
      html,
      text,
    })
  } catch (error) {
    console.error('Error sending admin notification email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send admin notification email',
    }
  }
}

/**
 * Generate order notification email HTML
 */
function generateOrderNotificationEmail(props: OrderNotificationEmailProps): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nová objednávka #${props.orderId}</title>
  <link href="https://fonts.googleapis.com/css2?family=Sofia+Sans+Condensed:wght@400;600&display=swap" rel="stylesheet">
  <style>
    a.button-link { color: #FCEFE6 !important; }
    a.button-link:visited { color: #FCEFE6 !important; }
    a.button-link:hover { color: #FCEFE6 !important; }
    a.link-text { color: #0E2825 !important; }
    a.link-text:visited { color: #F28E7A !important; }
    a.link-text:hover { color: #0E2825 !important; }
  </style>
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
              <p style="font-family: 'Sofia Sans Condensed', Arial, sans-serif; color: #0E2825; font-size: 16px; font-weight: 400; line-height: 100%; margin: 0 0 24px 0;">
                Dobrý deň Admin,
              </p>

              <p style="font-family: 'Sofia Sans Condensed', Arial, sans-serif; color: #0E2825; font-size: 18px; font-weight: 600; line-height: 140%; margin: 0 0 24px 0;">
                Nová objednávka bola úspešne vytvorená.
              </p>

              <p style="font-family: 'Sofia Sans Condensed', Arial, sans-serif; color: #0E2825; font-size: 16px; font-weight: 400; line-height: 160%; margin: 0 0 24px 0;">
                Číslo objednávky: <strong>${props.orderId}</strong><br>
                Meno klienta: <strong>${props.clientName}</strong><br>
                Zvolený balík: <strong>${props.package}</strong><br>
                Obdobie: <strong>${props.dateRange}</strong><br>
                Suma: <strong>${props.totalPrice}€</strong><br>
                Email: <strong><a href="mailto:${props.email}" class="link-text">${props.email}</a></strong><br>
                Tel. č.: <strong><a href="tel:${props.phone}" class="link-text">${props.phone}</a></strong>
              </p>

              <p style="font-family: 'Sofia Sans Condensed', Arial, sans-serif; color: #0E2825; font-size: 16px; font-weight: 400; line-height: 140%; margin: 24px 0 32px 0;">
                Skontroluj objednávku v administrácií a priprav ju na spracovanie.
              </p>

              <p style="margin: 32px 0;">
                <a href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard/orders" class="button-link"
                   style="font-family: 'Sofia Sans Condensed', Arial, sans-serif; background-color: #F28E7A; color: #FCEFE6 !important; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 16px; font-weight: 400;">
                  Zobraziť objednávky
                </a>
              </p>

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
LevFood - Nová objednávka #${props.orderId}

Dobrý deň Admin,

Nová objednávka bola úspešne vytvorená.

Číslo objednávky: ${props.orderId}
Meno klienta: ${props.clientName}
Zvolený balík: ${props.package}
Obdobie: ${props.dateRange}
Suma: ${props.totalPrice}€
Email: ${props.email}
Tel. č.: ${props.phone}

Skontroluj objednávku v administrácií a priprav ju na spracovanie.

Zobraziť objednávky: ${process.env.APP_URL || 'http://localhost:3000'}/dashboard/orders

---
Toto je automaticky generované upozornenie z LevFood administrátorského systému.

LevFood - Jedlo s láskou doručené
  `

  return { html, text }
}

/**
 * Send order notification email to admin
 */
export async function sendOrderNotification(
  to: string | string[],
  props: OrderNotificationEmailProps
): Promise<SendEmailResult> {
  try {
    const { html, text } = generateOrderNotificationEmail(props)

    return await sendEmail({
      to,
      subject: `Nová objednávka #${props.orderId} - LevFood`,
      html,
      text,
    })
  } catch (error) {
    console.error('Error sending order notification email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send order notification email',
    }
  }
}

/**
 * Generate client order confirmation email HTML
 */
function generateClientOrderConfirmationEmail(props: ClientOrderConfirmationEmailProps): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Potvrdenie objednávky #${props.orderId}</title>
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
              <p style="font-family: 'Sofia Sans Condensed', Arial, sans-serif; color: #0E2825; font-size: 16px; font-weight: 400; line-height: 100%; margin: 0 0 24px 0;">
                Dobrý deň ${props.clientName},
              </p>

              <p style="font-family: 'Sofia Sans Condensed', Arial, sans-serif; color: #0E2825; font-size: 16px; font-weight: 400; line-height: 140%; margin: 0 0 24px 0;">
                Ďakujeme, že ste si vybrali LevFood, objednávka bola úspešne prijatá.
              </p>

              <p style="font-family: 'Sofia Sans Condensed', Arial, sans-serif; color: #0E2825; font-size: 26px; font-weight: 600; line-height: 160%; margin: 0 0 24px 0;">
                Číslo objednávky: <strong style="color: #F28E7A; font-weight: 600;">${props.orderId}</strong>
              </p>

              <p style="font-family: 'Sofia Sans Condensed', Arial, sans-serif; color: #0E2825; font-size: 16px; font-weight: 400; line-height: 160%; margin: 0 0 24px 0;">
                Toto číslo bude zároveň vašim identifikačným údajom v aplikácií LevFood.
              </p>

              <p style="font-family: 'Sofia Sans Condensed', Arial, sans-serif; color: #0E2825; font-size: 16px; font-weight: 400; line-height: 160%; margin: 0 0 24px 0;">
                Nájdete v nej všetky aktuálne informácie o vašom predplatnom, možnosť vybrať si z alternatívnych jedál a mnoho ďalších funkcií.
              </p>

              <p style="font-family: 'Sofia Sans Condensed', Arial, sans-serif; color: #0E2825; font-size: 16px; font-weight: 400; line-height: 160%; margin: 0 0 40px 0;">
                Tešíme sa, že môžeme byť súčasťou Vašich dní plných energie a dobrého jedla.
              </p>

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
LevFood - Potvrdenie objednávky #${props.orderId}

Dobrý deň ${props.clientName},

Ďakujeme, že ste si vybrali LevFood, objednávka bola úspešne prijatá.

Číslo objednávky: ${props.orderId}

Toto číslo bude zároveň vašim identifikačným údajom v aplikácií LevFood.

Nájdete v nej všetky aktuálne informácie o vašom predplatnom, možnosť vybrať si z alternatívnych jedál a mnoho ďalších funkcií.

Tešíme sa, že môžeme byť súčasťou Vašich dní plných energie a dobrého jedla.

---
LevFood - Jedlo s láskou doručené
  `

  return { html, text }
}

/**
 * Send client order confirmation email
 */
export async function sendClientOrderConfirmation(
  to: string,
  props: ClientOrderConfirmationEmailProps
): Promise<SendEmailResult> {
  try {
    const { html, text } = generateClientOrderConfirmationEmail(props)

    const emailOptions: SendEmailOptions = {
      to,
      subject: `Potvrdenie objednávky #${props.orderId} - LevFood`,
      html,
      text,
    }

    // Add invoice PDF as attachment if provided
    if (props.invoicePdf) {
      emailOptions.attachments = [{
        filename: `Faktura-${props.orderId}.pdf`,
        content: props.invoicePdf,
        contentType: 'application/pdf',
      }]
    }

    return await sendEmail(emailOptions)
  } catch (error) {
    console.error('Error sending client order confirmation email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send client order confirmation email',
    }
  }
}

/**
 * Verify SMTP connection (useful for testing)
 */
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    const transport = getTransporter()
    await transport.verify()
    console.log('SMTP connection verified successfully')
    return true
  } catch (error) {
    console.error('SMTP connection verification failed:', error)
    return false
  }
}
