import ExcelJS from 'exceljs'
import { Buffer } from 'node:buffer'

type DataRow = Record<string, string | number>
type WeekSummaryRow = [string, number, number, number, string]

/**
 * Generates a styled Excel buffer for settlements, with dynamic column width,
 * colored and bolded headers, table borders, and a right-side weekly summary.
 * @param rows Main data table rows (day by day)
 * @param filename Worksheet name (not a file name)
 * @param weekSummaries Weekly summary (each row: [weekName, received, done, failed, ratio])
 * @returns Buffer containing Excel file contents
 */
export const writeToBufferStyled = async (
  rows: DataRow[],
  filename: string,
  weekSummaries?: WeekSummaryRow[]
): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(filename)

  // Main table headers
  const headers = [
    'tydzień',
    'data',
    'Ilość instalacji otrzymanych',
    'Ilość instalacji wykonanych',
    'Ilość instalacji niewykonanych',
    'Kompletacja',
  ]

  // Header fill color: HSL(200, 80%, 45%) == #2297db (ExcelJS: FF2297DB)
  const headerFill: ExcelJS.FillPattern = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2297DB' },
  }
  const borderStyle = {
    top: { style: 'thin' as const, color: { argb: 'FF000000' } },
    left: { style: 'thin' as const, color: { argb: 'FF000000' } },
    bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
    right: { style: 'thin' as const, color: { argb: 'FF000000' } },
  }

  // Add header row
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

  // Add data rows
  for (const row of rows) {
    const rowData = headers.map((key) => row[key] ?? '')
    const addedRow = worksheet.addRow(rowData)

    addedRow.eachCell((cell) => {
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      }
      cell.font = { color: { argb: 'FF000000' } }
      cell.border = borderStyle
    })

    // Format "data" column as dd.mm.yyyy
    const dateCol = headers.indexOf('data')
    if (dateCol !== -1) {
      const cell = addedRow.getCell(dateCol + 1)
      if (
        cell.value &&
        typeof cell.value === 'string' &&
        /^\d{4}-\d{2}-\d{2}/.test(cell.value)
      ) {
        const [year, month, day] = (cell.value as string).split('-')
        cell.value = `${day}.${month}.${year}`
      }
    }
    // Bold "Kompletacja"
    const kompletacjaCol = headers.indexOf('Kompletacja')
    if (kompletacjaCol !== -1) {
      addedRow.getCell(kompletacjaCol + 1).font = {
        bold: true,
        color: { argb: 'FF000000' },
      }
    }
  }

  // Make summary row at the end (if present) bold and with header color
  const lastRow = worksheet.lastRow
  if (lastRow) {
    lastRow.eachCell((cell) => {
      cell.font = { bold: true }
      cell.fill = headerFill
      cell.border = borderStyle
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      }
    })
  }

  // Dynamically set column widths to fit longest content
  worksheet.columns.forEach((column, i) => {
    let max = headers[i]?.length || 10
    if (column && column.eachCell) {
      column.eachCell({ includeEmpty: true }, (cell) => {
        const val = cell.value ? cell.value.toString() : ''
        if (val.length > max) max = val.length
      })
    }
    column.width = max + 2
  })

  // Add right-side weekly summary table, if provided
  if (weekSummaries && weekSummaries.length) {
    const colStart = 8 // H
    const rowStart = 1
    const weekHeaders = [
      'Podsumowanie tygodniowe',
      'Ilość instalacji otrzymanych',
      'Ilość instalacji wykonanych',
      'Ilość instalacji niewykonanych',
      'Kompletacja',
    ]
    // Add summary header
    for (let i = 0; i < weekHeaders.length; i++) {
      const cell = worksheet.getCell(rowStart, colStart + i)
      cell.value = weekHeaders[i]
      cell.fill = headerFill
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      }
      cell.border = borderStyle
    }
    // Add summary rows
    weekSummaries.forEach((summary, idx) => {
      for (let i = 0; i < weekHeaders.length; i++) {
        const cell = worksheet.getCell(rowStart + 1 + idx, colStart + i)
        cell.value = summary[i]
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true,
        }
        cell.border = borderStyle
        if (i === weekHeaders.length - 1) {
          cell.font = { bold: true, color: { argb: 'FF000000' } }
        }
      }
    })
    // Set column width for summary table
    for (let i = 0; i < weekHeaders.length; i++) {
      worksheet.getColumn(colStart + i).width = Math.max(
        weekHeaders[i].length + 2,
        16
      )
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
