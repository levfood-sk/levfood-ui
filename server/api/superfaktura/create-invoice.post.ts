/**
 * Superfaktura Invoice Creation Endpoint
 *
 * Creates an invoice in Superfaktura system via REST API.
 *
 * POST /api/superfaktura/create-invoice
 *
 * Request body example:
 * {
 *   client: {
 *     name: "Company Name",
 *     ico: "12345678",
 *     email: "client@example.com"
 *   },
 *   items: [{
 *     name: "Product/Service",
 *     description: "Description",
 *     quantity: 1,
 *     unit_price: 100,
 *     tax: 20
 *   }],
 *   invoice: {
 *     currency: "EUR",
 *     comment: "Optional comment"
 *   }
 * }
 */

import type { CreateInvoiceRequest } from '../../utils/superfaktura'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const config = useRuntimeConfig()

    // Validate required environment variables
    if (!config.superfakturaEmail || !config.superfakturaApiKey) {
      throw createError({
        statusCode: 500,
        message: 'Superfaktura credentials not configured',
      })
    }

    // Validate request body
    if (!body.client?.name) {
      throw createError({
        statusCode: 400,
        message: 'Client name is required',
      })
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'At least one invoice item is required',
      })
    }

    // Build invoice request
    const invoiceRequest: CreateInvoiceRequest = {
      Client: {
        name: body.client.name,
        ico: body.client.ico,
        dic: body.client.dic,
        ic_dph: body.client.ic_dph,
        email: body.client.email,
        address: body.client.address,
        city: body.client.city,
        zip: body.client.zip,
        country: body.client.country,
        phone: body.client.phone,
      },
      InvoiceItem: body.items.map((item: any) => ({
        name: item.name,
        description: item.description,
        quantity: item.quantity || 1,
        unit: item.unit || 'ks',
        unit_price: item.unit_price,
        tax: item.tax || 20,
        discount: item.discount,
      })),
      Invoice: {
        name: body.invoice?.name,
        currency: body.invoice?.currency || 'EUR',
        comment: body.invoice?.comment,
        variable: body.invoice?.variable,
        constant: body.invoice?.constant,
        delivery: body.invoice?.delivery,
        due: body.invoice?.due,
      },
    }

    // Prepare Superfaktura config
    const superfakturaConfig = {
      email: config.superfakturaEmail,
      apiKey: config.superfakturaApiKey,
      companyId: config.superfakturaCompanyId,
      isSandbox: config.superfakturaIsSandbox === 'true',
    }

    // Create invoice
    const result = await createInvoice(invoiceRequest, superfakturaConfig)

    // Check for errors
    if (result.error) {
      console.error('Superfaktura invoice creation failed:', result)
      throw createError({
        statusCode: 400,
        message: result.error_message || 'Failed to create invoice',
      })
    }

    console.log('✅ Invoice created successfully:', {
      invoiceId: result.data?.Invoice?.id,
      invoiceNumber: result.data?.Invoice?.invoice_no_formatted,
    })

    return {
      success: true,
      invoice: result.data,
    }
  } catch (error: any) {
    console.error('Invoice creation error:', error)

    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to create invoice',
    })
  }
})
