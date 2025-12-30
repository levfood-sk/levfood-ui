/**
 * CSV Export Composable
 * Provides functionality to export data to CSV format with proper encoding for Slovak characters
 */

export interface CsvColumn {
  header: string
  dataKey: string
}

export interface CsvExportOptions {
  columns: CsvColumn[]
  rows: Record<string, unknown>[]
  filename: string
  headerInfo?: { label: string; value: string }[]
}

/**
 * Escape CSV value to handle semicolons, quotes, and newlines
 * Using semicolon as delimiter for European Excel compatibility
 */
function escapeCsvValue(value: string): string {
  if (!value) return ''
  // Escape quotes and wrap in quotes if contains semicolon, quote, or newline
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function useCsvExport() {
  const exportToCsv = (options: CsvExportOptions): { success: boolean } => {
    // Only run on client side
    if (import.meta.server) {
      throw new Error('CSV export is only available on the client side')
    }

    try {
      // Use semicolon as delimiter for European Excel (Slovak locale)
      const delimiter = ';'
      const lines: string[] = []

      // Add header info if provided (e.g., date, total orders)
      if (options.headerInfo) {
        options.headerInfo.forEach((info) => {
          lines.push(`${escapeCsvValue(info.label)}${delimiter}${escapeCsvValue(info.value)}`)
        })
        lines.push('') // Empty line separator
      }

      // Add column headers
      const headers = options.columns.map((col) => escapeCsvValue(col.header))
      lines.push(headers.join(delimiter))

      // Add data rows
      options.rows.forEach((row) => {
        const values = options.columns.map((col) => {
          const value = row[col.dataKey]
          return escapeCsvValue(value?.toString() || '')
        })
        lines.push(values.join(delimiter))
      })

      // Create and download file
      // BOM (\uFEFF) ensures Excel properly handles Slovak characters (UTF-8)
      const csvContent = lines.join('\n')
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', options.filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      return { success: true }
    } catch (error: unknown) {
      console.error('CSV export error:', error)
      const message = error instanceof Error ? error.message : 'Nepodarilo sa vytvoriť CSV'
      throw new Error(message)
    }
  }

  return { exportToCsv }
}
