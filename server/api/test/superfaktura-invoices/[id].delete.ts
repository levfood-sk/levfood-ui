/**
 * Delete Superfaktura Invoice
 *
 * DELETE /api/test/superfaktura-invoices/:id
 */

import { deleteInvoice } from '~~/server/utils/superfaktura'

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const invoiceId = getRouterParam(event, 'id')

    if (!invoiceId) {
      throw createError({
        statusCode: 400,
        message: 'Invoice ID is required',
      })
    }

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

    console.log(`🗑️ Deleting invoice ${invoiceId}...`)
    const result = await deleteInvoice(Number(invoiceId), superfakturaConfig)

    if (result.error) {
      console.error('❌ Failed to delete invoice:', result.error_message)
      throw createError({
        statusCode: 400,
        message: result.error_message || 'Failed to delete invoice',
      })
    }

    console.log(`✅ Invoice ${invoiceId} deleted`)

    return {
      success: true,
      invoiceId,
    }
  } catch (error: any) {
    console.error('Delete invoice error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to delete invoice',
    })
  }
})

