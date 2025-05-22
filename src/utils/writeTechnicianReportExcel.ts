import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import ExcelJS from 'exceljs'
import { Buffer } from 'node:buffer'

type OrderDetail = {
  Data: string
  'Nr zlecenia': string
  Adres: string
  [code: string]: string | number
  Kwota: string
}

type Args = {
  filename: string
  technicianName: string
  year: number
  month: number
  workingDays: number
  totalAssigned: number
  totalCompleted: number
  totalNotCompleted: number
  totalRatio: number
  totalAmount: number
  workCodes: string[] // All available work codes, even if 0 for this technician!
  orderDetails: OrderDetail[]
}

export const writeTechnicianReportExcel = async ({
  filename,
  technicianName,
  year,
  month,
  workingDays,
  totalAssigned,
  totalCompleted,
  totalNotCompleted,
  totalRatio,
  totalAmount,
  workCodes,
  orderDetails,
}: Args): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(filename)

  // Header fill color (like in the general report)
  const headerFill: ExcelJS.FillPattern = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2297DB' },
  }
  const summaryFill: ExcelJS.FillPattern = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE3F6FC' },
  }
  const borderStyle: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  }

  // 1. Header A1:E4 (merged)
  worksheet.mergeCells('A1:F4')
  const headerCell = worksheet.getCell('A1')
  headerCell.value = `Rozliczenie technika: ${technicianName} — ${format(
    new Date(year, month - 1),
    'LLLL yyyy',
    { locale: pl }
  )}`
  headerCell.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } }
  headerCell.alignment = {
    horizontal: 'center',
    vertical: 'middle',
    wrapText: true,
  }
  headerCell.fill = headerFill

  // 2. General summary table (headers at row 6, values at row 7)
  worksheet.getRow(6).values = [
    'Dni robocze',
    'Otrzymane zlecenia',
    'Wykonane',
    'Niewykonane',
    'Skuteczność',
    'Łączna kwota',
  ]
  worksheet.getRow(7).values = [
    workingDays,
    totalAssigned,
    totalCompleted,
    totalNotCompleted,
    `${totalRatio.toFixed(2)}%`,
    `${totalAmount.toFixed(2)} zł`,
  ]
  worksheet.getRow(6).eachCell((cell) => {
    cell.font = { bold: true }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.fill = summaryFill
    cell.border = borderStyle
  })
  worksheet.getRow(7).eachCell((cell) => {
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = borderStyle
  })

  // 3. Orders table (headers at row 9)
  const codeHeaders = workCodes
  const orderTableHeaders = [
    'Data',
    'Nr zlecenia',
    'Adres',
    ...codeHeaders,
    'Kwota',
  ]
  worksheet.getRow(9).values = orderTableHeaders
  worksheet.getRow(9).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    }
    cell.fill = headerFill
    cell.border = borderStyle
  })

  // 4. Fill orders (starting at row 10)
  orderDetails.forEach((order, i) => {
    const rowIdx = 10 + i
    const rowValues = [
      order.Data,
      order['Nr zlecenia'],
      order.Adres,
      ...codeHeaders.map((code) =>
        order[code] && order[code] !== 0 ? order[code] : ''
      ),
      order.Kwota,
    ]
    worksheet.getRow(rowIdx).values = rowValues
    worksheet.getRow(rowIdx).eachCell((cell) => {
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      }
      cell.border = borderStyle
    })
  })

  // 5. Column widths - fit headers, not too wide
  worksheet.columns.forEach((column, i) => {
    let max = orderTableHeaders[i]?.length || 10
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const val = cell.value ? cell.value.toString() : ''
      if (val.length > max) max = val.length
    })
    column.width = Math.max(10, Math.min(max + 2, 22))
  })

  // No freeze
  worksheet.views = []

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
