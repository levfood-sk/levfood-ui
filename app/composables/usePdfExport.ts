export interface PdfColumn {
  header: string
  dataKey: string
  width?: number
}

export interface PdfExportOptions {
  title: string
  columns: PdfColumn[]
  rows: any[]
  filename: string
  orientation?: 'portrait' | 'landscape'
}

// Helper function to remove Slovak diacritics
function removeDiacritics(text: string): string {
  if (!text) return text
  const diacriticsMap: Record<string, string> = {
    'á': 'a', 'ä': 'a', 'č': 'c', 'ď': 'd', 'é': 'e', 'í': 'i',
    'ľ': 'l', 'ĺ': 'l', 'ň': 'n', 'ó': 'o', 'ô': 'o', 'ŕ': 'r',
    'š': 's', 'ť': 't', 'ú': 'u', 'ý': 'y', 'ž': 'z',
    'Á': 'A', 'Ä': 'A', 'Č': 'C', 'Ď': 'D', 'É': 'E', 'Í': 'I',
    'Ĺ': 'L', 'Ľ': 'L', 'Ň': 'N', 'Ó': 'O', 'Ô': 'O', 'Ŕ': 'R',
    'Š': 'S', 'Ť': 'T', 'Ú': 'U', 'Ý': 'Y', 'Ž': 'Z',
  }
  return text.replace(/[áäčďéíľĺňóôŕšťúýžÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]/g, (char) => diacriticsMap[char] || char)
}

// Helper function to format date without diacritics
function formatDateNoDiacritics(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day}.${month}.${year} ${hours}:${minutes}`
}

// Helper function to format date short without diacritics
function formatDateShortNoDiacritics(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}.${month}.${year}`
}

export function usePdfExport() {
  const exportToPdf = async (options: PdfExportOptions) => {
    // Only run on client side
    if (import.meta.server) {
      throw new Error('PDF export is only available on the client side')
    }

    try {
      // Dynamic import for client-side only
      const { jsPDF } = await import('jspdf')
      const autoTableModule = await import('jspdf-autotable')
      const autoTable = autoTableModule.default || autoTableModule

      const doc = new jsPDF({
        orientation: options.orientation || 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      // Add title without diacritics
      doc.setFontSize(16)
      doc.text(removeDiacritics(options.title), 14, 15)

      // Add export date without diacritics
      const exportDate = formatDateNoDiacritics(new Date())
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(`Export: ${exportDate}`, 14, 22)
      doc.setTextColor(0, 0, 0)

      // Prepare table data - remove diacritics from headers and values
      const headers = options.columns.map(col => removeDiacritics(col.header))
      const columnWidths = options.columns.map(col => col.width || 'auto')
      
      const rows = options.rows.map(row => {
        return options.columns.map(col => {
          const value = row[col.dataKey]
          if (value === null || value === undefined) return '-'
          if (typeof value === 'object' && value && 'toDate' in value && typeof value.toDate === 'function') {
            // Firestore timestamp - format without diacritics
            try {
              return formatDateShortNoDiacritics(value.toDate())
            } catch {
              return '-'
            }
          }
          // Remove diacritics from all text values
          return removeDiacritics(String(value))
        })
      })

      // Generate table
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 28,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [45, 55, 72], // slate-800
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252], // slate-50
        },
        columnStyles: options.columns.reduce((acc, col, index) => {
          if (col.width) {
            acc[index] = { cellWidth: col.width }
          }
          return acc
        }, {} as Record<number, { cellWidth: number }>),
        margin: { top: 28, left: 14, right: 14 },
      })

      // Save PDF
      doc.save(options.filename)
      
      return { success: true }
    } catch (error: any) {
      console.error('PDF export error:', error)
      throw new Error(error.message || 'Nepodarilo sa vytvoriť PDF')
    }
  }

  return {
    exportToPdf,
  }
}

