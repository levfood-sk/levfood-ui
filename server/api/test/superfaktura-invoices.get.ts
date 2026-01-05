/**
 * List Superfaktura Invoices
 *
 * GET /api/test/superfaktura-invoices
 */

import { listInvoices } from '~~/server/utils/superfaktura'

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const query = getQuery(event)

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

    const result = await listInvoices(superfakturaConfig, {
      page: query.page ? Number(query.page) : 1,
      per_page: query.per_page ? Number(query.per_page) : 20,
    })

    return {
      success: true,
      isSandbox: superfakturaConfig.isSandbox,
      credentials: {
        email: superfakturaConfig.email,
        companyId: superfakturaConfig.companyId,
      },
      invoices: result,
    }
  } catch (error: any) {
    console.error('List invoices error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to list invoices',
    })
  }
})

