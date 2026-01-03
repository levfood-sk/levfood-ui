/**
 * Create Client API Endpoint
 *
 * POST /api/clients/create
 *
 * Creates a new client in Firestore directly from the admin dashboard.
 * Used for cash-paying customers who don't go through the standard order flow.
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { z } from 'zod'
import type { Client } from '~~/app/lib/types/order'

// Validation schema for client creation
const createClientSchema = z.object({
  firstName: z.string().min(1, 'Meno je povinné').max(100, 'Meno je príliš dlhé'),
  lastName: z.string().min(1, 'Priezvisko je povinné').max(100, 'Priezvisko je príliš dlhé'),
  email: z.string().email('Neplatná emailová adresa'),
  phone: z.string()
    .min(1, 'Telefónne číslo je povinné')
    .regex(/^(\+421|0)?[0-9]{9,10}$/, { message: 'Neplatné telefónne číslo' }),
  accountStatus: z.enum(['aktívny', 'neaktívny']),
  // Optional personal data
  birthDate: z.string().nullable().optional(),
  height: z.number().min(50).max(250).nullable().optional(),
  weight: z.number().min(20).max(300).nullable().optional(),
  physicalActivity: z.enum(['nízka', 'stredná', 'vysoká']).nullable().optional(),
  workActivity: z.enum(['ľahká', 'mierne náročná', 'náročná']).nullable().optional(),
  stressLevel: z.enum(['nízky', 'stredný', 'vysoký']).nullable().optional(),
  goal: z.string().max(500).nullable().optional(),
})

type CreateClientInput = z.infer<typeof createClientSchema>

export default defineEventHandler(async (event) => {
  try {
    // Parse request body
    const body = await readBody<CreateClientInput>(event)

    // Validate input data
    const validationResult = createClientSchema.safeParse(body)

    if (!validationResult.success) {
      console.error('Client validation errors:', JSON.stringify(validationResult.error.issues, null, 2))
      throw createError({
        statusCode: 400,
        message: 'Neplatné údaje',
        data: validationResult.error.issues,
      })
    }

    const clientData = validationResult.data

    // Initialize Firebase Admin
    const { app } = getFirebaseAdmin()
    const db = getFirestore(app)

    // Check if client with this email already exists
    const clientsRef = db.collection('clients')
    const existingClient = await clientsRef
      .where('email', '==', clientData.email.toLowerCase())
      .limit(1)
      .get()

    if (!existingClient.empty) {
      throw createError({
        statusCode: 409,
        message: 'Používateľ s týmto emailom už existuje',
      })
    }

    // Create new client document
    const newClient: Omit<Client, 'clientId'> = {
      firstName: clientData.firstName,
      lastName: clientData.lastName,
      fullName: `${clientData.firstName} ${clientData.lastName}`,
      email: clientData.email.toLowerCase(),
      phone: clientData.phone,

      // Personal info (optional)
      ...(clientData.birthDate && { birthDate: clientData.birthDate }),
      ...(clientData.height && { height: clientData.height }),
      ...(clientData.weight && { weight: clientData.weight }),
      ...(clientData.physicalActivity && { physicalActivity: clientData.physicalActivity }),
      ...(clientData.workActivity && { workActivity: clientData.workActivity }),
      ...(clientData.stressLevel && { stressLevel: clientData.stressLevel }),
      ...(clientData.goal && { goal: clientData.goal }),

      // Account status
      accountStatus: clientData.accountStatus,

      // Subscription info - will be set when order is created
      currentPlan: null,
      lastPaymentDate: null,
      lastPaymentAmount: 0,
      subscriptionEndDate: null,

      // Metadata
      totalOrders: 0,
      totalSpent: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }

    const clientRef = await clientsRef.add(newClient)

    console.log('New client created from dashboard:', {
      clientId: clientRef.id,
      email: clientData.email,
      fullName: newClient.fullName,
    })

    return {
      success: true,
      clientId: clientRef.id,
      message: 'Používateľ bol úspešne vytvorený',
    }
  } catch (error: any) {
    console.error('Client creation error:', error)

    // Re-throw validation and conflict errors
    if (error.statusCode) {
      throw error
    }

    // Generic error
    throw createError({
      statusCode: 500,
      message: error.message || 'Nepodarilo sa vytvoriť používateľa',
    })
  }
})
