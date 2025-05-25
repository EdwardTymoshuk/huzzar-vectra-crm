import ExcelJS from 'exceljs'
import { Buffer } from 'node:buffer'

type DataRow = Record<string, string | number>

/**
 * Generates a formatted Excel buffer for the monthly summary report (1 row per technician).
 * Includes received, done, failed, completion %, work codes, and total earnings.
 * @param rows Table rows (one per technician)
 * @param filename Excel sheet name (e.g. "Rozliczenie_2025_05")
 * @param orderedHeaders Optional array to enforce column order
 */
export const writeTechnicianSummaryReport = async (
  rows: DataRow[],
  filename: string,
  orderedHeaders?: string[]
): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(filename)

  const headers = orderedHeaders ?? Object.keys(rows[0] || {})

  // Excel styling config
  const headerFill: ExcelJS.FillPattern = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2297DB' }, // blue
  }
  const borderStyle = {
    top: { style: 'thin' as const, color: { argb: 'FF000000' } },
    left: { style: 'thin' as const, color: { argb: 'FF000000' } },
    bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
    right: { style: 'thin' as const, color: { argb: 'FF000000' } },
  }

  // Header row
  const headerRow = worksheet.addRow(headers)
  headerRow.eachCell((cell) => {
    cell.fill = headerFill
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    }
    cell.border = borderStyle
  })

  // Data rows
  rows.forEach((row) => {
    const values = headers.map((key) => row[key] ?? '')
    const added = worksheet.addRow(values)

    added.eachCell((cell, colIndex) => {
      const headerKey = headers[colIndex - 1]
      const isAmount = headerKey === 'Kwota'
      const isRatio = headerKey === 'Kompletacja'

      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      }
      cell.border = borderStyle

      if (isRatio) {
        cell.font = { bold: true, color: { argb: 'FF000000' } }
      }
      if (isAmount) {
        cell.font = { bold: true, color: { argb: 'FF0A891C' } }
      }
    })
  })

  // Auto column widths
  worksheet.columns.forEach((col, i) => {
    let max = headers[i]?.length || 12
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      const val = cell.value ? cell.value.toString() : ''
      if (val.length > max) max = val.length
    })
    col.width = max + 2
  })

  return Buffer.from(await workbook.xlsx.writeBuffer())
}
