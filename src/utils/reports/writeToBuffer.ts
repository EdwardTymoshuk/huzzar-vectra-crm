import ExcelJS from 'exceljs'

/**
 * Generates a formatted Excel buffer from a list of rows.
 * Optionally colors the "Wykonana" column green ("TAK") or red ("NIE") if present.
 * @param rows - Array of row objects (each object is one row, keys = column headers).
 * @param sheetName - Sheet name (optional, default: 'Raport').
 * @returns Buffer with Excel file content (.xlsx)
 */
export const writeToBuffer = async <T extends Record<string, unknown>>(
  rows: T[],
  sheetName = 'Raport'
): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(sheetName)

  if (!rows.length) {
    throw new Error('No rows to export')
  }

  // Get column headers from the first row object
  const columns = Object.keys(rows[0])
  worksheet.columns = columns.map((col) => ({
    header: col,
    key: col,
    width: 20, // default, will auto-adjust below
  }))

  // Add all rows to worksheet
  rows.forEach((row) => {
    worksheet.addRow(row)
  })

  // Style header row
  const headerRow = worksheet.getRow(1)
  headerRow.eachCell((cell) => {
    cell.font = { bold: true }
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    }
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    }
  })

  // Find the index of the "Wykonana" column (if it exists)
  const wykonanaColIndex = columns.findIndex(
    (col) => col.toLowerCase() === 'wykonana'
  )
  // If present, get the ExcelJS column number (1-based)
  const wykonanaExcelCol = wykonanaColIndex !== -1 ? wykonanaColIndex + 1 : null

  // Style data rows and optionally color "Wykonana" cells
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return // Skip header

    row.eachCell((cell, colNumber) => {
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      }

      // Conditional fill for the "Wykonana" column only
      if (
        wykonanaExcelCol &&
        colNumber === wykonanaExcelCol &&
        typeof cell.value === 'string'
      ) {
        if (cell.value === 'TAK') {
          // Green fill for completed
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFC6EFCE' }, // Excel standard light green
          }
          cell.font = { ...cell.font, bold: true, color: { argb: 'FF006100' } } // Dark green text
        } else if (cell.value === 'NIE') {
          // Red fill for not completed
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFC7CE' }, // Excel standard light red
          }
          cell.font = { ...cell.font, bold: true, color: { argb: 'FF9C0006' } } // Dark red text
        }
      }
    })
  })

  // Auto adjust column widths based on longest value in each column
  worksheet.columns.forEach((column) => {
    let maxLength = column.header?.toString().length || 10
    if (column.eachCell) {
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value?.toString() || ''
        maxLength = Math.max(maxLength, cellValue.length)
      })
    }
    column.width = maxLength + 2 // Some extra padding
  })

  // Return as buffer for file download
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
