import ExcelJS from 'exceljs'

/**
 * Generates a formatted Excel buffer from a list of rows.
 * @param rows - Array of row objects (each object is one row, keys = column headers).
 * @param sheetName - Sheet name (optional, default: 'Raport').
 * @returns Buffer with Excel file content (.xlsx)
 */
export const writeToBuffer = async (
  rows: Record<string, any>[],
  sheetName = 'Raport'
): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(sheetName)

  if (!rows.length) {
    throw new Error('No rows to export')
  }

  // Get column headers
  const columns = Object.keys(rows[0])
  worksheet.columns = columns.map((col) => ({
    header: col,
    key: col,
    width: 20, // temporary default, will auto-adjust below
  }))

  // Add all rows
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

  // Style data rows
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return // skip header

    row.eachCell((cell) => {
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
  })

  // Auto adjust column widths based on longest value
  worksheet.columns.forEach((column) => {
    let maxLength = column.header?.toString().length || 10

    if (column.eachCell) {
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value?.toString() || ''
        maxLength = Math.max(maxLength, cellValue.length)
      })
    }

    column.width = maxLength + 2
  })

  // Return as buffer
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
