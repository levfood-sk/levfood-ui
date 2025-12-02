import { z } from 'zod'
import type { Timestamp } from 'firebase/firestore'

/**
 * Order Package Types
 */
export type PackageType = 'EKONOMY' | 'ŠTANDARD' | 'PREMIUM' | 'OFFICE'
export type DurationType = '5' | '6'
export type DeliveryType = 'prevádzka' | 'domov'
export type DeliveryCity = 'Levice' | 'Géňa' | 'Kalinčiakovo' | 'Hronské Klačany' | 'Starý Tekov' | 'Podlužany' | 'Hronské Kosihy' | 'Čajkov' | 'Rybník' | 'Tlmače' | 'Tlmače Lipník' | 'Mochovce' | 'Kalná n. Hronom' | 'Horná Seč'

/**
 * Delivery City Options Array
 */
export const DELIVERY_CITIES: DeliveryCity[] = [
  'Levice',
  'Géňa',
  'Kalinčiakovo',
  'Hronské Klačany',
  'Starý Tekov',
  'Podlužany',
  'Hronské Kosihy',
  'Čajkov',
  'Rybník',
  'Tlmače',
  'Tlmače Lipník',
  'Mochovce',
  'Kalná n. Hronom',
  'Horná Seč',
]
export type PaymentStatus = 'pending' | 'succeeded' | 'failed'
export type OrderStatus = 'pending' | 'approved' | 'cancelled'

/**
 * Physical Activity Levels
 */
export type PhysicalActivity = 'nízka' | 'stredná' | 'vysoká'
export type WorkActivity = 'ľahká' | 'mierne náročná' | 'náročná'
export type StressLevel = 'nízky' | 'stredný' | 'vysoký'
export type AccountStatus = 'aktívny' | 'neaktívny'

/**
 * Client Interface
 * Represents a client in the separate clients collection
 */
export interface Client {
  clientId: string             // Firestore document ID
  firstName: string
  lastName: string
  fullName: string
  email: string                // Unique identifier
  phone: string

  // Personal info (Niečo o tebe) - all optional
  birthDate?: string           // ISO date string
  height?: number | null       // in cm
  weight?: number | null       // in kg
  physicalActivity?: PhysicalActivity | null
  workActivity?: WorkActivity | null
  stressLevel?: StressLevel | null
  goal?: string                // User's goal (text field)

  // Account status
  accountStatus: AccountStatus // aktívny / neaktívny

  // Current subscription info
  currentPlan: PackageType | null  // Current active plan
  lastPaymentDate: Timestamp | null
  lastPaymentAmount: number    // in cents
  subscriptionEndDate: Timestamp | null  // End of current paid period

  // Metadata
  totalOrders: number          // Count of orders
  totalSpent: number           // Total amount spent in cents
  createdAt: Timestamp
  updatedAt: Timestamp
}

/**
 * Order Interface
 * Represents a complete order in Firestore
 */
export interface Order {
  // Unique identifiers
  orderId: string              // 6-digit unique ID for customer
  firestoreId: string          // Firestore document ID
  clientId: string             // Reference to Client document

  // Delivery information
  deliveryType: DeliveryType   // prevádzka or domov
  deliveryCity?: DeliveryCity  // City for home delivery (only when deliveryType is 'domov')
  deliveryAddress: string      // Billing address (required) / Delivery address when deliveryType is 'domov'

  // Package details
  package: PackageType
  duration: DurationType
  daysCount: number            // 20 or 24 days
  totalPrice: number           // Total price in cents (e.g., 29000 = 290€)

  // Dietary preferences
  dietaryRequirements: string[]
  notes: string

  // Delivery information
  courierNotes: string
  deliveryStartDate: string    // ISO date string

  // Payment information
  termsAccepted: boolean
  stripePaymentIntentId: string
  paymentStatus: PaymentStatus
  amountPaid: number           // Amount in cents
  currency: string             // 'eur'

  // Order management
  orderStatus: OrderStatus

  // Invoice information (optional, added after webhook processing)
  superfakturaInvoiceId?: number
  superfakturaInvoiceNumber?: string

  // Timestamps
  createdAt: Timestamp
  updatedAt: Timestamp
  paidAt: Timestamp | null
}

/**
 * Order Creation Input
 * Data received from the form before creating order
 */
export interface CreateOrderInput {
  // Step 1: Package selection
  package: PackageType
  duration: DurationType

  // Step 2: Preferences
  dietaryRequirements: string[]
  notes: string

  // Step 2b: Personal info (Niečo o tebe) - all optional
  birthDate?: string
  height?: number | null
  weight?: number | null
  physicalActivity?: PhysicalActivity | null
  workActivity?: WorkActivity | null
  stressLevel?: StressLevel | null
  goal?: string

  // Step 3: Delivery info
  deliveryType: DeliveryType
  deliveryCity?: DeliveryCity  // Required when deliveryType is 'domov'
  fullName: string
  phone: string
  email: string
  address: string
  courierNotes: string

  // Step 4: Payment
  deliveryStartDate: string
  termsAccepted: boolean
  stripePaymentIntentId: string
}

/**
 * Zod Schema for Order Validation
 */
export const createOrderSchema = z.object({
  // Package
  package: z.enum(['EKONOMY', 'ŠTANDARD', 'PREMIUM', 'OFFICE'], {
    message: 'Balíček je povinný',
  }),
  duration: z.enum(['5', '6'], {
    message: 'Dĺžka objednávky je povinná',
  }),

  // Preferences
  dietaryRequirements: z.array(z.string()).default([]),
  notes: z.string().default(''),

  // Personal info (all optional)
  birthDate: z.string().optional().default(''),
  height: z.number()
    .max(300, 'Výška je príliš vysoká')
    .optional()
    .nullable(),
  weight: z.number()
    .max(500, 'Hmotnosť je príliš vysoká')
    .optional()
    .nullable(),
  physicalActivity: z.enum(['nízka', 'stredná', 'vysoká'], {
    message: 'Neplatná hodnota',
  }).optional().nullable(),
  workActivity: z.enum(['ľahká', 'mierne náročná', 'náročná'], {
    message: 'Neplatná hodnota',
  }).optional().nullable(),
  stressLevel: z.enum(['nízky', 'stredný', 'vysoký'], {
    message: 'Neplatná hodnota',
  }).optional().nullable(),
  goal: z.string()
    .max(500, 'Cieľ je príliš dlhý')
    .optional()
    .default(''),

  // Customer info
  deliveryType: z.enum(['prevádzka', 'domov'], {
    message: 'Typ doručenia je povinný',
  }),
  deliveryCity: z.enum([
    'Levice', 'Géňa', 'Kalinčiakovo', 'Hronské Klačany', 'Starý Tekov',
    'Podlužany', 'Hronské Kosihy', 'Čajkov', 'Rybník', 'Tlmače',
    'Tlmače Lipník', 'Mochovce', 'Kalná n. Hronom', 'Horná Seč'
  ], {
    message: 'Mesto/obec je povinné pre doručenie domov',
  }).optional(),
  fullName: z.string()
    .min(2, 'Meno musí obsahovať aspoň 2 znaky')
    .max(100, 'Meno je príliš dlhé'),
  phone: z.string()
    .min(1, 'Telefónne číslo je povinné')
    .regex(/^(\+421|0)?[0-9]{9,10}$/, { message: 'Neplatné telefónne číslo' }),
  email: z.string()
    .email('Neplatná emailová adresa')
    .toLowerCase(),
  address: z.string()
    .min(5, 'Adresa musí obsahovať aspoň 5 znakov')
    .max(500, 'Adresa je príliš dlhá'),
  courierNotes: z.string().max(500, 'Poznámka je príliš dlhá').default(''),

  // Payment
  deliveryStartDate: z.string()
    .min(1, 'Dátum doručenia je povinný'),
  termsAccepted: z.boolean()
    .refine((val) => val === true, 'Musíte súhlasiť s podmienkami'),
  stripePaymentIntentId: z.string()
    .min(1, 'Chýba ID platby'),
})

export type CreateOrderSchemaType = z.infer<typeof createOrderSchema>

/**
 * Package Pricing (in cents) - Dynamic pricing based on duration
 */
export const PACKAGE_PRICES: Record<PackageType, Record<DurationType, number>> = {
  EKONOMY: {
    '5': 29900,  // 299€ for 5 days
    '6': 33900   // 339€ for 6 days
  },
  ŠTANDARD: {
    '5': 35900,  // 359€ for 5 days
    '6': 39900   // 399€ for 6 days
  },
  PREMIUM: {
    '5': 41900,  // 419€ for 5 days
    '6': 45900   // 459€ for 6 days
  },
  OFFICE: {
    '5': 24900,  // 249€ for 5 days (only option)
    '6': 24900   // 249€ for 6 days (not available, but keeping for type consistency)
  }
}

/**
 * Calculate total price based on package and duration
 */
export function calculateOrderPrice(packageType: PackageType, duration: DurationType): {
  daysCount: number
  totalPrice: number
} {
  const totalPrice = PACKAGE_PRICES[packageType][duration]
  const daysCount = duration === '5' ? 20 : 24

  return {
    daysCount,
    totalPrice,
  }
}

/**
 * Format price from cents to EUR string
 */
export function formatPrice(cents: number): string {
  const euros = cents / 100
  return `${euros.toFixed(2)}€`
}

/**
 * Order Status Labels (Slovak)
 */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Čakajúca',
  approved: 'Schválená',
  cancelled: 'Zrušená',
}

/**
 * Order Status Colors for UI
 */
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'warning',
  approved: 'success',
  cancelled: 'error',
}

/**
 * Order with Client Data (for admin display)
 */
export interface OrderWithClient extends Order {
  client?: Client
}
