/**
 * Superfaktura Production Test Endpoint
 *
 * POST /api/test/superfaktura-production
 *
 * Creates a test invoice in production Superfaktura and downloads PDF
 */

import { createInvoice, downloadInvoicePDF } from '~~/server/utils/superfaktura'
import type { CreateInvoiceRequest, InvoiceClient, InvoiceItem, InvoiceData } from '~~/server/utils/superfaktura'

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()

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
      isSandbox: config.superfakturaIsSandbox === 'false',
    }

    console.log('📋 Superfaktura production test configuration:', {
      hasEmail: !!superfakturaConfig.email,
      hasApiKey: !!superfakturaConfig.apiKey,
      companyId: superfakturaConfig.companyId,
      isSandbox: superfakturaConfig.isSandbox,
    })

    // Build test invoice client data
    const invoiceClient: InvoiceClient = {
      name: 'Test Client Production',
      email: 'test@levfood.sk',
      phone: '+421900000000',
      address: 'Test Street 123, Bratislava, 12345',
    }

    // Build test invoice item (€0.50 - Stripe minimum)
    const invoiceItem: InvoiceItem = {
      name: 'Test Product',
      description: 'Production integration test - €0.50',
      quantity: 1,
      unit: 'ks',
      unit_price: 0.50, // €0.50 (Stripe minimum for EUR)
      tax: 0, // No tax for test
    }

    // Build invoice data
    const now = new Date()
    const invoiceDate = now.toISOString().split('T')[0] // YYYY-MM-DD format

    const invoiceData: InvoiceData = {
      name: `Production Test Invoice - ${now.toLocaleString('sk-SK')}`,
      currency: 'EUR',
      variable: `TEST${Date.now()}`, // Unique variable symbol
      comment: 'This is a production integration test invoice for €0.50',
      delivery: invoiceDate,
      due: invoiceDate,
    }

    // Create invoice request
    const invoiceRequest: CreateInvoiceRequest = {
      Client: invoiceClient,
      Invoice: invoiceData,
      InvoiceItem: [invoiceItem],
    }

    // Create invoice in Superfaktura
    console.log('📤 Creating test invoice in Superfaktura...')
    const invoiceResult = await createInvoice(invoiceRequest, superfakturaConfig)

    if (invoiceResult.error) {
      console.error('❌ Failed to create test invoice:', {
        error: invoiceResult.error,
        message: invoiceResult.error_message,
      })

      throw createError({
        statusCode: 500,
        message: invoiceResult.error_message || 'Failed to create test invoice',
      })
    }

    const invoiceId = invoiceResult.data?.Invoice?.id
    const invoiceNumber = invoiceResult.data?.Invoice?.invoice_no_formatted

    console.log('✅ Test invoice created:', {
      invoiceId,
      invoiceNumber,
    })

    // Download invoice PDF
    console.log('📥 Downloading test invoice PDF...')
    const invoicePdf = await downloadInvoicePDF(invoiceId, superfakturaConfig)

    if (!invoicePdf) {
      console.error('❌ Failed to download test invoice PDF')
    } else {
      console.log('✅ Test invoice PDF downloaded:', {
        invoiceId,
        pdfSize: invoicePdf.length,
      })
    }

    return {
      success: true,
      invoiceId,
      invoiceNumber,
      pdfSize: invoicePdf?.length || 0,
      hasPdf: !!invoicePdf,
      invoicePdf: invoicePdf ? invoicePdf.toString('base64') : null, // Return as base64 for download
    }
  } catch (error: any) {
    console.error('❌ Production Superfaktura test error:', error)

    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to create test invoice',
    })
  }
})
