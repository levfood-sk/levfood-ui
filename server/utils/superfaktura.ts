/**
 * Superfaktura API Utility
 *
 * Provides helper functions for interacting with Superfaktura API
 * Documentation: https://github.com/superfaktura/docs
 */

export interface SuperfakturaConfig {
  email: string
  apiKey: string
  companyId?: string
  isSandbox: boolean
}

export interface InvoiceClient {
  name: string
  ico?: string // Company ID number
  dic?: string // Tax ID
  ic_dph?: string // VAT number
  email?: string
  address?: string
  city?: string
  zip?: string
  country?: string
  phone?: string
}

export interface InvoiceItem {
  name: string
  description?: string
  quantity?: number
  unit?: string
  unit_price: number
  tax: number // Tax rate in percentage (e.g., 20 for 20%)
  discount?: number // Percentage discount on item
  discount_description?: string // Discount description
}

export interface InvoiceData {
  name?: string // Invoice name/title
  currency?: string // Default: 'EUR'
  comment?: string
  invoice_no_formatted?: string // Custom invoice number
  variable?: string // Variable symbol
  constant?: string // Constant symbol
  delivery?: string // Delivery date
  due?: string // Due date
  rounding?: string // Rounding mode: 'item', 'item_ext', 'document'
  discount?: number // Percentage discount on whole invoice
  discount_total?: number // Nominal discount (fixed €), only used if discount is not set
}

export interface CreateInvoiceRequest {
  Client: InvoiceClient
  Invoice?: InvoiceData
  InvoiceItem: InvoiceItem[]
}

export interface SuperfakturaResponse {
  error?: number
  error_message?: string
  data?: any
}

/**
 * Get Superfaktura base URL based on environment
 */
export function getSuperfakturaBaseUrl(isSandbox: boolean): string {
  return isSandbox
    ? 'https://sandbox.superfaktura.sk'
    : 'https://moja.superfaktura.sk'
}

/**
 * Generate authorization header for Superfaktura API
 */
export function generateAuthHeader(config: SuperfakturaConfig): string {
  const params = new URLSearchParams({
    email: config.email,
    apikey: config.apiKey,
    module: 'api',
  })

  if (config.companyId) {
    params.append('company_id', config.companyId)
  }

  return `SFAPI ${params.toString()}`
}

/**
 * Make API request to Superfaktura
 */
export async function makeSuperfakturaRequest(
  endpoint: string,
  data: any,
  config: SuperfakturaConfig
): Promise<SuperfakturaResponse> {
  const baseUrl = getSuperfakturaBaseUrl(config.isSandbox)
  const url = `${baseUrl}${endpoint}`
  const authHeader = generateAuthHeader(config)

  const body = new URLSearchParams()
  body.append('data', JSON.stringify(data))

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: body.toString(),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('Superfaktura API error:', result)
      return {
        error: response.status,
        error_message: result.error_message || 'API request failed',
        data: result,
      }
    }

    return result
  } catch (error: any) {
    console.error('Superfaktura request failed:', error)
    return {
      error: 1,
      error_message: error.message || 'Request failed',
    }
  }
}

/**
 * Create invoice in Superfaktura
 */
export async function createInvoice(
  invoiceData: CreateInvoiceRequest,
  config: SuperfakturaConfig
): Promise<SuperfakturaResponse> {
  return makeSuperfakturaRequest('/invoices/create', invoiceData, config)
}

/**
 * Send invoice via email
 */
export async function sendInvoiceEmail(
  invoiceId: number,
  email: string,
  config: SuperfakturaConfig,
  options?: {
    cc?: string
    bcc?: string
  }
): Promise<SuperfakturaResponse> {
  const data = {
    invoice_id: invoiceId,
    email,
    ...(options?.cc && { cc: options.cc }),
    ...(options?.bcc && { bcc: options.bcc }),
  }

  return makeSuperfakturaRequest('/invoices/send', data, config)
}

/**
 * Download invoice PDF from Superfaktura
 */
export async function downloadInvoicePDF(
  invoiceId: number,
  config: SuperfakturaConfig
): Promise<Buffer | null> {
  const baseUrl = getSuperfakturaBaseUrl(config.isSandbox)
  const url = `${baseUrl}/invoices/pdf/${invoiceId}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': generateAuthHeader(config),
      },
    })

    if (!response.ok) {
      console.error('Failed to download invoice PDF:', response.status, response.statusText)
      return null
    }

    // Get the PDF as array buffer and convert to Buffer
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error: any) {
    console.error('Error downloading invoice PDF:', error)
    return null
  }
}

/**
 * Create invoice from Stripe payment data
 */
export function createInvoiceFromStripePayment(
  paymentIntent: any,
  customerData?: {
    name?: string
    email?: string
    address?: any
  }
): CreateInvoiceRequest {
  // Extract amount and currency from payment intent
  const amount = paymentIntent.amount / 100 // Convert from cents to main currency
  const currency = paymentIntent.currency?.toUpperCase() || 'EUR'

  // Build client data
  const client: InvoiceClient = {
    name: customerData?.name || paymentIntent.receipt_email || 'Customer',
    email: customerData?.email || paymentIntent.receipt_email || undefined,
  }

  // Add address if available
  if (customerData?.address) {
    client.address = customerData.address.line1 || undefined
    client.city = customerData.address.city || undefined
    client.zip = customerData.address.postal_code || undefined
    client.country = customerData.address.country || undefined
  }

  // Build invoice item
  const item: InvoiceItem = {
    name: paymentIntent.description || 'Payment',
    description: `Stripe Payment ID: ${paymentIntent.id}`,
    quantity: 1,
    unit_price: amount,
    tax: 20, // Default 20% VAT - adjust based on your business requirements
  }

  // Build invoice data
  const invoice: InvoiceData = {
    name: `Stripe Payment - ${paymentIntent.id}`,
    currency,
    variable: paymentIntent.id, // Use Stripe payment ID as variable symbol
    comment: `Payment via Stripe\nPayment Intent: ${paymentIntent.id}`,
  }

  return {
    Client: client,
    Invoice: invoice,
    InvoiceItem: [item],
  }
}
