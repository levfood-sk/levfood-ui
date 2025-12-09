/**
 * Superfaktura Package Invoice Test Endpoint
 *
 * POST /api/test/superfaktura-package
 *
 * Creates a test invoice in Superfaktura for a specific package type,
 * using the exact same pricing logic as the webhook.
 * 
 * Request body:
 * {
 *   package: 'EKONOMY' | 'ŠTANDARD' | 'PREMIUM' | 'OFFICE',
 *   duration: '5' | '6',
 *   clientName?: string,
 *   clientEmail?: string
 * }
 */

import { createInvoice, downloadInvoicePDF, payInvoice } from '~~/server/utils/superfaktura'
import type { CreateInvoiceRequest, InvoiceClient, InvoiceItem, InvoiceData } from '~~/server/utils/superfaktura'
import type { PackageType, DurationType } from '~~/app/lib/types/order'
import { ORIGINAL_PRICES, PACKAGE_PRICES, hasPackageDiscount } from '~~/app/lib/types/order'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const config = useRuntimeConfig()

    // Validate required fields
    if (!body.package || !body.duration) {
      throw createError({
        statusCode: 400,
        message: 'Package and duration are required',
      })
    }

    const packageType = body.package as PackageType
    const duration = body.duration as DurationType

    // Validate package type
    if (!['EKONOMY', 'ŠTANDARD', 'PREMIUM', 'OFFICE'].includes(packageType)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid package type',
      })
    }

    // Validate duration
    if (!['5', '6'].includes(duration)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid duration',
      })
    }

    // Verify Superfaktura is configured
    if (!config.superfakturaEmail || !config.superfakturaApiKey) {
      throw createError({
        statusCode: 500,
        message: 'Superfaktura credentials not configured',
      })
    }

    const superfakturaConfig = {
      email: config.superfakturaEmail,
      apiKey: config.superfakturaApiKey,
      companyId: config.superfakturaCompanyId,
      isSandbox: config.superfakturaIsSandbox === 'true',
    }

    console.log('📋 Package invoice test configuration:', {
      package: packageType,
      duration,
      isSandbox: superfakturaConfig.isSandbox,
    })

    // Check if package has discount (using single source of truth)
    const hasDiscount = hasPackageDiscount(packageType)

    // Get original price before discount
    const originalPrice = ORIGINAL_PRICES[packageType][duration]
    
    // Get final price after discount (what customer actually pays)
    const finalPrice = PACKAGE_PRICES[packageType][duration]

    // Convert to euros (from cents)
    const originalPriceEuros = originalPrice / 100
    const finalPriceEuros = finalPrice / 100

    // Calculate nominal discount amount (e.g., 359 - 323 = 36€)
    const discountAmount = hasDiscount ? originalPriceEuros - finalPriceEuros : 0

    // Calculate days
    const daysCount = duration === '5' ? 20 : 24

    // Build test invoice client data
    const invoiceClient: InvoiceClient = {
      name: body.clientName || 'Test Client - Package Test',
      email: body.clientEmail || 'test@levfood.sk',
      phone: '+421900000000',
      address: 'Test Street 123, Levice, 93401',
    }

    // Build invoice item - use original price, discount will be on invoice level
    const invoiceItem: InvoiceItem = {
      name: `LevFood ${packageType} balík`,
      description: `${daysCount} dní / Test objednávka${hasDiscount ? ' (Zľava 10%)' : ''}`,
      quantity: 1,
      unit: 'balík',
      unit_price: originalPriceEuros, // Original price before discount
      tax: 0,
    }

    // Build invoice data with discount_total on invoice level (not item level!)
    const now = new Date()
    const invoiceDate = now.toISOString().split('T')[0] // YYYY-MM-DD format
    const testOrderId = `TEST${Date.now().toString().slice(-6)}`

    const invoiceData: InvoiceData = {
      name: `Test Objednávka #${testOrderId}`,
      currency: 'EUR',
      variable: testOrderId,
      comment: `LevFood ${packageType} balík - TEST\nTento faktúra je testovacia`,
      delivery: invoiceDate,
      due: invoiceDate,
      rounding: 'item_ext',
      discount_total: discountAmount, // Nominal discount (e.g., 36€) on invoice level
    }

    // Create invoice request
    const invoiceRequest: CreateInvoiceRequest = {
      Client: invoiceClient,
      Invoice: invoiceData,
      InvoiceItem: [invoiceItem],
    }

    // Log pricing details for debugging
    console.log('💰 Invoice pricing details:', {
      package: packageType,
      duration,
      hasDiscount,
      originalPrice: `${originalPriceEuros}€`,
      discountAmount: `${discountAmount}€`,
      expectedFinalPrice: `${finalPriceEuros}€`,
    })

    // Create invoice in Superfaktura
    console.log('📤 Creating package test invoice in Superfaktura...')
    const invoiceResult = await createInvoice(invoiceRequest, superfakturaConfig)

    if (invoiceResult.error) {
      console.error('❌ Failed to create package test invoice:', {
        error: invoiceResult.error,
        message: invoiceResult.error_message,
        data: invoiceResult.data,
      })

      throw createError({
        statusCode: 500,
        message: invoiceResult.error_message || 'Failed to create test invoice',
      })
    }

    const invoiceId = invoiceResult.data?.Invoice?.id
    const invoiceNumber = invoiceResult.data?.Invoice?.invoice_no_formatted

    console.log('✅ Package test invoice created:', {
      invoiceId,
      invoiceNumber,
      package: packageType,
    })

    // Mark invoice as paid
    console.log('💳 Marking invoice as paid...')
    const payResult = await payInvoice(invoiceId, finalPriceEuros, superfakturaConfig, {
      payment_type: 'card',
    })

    if (payResult.error) {
      console.error('❌ Failed to mark invoice as paid:', payResult.error_message)
    } else {
      console.log('✅ Invoice marked as paid')
    }

    // Download invoice PDF
    console.log('📥 Downloading package test invoice PDF...')
    const invoicePdf = await downloadInvoicePDF(invoiceId, superfakturaConfig)

    if (!invoicePdf) {
      console.error('❌ Failed to download package test invoice PDF')
    } else {
      console.log('✅ Package test invoice PDF downloaded:', {
        invoiceId,
        pdfSize: invoicePdf.length,
      })
    }

    return {
      success: true,
      invoiceId,
      invoiceNumber,
      package: packageType,
      duration,
      pricing: {
        originalPrice: originalPriceEuros,
        discountAmount,
        hasDiscount,
        discountPercent: hasDiscount ? 10 : 0,
        expectedFinalPrice: finalPriceEuros,
        daysCount,
      },
      pdfSize: invoicePdf?.length || 0,
      hasPdf: !!invoicePdf,
      invoicePdf: invoicePdf ? invoicePdf.toString('base64') : null,
    }
  } catch (error: any) {
    console.error('❌ Package Superfaktura test error:', error)

    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to create package test invoice',
    })
  }
})

