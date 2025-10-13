/**
 * GoPay Payment Gateway Client Utility
 *
 * This utility handles all communication with the GoPay REST API including:
 * - OAuth 2.0 authentication and token management
 * - Payment creation
 * - Payment status retrieval
 * - Automatic token refresh
 *
 * Uses sandbox mode by default for testing.
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * GoPay configuration interface
 */
interface GoPayConfig {
  clientId: string
  clientSecret: string
  merchantId: string
  isProduction: boolean
}

/**
 * OAuth access token response from GoPay
 */
interface GoPayToken {
  access_token: string
  token_type: 'Bearer'
  expires_in: number // Token lifetime in seconds (typically 1800 = 30 minutes)
  timestamp: number // When the token was obtained
}

/**
 * Payment creation request parameters
 */
interface CreatePaymentParams {
  amount: number // Amount in cents (e.g., 199 for €1.99)
  currency: string // Currency code (e.g., 'EUR')
  order_number: string // Unique order identifier
  order_description: string // Human-readable description
  return_url: string // URL where user returns after payment
  notify_url: string // Webhook URL for payment status notifications
  lang?: string // Language code (e.g., 'sk', 'cs', 'en')
  payer?: {
    contact?: {
      first_name?: string
      last_name?: string
      email?: string
    }
  }
}

/**
 * Payment creation response from GoPay
 */
interface CreatePaymentResponse {
  id: number // GoPay payment ID
  order_number: string
  state: string // Payment state (e.g., 'CREATED', 'PAID', 'CANCELED')
  amount: number
  currency: string
  gw_url: string // URL to redirect user to payment gateway
}

/**
 * Payment status response from GoPay
 */
interface PaymentStatusResponse {
  id: number
  order_number: string
  state: string
  amount: number
  currency: string
  payer?: {
    payment_card?: {
      card_number: string // Masked card number
      card_expiration: string
    }
  }
  items?: Array<{
    name: string
    amount: number
  }>
}

// ============================================================================
// GoPay Client Class
// ============================================================================

/**
 * GoPay API client with OAuth authentication
 */
class GoPayClient {
  private config: GoPayConfig
  private token: GoPayToken | null = null
  private baseUrl: string

  constructor(config: GoPayConfig) {
    this.config = config
    // Use sandbox URL for testing, production URL for live payments
    this.baseUrl = config.isProduction
      ? 'https://gate.gopay.cz/api'
      : 'https://gw.sandbox.gopay.com/api'
  }

  /**
   * Get base URL for API requests
   */
  getBaseUrl(): string {
    return this.baseUrl
  }

  /**
   * Check if current token is still valid
   * Token expires after 30 minutes, we refresh 1 minute before expiry
   */
  private isTokenValid(): boolean {
    if (!this.token) return false

    const now = Date.now()
    const tokenAge = (now - this.token.timestamp) / 1000 // Age in seconds
    const expiresIn = this.token.expires_in

    // Consider token invalid if less than 60 seconds remaining
    return tokenAge < (expiresIn - 60)
  }

  /**
   * Obtain OAuth access token from GoPay
   * Uses Basic authentication with client credentials
   */
  private async authenticate(): Promise<void> {
    // Create Basic auth credentials (base64 encoded clientId:clientSecret)
    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`
    ).toString('base64')

    try {
      const response = await fetch(`${this.baseUrl}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          scope: 'payment-all', // Full payment access scope
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`GoPay authentication failed: ${response.status} ${errorText}`)
      }

      const data = await response.json()

      // Store token with timestamp for expiry tracking
      this.token = {
        access_token: data.access_token,
        token_type: data.token_type,
        expires_in: data.expires_in,
        timestamp: Date.now(),
      }
    } catch (error) {
      console.error('GoPay authentication error:', error)
      throw error
    }
  }

  /**
   * Get valid access token, refreshing if necessary
   */
  private async getAccessToken(): Promise<string> {
    if (!this.isTokenValid()) {
      await this.authenticate()
    }

    if (!this.token) {
      throw new Error('Failed to obtain GoPay access token')
    }

    return this.token.access_token
  }

  /**
   * Create a new payment in GoPay
   * Returns payment details including redirect URL
   */
  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResponse> {
    const token = await this.getAccessToken()

    // Prepare payment request body according to GoPay API spec
    const requestBody = {
      payer: {
        default_payment_instrument: 'PAYMENT_CARD', // Default to card payment
        allowed_payment_instruments: ['PAYMENT_CARD'], // Only allow card payments for simplicity
        contact: params.payer?.contact || {},
      },
      target: {
        type: 'ACCOUNT',
        goid: this.config.merchantId,
      },
      amount: params.amount,
      currency: params.currency,
      order_number: params.order_number,
      order_description: params.order_description,
      items: [
        {
          name: params.order_description,
          amount: params.amount,
        },
      ],
      callback: {
        return_url: params.return_url,
        notification_url: params.notify_url,
      },
      lang: params.lang || 'SK', // Default to Slovak language
    }

    try {
      const response = await fetch(`${this.baseUrl}/payments/payment`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`GoPay create payment failed: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      return data as CreatePaymentResponse
    } catch (error) {
      console.error('GoPay create payment error:', error)
      throw error
    }
  }

  /**
   * Get payment status from GoPay
   * Used to verify payment completion and retrieve details
   */
  async getPaymentStatus(paymentId: number): Promise<PaymentStatusResponse> {
    const token = await this.getAccessToken()

    try {
      const response = await fetch(`${this.baseUrl}/payments/payment/${paymentId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`GoPay get payment status failed: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      return data as PaymentStatusResponse
    } catch (error) {
      console.error('GoPay get payment status error:', error)
      throw error
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let goPayClient: GoPayClient | null = null

/**
 * Get or create GoPay client instance (singleton pattern)
 * Reads configuration from runtime config
 */
export const useGoPay = (): GoPayClient => {
  if (goPayClient) {
    return goPayClient
  }

  const config = useRuntimeConfig()

  // Validate required configuration
  if (!config.goPayClientId) {
    throw new Error('GOPAY_CLIENT_ID is not configured')
  }
  if (!config.goPayClientSecret) {
    throw new Error('GOPAY_CLIENT_SECRET is not configured')
  }
  if (!config.goPayMerchantId) {
    throw new Error('GOPAY_MERCHANT_ID is not configured')
  }

  // Create client with configuration
  goPayClient = new GoPayClient({
    clientId: config.goPayClientId,
    clientSecret: config.goPayClientSecret,
    merchantId: config.goPayMerchantId,
    isProduction: config.goPayIsProduction === 'true',
  })

  return goPayClient
}

// ============================================================================
// Type Exports
// ============================================================================

export type {
  CreatePaymentParams,
  CreatePaymentResponse,
  PaymentStatusResponse,
}
